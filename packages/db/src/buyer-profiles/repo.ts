import { type SupabaseClient } from "@supabase/supabase-js"

import {
  type BuyerProfileRow,
  type BuyerProfileUpdate,
  type Database,
} from "../types"

type Client = SupabaseClient<Database>

const SELECT_COLUMNS =
  "user_id, display_name, address_label, city, postcode, created_at, updated_at, deleted_at"

/**
 * Repo `buyer_profiles` (KAN-25). Profil acheteur minimal (nom + zone)
 * étendant `public.users`, miroir léger du pattern `producersRepo`.
 *
 * Le client est injecté au cas par cas : pour les use cases user-facing on
 * passe le client utilisateur (RLS `buyer_profiles_*_self`). La colonne
 * `location` (geography) n'est jamais projetée ni écrite directement — elle
 * passe par la RPC `set_buyer_location`.
 */
export const buyerProfilesRepo = {
  async findByUserId(
    client: Client,
    userId: string,
  ): Promise<BuyerProfileRow | null> {
    const { data, error } = await client
      .from("buyer_profiles")
      .select(SELECT_COLUMNS)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle()
    if (error) throw error
    return data ?? null
  },

  /**
   * Crée la row acheteur lazy (1ère soumission de zone). RLS
   * `buyer_profiles_insert_self` exige `auth.uid() = user_id`.
   */
  async create(
    client: Client,
    userId: string,
    fields: BuyerProfileUpdate,
  ): Promise<BuyerProfileRow> {
    const { data, error } = await client
      .from("buyer_profiles")
      .insert({ user_id: userId, ...fields })
      .select(SELECT_COLUMNS)
      .single()
    if (error) throw error
    return data
  },

  /**
   * Patch partiel des champs non-géo. Caller : client utilisateur (RLS
   * `buyer_profiles_update_self`).
   */
  async update(
    client: Client,
    userId: string,
    fields: BuyerProfileUpdate,
  ): Promise<BuyerProfileRow> {
    const { data, error } = await client
      .from("buyer_profiles")
      .update(fields)
      .eq("user_id", userId)
      .select(SELECT_COLUMNS)
      .single()
    if (error) throw error
    return data
  },

  /**
   * Met à jour la colonne `location` (PostGIS geography) via la RPC
   * `set_buyer_location`. Si les deux args sont null, réinitialise la
   * position. SECURITY INVOKER → RLS appliquée (le user n'édite que sa row).
   */
  async setLocationViaRpc(
    client: Client,
    longitude: number | null,
    latitude: number | null,
  ): Promise<void> {
    const { error } = await client.rpc("set_buyer_location", {
      p_longitude: longitude,
      p_latitude: latitude,
    })
    if (error) throw error
  },
}
