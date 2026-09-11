"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

/**
 * Bouton « Ajouter / Retirer de mes envies » de la fiche produit (KAN-30 —
 * AC-05). Toggle optimiste vers `POST` / `DELETE /api/v1/wishlist`. L'état
 * initial (`initialInWishlist`) est lu server-side sur la page fiche pour
 * éviter un flash d'état incorrect.
 */
export function WishlistToggleButton({
  productId,
  initialInWishlist,
}: {
  productId: string
  initialInWishlist: boolean
}) {
  const router = useRouter()
  const [inWishlist, setInWishlist] = useState(initialInWishlist)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [, startTransition] = useTransition()

  async function toggle() {
    if (saving) return
    setError(null)
    setSaving(true)
    const next = !inWishlist
    setInWishlist(next) // optimistic

    try {
      const res = next
        ? await fetch("/api/v1/wishlist", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ productId }),
          })
        : await fetch(`/api/v1/wishlist/${productId}`, { method: "DELETE" })

      if (!res.ok) {
        setInWishlist(!next) // rollback
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null
        setError(data?.error ?? "Une erreur est survenue, réessayez.")
        return
      }
      startTransition(() => router.refresh())
    } catch {
      setInWishlist(!next) // rollback
      setError("Une erreur est survenue, réessayez.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-cream-100 pt-4">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={saving}
        aria-pressed={inWishlist}
        className={
          inWishlist
            ? "flex items-center justify-center gap-2 rounded-full border border-green-600 bg-green-50 px-5 py-3 font-body text-sm font-semibold text-green-700 transition-colors hover:bg-green-100 disabled:opacity-60"
            : "flex items-center justify-center gap-2 rounded-full bg-green-600 px-5 py-3 font-body text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-60"
        }
      >
        <svg
          viewBox="0 0 24 24"
          fill={inWishlist ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={2}
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        {inWishlist ? "Dans mes envies" : "Ajouter à mes envies"}
      </button>

      {error ? (
        <p role="alert" className="font-body text-xs text-rose">
          {error}
        </p>
      ) : (
        <p className="font-body text-xs text-cream-500">
          Vos envies restent privées. Vous serez prévenu·e lorsqu&apos;un
          rameneur pourra vous apporter ce produit.
        </p>
      )}
    </div>
  )
}
