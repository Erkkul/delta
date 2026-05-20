"use client"

import {
  PRODUCT_CATEGORY_EMOJI,
  PRODUCT_CATEGORY_FR,
  PRODUCT_LABEL_FR,
  PRODUCT_PACKAGING_FR,
  PRODUCT_PACKAGING_UNIT_SHORT,
  PRODUCT_STATUS_FR,
  type ProductCategory,
  type ProductLabel,
  type ProductPackaging,
  type ProductStatus,
} from "@delta/contracts/product"
import { getStockDisplayState } from "@delta/core/product"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

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
  labels: ProductLabel[]
  /** URL publique de la photo de couverture (`photos[0].url`) — KAN-21. */
  coverPhotoUrl: string | null
}

export function ProductCard({ product }: { product: ProductCardItem }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Click outside → ferme le menu
  useEffect(() => {
    if (!menuOpen) return
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [menuOpen])

  const emoji = PRODUCT_CATEGORY_EMOJI[product.category]
  const categoryLabel = PRODUCT_CATEGORY_FR[product.category]
  const packagingLabel = PRODUCT_PACKAGING_FR[product.packaging]
  const unitShort = PRODUCT_PACKAGING_UNIT_SHORT[product.packaging]

  const stockState = getStockDisplayState({
    stock: product.stock,
    low_stock_threshold: product.low_stock_threshold,
    status: product.status,
  })

  async function transitionTo(target: ProductStatus, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setMenuOpen(false)
    setPending(true)
    try {
      const res = await fetch(
        `/api/v1/producer/products/${product.id}/status`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: target }),
        },
      )
      if (res.ok) {
        router.refresh()
        return
      }
      const payload = (await res.json().catch(() => ({}))) as {
        code?: string
        details?: { reason?: string }
      }
      // Précondition manquante → ouvrir l'édition avec focus=publish.
      // Les autres erreurs sont rares (rôle / réseau / 5xx) et tombent
      // dans le fallback alert.
      if (
        payload.code === "PRODUCT_TRANSITION_INVALID" &&
        payload.details?.reason === "missing_preconditions"
      ) {
        router.push(`/producer/catalogue/${product.id}?focus=publish`)
        return
      }
      window.alert("Impossible de modifier le statut. Réessayez plus tard.")
    } catch {
      window.alert("Impossible de modifier le statut. Réessayez plus tard.")
    } finally {
      setPending(false)
    }
  }
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
        className={`relative flex h-[150px] items-center justify-center overflow-hidden bg-gradient-to-br ${gradientForCategory(product.category)}`}
      >
        {product.coverPhotoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={product.coverPhotoUrl}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            className="select-none text-6xl opacity-70"
            aria-hidden="true"
          >
            {emoji}
          </span>
        )}
        <span
          className={`absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider ${statusBadgeClass(displayStatus)}`}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-1.5 w-1.5 rounded-full ${statusDotClass(displayStatus)}`}
          />
          {statusBadgeLabel(displayStatus)}
        </span>
        {/* Menu kebab (KAN-23 — KAN-76) */}
        <div ref={menuRef} className="absolute right-2 top-2">
          <button
            type="button"
            aria-label="Actions sur ce produit"
            aria-expanded={menuOpen}
            disabled={pending}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setMenuOpen((v) => !v)
            }}
            className="grid h-7.5 w-7.5 min-h-[30px] min-w-[30px] place-items-center rounded-md bg-white/90 text-cream-700 backdrop-blur transition-colors hover:bg-white hover:text-green-700 disabled:opacity-50"
          >
            <svg
              width={16}
              height={16}
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx={5} cy={12} r={2} />
              <circle cx={12} cy={12} r={2} />
              <circle cx={19} cy={12} r={2} />
            </svg>
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-9 z-20 min-w-[180px] rounded-md border border-cream-200 bg-white py-1 shadow-elevated">
              {getQuickActions(product.status).map((a) =>
                a.kind === "divider" ? (
                  <div
                    key={a.id}
                    className="my-1 h-px bg-cream-100"
                    aria-hidden="true"
                  />
                ) : (
                  <button
                    key={a.id}
                    type="button"
                    onClick={(e) => {
                      void transitionTo(a.target, e)
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-cream-800 transition-colors hover:bg-green-50 hover:text-green-800"
                  >
                    {a.label}
                  </button>
                ),
              )}
              <div className="my-1 h-px bg-cream-100" aria-hidden="true" />
              <Link
                href={`/producer/catalogue/${product.id}`}
                onClick={(e) => e.stopPropagation()}
                className="block w-full px-3 py-2 text-left text-sm text-cream-800 transition-colors hover:bg-green-50 hover:text-green-800"
              >
                Modifier la fiche
              </Link>
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="font-display text-[15px] font-bold leading-tight text-cream-950">
          {product.name}
        </div>
        <div className="mt-1 text-xs text-cream-500">
          {emoji} {categoryLabel} · {packagingLabel}
        </div>
        {product.labels.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {product.labels.map((l) => (
              <span
                key={l}
                className="rounded-pill bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700"
              >
                {PRODUCT_LABEL_FR[l]}
              </span>
            ))}
          </div>
        ) : null}
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

type QuickAction =
  | { kind: "divider"; id: string }
  | {
      kind: "action"
      id: string
      label: string
      target: ProductStatus
    }

/**
 * Actions affichées dans le menu kebab selon le statut courant (KAN-23).
 * Trois max + ouverture de la fiche (séparée). Pour `sold_out`, on s'aligne
 * sur le statut DB sous-jacent (toujours `active`).
 */
function getQuickActions(status: ProductStatus): QuickAction[] {
  switch (status) {
    case "active":
      return [
        {
          kind: "action",
          id: "to-draft",
          label: "Mettre en brouillon",
          target: "draft",
        },
        {
          kind: "action",
          id: "to-disabled",
          label: "Désactiver",
          target: "disabled",
        },
      ]
    case "draft":
      return [
        {
          kind: "action",
          id: "to-active",
          label: "Publier",
          target: "active",
        },
        {
          kind: "action",
          id: "to-disabled",
          label: "Désactiver",
          target: "disabled",
        },
      ]
    case "disabled":
      return [
        {
          kind: "action",
          id: "to-active",
          label: "Réactiver",
          target: "active",
        },
        {
          kind: "action",
          id: "to-draft",
          label: "Mettre en brouillon",
          target: "draft",
        },
      ]
  }
}

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
