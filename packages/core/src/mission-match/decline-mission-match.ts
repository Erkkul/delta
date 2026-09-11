import { type MissionMatchDetail } from "@delta/contracts/mission-match"

import { type MissionMatchAdapter } from "./adapters"

/**
 * Use case `declineMissionMatch` (KAN-31 — action "Refuser cette mission" de
 * AC-07). Transition `pending → declined`, sans effet de bord sur le stock.
 *
 * Ne gère PAS les pénalités en cas de refus répété (D7, ex-KAN-32) — hors
 * scope KAN-31, cf. specs/KAN-31/proposal.md.
 */
export async function declineMissionMatch(
  missionMatchId: string,
  buyerId: string,
  deps: MissionMatchAdapter,
): Promise<MissionMatchDetail> {
  return deps.decline(missionMatchId, buyerId)
}
