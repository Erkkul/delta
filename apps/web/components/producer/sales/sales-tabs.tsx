/**
 * Onglets de filtrage de la table des ventes (KAN-19 — PR-07).
 *
 * Au MVP, les 4 onglets sont rendus avec un compteur `(0)` et marqués
 * `aria-disabled` : aucune table ventes n'existe encore, donc aucun
 * filtrage à proposer. Les onglets restent visibles pour préserver la
 * structure de la maquette et signaler la fonctionnalité à venir.
 */
const TABS: ReadonlyArray<{ label: string }> = [
  { label: "Toutes les ventes" },
  { label: "En escrow" },
  { label: "Versées" },
  { label: "Litiges" },
]

export function SalesTabs() {
  return (
    <div
      role="tablist"
      aria-label="Filtrer les ventes par statut"
      className="mb-4 flex border-b border-cream-200"
      data-testid="sales-tabs"
    >
      {TABS.map((tab) => (
        <span
          key={tab.label}
          role="tab"
          aria-disabled="true"
          aria-selected="false"
          tabIndex={0}
          title="Disponible une fois vos premières ventes enregistrées"
          className="cursor-default border-b-2 border-transparent px-4 py-3 text-sm font-medium text-cream-500"
        >
          {tab.label} <span className="text-cream-400">(0)</span>
        </span>
      ))}
    </div>
  )
}
