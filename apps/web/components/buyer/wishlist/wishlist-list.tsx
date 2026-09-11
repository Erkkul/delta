"use client"

import { PRODUCT_CATEGORY_EMOJI } from "@delta/contracts/product"
import { type WishlistItem } from "@delta/contracts/wishlist"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { formatPriceEur, packagingUnitLabel } from "@/lib/catalogue/format"

/**
 * Liste des envies (KAN-30 — AC-06). Rendu client pour gérer le retrait
 * optimiste. Chaque envie est en état `pending` au MVP (« En attente d'un
 * rameneur ») ; les états enrichis (match probable / à confirmer) viendront
 * du matching (KAN-42).
 */
export function WishlistList({ items }: { items: WishlistItem[] }) {
  const router = useRouter()
  const [list, setList] = useState(items)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  async function remove(productId: string) {
    if (removing) return
    setError(null)
    setRemoving(productId)
    const previous = list
    setList((l) => l.filter((i) => i.product.id !== productId)) // optimistic

    try {
      const res = await fetch(`/api/v1/wishlist/${productId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        setList(previous) // rollback
        setError("Le retrait a échoué, réessayez.")
        return
      }
      router.refresh()
    } catch {
      setList(previous) // rollback
      setError("Le retrait a échoué, réessayez.")
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p role="alert" className="font-body text-sm text-rose">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2.5">
        {list.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-2xl border border-cream-200 bg-white p-3.5"
          >
            <Link
              href={`/acheteur/catalogue/${item.product.id}`}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <span className="grid h-[60px] w-[60px] shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-green-100 to-green-200 text-3xl">
                {item.product.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.product.photo.url}
                    alt={item.product.photo.alt ?? item.product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span aria-hidden="true">
                    {PRODUCT_CATEGORY_EMOJI[item.product.category]}
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-[15px] font-bold leading-tight text-cream-950">
                  {item.product.name}
                </span>
                <span className="block truncate font-body text-xs text-cream-600">
                  {item.product.producer.display_name}
                  {item.product.producer.zone
                    ? ` · ${item.product.producer.zone}`
                    : ""}
                </span>
                <span className="mt-1 block font-body text-[11px] text-cream-500">
                  {formatPriceEur(item.product.unit_price_cents)}{" "}
                  {packagingUnitLabel(item.product.packaging)} · En attente
                  d&apos;un rameneur
                </span>
              </span>
            </Link>

            <button
              type="button"
              onClick={() => void remove(item.product.id)}
              disabled={removing === item.product.id}
              aria-label={`Retirer ${item.product.name} de mes envies`}
              className="shrink-0 rounded-full p-2 text-cream-500 transition-colors hover:text-rose disabled:opacity-50"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-4 w-4"
                aria-hidden="true"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-2 14H7L5 6" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
