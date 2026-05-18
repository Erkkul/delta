/**
 * KPIs financiers de la page « Ventes & virements » (KAN-19 — PR-07).
 *
 * Toutes les cards sont en `state="coming"` au MVP : aucune des sources
 * (missions, mission_buyers, payouts Stripe) n'est encore livrée. La
 * première card adopte un variant visuel atténué cohérent avec la
 * maquette (highlight vert) — au MVP, elle reste en empty state comme
 * les autres pour ne pas mocker des chiffres.
 */
import { KpiCard } from "@/components/dashboard/kpi-card"

export function SalesKpis() {
  return (
    <div
      className="mb-6 grid grid-cols-2 gap-3 tablet:grid-cols-4"
      data-testid="sales-kpis"
    >
      <KpiCard label="Revenus du mois" state="coming" />
      <KpiCard label="En attente (escrow)" state="coming" />
      <KpiCard label="Versé sur IBAN" state="coming" />
      <KpiCard label="Commission Delta" state="coming" />
    </div>
  )
}
