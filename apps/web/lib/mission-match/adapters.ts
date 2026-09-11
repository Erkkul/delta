import { type MissionMatchDetail } from "@delta/contracts/mission-match"
import {
  type ExpirePendingMissionMatchesDeps,
  type MissionMatchAdapter,
  MissionMatchAlreadyRespondedError,
  MissionMatchExpiredError,
  MissionMatchNotFoundError,
  MissionMatchOutOfStockError,
  computeMissionPricingBreakdown,
} from "@delta/core/mission-match"
import {
  MissionMatchAlreadyRespondedDbError,
  MissionMatchExpiredDbError,
  MissionMatchNotFoundDbError,
  MissionMatchOutOfStockDbError,
  missionMatchRepo,
} from "@delta/db/mission-match"
import { type Database, type MissionMatchDetailViewRow } from "@delta/db/types"
import { type SupabaseClient } from "@supabase/supabase-js"

type Client = SupabaseClient<Database>

const FALLBACK_RAMENEUR_NAME = "Un rameneur Delta"

function toDetail(row: MissionMatchDetailViewRow): MissionMatchDetail {
  const totalCents = row.unit_price_cents * row.quantity
  return {
    id: row.id,
    status: row.status,
    confirmationDeadline: row.confirmation_deadline,
    respondedAt: row.responded_at,
    quantity: row.quantity,
    unitPriceCents: row.unit_price_cents,
    totalCents,
    pricing: computeMissionPricingBreakdown(totalCents),
    product: { id: row.product_id, name: row.product_name },
    producer: {
      userId: row.producer_user_id,
      displayName: row.producer_display_name ?? "Producteur Delta",
      zone: row.producer_zone,
    },
    rameneur: {
      userId: row.rameneur_user_id,
      displayName: row.rameneur_display_name ?? FALLBACK_RAMENEUR_NAME,
    },
    trip: {
      originLabel: row.origin_label,
      destinationLabel: row.destination_label,
      departDate: row.depart_date,
    },
  }
}

/** Traduit une erreur DB typée (`@delta/db/mission-match`) vers l'erreur core correspondante. */
function rethrowAsCoreError(err: unknown): never {
  if (err instanceof MissionMatchNotFoundDbError) throw new MissionMatchNotFoundError()
  if (err instanceof MissionMatchAlreadyRespondedDbError) {
    throw new MissionMatchAlreadyRespondedError()
  }
  if (err instanceof MissionMatchExpiredDbError) throw new MissionMatchExpiredError()
  if (err instanceof MissionMatchOutOfStockDbError) {
    throw new MissionMatchOutOfStockError()
  }
  throw err
}

/**
 * Implémentation de `MissionMatchAdapter` (KAN-31) pour les route handlers
 * user-facing. Le caller fournit le client utilisateur — RLS + vue
 * `mission_match_details` gated sur `auth.uid()`.
 */
export function getMissionMatchAdapter(client: Client): MissionMatchAdapter {
  return {
    async findDetailForBuyer(missionMatchId, buyerId) {
      const row = await missionMatchRepo.findDetailForBuyer(
        client,
        missionMatchId,
        buyerId,
      )
      return row ? toDetail(row) : null
    },

    async confirm(missionMatchId, buyerId) {
      try {
        await missionMatchRepo.confirm(client, missionMatchId)
      } catch (err) {
        rethrowAsCoreError(err)
      }
      const row = await missionMatchRepo.findDetailForBuyer(
        client,
        missionMatchId,
        buyerId,
      )
      if (!row) throw new MissionMatchNotFoundError()
      return toDetail(row)
    },

    async decline(missionMatchId, buyerId) {
      try {
        await missionMatchRepo.decline(client, missionMatchId, buyerId)
      } catch (err) {
        rethrowAsCoreError(err)
      }
      const row = await missionMatchRepo.findDetailForBuyer(
        client,
        missionMatchId,
        buyerId,
      )
      if (!row) throw new MissionMatchNotFoundError()
      return toDetail(row)
    },
  }
}

/**
 * Adapter pour le job Inngest cron `expire-pending-mission-matches`
 * (KAN-31, packages/jobs). Le caller fournit le client admin (bypass RLS —
 * opère sur tous les acheteurs, pas un self précis).
 */
export function getMissionMatchExpiryAdapter(
  client: Client,
): ExpirePendingMissionMatchesDeps {
  return {
    expirePendingPastDeadline: (now) =>
      missionMatchRepo.expirePendingPastDeadline(client, now),
  }
}
