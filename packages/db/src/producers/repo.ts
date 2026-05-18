import { type SupabaseClient } from "@supabase/supabase-js"

import {
  type Database,
  type FarmPhoto,
  type ProducerInsert,
  type ProducerLabel,
  type ProducerRow,
  type ProducerSiretStatus,
  type ProducerStripeStatus,
  type Weekday,
} from "../types"

type Client = SupabaseClient<Database>

/**
 * Repo `producers` (KAN-16). Source unique de vérité du profil producteur
 * étendant `public.users`.
 *
 * Comme `usersRepo`, on injecte le `client` au cas par cas :
 *   - client utilisateur (RLS `producers_*_self`) pour les use cases
 *     d'onboarding (`submitSiretDeclaration`, `requestStripeOnboardingLink`)
 *   - client admin (bypass RLS) pour le webhook handler Stripe
 *     (`applyStripeAccountUpdate`) et le job Inngest de vérif SIRET
 *     (`verifySiretWithInsee`).
 */
export const producersRepo = {
  async findByUserId(
    client: Client,
    userId: string,
  ): Promise<ProducerRow | null> {
    const { data, error } = await client
      .from("producers")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle()
    if (error) throw error
    return data ?? null
  },

  async findByStripeAccountId(
    client: Client,
    stripeAccountId: string,
  ): Promise<ProducerRow | null> {
    const { data, error } = await client
      .from("producers")
      .select("*")
      .eq("stripe_account_id", stripeAccountId)
      .is("deleted_at", null)
      .maybeSingle()
    if (error) throw error
    return data ?? null
  },

  /**
   * Crée une row producteur lazy à la première soumission SIRET. RLS
   * `producers_insert_self` exige `auth.uid() = user_id` côté client
   * utilisateur.
   */
  async create(client: Client, input: ProducerInsert): Promise<ProducerRow> {
    const { data, error } = await client
      .from("producers")
      .insert(input)
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  /**
   * Met à jour la déclaration SIRET. Appelé par le use case
   * `submitSiretDeclaration` après upsert idempotent côté core.
   */
  async updateSiretDeclaration(
    client: Client,
    userId: string,
    fields: {
      siret: string
      legal_name: string
      legal_form: string
      naf_code: string
      siret_status: ProducerSiretStatus
    },
  ): Promise<ProducerRow> {
    const { data, error } = await client
      .from("producers")
      .update(fields)
      .eq("user_id", userId)
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  /**
   * Met à jour le résultat de la vérification SIRET (job Inngest
   * `producer.siret.requested`). Caller : client admin (le job tourne en
   * service_role pour bypass RLS).
   */
  async setSiretVerificationResult(
    client: Client,
    producerId: string,
    result:
      | { status: "verified" }
      | { status: "rejected"; reason: string },
  ): Promise<ProducerRow> {
    const fields =
      result.status === "verified"
        ? {
            siret_status: "verified" as const,
            siret_verified_at: new Date().toISOString(),
            siret_rejection_reason: null,
          }
        : {
            siret_status: "rejected" as const,
            siret_verified_at: null,
            siret_rejection_reason: result.reason,
          }
    const { data, error } = await client
      .from("producers")
      .update(fields)
      .eq("id", producerId)
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  /**
   * Pose le `stripe_account_id` à la création du compte Stripe Connect
   * Express (1ère soumission de l'endpoint stripe-link). Caller : client
   * utilisateur (RLS `producers_update_self`).
   */
  async setStripeAccount(
    client: Client,
    userId: string,
    stripeAccountId: string,
  ): Promise<ProducerRow> {
    const { data, error } = await client
      .from("producers")
      .update({
        stripe_account_id: stripeAccountId,
        stripe_status: "pending" as const,
      })
      .eq("user_id", userId)
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  /**
   * Applique le payload du webhook `account.updated` à la row producteur.
   * Caller : webhook handler (service_role, bypass RLS).
   */
  async applyStripeAccountUpdate(
    client: Client,
    stripeAccountId: string,
    fields: {
      stripe_status: ProducerStripeStatus
      payouts_enabled: boolean
      charges_enabled: boolean
      requirements_currently_due: string[]
    },
  ): Promise<ProducerRow | null> {
    const { data, error } = await client
      .from("producers")
      .update(fields)
      .eq("stripe_account_id", stripeAccountId)
      .select("*")
      .maybeSingle()
    if (error) throw error
    return data ?? null
  },

  // ─── KAN-17 — Profil & ferme ──────────────────────────────────────────

  /**
   * Met à jour les champs publics (nom, description, photos, labels) et
   * l'adresse de récupération. Patch partiel — seules les clés présentes
   * sont écrites. La colonne `pickup_location` (geography) n'est pas
   * touchée ici, elle passe par `setPickupLocationViaRpc` ci-dessous.
   *
   * Caller : client utilisateur (RLS `producers_update_self`).
   */
  async updateProfile(
    client: Client,
    userId: string,
    patch: {
      display_name?: string | null
      public_description?: string | null
      profile_photo_url?: string | null
      farm_photos?: FarmPhoto[]
      labels?: ProducerLabel[]
      pickup_public_zone?: string | null
      pickup_address?: string | null
      pickup_days?: Weekday[]
      pickup_hours_start?: string | null
      pickup_hours_end?: string | null
    },
  ): Promise<ProducerRow> {
    const { data, error } = await client
      .from("producers")
      .update(patch)
      .eq("user_id", userId)
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  /**
   * Bascule le flag `paused` et synchronise `paused_at`. Side-effect produits
   * : invisibilité côté catalogue acheteur (gating RLS, KAN-20).
   *
   * Caller : client utilisateur (RLS `producers_update_self`).
   */
  async setPaused(
    client: Client,
    userId: string,
    paused: boolean,
  ): Promise<ProducerRow> {
    const { data, error } = await client
      .from("producers")
      .update({
        paused,
        paused_at: paused ? new Date().toISOString() : null,
      })
      .eq("user_id", userId)
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  /**
   * Met à jour la colonne `pickup_location` (PostGIS geography) via la RPC
   * `set_pickup_location` (cf. migration KAN-17). Si les deux args sont
   * null, réinitialise la position. SECURITY INVOKER → seul le owner peut
   * éditer sa row (RLS appliquée).
   */
  async setPickupLocationViaRpc(
    client: Client,
    longitude: number | null,
    latitude: number | null,
  ): Promise<void> {
    const { error } = await client.rpc("set_pickup_location", {
      p_longitude: longitude,
      p_latitude: latitude,
    })
    if (error) throw error
  },

  /**
   * Révèle l'adresse exacte d'un producteur si le caller est autorisé
   * (owner ou rameneur en mission active). Wrap la RPC SECURITY DEFINER
   * `reveal_pickup_address`. Retourne null si non autorisé.
   */
  async revealPickupAddress(
    client: Client,
    producerId: string,
  ): Promise<string | null> {
    const { data, error } = await client.rpc("reveal_pickup_address", {
      producer_id: producerId,
    })
    if (error) throw error
    return data ?? null
  },
}
