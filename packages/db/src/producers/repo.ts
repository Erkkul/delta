import { type SupabaseClient } from "@supabase/supabase-js"

import {
  type Database,
  type ProducerInsert,
  type ProducerRow,
  type ProducerSiretStatus,
  type ProducerStripeStatus,
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
}
