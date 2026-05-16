import {
  ResetPasswordInput,
  type ResetPasswordOutput,
} from "@delta/contracts/auth"

import {
  AuthValidationError,
  InvalidRecoveryTokenError,
  RateLimitedError,
  WeakPasswordError,
} from "../errors"
import { rateLimit, type RateLimitStore } from "../rate-limit/rate-limit"

/**
 * Adapter pour finaliser un reset password via le provider Auth
 * (Supabase). Le caller doit :
 *   1. Appeler `verifyOtp({ email, token, type: 'recovery' })` —
 *      retourner `{ userId }` si succès, `null` si refus (token faux,
 *      expiré, déjà consommé, email inconnu).
 *   2. Appeler `updateUser({ password })` — throw `WeakPasswordError`
 *      si le provider rejette la nouvelle politique. Toute autre erreur
 *      → erreur générique laissée remonter.
 *   3. Optionnel : signOut pour ne pas laisser une session de recovery
 *      ouverte (la spec redirige vers /login après succès).
 *
 * Pas de distinction des motifs d'échec côté `verifyAndUpdate` au-delà
 * du `null` : l'anti-énumération exige une réponse uniforme côté
 * adapter HTTP.
 */
export type ResetPasswordAdapter = {
  verifyAndUpdate(input: {
    email: string
    token: string
    newPassword: string
  }): Promise<{ userId: string } | null>
}

export type ResetPasswordDeps = ResetPasswordAdapter & {
  store: RateLimitStore
}

/**
 * Politique rate-limit pour `/auth/reset-password` : 5 tentatives par
 * fenêtre de 15 min, indexées sur l'email cible. Symétrique avec
 * `/auth/login` (cf. specs/KAN-157/design.md §Hypothèses) — bornage
 * dimensionné pour limiter le brute-force OTP sans bloquer un user qui
 * se trompe une ou deux fois.
 */
export const RESET_PASSWORD_RATE_LIMIT = {
  attempts: 5,
  windowMs: 15 * 60_000,
} as const

/**
 * Use case `resetPasswordWithOtp` (KAN-157 — AU-FP3).
 *
 * Étapes :
 *   1. Validation Zod (email, OTP 6 chiffres, nouveau mdp politique partagée)
 *   2. Rate-limit fenêtre fixe par email (5 / 15 min)
 *   3. Vérification OTP + update password via l'adapter — toute issue
 *      mappée vers `InvalidRecoveryTokenError` (sauf WeakPasswordError
 *      que l'adapter peut throw explicitement si Supabase rejette le mdp).
 *
 * Erreurs typées (cf. errors.ts) :
 *   - AuthValidationError         (input non conforme au schéma Zod)
 *   - RateLimitedError            (5 essais dépassés)
 *   - InvalidRecoveryTokenError   (adapter a refusé — opaque par design)
 *   - WeakPasswordError           (adapter a explicitement throw)
 */
export async function resetPasswordWithOtp(
  input: unknown,
  deps: ResetPasswordDeps,
): Promise<ResetPasswordOutput> {
  const parsed = ResetPasswordInput.safeParse(input)
  if (!parsed.success) {
    throw new AuthValidationError(
      "Validation du formulaire échouée.",
      parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    )
  }

  const { email, token, newPassword } = parsed.data

  const limit = await rateLimit(
    `auth:reset-password:${email}`,
    RESET_PASSWORD_RATE_LIMIT.attempts,
    RESET_PASSWORD_RATE_LIMIT.windowMs,
    deps.store,
  )
  if (!limit.allowed) {
    throw new RateLimitedError(limit.retryAfterMs)
  }

  const result = await deps.verifyAndUpdate({ email, token, newPassword })
  if (!result) {
    throw new InvalidRecoveryTokenError()
  }

  return { userId: result.userId }
}

/**
 * Re-export pour qu'un caller (adapter HTTP) puisse construire l'instance
 * directement sans dépendre du chemin d'import interne.
 */
export { WeakPasswordError }
