/**
 * Pénalité acheteur crescendo (KAN-32, décision produit D7 — 2026-05-01).
 * Seuils et durée de suspension = valeurs PROPOSÉES, non tranchées en
 * décision produit (D7 dit elle-même "seuils précis à finaliser" ; cf.
 * produit/decisions/decisions_produit.md § Bloquantes pour développement,
 * et specs/KAN-32/proposal.md § Hypothèses). Même posture que
 * `DEFAULT_MISSION_MATCH_CONFIRMATION_HOURS` (KAN-31) : câblées en attendant
 * l'arbitrage produit.
 *
 * Ces constantes documentent la règle côté lecture humaine et sont
 * couvertes par des tests unitaires ; la fenêtre glissante elle-même
 * (comptage des refus sur le dernier mois) est calculée côté SQL dans la
 * fonction RPC `decline_mission_match` (migration
 * 20261005120000_buyer_penalty.sql) pour rester atomique avec l'écriture du
 * refus — à garder synchronisée avec ces valeurs si le produit tranche
 * d'autres seuils.
 */
export const BUYER_PENALTY_WARNING_THRESHOLD = 2
export const BUYER_PENALTY_SUSPENSION_THRESHOLD = 3
export const BUYER_PENALTY_SUSPENSION_DURATION_DAYS = 14

export type BuyerPenaltyOutcome =
  | { kind: "none" }
  | { kind: "warning" }
  | { kind: "suspension"; suspendedUntil: Date }

/**
 * Détermine l'effet d'un refus de match sur la base du nombre de refus de
 * l'acheteur dans la fenêtre glissante (refus qui vient d'être écrit
 * inclus). Fonction pure (cf. ARCHITECTURE.md §14.2) — `now` est passé en
 * paramètre plutôt que `new Date()` inline pour rester testable.
 */
export function computeBuyerPenaltyOutcome(
  declineCountInWindow: number,
  now: Date,
): BuyerPenaltyOutcome {
  if (declineCountInWindow >= BUYER_PENALTY_SUSPENSION_THRESHOLD) {
    return {
      kind: "suspension",
      suspendedUntil: new Date(
        now.getTime() + BUYER_PENALTY_SUSPENSION_DURATION_DAYS * 24 * 60 * 60 * 1000,
      ),
    }
  }
  if (declineCountInWindow === BUYER_PENALTY_WARNING_THRESHOLD) {
    return { kind: "warning" }
  }
  return { kind: "none" }
}

/** Un acheteur est suspendu si `suspended_until` est une date future. */
export function isBuyerSuspended(
  suspendedUntil: string | null,
  now: Date,
): boolean {
  if (!suspendedUntil) return false
  return new Date(suspendedUntil).getTime() > now.getTime()
}
