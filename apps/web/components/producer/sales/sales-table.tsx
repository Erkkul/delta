/**
 * Section « Ventes » de la page historique producteur (KAN-19 — PR-07).
 *
 * Au MVP : empty state pur. Les tables `missions` / `mission_buyers` /
 * `products` qui alimenteront la liste réelle sont livrées par KAN-10 /
 * KAN-11. Les colonnes (Date / Produit·Mission / Rameneur / Acheteurs /
 * Brut / Vous (85 %) / Statut / Action) restent documentées dans la
 * maquette `design/maquettes/producteur/pr-07-historique-ventes.html`
 * pour câblage ultérieur.
 */
import { EmptyState } from "@/components/dashboard/empty-state"
import { SectionCard } from "@/components/dashboard/section-card"

export function SalesTable() {
  return (
    <SectionCard title="Ventes">
      <EmptyState
        icon="🧾"
        text="Aucune vente pour l'instant. Vos premières ventes apparaîtront ici une fois vos premières missions livrées."
      />
    </SectionCard>
  )
}
