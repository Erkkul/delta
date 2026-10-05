import { type MissionMatchDetail } from "@delta/contracts/mission-match"

import { type MissionMatchAdapter } from "./adapters"

/**
 * Use case `declineMissionMatch` (KAN-31 — action "Refuser cette mission" de
 * AC-07). Transition `pending → declined`, sans effet de bord sur le stock.
 *
 * Le comptage des refus et l'application éventuelle d'une pénalité
 * crescendo (D7, KAN-32 — avertissement au 2e refus du mois, suspension au
 * 3e) sont portés atomiquement par l'adapter (RPC `decline_mission_match`,
 * cf. packages/db/src/mission-match/repo.ts) : ce use case reste un simple
 * délégué, cf. specs/KAN-32/design.md.
 */
export async function declineMissionMatch(
  missionMatchId: string,
  buyerId: string,
  deps: MissionMatchAdapter,
): Promise<MissionMatchDetail> {
  return deps.decline(missionMatchId, buyerId)
}
