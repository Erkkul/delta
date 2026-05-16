import { ForgotPasswordInput } from "@delta/contracts/auth"

import { AuthValidationError, RateLimitedError } from "../errors"
import { rateLimit, type RateLimitStore } from "../rate-limit/rate-limit"

/**
 * Adapter pour déclencher l'envoi d'un email de récupération via le
 * provider Auth (Supabase). Retourne toujours `void` côté caller — toute
 * issue interne du provider (email inconnu, throttling Supabase, etc.)
 * est avalée par l'adapter pour préserver l'anti-énumération.
 */
export type SendRecoveryEmailAdapter = {
  sendRecoveryEmail(email: string): Promise<void>
}

export type RequestPasswordResetDeps = SendRecoveryEmailAdapter & {
  store: RateLimitStore
}

/**
 * Politique rate-limit pour `/auth/forgot-password` : 3 demandes par
 * heure, indexées sur l'email cible (cf. specs/KAN-157/design.md
 * § Risques techniques — spam d'emails). Fenêtre longue car chaque
 * appel déclenche un email réel.
 */
export const FORGOT_PASSWORD_RATE_LIMIT = {
  attempts: 3,
  windowMs: 60 * 60_000,
} as const

/**
 * Use case `requestPasswordReset` (KAN-157 — AU-FP1).
 *
 * Étapes :
 *   1. Validation Zod (email format)
 *   2. Rate-limit fenêtre fixe par email (3 / heure)
 *   3. Demande d'envoi à l'adapter — peu importe le résultat, on ne
 *      remonte rien (anti-énumération stricte côté adapter HTTP).
 *
 * Erreurs typées (cf. errors.ts) :
 *   - AuthValidationError  (email mal formé)
 *   - RateLimitedError     (3 demandes dépassées sur la fenêtre)
 */
export async function requestPasswordReset(
  input: unknown,
  deps: RequestPasswordResetDeps,
): Promise<void> {
  const parsed = ForgotPasswordInput.safeParse(input)
  if (!parsed.success) {
    throw new AuthValidationError(
      "Validation du formulaire échouée.",
      parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    )
  }

  const { email } = parsed.data

  const limit = await rateLimit(
    `auth:forgot-password:${email}`,
    FORGOT_PASSWORD_RATE_LIMIT.attempts,
    FORGOT_PASSWORD_RATE_LIMIT.windowMs,
    deps.store,
  )
  if (!limit.allowed) {
    throw new RateLimitedError(limit.retryAfterMs)
  }

  await deps.sendRecoveryEmail(email)
}
