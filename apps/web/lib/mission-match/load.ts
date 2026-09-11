import { type MissionMatchDetail } from "@delta/contracts/mission-match"
import { type Database } from "@delta/db/types"
import { type SupabaseClient } from "@supabase/supabase-js"

import { getMissionMatchAdapter } from "./adapters"

type Client = SupabaseClient<Database>

/** Charge le détail d'un match pour AC-07 (KAN-31). `null` si introuvable / pas le sien. */
export async function loadMissionMatchDetail(
  client: Client,
  missionMatchId: string,
  buyerId: string,
): Promise<MissionMatchDetail | null> {
  return getMissionMatchAdapter(client).findDetailForBuyer(missionMatchId, buyerId)
}
