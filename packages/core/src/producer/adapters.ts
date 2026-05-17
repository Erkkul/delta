/**
 * Adapters typés pour les use cases producer (KAN-16). Définissent la
 * surface d'I/O nécessaire à chaque use case ; implémentés côté
 * `apps/web/lib/` (route handlers, webhook) et `packages/jobs/` (Inngest
 * job). Le core reste pur (cf. ARCHITECTURE.md §4.1).
 *
 * Pas de dépendance Stripe SDK / Sirene HTTP ici — les adapters exposent
 * des primitives plates (string, boolean) pour que le core ne couple
 * jamais sa logique à une vendor lib.
 */

import {
  type LegalForm,
  type SiretStatus,
  type StripeAccountStatus,
} from "@delta/contracts/producer"

/**
 * Forme métier minimale d'un producteur partagée entre core et adapters.
 * Doublonne volontairement `ProducerRow` de `@delta/db` (le core ne dépend
 * pas de db). Pour éviter le drift, les adapters d'apps/web qui wrappent
 * `producersRepo` se chargent du mapping ProducerRow → Producer (one-to-one).
 */
export type Producer = {
  id: string
  user_id: string
  siret: string | null
  legal_name: string | null
  legal_form: string | null
  naf_code: string | null
  siret_status: SiretStatus
  siret_verified_at: string | null
  siret_rejection_reason: string | null
  stripe_account_id: string | null
  stripe_status: StripeAccountStatus
  payouts_enabled: boolean
  charges_enabled: boolean
  requirements_currently_due: string[]
}

// ─── Producteurs ─────────────────────────────────────────────────────────

export type ProducerAdapter = {
  findByUserId(userId: string): Promise<Producer | null>
  findByStripeAccountId(stripeAccountId: string): Promise<Producer | null>
  /**
   * Idempotent : crée une row si elle n'existe pas, no-op si elle existe.
   * Retourne la row courante (créée ou pré-existante).
   */
  ensureForUser(userId: string): Promise<Producer>
  updateSiretDeclaration(
    userId: string,
    fields: {
      siret: string
      legal_name: string
      legal_form: LegalForm
      naf_code: string
      siret_status: SiretStatus
    },
  ): Promise<Producer>
  setSiretVerificationResult(
    producerId: string,
    result: { status: "verified" } | { status: "rejected"; reason: string },
  ): Promise<Producer>
  setStripeAccount(userId: string, stripeAccountId: string): Promise<Producer>
  applyStripeAccountUpdate(
    stripeAccountId: string,
    fields: {
      stripe_status: StripeAccountStatus
      payouts_enabled: boolean
      charges_enabled: boolean
      requirements_currently_due: string[]
    },
  ): Promise<Producer | null>
}

// ─── Rôles utilisateur ───────────────────────────────────────────────────

export type RoleChecker = {
  /**
   * Indique si le user a le rôle `producteur` dans son tableau `users.roles`.
   * Implémentation typique : `usersRepo.findById(client, userId).roles
   * .includes("producteur")`.
   */
  hasProducerRole(userId: string): Promise<boolean>
}

// ─── Stripe Connect Express ──────────────────────────────────────────────

export type StripeConnectAdapter = {
  createConnectAccount(input: {
    email: string
  }): Promise<{ accountId: string }>
  createAccountLink(input: {
    accountId: string
    refreshUrl: string
    returnUrl: string
  }): Promise<{ url: string; expiresAt: string }>
}

// ─── Webhook Stripe — verrouillage idempotence ───────────────────────────

export type StripeEventStore = {
  /**
   * Tente d'enregistrer l'event. Retourne `true` si la row a été insérée
   * (event nouveau, à traiter) ou `false` si conflit sur `event_id`
   * (déjà traité, à ignorer). Pattern INSERT … ON CONFLICT DO NOTHING.
   */
  insertIfNew(event: {
    event_id: string
    event_type: string
    payload: Record<string, unknown>
  }): Promise<boolean>
}

// ─── Sirene INSEE ────────────────────────────────────────────────────────

/**
 * Réponse normalisée du client Sirene (cf. packages/jobs/src/integrations/insee.ts).
 * Le client traduit le JSON brut INSEE en une forme métier minimale ;
 * `legal_name_official` correspond à `uniteLegale.periodesUniteLegale[0]
 * .denominationUniteLegale` du payload V3.11.
 *
 * Retourne `null` si le SIRET n'existe pas dans la base Sirene (404).
 */
export type InseeSiretRecord = {
  siret: string
  legal_name_official: string | null
}

export type InseeAdapter = {
  fetchSiretRecord(siret: string): Promise<InseeSiretRecord | null>
}

// ─── Inngest scheduling ──────────────────────────────────────────────────

export type SiretVerificationScheduler = {
  /**
   * Émet l'event `producer.siret.requested` consommé par le job Inngest
   * `verify-siret`. Idempotent par `producer_id` côté Inngest.
   */
  scheduleSiretVerification(producerId: string): Promise<void>
}
