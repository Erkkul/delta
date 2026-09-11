import { type MissionMatchDetail } from "@delta/contracts/mission-match"

/**
 * Adapters pour les use cases mission-match (KAN-31). Suivent le pattern
 * `core/product/adapters.ts` : interface fine, implémentée côté
 * `apps/web/lib/mission-match/adapters.ts`.
 */

export type MissionMatchAdapter = {
  /** Détail d'un match pour son acheteur, `null` si introuvable / pas le sien. */
  findDetailForBuyer(
    missionMatchId: string,
    buyerId: string,
  ): Promise<MissionMatchDetail | null>

  /**
   * Confirme le match (transition `pending → accepted` + décrément stock
   * produit), atomique côté DB (fonction RPC `confirm_mission_match`).
   * Lève une erreur typée `core/mission-match/errors.ts` en cas d'échec.
   */
  confirm(missionMatchId: string, buyerId: string): Promise<MissionMatchDetail>

  /**
   * Refuse le match (transition `pending → declined`). Lève
   * `MissionMatchNotFoundError` ou `MissionMatchAlreadyRespondedError`.
   */
  decline(missionMatchId: string, buyerId: string): Promise<MissionMatchDetail>
}
