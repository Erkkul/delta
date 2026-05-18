/**
 * Filtres secondaires de la table des ventes (KAN-19 — PR-07).
 *
 * Trois chips déroulants — période / produits / rameneurs — désactivés
 * au MVP tant qu'aucune vente n'existe.
 */
const FILTERS: ReadonlyArray<{ label: string }> = [
  { label: "Toutes périodes" },
  { label: "Tous produits" },
  { label: "Tous rameneurs" },
]

export function SalesFilters() {
  return (
    <div
      className="mb-4 flex flex-wrap gap-2"
      data-testid="sales-filters"
      role="group"
      aria-label="Filtres de la liste des ventes"
    >
      {FILTERS.map((filter) => (
        <button
          key={filter.label}
          type="button"
          disabled
          aria-disabled="true"
          title="Disponible une fois vos premières ventes enregistrées"
          className="flex cursor-not-allowed items-center gap-1.5 rounded-pill border border-cream-300 bg-white px-3.5 py-2 text-sm font-medium text-cream-500"
        >
          {filter.label}
          <svg
            viewBox="0 0 24 24"
            width={12}
            height={12}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      ))}
    </div>
  )
}
