import { type MissionMatchDetail } from "@delta/contracts/mission-match"

import { type MissionMatchAdapter } from "./adapters"

/**
 * Use case `confirmMissionMatch` (KAN-31 — action "Confirmer" de AC-07).
 *
 * La transition (`pending → accepted`) et le décrément de stock associé
 * doivent être atomiques (ARCHITECTURE.md §6.3) : cette garantie est portée
 * par la fonction DB `confirm_mission_match` (transaction unique), pas par
 * ce use case. Le use case reste le point d'entrée unique côté domaine
 * (mockable en test) et l'endroit où loguer/étendre une éventuelle règle
 * métier future sans toucher aux route handlers.
 *
 * Ne déclenche PAS le paiement Stripe (hors scope KAN-31, cf.
 * specs/KAN-31/proposal.md § Hypothèses) : accepter le match seulement.
 */
export async function confirmMissionMatch(
  missionMatchId: string,
  buyerId: string,
  deps: MissionMatchAdapter,
): Promise<MissionMatchDetail> {
  return deps.confirm(missionMatchId, buyerId)
}
