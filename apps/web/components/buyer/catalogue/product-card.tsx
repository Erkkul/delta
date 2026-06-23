import { type CataloguePublicProduct } from "@delta/contracts/catalogue"
import { PRODUCT_CATEGORY_EMOJI } from "@delta/contracts/product"
import Link from "next/link"

import { formatPriceEur, packagingUnitLabel } from "@/lib/catalogue/format"

/**
 * Carte produit du catalogue acheteur (KAN-28 — AC-03/AC-04).
 *
 * Badge trajet/match et bouton « ajouter aux envies » sont **différés**
 * (KAN-42 / KAN-30) : le cœur est rendu inerte, aucun badge trajet n'est
 * affiché tant que le matching n'existe pas. Cf. specs/KAN-28/proposal.md.
 */
export function ProductCard({ product }: { product: CataloguePublicProduct }) {
  return (
    <Link
      href={`/acheteur/catalogue/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white transition-shadow hover:shadow-lg"
    >
      <div className="relative h-32 bg-gradient-to-br from-green-100 to-green-200 md:h-40">
        {product.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.photo.url}
            alt={product.photo.alt ?? product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="absolute inset-0 grid place-items-center text-5xl"
          >
            {PRODUCT_CATEGORY_EMOJI[product.category]}
          </span>
        )}
        <span
          aria-disabled="true"
          title="Ajouter à mes envies — bientôt"
          className="absolute right-2 top-2 grid h-8 w-8 cursor-not-allowed place-items-center rounded-full bg-white/95 text-cream-400 shadow"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-4 w-4"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="font-display text-[15px] font-bold leading-tight text-cream-950">
          {product.name}
        </div>
        <div className="font-body text-xs text-cream-600">
          {product.producer.display_name}
          {product.producer.zone ? ` · ${product.producer.zone}` : ""}
        </div>
        <div className="mt-auto pt-2">
          <span className="font-display text-[15px] font-bold text-earth-800">
            {formatPriceEur(product.unit_price_cents)}
          </span>{" "}
          <span className="font-body text-[11px] font-medium text-cream-500">
            {packagingUnitLabel(product.packaging)}
          </span>
        </div>
      </div>
    </Link>
  )
}
