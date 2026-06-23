import {
  PRODUCT_CATEGORY_EMOJI,
  PRODUCT_CATEGORY_FR,
  PRODUCT_LABEL_FR,
  type ProductLabel,
} from "@delta/contracts/product"
import { catalogueRepo, mapCatalogueProduct } from "@delta/db/catalogue"
import Link from "next/link"
import { notFound } from "next/navigation"

import { formatPriceEur, packagingUnitLabel } from "@/lib/catalogue/format"
import { getServerSupabase } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

function isKnownLabel(label: string): label is ProductLabel {
  return label in PRODUCT_LABEL_FR
}

/**
 * Fiche produit acheteur (KAN-28 — AC-05).
 *
 * Lecture server-side directe via `catalogueRepo.getById` (vue publique) ;
 * 404 si le produit n'est pas visible. Gating session + rôle assuré par
 * `acheteur/layout.tsx`.
 *
 * Différés : bouton « Ajouter aux envies » (rendu inerte → KAN-30) et le
 * bloc « match / trajets » (KAN-42). Cf. specs/KAN-28/proposal.md.
 */
export default async function BuyerProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await getServerSupabase()
  const row = await catalogueRepo.getById(supabase, id)
  if (!row) notFound()

  const product = mapCatalogueProduct(row)
  const labels = product.labels.filter(isKnownLabel)

  return (
    <main className="mx-auto w-full max-w-[760px] px-5 py-6">
      <Link
        href="/acheteur/catalogue"
        className="mb-4 inline-flex font-body text-sm text-cream-600 hover:text-cream-950"
      >
        ← Retour au catalogue
      </Link>

      <div className="overflow-hidden rounded-2xl border border-cream-200 bg-white">
        <div className="relative h-56 bg-gradient-to-br from-green-100 to-green-200 md:h-72">
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
              className="absolute inset-0 grid place-items-center text-7xl"
            >
              {PRODUCT_CATEGORY_EMOJI[product.category]}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1">
            <span className="font-body text-xs font-semibold uppercase tracking-wide text-green-700">
              {PRODUCT_CATEGORY_FR[product.category]}
            </span>
            <h1 className="font-display text-2xl font-bold tracking-tight text-green-900">
              {product.name}
            </h1>
            <p className="font-body text-sm text-cream-600">
              {product.producer.display_name}
              {product.producer.zone ? ` · ${product.producer.zone}` : ""}
            </p>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="font-display text-2xl font-bold text-earth-800">
              {formatPriceEur(product.unit_price_cents)}
            </span>
            <span className="font-body text-sm font-medium text-cream-500">
              {packagingUnitLabel(product.packaging)}
            </span>
          </div>

          {labels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {labels.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-green-50 px-3 py-1 font-body text-xs font-medium text-green-700"
                >
                  {PRODUCT_LABEL_FR[label]}
                </span>
              ))}
            </div>
          )}

          {product.description && (
            <p className="font-body text-sm leading-relaxed text-cream-700">
              {product.description}
            </p>
          )}

          <div className="flex flex-col gap-2 border-t border-cream-100 pt-4">
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Ajouter à mes envies — bientôt"
              className="cursor-not-allowed rounded-full bg-cream-100 px-5 py-3 font-body text-sm font-semibold text-cream-400"
            >
              Ajouter à mes envies
            </button>
            <p className="font-body text-xs text-cream-500">
              Bientôt : ajoutez ce produit à vos envies et soyez prévenu·e
              lorsqu&apos;un rameneur peut vous l&apos;apporter.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
