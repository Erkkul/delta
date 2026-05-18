import { type ReactNode } from "react"

/**
 * Empty state utilisé dans chaque section du dashboard tant que sa
 * source de données n'est pas livrée. Microcopy strictement orientée
 * utilisateur — jamais de référence à un ticket interne.
 */
export function EmptyState({
  icon,
  text,
}: {
  icon: ReactNode
  text: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-cream-50 px-4 py-5 text-sm text-cream-700">
      <div
        aria-hidden="true"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white text-base text-cream-500"
      >
        {icon}
      </div>
      <p>{text}</p>
    </div>
  )
}
