"use client"

import {
  type BuyerProfileSnapshot,
  type BuyerProfileUpsertInput,
} from "@delta/contracts/buyer-profile"
import { useState, type FormEvent } from "react"

import {
  AddressAutocomplete,
  type AddressSuggestion,
} from "@/components/forms/address-autocomplete"

/**
 * BuyerZoneForm (KAN-25) — saisie du nom + zone d'habitation acheteur.
 *
 * Source : maquette `design/maquettes/acheteur/ac-02-onboarding.html` (étape 1).
 * Voir `specs/KAN-25/notes.md` pour le conflit maquette ↔ KAN-81 sur le champ
 * « nom » (la maquette ne l'affiche pas ; KAN-81 l'exige — capté ici, facultatif).
 *
 * Deux modes :
 *   - `onboarding` : CTA « Continuer » (appelle `onSaved` après PUT réussi)
 *   - `edit`       : CTA « Enregistrer » depuis les paramètres (KAN-82)
 */

export type BuyerZoneFormProps = {
  initial: BuyerProfileSnapshot | null
  mode?: "onboarding" | "edit"
  onSaved?: (updated: BuyerProfileSnapshot) => void
}

type FormState = {
  display_name: string
  address_label: string
  city: string | null
  postcode: string | null
  longitude: number | null
  latitude: number | null
}

export function BuyerZoneForm({
  initial,
  mode = "onboarding",
  onSaved,
}: BuyerZoneFormProps) {
  const [state, setState] = useState<FormState>({
    display_name: initial?.display_name ?? "",
    address_label: initial?.address_label ?? "",
    city: initial?.city ?? null,
    postcode: initial?.postcode ?? null,
    longitude: null,
    latitude: null,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function handleSelect(sug: AddressSuggestion) {
    setState((s) => ({
      ...s,
      address_label: sug.label,
      city: sug.city,
      postcode: sug.postcode,
      longitude: sug.longitude,
      latitude: sug.latitude,
    }))
  }

  function handleSubmit(e: FormEvent) {
    void submit(e)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    if (state.address_label.trim().length < 5) {
      setError("Renseignez votre adresse pour continuer.")
      return
    }

    const payload: BuyerProfileUpsertInput = {
      address_label: state.address_label.trim(),
      ...(state.display_name.trim().length > 0
        ? { display_name: state.display_name.trim() }
        : {}),
      ...(state.city ? { city: state.city } : {}),
      ...(state.postcode ? { postcode: state.postcode } : {}),
      ...(state.longitude != null && state.latitude != null
        ? { longitude: state.longitude, latitude: state.latitude }
        : {}),
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/v1/me/buyer-profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null
        throw new Error(body?.error ?? "Enregistrement impossible, réessayez.")
      }
      const updated = (await res.json()) as BuyerProfileSnapshot
      setSaved(true)
      onSaved?.(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="buyer-name"
          className="font-body text-xs font-semibold uppercase tracking-[0.06em] text-cream-700"
        >
          Votre nom
        </label>
        <input
          id="buyer-name"
          type="text"
          value={state.display_name}
          onChange={(e) =>
            setState((s) => ({ ...s, display_name: e.target.value }))
          }
          placeholder="Prénom et nom"
          autoComplete="name"
          className="w-full rounded-md border-[1.5px] border-cream-300 bg-cream-50 px-3.5 py-3 text-sm text-cream-950 focus:border-green-600 focus:shadow-focus focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="buyer-address"
          className="font-body text-xs font-semibold uppercase tracking-[0.06em] text-cream-700"
        >
          Adresse de livraison
        </label>
        <AddressAutocomplete
          id="buyer-address"
          value={state.address_label}
          onChange={(v) =>
            setState((s) => ({
              ...s,
              address_label: v,
              // Reset des coords si l'utilisateur retape — il devra resélectionner.
              city: null,
              postcode: null,
              longitude: null,
              latitude: null,
            }))
          }
          onSelect={handleSelect}
          placeholder="14 rue de Lévis, 75017 Paris"
          required
          ariaLabel="Adresse de livraison"
        />
        <p className="font-body text-xs leading-relaxed text-cream-600">
          Adresse complétée via l&apos;API Adresse Gouv.fr. Votre adresse précise
          n&apos;est révélée au rameneur qu&apos;après votre confirmation de
          mission.
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="font-body text-sm text-rose"
          data-testid="buyer-zone-error"
        >
          {error}
        </p>
      ) : null}

      {saved && mode === "edit" ? (
        <p className="font-body text-sm text-green-700" data-testid="buyer-zone-saved">
          Zone enregistrée.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center rounded-pill bg-green-600 px-6 py-3.5 font-body text-sm font-semibold text-cream-50 shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting
          ? "Enregistrement…"
          : mode === "edit"
            ? "Enregistrer"
            : "Continuer"}
      </button>
    </form>
  )
}
