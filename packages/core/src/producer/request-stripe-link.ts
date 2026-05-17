import { type StripeOnboardingLinkOutput } from "@delta/contracts/producer"

import {
  ProducerRoleForbiddenError,
  RateLimitedError,
  StripeAccountAlreadyEnabledError,
  StripeUpstreamError,
} from "../errors"
import { rateLimit, type RateLimitStore } from "../rate-limit/rate-limit"

import {
  type ProducerAdapter,
  type RoleChecker,
  type StripeConnectAdapter,
} from "./adapters"

export type RequestStripeOnboardingLinkDeps = ProducerAdapter &
  RoleChecker &
  StripeConnectAdapter & {
    store: RateLimitStore
  }

/**
 * Politique rate-limit pour `/api/v1/producer/onboarding/stripe-link` :
 * 10 requêtes par 15 min et par user. Volontairement plus permissif que
 * SIRET car (a) l'Account Link Stripe expire vite (≤ 5 min) et (b)
 * l'utilisateur peut légitimement re-cliquer après expiration.
 */
export const STRIPE_LINK_RATE_LIMIT = {
  attempts: 10,
  windowMs: 15 * 60_000,
} as const

export type RequestStripeOnboardingLinkInput = {
  /** Email du user, transmis à Stripe pour préremplir le KYC. */
  email: string
  /** URL de retour après onboarding terminé (page `/stripe/return`). */
  returnUrl: string
  /** URL de refresh si l'Account Link a expiré (page `/stripe/refresh`). */
  refreshUrl: string
}

/**
 * Use case `requestStripeOnboardingLink` (KAN-16 — étape 3 du wizard).
 *
 * Étapes :
 *   1. Vérifie le rôle producteur (ProducerRoleForbiddenError sinon)
 *   2. Rate-limit fenêtre fixe par user
 *   3. Crée la row producteur si elle n'existe pas (ne devrait pas
 *      arriver — l'étape 2 SIRET l'aura créée — mais idempotence)
 *   4. Refuse si `payouts_enabled = true` (StripeAccountAlreadyEnabledError)
 *   5. Crée le compte Stripe Connect Express si absent (idempotent par
 *      `stripe_account_id` côté producer)
 *   6. Génère un Account Link frais (pas de cache — chaque appel doit
 *      retourner un lien neuf, l'ancien expire en ≤ 5 min)
 *
 * Erreurs typées :
 *   - ProducerRoleForbiddenError         (user n'a pas le rôle producteur)
 *   - StripeAccountAlreadyEnabledError   (payouts_enabled = true déjà)
 *   - StripeUpstreamError                (Stripe 5xx / timeout)
 *   - RateLimitedError                   (10 essais / 15 min dépassés)
 */
export async function requestStripeOnboardingLink(
  input: RequestStripeOnboardingLinkInput,
  userId: string,
  deps: RequestStripeOnboardingLinkDeps,
): Promise<StripeOnboardingLinkOutput> {
  if (!(await deps.hasProducerRole(userId))) {
    throw new ProducerRoleForbiddenError()
  }

  const limit = await rateLimit(
    `producer:stripe-link:${userId}`,
    STRIPE_LINK_RATE_LIMIT.attempts,
    STRIPE_LINK_RATE_LIMIT.windowMs,
    deps.store,
  )
  if (!limit.allowed) {
    throw new RateLimitedError(limit.retryAfterMs)
  }

  let producer = await deps.ensureForUser(userId)
  if (producer.payouts_enabled) {
    throw new StripeAccountAlreadyEnabledError()
  }

  // Création du compte Stripe Connect Express si absent. Idempotence
  // garantie par la row producer : un user a au plus 1 stripe_account_id.
  let justCreated = false
  if (!producer.stripe_account_id) {
    let accountId: string
    try {
      const created = await deps.createConnectAccount({ email: input.email })
      accountId = created.accountId
    } catch (err) {
      throw new StripeUpstreamError(
        err instanceof Error
          ? `Création compte Stripe échouée : ${err.message}`
          : "Création compte Stripe échouée.",
      )
    }
    producer = await deps.setStripeAccount(userId, accountId)
    justCreated = true
  }

  // Account Link toujours frais — pas de cache. Si Stripe est down ici,
  // l'erreur remonte au client qui pourra retry.
  if (!producer.stripe_account_id) {
    // Garde TypeScript ; setStripeAccount renvoie toujours une row avec
    // stripe_account_id renseigné.
    throw new StripeUpstreamError(
      "Stripe account ID introuvable après création.",
    )
  }

  // Dispatch onboarding initial vs update (KAN-158) :
  //   - Compte fraîchement créé → `account_onboarding` (collecte initiale complète)
  //   - Compte pré-existant en restricted → `account_update` (collecte ciblée
  //     sur les `requirements_currently_due`, plus rapide pour l'utilisateur)
  try {
    const link = justCreated
      ? await deps.createAccountLink({
          accountId: producer.stripe_account_id,
          refreshUrl: input.refreshUrl,
          returnUrl: input.returnUrl,
        })
      : await deps.createAccountUpdateLink({
          accountId: producer.stripe_account_id,
          refreshUrl: input.refreshUrl,
          returnUrl: input.returnUrl,
        })
    return { url: link.url, expires_at: link.expiresAt }
  } catch (err) {
    throw new StripeUpstreamError(
      err instanceof Error
        ? `Création Account Link échouée : ${err.message}`
        : "Création Account Link échouée.",
    )
  }
}
