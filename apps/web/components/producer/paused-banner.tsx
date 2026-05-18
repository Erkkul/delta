import Link from "next/link"

/**
 * Bandeau « Boutique en pause » visible quand `producers.paused = true`
 * (KAN-18). Rappelle au producteur que ses produits sont masqués côté
 * catalogue acheteur et propose un raccourci vers le toggle Paramètres.
 */
export function PausedBanner() {
  return (
    <div
      role="status"
      className="mb-5 flex items-center gap-3 rounded-md border border-cream-300 bg-cream-100 px-4 py-3 text-sm text-cream-700"
    >
      <span aria-hidden="true" className="text-lg">
        ⏸
      </span>
      <div className="flex-1">
        <strong className="text-cream-950">Boutique en pause.</strong> Vos
        produits ne sont pas visibles côté acheteur. Vous pouvez la réactiver
        depuis vos paramètres.
      </div>
      <Link
        href="/producer/settings"
        className="shrink-0 text-xs font-semibold text-green-700 underline"
      >
        Paramètres →
      </Link>
    </div>
  )
}
