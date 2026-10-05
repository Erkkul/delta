import { type SupabaseClient } from "@supabase/supabase-js"

import {
  type Database,
  type MissionBuyerRow,
  type MissionMatchDetailViewRow,
} from "../types"

type Client = SupabaseClient<Database>

const DETAIL_COLUMNS =
  "id, buyer_id, status, confirmation_deadline, responded_at, quantity, unit_price_cents, product_id, product_name, producer_user_id, producer_display_name, producer_zone, rameneur_user_id, rameneur_display_name, origin_label, destination_label, depart_date"

/**
 * Postgres error codes levés par les fonctions RPC `confirm_mission_match`
 * et `decline_mission_match` (P0001/P0002 partagés entre les deux, cf.
 * migrations 20260911120000 et 20261005120000_buyer_penalty).
 */
export const CONFIRM_MISSION_MATCH_PG_CODES = {
  AlreadyResponded: "P0001",
  NotFound: "P0002",
  Expired: "P0003",
  OutOfStock: "P0004",
  /** KAN-32 — acheteur suspendu (pénalité D7). */
  BuyerSuspended: "P0005",
} as const

export const DECLINE_MISSION_MATCH_PG_CODES = {
  AlreadyResponded: "P0001",
  NotFound: "P0002",
} as const

export class MissionMatchNotFoundDbError extends Error {}
export class MissionMatchAlreadyRespondedDbError extends Error {}
export class MissionMatchExpiredDbError extends Error {}
export class MissionMatchOutOfStockDbError extends Error {}
/** KAN-32 — levée par `confirm_mission_match` quand `users.suspended_until` est dans le futur. */
export class MissionMatchBuyerSuspendedDbError extends Error {}

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
        case CONFIRM_MISSION_MATCH_PG_CODES.BuyerSuspended:
          throw new MissionMatchBuyerSuspendedDbError(error.message)
        default:
          throw error
      }
    }
    return data
  },

  /**
   * Refuse le match via la fonction RPC atomique `decline_mission_match`
   * (KAN-32 — transition + comptage des refus + pénalité crescendo D7
   * éventuelle dans la même transaction, migration
   * 20261005120000_buyer_penalty.sql). Remplace l'UPDATE self direct de
   * KAN-31 : la policy `mission_buyers_update_self` a été supprimée pour
   * qu'aucun chemin ne puisse contourner le comptage de pénalité.
   */
  async decline(
    client: Client,
    missionMatchId: string,
  ): Promise<MissionBuyerRow> {
    const { data, error } = await client.rpc("decline_mission_match", {
      p_mission_buyer_id: missionMatchId,
    })
    if (error) {
      switch (error.code) {
        case DECLINE_MISSION_MATCH_PG_CODES.NotFound:
          throw new MissionMatchNotFoundDbError(error.message)
        case DECLINE_MISSION_MATCH_PG_CODES.AlreadyResponded:
          throw new MissionMatchAlreadyRespondedDbError(error.message)
        default:
          throw error
      }
    }
    return data
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
