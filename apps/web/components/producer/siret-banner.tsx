import { type ProducerSiretStatus } from "@delta/db/types"
import Link from "next/link"

/**
 * Bandeau SIRET en tête du dashboard producteur (KAN-18 — PR-03).
 *
 * 4 variantes :
 *   - `verified` → masqué (pas de bandeau)
 *   - `pending`  → orange, info de vérification en cours
 *   - `rejected` → rouge, lien support pour corriger
 *   - `not_submitted` → orange, CTA vers l&apos;onboarding
 *
 * Rendu null si `verified`. Le banner reste visuellement non bloquant —
 * les produits du producteur sont quand même masqués au catalogue
 * acheteur tant que SIRET n&apos;est pas vérifié (gating RLS côté `products`
 * une fois KAN-20 livré).
 */
export function SiretBanner({
  status,
  rejectionReason,
}: {
  status: ProducerSiretStatus
  rejectionReason?: string | null
}) {
  if (status === "verified") return null

  if (status === "rejected") {
    return (
      <div
        role="status"
        className="mb-5 flex items-center gap-3 rounded-md border border-[#C75B5B] bg-[#FDEDEC] px-4 py-3 text-sm text-[#7A1F1F]"
      >
        <span aria-hidden="true" className="text-lg">
          ⚠
        </span>
        <div className="flex-1">
          <strong className="text-[#7A1F1F]">SIRET rejeté.</strong>{" "}
          {rejectionReason ??
            "Le numéro saisi n’a pas pu être validé par l’INSEE."}{" "}
          Reprenez l&apos;onboarding pour corriger.
        </div>
        <Link
          href="/onboarding/producteur"
          className="shrink-0 text-xs font-semibold text-[#7A1F1F] underline"
        >
          Corriger →
        </Link>
      </div>
    )
  }

  if (status === "not_submitted") {
    return (
      <div
        role="status"
        className="mb-5 flex items-center gap-3 rounded-md border border-earth-200 bg-earth-50 px-4 py-3 text-sm text-cream-700"
      >
        <span aria-hidden="true" className="text-lg text-earth-800">
          ⓘ
        </span>
        <div className="flex-1">
          <strong className="text-earth-800">SIRET à renseigner.</strong> Vos
          produits ne peuvent pas être publiés tant que votre SIRET n&apos;a
          pas été soumis.
        </div>
        <Link
          href="/onboarding/producteur"
          className="shrink-0 text-xs font-semibold text-earth-800 underline"
        >
          Compléter →
        </Link>
      </div>
    )
  }

  // pending
  return (
    <div
      role="status"
      className="mb-5 flex items-center gap-3 rounded-md border border-earth-200 bg-earth-50 px-4 py-3 text-sm text-cream-700"
    >
      <span aria-hidden="true" className="text-lg text-earth-800">
        ⏳
      </span>
      <div className="flex-1">
        <strong className="text-earth-800">
          SIRET en cours de vérification.
        </strong>{" "}
        Délai habituel ≤ 48 h. Vos produits restent invisibles côté acheteur
        tant que la vérification n&apos;est pas validée.
      </div>
    </div>
  )
}
