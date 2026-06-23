"use client"

import {
  type CataloguePage,
  type CataloguePublicProduct,
} from "@delta/contracts/catalogue"
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_FR,
  type ProductCategory,
} from "@delta/contracts/product"
import { useCallback, useEffect, useRef, useState } from "react"

import { ProductCard } from "./product-card"

/** Filtres différés (KAN-42 matching / KAN-30) — rendus inertes. */
const DEFERRED_FILTERS = [
  "📍 Zone d'origine",
  "🚐 Trajet actif",
  "📅 Disponibilité",
  "🚜 Producteur",
]

type Props = {
  initialItems: CataloguePublicProduct[]
  initialNextCursor: string | null
}

async function fetchCatalogue(params: {
  q?: string
  category?: ProductCategory | null
  cursor?: string | null
}): Promise<CataloguePage> {
  const search = new URLSearchParams()
  if (params.q) search.set("q", params.q)
  if (params.category) search.set("category", params.category)
  if (params.cursor) search.set("cursor", params.cursor)
  const res = await fetch(`/api/v1/catalogue?${search.toString()}`)
  if (!res.ok) throw new Error("catalogue fetch failed")
  return (await res.json()) as CataloguePage
}

/**
 * Catalogue parcourable interactif (KAN-28 — AC-04).
 *
 * Rendu initial server-side (props), puis recherche FTS + filtre catégorie +
 * pagination « charger plus » via `GET /api/v1/catalogue`. Les filtres
 * zone / trajet / disponibilité / producteur sont **différés** (KAN-42) et
 * rendus désactivés.
 */
export function CatalogueBrowser({ initialItems, initialNextCursor }: Props) {
  const [q, setQ] = useState("")
  const [category, setCategory] = useState<ProductCategory | null>(null)
  const [items, setItems] = useState(initialItems)
  const [nextCursor, setNextCursor] = useState(initialNextCursor)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const firstRun = useRef(true)

  const runSearch = useCallback(
    async (nextQ: string, nextCategory: ProductCategory | null) => {
      setLoading(true)
      setError(false)
      try {
        const page = await fetchCatalogue({ q: nextQ, category: nextCategory })
        setItems(page.items)
        setNextCursor(page.nextCursor)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  // Recherche + filtre catégorie (debounce 350 ms). Skip au montage initial.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    const handle = setTimeout(() => {
      void runSearch(q.trim(), category)
    }, 350)
    return () => clearTimeout(handle)
  }, [q, category, runSearch])

  async function loadMore() {
    if (!nextCursor || loading) return
    setLoading(true)
    setError(false)
    try {
      const page = await fetchCatalogue({ q: q.trim(), category, cursor: nextCursor })
      setItems((prev) => [...prev, ...page.items])
      setNextCursor(page.nextCursor)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 rounded-2xl border border-cream-200 bg-white px-4 py-3">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-[18px] w-[18px] text-cream-500"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un produit ou un producteur…"
          aria-label="Rechercher dans le catalogue"
          className="flex-1 bg-transparent font-body text-[15px] text-cream-950 outline-none placeholder:text-cream-500"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <CategoryChip
          label="Toutes catégories"
          active={category === null}
          onClick={() => setCategory(null)}
        />
        {PRODUCT_CATEGORIES.map((cat) => (
          <CategoryChip
            key={cat}
            label={PRODUCT_CATEGORY_FR[cat]}
            active={category === cat}
            onClick={() => setCategory(cat)}
          />
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {DEFERRED_FILTERS.map((label) => (
          <span
            key={label}
            aria-disabled="true"
            title="Disponible bientôt"
            className="flex flex-shrink-0 cursor-not-allowed items-center gap-1.5 whitespace-nowrap rounded-full border border-cream-200 bg-cream-50 px-3.5 py-2 font-body text-[13px] font-medium text-cream-400"
          >
            {label}
          </span>
        ))}
      </div>

      <p className="font-body text-[13px] text-cream-600" aria-live="polite">
        <strong className="font-bold text-cream-950">
          {items.length}
          {nextCursor ? "+" : ""} produit{items.length > 1 ? "s" : ""}
        </strong>{" "}
        matchable{items.length > 1 ? "s" : ""}
      </p>

      {error && (
        <p className="font-body text-sm text-rose" role="alert">
          Le catalogue n&apos;a pas pu être chargé. Réessayez.
        </p>
      )}

      {items.length === 0 && !loading ? (
        <div className="rounded-2xl border border-cream-200 bg-white px-6 py-12 text-center">
          <p className="font-body text-sm text-cream-600">
            Aucun produit ne correspond à votre recherche pour l&apos;instant.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {nextCursor && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            className="rounded-full bg-green-700 px-5 py-2.5 font-body text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:opacity-60"
          >
            {loading ? "Chargement…" : "Charger plus"}
          </button>
        </div>
      )}
    </div>
  )
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 font-body text-[13px] font-medium transition-colors ${
        active
          ? "border-green-700 bg-green-700 text-white"
          : "border-cream-300 bg-white text-cream-700 hover:border-green-300"
      }`}
    >
      {label}
    </button>
  )
}
