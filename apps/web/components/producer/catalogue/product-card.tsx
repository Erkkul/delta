"use client"

import {
  PRODUCT_CATEGORY_EMOJI,
  PRODUCT_CATEGORY_FR,
  PRODUCT_PACKAGING_FR,
  PRODUCT_PACKAGING_UNIT_SHORT,
  PRODUCT_STATUS_FR,
  type ProductCategory,
  type ProductPackaging,
  type ProductStatus,
} from "@delta/contracts/product"
import { getStockDisplayState } from "@delta/core/product"
import Link from "next/link"

import { formatEuros } from "./format"

/**
 * Carte produit dans la grille catalogue (PR-04).
 *
 * Maquette : visuel + emoji catégorie + status badge (top-left) + nom +
 * catégorie + prix + stock + fenêtre de disponibilité.
 *
 * Au MVP de KAN-20, les compteurs « Envies » / « Vendus » de la maquette
 * ne sont pas câblés (KAN-30 wishlist + KAN-19 ventes) — on ne les rend
 * pas pour éviter d'introduire des `—` non informatifs.
 *
 * KAN-22 : badge `epuise` quand `stock = 0 && status = 'active'` (dérivé,
 * pas une valeur enum) ; libellé stock barré pour `empty`, orange pour `low`.
 */
export type ProductCardItem = {
  id: string
  name: string
  category: ProductCategory
  packaging: ProductPackaging
  unit_price_cents: number
  stock: number
  low_stock_threshold: number | null
  availability_from: string | null
  availability_to: string | null
  status: ProductStatus
}

export function ProductCard({ product }: { product: ProductCardItem }) {
  const emoji = PRODUCT_CATEGORY_EMOJI[product.category]
  const categoryLabel = PRODUCT_CATEGORY_FR[product.category]
  const packagingLabel = PRODUCT_PACKAGING_FR[product.packaging]
  const unitShort = PRODUCT_PACKAGING_UNIT_SHORT[product.packaging]

  const stockState = getStockDisplayState({
    stock: product.stock,
    low_stock_threshold: product.low_stock_threshold,
    status: product.status,
  })
  const stockLabel =
    stockState.kind === "empty"
      ? "Épuisé"
      : stockState.kind === "low"
        ? `⚠ ${product.stock} en stock`
        : `${product.stock} en stock`
  const stockClass =
    stockState.kind === "empty"
      ? "text-cream-500 line-through"
      : stockState.kind === "low"
        ? "text-orange-500"
        : "text-cream-700"

  const displayStatus: ProductStatus | "sold_out" = stockState.showSoldOutBadge
    ? "sold_out"
    : product.status

  const availabilityLabel = formatAvailability(
    product.availability_from,
    product.availability_to,
  )

  const dimClass =
    product.status === "draft"
      ? "opacity-85"
      : product.status === "disabled"
        ? "opacity-65"
        : ""

  return (
    <Link
      href={`/producer/catalogue/${product.id}`}
      className={`group flex flex-col overflow-hidden rounded-lg border border-cream-200 bg-white transition-all hover:-translate-y-0.5 hover:border-green-300 hover:shadow-elevated ${dimClass}`}
    >
      <div
        className={`relative flex h-[150px] items-center justify-center bg-gradient-to-br ${gradientForCategory(product.category)}`}
      >
        <span className="select-none text-6xl opacity-70" aria-hidden="true">
          {emoji}
        </span>
        <span
          className={`absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider ${statusBadgeClass(displayStatus)}`}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-1.5 w-1.5 rounded-full ${statusDotClass(displayStatus)}`}
          />
          {statusBadgeLabel(displayStatus)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="font-display text-[15px] font-bold leading-tight text-cream-950">
          {product.name}
        </div>
        <div className="mt-1 text-xs text-cream-500">
          {emoji} {categoryLabel} · {packagingLabel}
        </div>
        <div className="mt-2.5 flex items-baseline justify-between rounded-md bg-cream-50 px-3 py-2">
          <span className="font-display text-lg font-bold text-green-700">
            {formatEuros(product.unit_price_cents)}
            <span className="ml-0.5 text-xs font-normal text-cream-500">
              /{unitShort}
            </span>
          </span>
          <span className={`text-xs font-semibold ${stockClass}`}>
            {stockLabel}
          </span>
        </div>
        {availabilityLabel ? (
          <div className="mt-2 text-[11.5px] text-cream-500">
            📅 {availabilityLabel}
          </div>
        ) : null}
      </div>
    </Link>
  )
}

type DisplayStatus = ProductStatus | "sold_out"

function statusBadgeLabel(status: DisplayStatus): string {
  if (status === "sold_out") return "Épuisé"
  return PRODUCT_STATUS_FR[status]
}

function statusBadgeClass(status: DisplayStatus): string {
  switch (status) {
    case "active":
      return "border-green-200 bg-green-100 text-green-800"
    case "sold_out":
      return "border-orange-200 bg-orange-50 text-orange-600"
    case "draft":
      return "border-cream-300 bg-cream-100 text-cream-700"
    case "disabled":
      return "border-cream-300 bg-cream-100 text-cream-600"
  }
}

function statusDotClass(status: DisplayStatus): string {
  switch (status) {
    case "active":
      return "bg-green-600"
    case "sold_out":
      return "bg-orange-500"
    case "draft":
      return "bg-cream-500"
    case "disabled":
      return "bg-cream-500"
  }
}

function gradientForCategory(category: ProductCategory): string {
  switch (category) {
    case "miel_et_ruche":
      return "from-earth-100 to-earth-200"
    case "fruits":
      return "from-earth-100 to-earth-200"
    case "legumes":
      return "from-green-100 to-green-200"
    case "cereales_legumineuses":
      return "from-cream-200 to-earth-100"
    case "conserves_confitures":
      return "from-earth-200 to-cream-200"
    case "pain_biscuits":
      return "from-earth-100 to-earth-200"
    case "huiles":
      return "from-green-100 to-earth-100"
    case "boissons_non_alcoolisees":
      return "from-cream-200 to-green-100"
  }
}

function formatAvailability(
  from: string | null,
  to: string | null,
): string | null {
  if (!from && !to) return "Disponible toute l'année"
  const fmt = (s: string) => {
    const [y, m, d] = s.split("-")
    if (!y || !m || !d) return s
    const date = new Date(`${y}-${m}-${d}T00:00:00Z`)
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
    }).format(date)
  }
  if (from && !to) return `Disponible dès le ${fmt(from)}`
  if (!from && to) return `Disponible jusqu'au ${fmt(to)}`
  return `Disponible du ${fmt(from!)} au ${fmt(to!)}`
}
