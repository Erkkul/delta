"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Autocomplétion API Adresse Gouv.fr (KAN-17).
 *
 * Endpoint public sans clé. Debounce 350 ms, 5 suggestions max. Le caller
 * fournit la valeur courante (champ contrôlé) et reçoit en callback
 * l'adresse retenue + ses coordonnées WGS84 quand le user clique sur une
 * suggestion.
 *
 * Réutilisable : la convention `apps/web/components/forms/AddressAutocomplete.tsx`
 * a été infléchie ici en `producer/` car le composant n'a pas d'autres
 * consommateurs au MVP. À déplacer vers `apps/web/components/forms/` quand
 * KAN-25 (onboarding acheteur) ou KAN-41 (déclaration trajet rameneur) le
 * reprendront.
 */

const API_BASE = "https://api-adresse.data.gouv.fr/search/"
const DEBOUNCE_MS = 350
const SUGGESTION_LIMIT = 5

export type AddressSuggestion = {
  label: string
  longitude: number
  latitude: number
  score: number
}

type AdresseGouvFeature = {
  geometry: { coordinates: [number, number] }
  properties: { label: string; score: number }
}

export type AddressAutocompleteProps = {
  value: string
  onChange: (value: string) => void
  onSelect: (suggestion: AddressSuggestion) => void
  placeholder?: string
  required?: boolean
  ariaLabel?: string
  /** Optionnel : id pour relier le label HTML au champ */
  id?: string
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  required,
  ariaLabel,
  id,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  // Debounced fetch suggestions
  useEffect(() => {
    if (value.trim().length < 4) {
      setSuggestions([])
      return undefined
    }
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(() => {
      void fetch(
        `${API_BASE}?q=${encodeURIComponent(value)}&limit=${SUGGESTION_LIMIT}`,
        { headers: { Accept: "application/json" } },
      )
        .then((r) => (r.ok ? r.json() : { features: [] }))
        .then((data: { features?: AdresseGouvFeature[] }) => {
          if (cancelled) return
          const list = (data.features ?? []).map<AddressSuggestion>((f) => ({
            label: f.properties.label,
            longitude: f.geometry.coordinates[0],
            latitude: f.geometry.coordinates[1],
            score: f.properties.score,
          }))
          setSuggestions(list)
          setOpen(list.length > 0)
        })
        .catch(() => {
          if (!cancelled) setSuggestions([])
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [value])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={wrapperRef} className="relative">
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true)
        }}
        placeholder={placeholder}
        required={required}
        aria-label={ariaLabel}
        autoComplete="off"
        className="w-full rounded-md border-[1.5px] border-cream-300 bg-cream-50 px-3.5 py-3 text-sm text-cream-950 focus:border-green-600 focus:shadow-focus focus:outline-none"
      />
      {open && suggestions.length > 0 ? (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-10 mt-1 max-h-60 overflow-auto rounded-md border border-cream-200 bg-white shadow-elevated"
        >
          {suggestions.map((s, i) => (
            <li key={`${s.label}-${i}`}>
              <button
                type="button"
                onClick={() => {
                  onChange(s.label)
                  onSelect(s)
                  setOpen(false)
                }}
                className="block w-full px-3.5 py-2 text-left text-sm text-cream-950 hover:bg-green-50"
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {loading && value.length >= 4 ? (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-cream-500">
          …
        </span>
      ) : null}
    </div>
  )
}
