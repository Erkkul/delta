"use client"

import Link from "next/link"

import { ProductCard, type ProductCardItem } from "./product-card"

/**
 * Grille des produits + état vide. Cohérent maquette PR-04.
 */
export function CatalogueList({
  items,
  hasFiltersApplied,
}: {
  items: ProductCardItem[]
  hasFiltersApplied: boolean
}) {
  if (items.length === 0) {
    if (hasFiltersApplied) {
      return (
        <div className="rounded-xl border-2 border-dashed border-cream-200 bg-white px-8 py-12 text-center">
          <div className="mb-3 text-5xl opacity-50" aria-hidden="true">
            🔎
          </div>
          <h2 className="mb-2 font-display text-xl font-bold text-green-900">
            Aucun produit ne correspond
          </h2>
          <p className="mx-auto max-w-md text-sm text-cream-600">
            Essayez un autre filtre ou un autre mot-clé. Vous pouvez aussi
            créer un nouveau produit pour enrichir votre catalogue.
          </p>
        </div>
      )
    }
    return (
      <div className="rounded-xl border-2 border-dashed border-cream-200 bg-white px-8 py-16 text-center">
        <div className="mb-3 text-6xl opacity-50" aria-hidden="true">
          🌱
        </div>
        <h2 className="mb-2 font-display text-2xl font-bold text-green-900">
          Votre catalogue est vide
        </h2>
        <p className="mx-auto mb-5 max-w-md text-sm leading-relaxed text-cream-600">
          Ajoutez votre premier produit pour commencer à apparaître dans les
          envies des voisins. Ça prend 2 minutes : un nom, un prix, un
          conditionnement.
        </p>
        <Link
          href="/producer/catalogue/nouveau"
          className="inline-flex h-11 items-center gap-2 rounded-pill bg-green-600 px-5 text-sm font-semibold text-white shadow-active transition-colors hover:bg-green-700"
        >
          <svg
            width={14}
            height={14}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Ajouter mon premier produit
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
      {items.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}
