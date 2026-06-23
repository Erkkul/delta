/**
 * Cartes de synthèse de l'historique commandes acheteur (KAN-27 — AC-09).
 *
 * Toutes les cards sont en `state="coming"` au MVP : aucune des sources
 * (missions, mission_buyers, paiements, trips) n'est encore livrée. La
 * maquette montre des chiffres (14 commandes / 421 € / 186 km) — non
 * repris pour ne pas mocker de données. Se câbleront quand KAN-10 /
 * KAN-11 / KAN-33-34 arriveront.
 */
import { KpiCard } from "@/components/dashboard/kpi-card"

export function HistoryStats() {
  return (
    <div
      className="mb-6 grid grid-cols-1 gap-3 tablet:grid-cols-3"
      data-testid="history-stats"
    >
      <KpiCard label="Commandes" state="coming" />
      <KpiCard label="Total dépensé" state="coming" />
      <KpiCard label="Km évités" state="coming" />
    </div>
  )
}
