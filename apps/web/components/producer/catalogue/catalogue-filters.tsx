"use client"

import { type ProductStatus } from "@delta/contracts/product"
import { useEffect, useState } from "react"

type Filter = "all" | ProductStatus | "sold_out"

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "Tous" },
  { key: "active", label: "Actifs" },
  { key: "draft", label: "Brouillons" },
  { key: "disabled", label: "Désactivés" },
  { key: "sold_out", label: "Épuisés" },
]

/**
 * Barre de filtres : tabs status + champ de recherche FTS (debounce 300 ms).
 * Cohérent maquette PR-04.
 */
export function CatalogueFilters({
  status,
  q,
  counts,
  onStatusChange,
  onSearchChange,
}: {
  status: Filter
  q: string
  counts: Record<Filter, number>
  onStatusChange: (next: Filter) => void
  onSearchChange: (next: string) => void
}) {
  const [draft, setDraft] = useState(q)

  // Sync externe (ex. reset depuis le parent)
  useEffect(() => {
    setDraft(q)
  }, [q])

  useEffect(() => {
    const t = setTimeout(() => {
      if (draft !== q) onSearchChange(draft)
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {FILTERS.map((f) => {
        const active = f.key === status
        // Le filtre « Épuisés » (KAN-23) prend une couleur orange en actif
        // pour rester cohérent avec le badge `epuise` de la carte (KAN-22).
        // Inactif : style neutre identique aux autres tabs.
        const isSoldOut = f.key === "sold_out"
        const activeClass = isSoldOut
          ? "inline-flex h-9 items-center gap-1.5 rounded-pill border border-orange-500 bg-orange-500 px-4 text-sm font-semibold text-white transition-colors"
          : "inline-flex h-9 items-center gap-1.5 rounded-pill border border-green-700 bg-green-700 px-4 text-sm font-semibold text-white transition-colors"
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => onStatusChange(f.key)}
            className={
              active
                ? activeClass
                : "inline-flex h-9 items-center gap-1.5 rounded-pill border border-cream-200 bg-white px-4 text-sm font-medium text-cream-700 transition-colors hover:border-green-300 hover:bg-green-50 hover:text-green-700"
            }
          >
            <span>{f.label}</span>
            <span
              className={
                active
                  ? "text-[11px] opacity-80"
                  : "text-[11px] font-normal opacity-70"
              }
            >
              ({counts[f.key]})
            </span>
          </button>
        )
      })}
      <div className="flex-1" />
      <label className="relative w-full max-w-[260px] tablet:w-60">
        <span className="sr-only">Rechercher un produit</span>
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cream-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
          />
        </svg>
        <input
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Rechercher un produit…"
          className="h-9 w-full rounded-pill border-[1.5px] border-cream-200 bg-white pl-9 pr-3.5 text-sm text-cream-950 outline-none transition-colors placeholder:text-cream-400 focus:border-green-400 focus:shadow-focus"
        />
      </label>
    </div>
  )
}

export type CatalogueFilter = Filter
