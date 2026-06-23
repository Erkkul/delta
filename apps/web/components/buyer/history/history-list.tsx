/**
 * Liste de l'historique commandes acheteur (KAN-27 — AC-09).
 *
 * Au MVP : empty state pur. Les tables `missions` / `mission_buyers` /
 * `products` qui alimenteront la liste réelle sont livrées par KAN-10 /
 * KAN-11. Quand elles arriveront : regroupement par mois (divider +
 * total) et order-card (image produit, date, producteur, rameneur,
 * note, montant, facture PDF [KAN-36] / recommander) — documentés dans
 * la maquette `design/maquettes/acheteur/ac-09-historique.html`.
 */
import { EmptyState } from "@/components/dashboard/empty-state"
import { SectionCard } from "@/components/dashboard/section-card"

export function HistoryList() {
  return (
    <SectionCard title="Commandes">
      <EmptyState
        icon="🧾"
        text="Aucune commande pour l'instant. Vos commandes livrées apparaîtront ici."
      />
    </SectionCard>
  )
}
