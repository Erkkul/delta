/**
 * Délai de confirmation par défaut (heures). Valeur PROPOSÉE, non tranchée
 * en décision produit — cf. produit/decisions/decisions_produit.md §
 * Bloquantes pour développement, et specs/KAN-31/proposal.md § Hypothèses.
 * Cohérente avec la valeur par défaut posée en DB
 * (`mission_buyers.confirmation_deadline`, migration
 * `20260911120000_create_missions.sql`).
 */
export const DEFAULT_MISSION_MATCH_CONFIRMATION_HOURS = 24

/**
 * Calcule la deadline de confirmation d'un match à partir de l'instant de
 * réservation de la mission. Fonction pure (cf. ARCHITECTURE.md §14.2) —
 * `reservedAt` est passé en paramètre plutôt que `new Date()` inline pour
 * rester testable.
 */
export function computeMissionConfirmationDeadline(
  reservedAt: Date,
  hours: number = DEFAULT_MISSION_MATCH_CONFIRMATION_HOURS,
): Date {
  return new Date(reservedAt.getTime() + hours * 60 * 60 * 1000)
}
