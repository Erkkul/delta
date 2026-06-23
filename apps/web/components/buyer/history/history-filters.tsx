/**
 * Filtres de l'historique commandes acheteur (KAN-27 — AC-09).
 *
 * Chips période / producteur / catégorie + action « Exporter CSV »,
 * tous désactivés au MVP tant qu'aucune commande n'existe. Microcopy
 * du tooltip strictement orientée utilisateur.
 */
const FILTERS: ReadonlyArray<{ label: string }> = [
  { label: "Cette année" },
  { label: "Tous producteurs" },
  { label: "Toutes catégories" },
]

export function HistoryFilters() {
  return (
    <div
      className="mb-6 flex flex-wrap gap-2"
      data-testid="history-filters"
      role="group"
      aria-label="Filtres de l'historique des commandes"
    >
      {FILTERS.map((filter) => (
        <button
          key={filter.label}
          type="button"
          disabled
          aria-disabled="true"
          title="Disponible une fois vos premières commandes enregistrées"
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
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Disponible une fois vos premières commandes enregistrées"
        className="flex cursor-not-allowed items-center gap-1.5 rounded-pill border border-cream-300 bg-white px-3.5 py-2 text-sm font-medium text-cream-500"
      >
        <svg
          viewBox="0 0 24 24"
          width={14}
          height={14}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Exporter CSV
      </button>
    </div>
  )
}
