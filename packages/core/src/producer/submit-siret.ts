import {
  SiretDeclarationInput,
  type SiretDeclarationOutput,
} from "@delta/contracts/producer"

import {
  ProducerRoleForbiddenError,
  ProducerValidationError,
  RateLimitedError,
  SiretAlreadyVerifiedError,
} from "../errors"
import { rateLimit, type RateLimitStore } from "../rate-limit/rate-limit"

import {
  type ProducerAdapter,
  type RoleChecker,
  type SiretVerificationScheduler,
} from "./adapters"

export type SubmitSiretDeclarationDeps = ProducerAdapter &
  RoleChecker &
  SiretVerificationScheduler & {
    store: RateLimitStore
  }

/**
 * Politique rate-limit pour `/api/v1/producer/onboarding/siret` :
 * 5 soumissions par heure et par user (anti-flood, débrayé en cas de
 * re-soumission après rejet). Exposée pour les tests d'intégration.
 */
export const SIRET_DECLARATION_RATE_LIMIT = {
  attempts: 5,
  windowMs: 60 * 60_000,
} as const

/**
 * Use case `submitSiretDeclaration` (KAN-16 — étape 2 du wizard).
 *
 * Étapes :
 *   1. Vérifie le rôle producteur (ProducerRoleForbiddenError sinon)
 *   2. Rate-limit fenêtre fixe par user
 *   3. Validation Zod de l'input
 *   4. Crée la row producteur si elle n'existe pas (idempotent)
 *   5. Refuse la modification si SIRET déjà verified (SiretAlreadyVerifiedError)
 *   6. Persiste la déclaration avec statut `pending`
 *   7. Programme le job Inngest `producer.siret.requested`
 *
 * Erreurs typées (cf. errors.ts) :
 *   - ProducerRoleForbiddenError    (user n'a pas le rôle producteur)
 *   - ProducerValidationError       (input non conforme au schéma Zod)
 *   - SiretAlreadyVerifiedError     (modification bloquée au MVP)
 *   - RateLimitedError              (5 soumissions / heure dépassées)
 */
export async function submitSiretDeclaration(
  input: unknown,
  userId: string,
  deps: SubmitSiretDeclarationDeps,
): Promise<SiretDeclarationOutput> {
  if (!(await deps.hasProducerRole(userId))) {
    throw new ProducerRoleForbiddenError()
  }

  const limit = await rateLimit(
    `producer:siret:${userId}`,
    SIRET_DECLARATION_RATE_LIMIT.attempts,
    SIRET_DECLARATION_RATE_LIMIT.windowMs,
    deps.store,
  )
  if (!limit.allowed) {
    throw new RateLimitedError(limit.retryAfterMs)
  }

  const parsed = SiretDeclarationInput.safeParse(input)
  if (!parsed.success) {
    throw new ProducerValidationError(
      "Validation du formulaire échouée.",
      parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    )
  }

  // Idempotent : la row producteur peut déjà exister (re-soumission après
  // rejet ou navigation arrière dans le wizard).
  const current = await deps.ensureForUser(userId)
  if (current.siret_status === "verified") {
    throw new SiretAlreadyVerifiedError()
  }

  const { siret, legal_name, legal_form, naf_code } = parsed.data
  const updated = await deps.updateSiretDeclaration(userId, {
    siret,
    legal_name,
    legal_form,
    naf_code,
    siret_status: "pending",
  })

  await deps.scheduleSiretVerification(updated.id)

  return { siret_status: "pending" }
}
