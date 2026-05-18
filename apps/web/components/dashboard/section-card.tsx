import { type ReactNode } from "react"

/**
 * Container blanc pour une section du dashboard producteur (et futurs
 * dashboards). Header avec titre + lien d'action droit optionnel, slot
 * enfants pour le contenu (souvent un `<EmptyState />` au MVP).
 */
export function SectionCard({
  title,
  actionHref,
  actionLabel,
  children,
}: {
  title: string
  actionHref?: string
  actionLabel?: string
  children: ReactNode
}) {
  return (
    <section className="mb-6 rounded-lg border border-cream-200 bg-white p-5">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-green-900">
          {title}
        </h2>
        {actionHref && actionLabel ? (
          <a
            href={actionHref}
            className="text-xs font-medium text-green-700 hover:text-green-800"
          >
            {actionLabel}
          </a>
        ) : null}
      </header>
      {children}
    </section>
  )
}
