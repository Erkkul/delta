"use client"

import { useState } from "react"

/**
 * Modale de confirmation pour la suppression d'un produit (KAN-71).
 * Affichée uniquement en mode édition.
 */
export function ProductDeleteConfirm({
  open,
  productName,
  onCancel,
  onConfirm,
}: {
  open: boolean
  productName: string
  onCancel: () => void
  onConfirm: () => Promise<void> | void
}) {
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  async function handleConfirm() {
    if (submitting) return
    setSubmitting(true)
    try {
      await onConfirm()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-product-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-cream-950/40 px-4 py-6"
    >
      <div className="w-full max-w-md rounded-lg border border-cream-200 bg-white p-6 shadow-elevated">
        <h2
          id="delete-product-title"
          className="font-display text-xl font-bold text-green-900"
        >
          Supprimer ce produit ?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-cream-700">
          « {productName} » sera retiré de votre catalogue immédiatement et
          ne sera plus visible des acheteurs. Vous pourrez le rétablir
          pendant 30 jours en contactant le support.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 tablet:flex-row tablet:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="inline-flex h-10 items-center justify-center rounded-pill border-[1.5px] border-cream-200 bg-white px-5 text-sm font-semibold text-cream-700 transition-colors hover:bg-cream-50 disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={submitting}
            className="inline-flex h-10 items-center justify-center rounded-pill bg-[#C75B5B] px-5 text-sm font-semibold text-white shadow-active transition-colors hover:bg-[#A04646] disabled:opacity-60"
          >
            {submitting ? "Suppression…" : "Supprimer définitivement"}
          </button>
        </div>
      </div>
    </div>
  )
}
