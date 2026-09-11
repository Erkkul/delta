import { type SupabaseClient } from "@supabase/supabase-js"

import {
  type Database,
  type MissionBuyerRow,
  type MissionMatchDetailViewRow,
} from "../types"

type Client = SupabaseClient<Database>

const DETAIL_COLUMNS =
  "id, buyer_id, status, confirmation_deadline, responded_at, quantity, unit_price_cents, product_id, product_name, producer_user_id, producer_display_name, producer_zone, rameneur_user_id, rameneur_display_name, origin_label, destination_label, depart_date"

/** Postgres error codes levés par la fonction RPC `confirm_mission_match`. */
export const CONFIRM_MISSION_MATCH_PG_CODES = {
  AlreadyResponded: "P0001",
  NotFound: "P0002",
  Expired: "P0003",
  OutOfStock: "P0004",
} as const

export class MissionMatchNotFoundDbError extends Error {}
export class MissionMatchAlreadyRespondedDbError extends Error {}
export class MissionMatchExpiredDbError extends Error {}
export class MissionMatchOutOfStockDbError extends Error {}

/**
 * Repo mission-match (KAN-31). Caller : toujours le client utilisateur — la
 * vue `mission_match_details` embarque son propre prédicat d'autorisation
 * (`buyer_id = auth.uid()`, cf. migration 20260911120000), et
 * `mission_buyers` a la RLS self-only classique.
 */
export const missionMatchRepo = {
  /**
   * Détail composé d'un match pour son acheteur. `null` si introuvable ou
   * si `missionMatchId` n'appartient pas au `buyerId` (la vue ne renvoie de
   * toute façon que les rows du caller courant).
   */
  async findDetailForBuyer(
    client: Client,
    missionMatchId: string,
    buyerId: string,
  ): Promise<MissionMatchDetailViewRow | null> {
    const { data, error } = await client
      .from("mission_match_details")
      .select(DETAIL_COLUMNS)
      .eq("id", missionMatchId)
      .eq("buyer_id", buyerId)
      .maybeSingle()
    if (error) throw error
    return data ?? null
  },

  /**
   * Confirme le match via la fonction RPC atomique `confirm_mission_match`
   * (transition + décrément stock, cf. migration). Traduit les codes
   * Postgres `P0001..P0004` en erreurs DB typées — le mapping vers les
   * erreurs `core/mission-match/errors.ts` se fait côté adapter web.
   */
  async confirm(
    client: Client,
    missionMatchId: string,
  ): Promise<MissionBuyerRow> {
    const { data, error } = await client.rpc("confirm_mission_match", {
      p_mission_buyer_id: missionMatchId,
    })
    if (error) {
      switch (error.code) {
        case CONFIRM_MISSION_MATCH_PG_CODES.NotFound:
          throw new MissionMatchNotFoundDbError(error.message)
        case CONFIRM_MISSION_MATCH_PG_CODES.AlreadyResponded:
          throw new MissionMatchAlreadyRespondedDbError(error.message)
        case CONFIRM_MISSION_MATCH_PG_CODES.Expired:
          throw new MissionMatchExpiredDbError(error.message)
        case CONFIRM_MISSION_MATCH_PG_CODES.OutOfStock:
          throw new MissionMatchOutOfStockDbError(error.message)
        default:
          throw error
      }
    }
    return data
  },

  /**
   * Refuse le match : UPDATE conditionnel `WHERE status = 'pending'`. Si
   * aucune row n'est retournée, une lecture de suivi distingue "introuvable"
   * de "déjà répondu" (le caller lève l'erreur typée adéquate).
   */
  async decline(
    client: Client,
    missionMatchId: string,
    buyerId: string,
  ): Promise<MissionBuyerRow> {
    const { data, error } = await client
      .from("mission_buyers")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", missionMatchId)
      .eq("buyer_id", buyerId)
      .eq("status", "pending")
      .select("*")
      .maybeSingle()
    if (error) throw error
    if (data) return data

    const { data: existing, error: findError } = await client
      .from("mission_buyers")
      .select("*")
      .eq("id", missionMatchId)
      .eq("buyer_id", buyerId)
      .maybeSingle()
    if (findError) throw findError
    if (!existing) throw new MissionMatchNotFoundDbError()
    throw new MissionMatchAlreadyRespondedDbError()
  },

  /**
   * Sweep d'expiration (job Inngest cron, cf. packages/jobs). Caller :
   * client admin (bypass RLS) — opère sur tous les acheteurs, pas juste
   * l'appelant courant. Renvoie le nombre de rows expirées.
   */
  async expirePendingPastDeadline(client: Client, now: Date): Promise<number> {
    const { data, error } = await client
      .from("mission_buyers")
      .update({ status: "expired" })
      .eq("status", "pending")
      .lt("confirmation_deadline", now.toISOString())
      .select("id")
    if (error) throw error
    return data?.length ?? 0
  },
}
