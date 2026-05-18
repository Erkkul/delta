"use client"

import {
  PRODUCT_CATEGORY_EMOJI,
  PRODUCT_CATEGORY_FR,
  PRODUCT_PACKAGING_FR,
  PRODUCT_PACKAGING_UNIT_SHORT,
  type ProductCategory,
  type ProductPackaging,
} from "@delta/contracts/product"

import { formatEuros } from "./format"

/**
 * Aperçu sticky droit (PR-05). Carte mockée vue acheteur dérivée du
 * state local du form parent.
 *
 * KAN-21 : `coverPhotoUrl` (= `photos[0]?.url`) remplace l'emoji fallback
 * quand au moins une photo est uploadée.
 */
export function ProductFormPreview({
  name,
  category,
  packaging,
  unitPriceCents,
  producerName,
  producerCity,
  coverPhotoUrl,
}: {
  name: string
  category: ProductCategory
  packaging: ProductPackaging
  unitPriceCents: number | null
  producerName: string
  producerCity: string | null
  coverPhotoUrl: string | null
}) {
  const emoji = PRODUCT_CATEGORY_EMOJI[category]
  const categoryLabel = PRODUCT_CATEGORY_FR[category]
  const packagingLabel = PRODUCT_PACKAGING_FR[packaging]
  const unitShort = PRODUCT_PACKAGING_UNIT_SHORT[packaging]
  const displayName = name.trim().length === 0 ? "Nom du produit" : name

  return (
    <aside className="hidden tablet:block">
      <div className="overflow-hidden rounded-lg border border-cream-200 bg-white shadow-card">
        <div className="border-b border-cream-200 bg-gradient-to-br from-green-50 to-cream-50 px-4 py-3.5">
          <div className="font-display text-xs font-bold uppercase tracking-wider text-green-800">
            👀 Aperçu voisin
          </div>
          <div className="mt-0.5 text-[11px] text-cream-500">
            Vue de votre produit côté acheteur
          </div>
        </div>
        <div className="p-4">
          <div className="overflow-hidden rounded-md border border-cream-200 bg-white shadow-card">
            <div className="relative flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br from-earth-100 to-earth-200">
              {coverPhotoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={coverPhotoUrl}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="select-none text-5xl opacity-70"
                >
                  {emoji}
                </span>
              )}
              <span className="absolute left-2 top-2 rounded-pill bg-earth-100/90 px-2 py-0.5 text-[10px] font-semibold text-earth-800">
                {emoji} {categoryLabel}
              </span>
            </div>
            <div className="p-3">
              <div className="truncate font-display text-sm font-semibold text-cream-950">
                {displayName}
              </div>
              <div className="mt-0.5 text-[11.5px] text-cream-600">
                {producerName}
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-[11px] text-cream-500">
                  {producerCity ? `📍 ${producerCity}` : null}
                </span>
                <div className="text-right">
                  <div className="font-display text-[15px] font-bold text-green-700">
                    {unitPriceCents != null && unitPriceCents > 0
                      ? formatEuros(unitPriceCents)
                      : "—"}
                  </div>
                  <div className="text-[10px] text-cream-500">
                    /{packagingLabel.toLowerCase()}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3.5 border-t border-cream-100 pt-3.5 text-[11.5px] leading-relaxed text-cream-500">
            <strong className="font-semibold text-green-800">
              Conseil :
            </strong>{" "}
            ajoutez une photo qui montre le produit en gros plan. Les
            fiches avec photos détaillées génèrent jusqu&apos;à{" "}
            <strong className="text-green-800">2,5×</strong> plus
            d&apos;envies qu&apos;une photo générique.
          </p>
          <p className="mt-2 text-[11px] text-cream-500">
            Unité : {unitShort}
          </p>
        </div>
      </div>
    </aside>
  )
}
