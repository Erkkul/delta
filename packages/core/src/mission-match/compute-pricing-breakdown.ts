/**
 * Répartition 85 % producteur / 10 % rameneur / 5 % plateforme (décision
 * produit 2026-05-01, cf. CLAUDE.md § Décisions clés). Affichage seul au
 * périmètre de KAN-31 (AC-07 breakdown financier) — le split Stripe réel
 * (`transfer_data`) est porté par le domaine paiement (ex-KAN-33/34).
 */
export const MISSION_SPLIT = {
  producer: 0.85,
  rameneur: 0.1,
  platform: 0.05,
} as const

export type MissionPricingBreakdown = {
  producerShareCents: number
  rameneurShareCents: number
  platformShareCents: number
}

/**
 * Calcule la répartition en centimes. `platformShareCents` absorbe l'écart
 * d'arrondi (producteur et rameneur arrondis à l'entier le plus proche,
 * plateforme = reste) pour que la somme des trois parts égale toujours
 * `totalCents` — jamais l'inverse, cohérent avec la maquette AC-07 (8,50 €
 * → 7,23 / 0,85 / 0,42).
 */
export function computeMissionPricingBreakdown(
  totalCents: number,
): MissionPricingBreakdown {
  const producerShareCents = Math.round(totalCents * MISSION_SPLIT.producer)
  const rameneurShareCents = Math.round(totalCents * MISSION_SPLIT.rameneur)
  const platformShareCents = totalCents - producerShareCents - rameneurShareCents
  return { producerShareCents, rameneurShareCents, platformShareCents }
}
