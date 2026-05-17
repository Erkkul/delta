import {
  type Producer,
  type ProducerAdapter,
  type RoleChecker,
  type SiretVerificationScheduler,
  type StripeEventStore,
} from "@delta/core/producer"
import { producersRepo, type ProducerRow } from "@delta/db"
import { type Database } from "@delta/db/types"
import { usersRepo } from "@delta/db/users"
import { inngest } from "@delta/jobs/inngest-client"
import { type SupabaseClient } from "@supabase/supabase-js"

/**
 * Mappe une `ProducerRow` (forme DB) vers la `Producer` (forme métier
 * exposée au core). One-to-one — les deux types sont volontairement
 * dupliqués pour ne pas coupler core à db (cf. core/producer/adapters.ts).
 */
function toProducer(row: ProducerRow): Producer {
  return {
    id: row.id,
    user_id: row.user_id,
    siret: row.siret,
    legal_name: row.legal_name,
    legal_form: row.legal_form,
    naf_code: row.naf_code,
    siret_status: row.siret_status,
    siret_verified_at: row.siret_verified_at,
    siret_rejection_reason: row.siret_rejection_reason,
    stripe_account_id: row.stripe_account_id,
    stripe_status: row.stripe_status,
    payouts_enabled: row.payouts_enabled,
    charges_enabled: row.charges_enabled,
    requirements_currently_due: row.requirements_currently_due,
  }
}

type Client = SupabaseClient<Database>

/**
 * Implémentation de `ProducerAdapter` pour les route handlers user-facing
 * (RLS appliquée). Le caller fournit le client utilisateur (`getServerSupabase()`)
 * pour que toutes les opérations soient gated par `auth.uid() = user_id`.
 *
 * `ensureForUser` fait un SELECT puis INSERT si absent. En cas de race
 * (deux requêtes parallèles pour le même user), la 2e INSERT échoue sur
 * la UNIQUE constraint → on retry le SELECT.
 *
 * `applyStripeAccountUpdate` doit utiliser le client admin (service_role
 * bypass RLS) car il est appelé depuis le webhook handler qui n'a pas
 * de session utilisateur. On expose une variante `forAdmin()` pour ce cas.
 */
export function getProducerAdapter(client: Client): ProducerAdapter & {
  findById(id: string): Promise<Producer | null>
} {
  return {
    async findByUserId(userId) {
      const row = await producersRepo.findByUserId(client, userId)
      return row ? toProducer(row) : null
    },

    async findById(id) {
      const { data, error } = await client
        .from("producers")
        .select("*")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle()
      if (error) throw error
      return data ? toProducer(data) : null
    },

    async findByStripeAccountId(stripeAccountId) {
      const row = await producersRepo.findByStripeAccountId(
        client,
        stripeAccountId,
      )
      return row ? toProducer(row) : null
    },

    async ensureForUser(userId) {
      const existing = await producersRepo.findByUserId(client, userId)
      if (existing) return toProducer(existing)
      try {
        const created = await producersRepo.create(client, { user_id: userId })
        return toProducer(created)
      } catch (err) {
        // Race entre deux requêtes parallèles : la 2e INSERT viole la
        // UNIQUE constraint sur user_id. On retry le SELECT.
        const retried = await producersRepo.findByUserId(client, userId)
        if (!retried) throw err
        return toProducer(retried)
      }
    },

    async updateSiretDeclaration(userId, fields) {
      const row = await producersRepo.updateSiretDeclaration(
        client,
        userId,
        fields,
      )
      return toProducer(row)
    },

    async setSiretVerificationResult(producerId, result) {
      const row = await producersRepo.setSiretVerificationResult(
        client,
        producerId,
        result,
      )
      return toProducer(row)
    },

    async setStripeAccount(userId, stripeAccountId) {
      const row = await producersRepo.setStripeAccount(
        client,
        userId,
        stripeAccountId,
      )
      return toProducer(row)
    },

    async applyStripeAccountUpdate(stripeAccountId, fields) {
      const row = await producersRepo.applyStripeAccountUpdate(
        client,
        stripeAccountId,
        fields,
      )
      return row ? toProducer(row) : null
    },
  }
}

/**
 * Implémentation de `RoleChecker` — lit `users.roles` via le repo `users`.
 * Utilise le client utilisateur (RLS appliquée — l'utilisateur peut
 * toujours lire sa propre row via `users_select_self`).
 */
export function getRoleChecker(client: Client): RoleChecker {
  return {
    async hasProducerRole(userId) {
      const row = await usersRepo.findById(client, userId)
      return row?.roles?.includes("producteur") ?? false
    },
  }
}

/**
 * Implémentation de `SiretVerificationScheduler` — émet l'event Inngest
 * `producer.siret.requested` qui déclenche le job de vérification Sirene.
 */
export function getSiretVerificationScheduler(): SiretVerificationScheduler {
  return {
    async scheduleSiretVerification(producerId) {
      await inngest.send({
        name: "producer.siret.requested",
        data: { producer_id: producerId },
      })
    },
  }
}

/**
 * Implémentation de `StripeEventStore` — wrapper sur la table
 * `public.stripe_webhook_events`. Utilise le client admin (service_role)
 * car le webhook handler n'a pas de session user.
 *
 * Pattern : INSERT … ON CONFLICT (event_id) DO NOTHING + RETURNING. Si la
 * row est insérée, on retourne `true` (event nouveau à traiter). Si
 * conflit, RETURNING ne renvoie rien → on retourne `false` (déjà traité).
 */
export function getStripeEventStore(client: Client): StripeEventStore {
  return {
    async insertIfNew(event) {
      const { data, error } = await client
        .from("stripe_webhook_events")
        .insert(event)
        .select("event_id")
        // Ignore le conflit unique sur event_id (event déjà traité).
        // Supabase JS expose `onConflict` via la méthode `upsert`, mais
        // on veut DO NOTHING, pas DO UPDATE. On exécute un INSERT et on
        // détecte le conflit via le code d'erreur PG.
        .maybeSingle()

      if (error) {
        if (error.code === "23505") {
          // duplicate key — event déjà inséré
          return false
        }
        throw error
      }
      return data !== null
    },
  }
}
