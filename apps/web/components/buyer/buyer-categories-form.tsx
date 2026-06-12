"use client"

import { type BuyerProfileSnapshot } from "@delta/contracts/buyer-profile"
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_EMOJI,
  PRODUCT_CATEGORY_FR,
  type ProductCategory,
} from "@delta/contracts/product"
import { useState, type FormEvent } from "react"

/**
 * BuyerCategoriesForm (KAN-26) — sélection des catégories d'intérêt de
 * l'acheteur (AC-02 étape 2 « Qu'est-ce qui vous tente ? » + AC-11 ligne
 * « Catégories d'intérêt »).
 *
 * Source : maquette `design/maquettes/acheteur/ac-02-onboarding.html` (étape 2).
 * Les chips sont pilotés par l'enum `product_category` (libellés FR + emoji du
 * contrat), pas par la liste en dur de la maquette — voir specs/KAN-26/notes.md
 * (conflit de taxonomie maquette ↔ enum produit).
 *
 * Deux modes :
 *   - `onboarding` : CTA « Continuer » (appelle `onSaved` après PUT réussi)
 *   - `edit`       : CTA « Enregistrer » depuis les paramètres (KAN-84)
 *
 * La sélection vide est valide (« aucune préférence »).
 */

export type BuyerCategoriesFormProps = {
  initial: BuyerProfileSnapshot | null
  mode?: "onboarding" | "edit"
  onSaved?: (updated: BuyerProfileSnapshot) => void
}

export function BuyerCategoriesForm({
  initial,
  mode = "onboarding",
  onSaved,
}: BuyerCategoriesFormProps) {
  const [selected, setSelected] = useState<Set<ProductCategory>>(
    () => new Set(initial?.preferred_categories ?? []),
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function toggle(cat: ProductCategory) {
    setSaved(false)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  function handleSubmit(e: FormEvent) {
    void submit(e)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    setSubmitting(true)
    try {
      const res = await fetch("/api/v1/me/buyer-profile/categories", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ preferred_categories: [...selected] }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null
        throw new Error(body?.error ?? "Enregistrement impossible, réessayez.")
      }
      const updated = (await res.json()) as BuyerProfileSnapshot
      setSaved(true)
      onSaved?.(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div
        className="grid grid-cols-1 gap-2.5 mobile:grid-cols-2"
        role="group"
        aria-label="Catégories d'intérêt"
      >
        {PRODUCT_CATEGORIES.map((cat) => {
          const active = selected.has(cat)
          return (
            <button
              type="button"
              key={cat}
              onClick={() => toggle(cat)}
              aria-pressed={active}
              className={`flex items-center gap-2.5 rounded-xl border-[1.5px] px-3 py-3.5 text-left transition-colors ${
                active
                  ? "border-green-600 bg-green-50"
                  : "border-cream-200 bg-white hover:border-green-400 hover:bg-green-50"
              }`}
            >
              <span
                aria-hidden="true"
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg ${
                  active ? "bg-green-100" : "bg-earth-100"
                }`}
              >
                {PRODUCT_CATEGORY_EMOJI[cat]}
              </span>
              <span className="flex-1 font-body text-sm font-semibold text-cream-950">
                {PRODUCT_CATEGORY_FR[cat]}
              </span>
              <span
                aria-hidden="true"
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 text-[11px] font-bold text-white ${
                  active
                    ? "border-green-600 bg-green-600"
                    : "border-cream-300 bg-transparent"
                }`}
              >
                {active ? "✓" : ""}
              </span>
            </button>
          )
        })}
      </div>

      <p className="font-body text-xs leading-relaxed text-cream-600">
        Seuls les produits secs et agricoles non sensibles sont proposés au MVP
        (pas de frais ni d&apos;alcool). Vous pourrez tout voir dans le
        catalogue.
      </p>

      {error ? (
        <p
          role="alert"
          className="font-body text-sm text-rose"
          data-testid="buyer-categories-error"
        >
          {error}
        </p>
      ) : null}

      {saved && mode === "edit" ? (
        <p
          className="font-body text-sm text-green-700"
          data-testid="buyer-categories-saved"
        >
          Préférences enregistrées.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center rounded-pill bg-green-600 px-6 py-3.5 font-body text-sm font-semibold text-cream-50 shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting
          ? "Enregistrement…"
          : mode === "edit"
            ? "Enregistrer"
            : "Continuer"}
      </button>
    </form>
  )
}
