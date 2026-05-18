import { type ReactNode } from "react"

/**
 * Card KPI utilisée dans le dashboard producteur (PR-03 — KAN-18) et
 * réutilisable pour les futurs dashboards acheteur / rameneur.
 *
 * Deux modes :
 *   - `value` : valeur chiffrée + meta optionnelle (utilisé quand la
 *     source de données existe, livré ticket par ticket).
 *   - `state="coming"` : placeholder « — » + meta « Disponible bientôt ».
 *     Mode par défaut au MVP pour les KPIs qui dépendent de tables
 *     non encore livrées (missions, products, payouts, reviews).
 */
export function KpiCard({
  label,
  value,
  meta,
  state = "value",
}: {
  label: string
  value?: ReactNode
  meta?: ReactNode
  state?: "value" | "coming"
}) {
  const isComing = state === "coming"
  return (
    <div className="rounded-lg border border-cream-200 bg-white p-4">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-cream-600">
        {label}
      </div>
      <div
        className={`font-display text-3xl font-bold leading-none ${
          isComing ? "text-cream-300" : "text-green-900"
        }`}
        aria-label={isComing ? "Donnée non disponible" : undefined}
      >
        {isComing ? "—" : value}
      </div>
      <div className="mt-1.5 text-xs text-cream-600">
        {isComing ? "Disponible bientôt" : meta}
      </div>
    </div>
  )
}
