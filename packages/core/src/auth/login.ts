import { LoginInput, type LoginOutput, type Role } from "@delta/contracts/auth"

import {
  AuthValidationError,
  InvalidCredentialsError,
  RateLimitedError,
} from "../errors"
import { rateLimit, type RateLimitStore } from "../rate-limit/rate-limit"

/**
 * Adapter pour appeler le provider Auth (Supabase) avec un couple
 * email / mot de passe. Renvoie `{ userId }` si le provider accepte,
 * `null` si refus (mauvais mdp, user inconnu, email non vérifié).
 *
 * Important : ne JAMAIS distinguer les motifs d'échec au-delà de cette
 * frontière — l'anti-énumération exige une réponse uniforme.
 */
export type SignInAdapter = {
  signInWithPassword(input: {
    email: string
    password: string
  }): Promise<{ userId: string } | null>
}

/**
 * Adapter qui lit les rôles courants d'un utilisateur après login.
 * Permet au client de rediriger vers la bonne étape d'onboarding sans
 * faire un second aller-retour. Implémentation typique : `usersRepo
 * .findById(admin, userId).roles`.
 */
export type LoadRolesAdapter = {
  loadRoles(userId: string): Promise<Role[]>
}

export type LoginDeps = SignInAdapter &
  LoadRolesAdapter & {
    store: RateLimitStore
  }

/**
 * Politique rate-limit baseline pour `/auth/login` : 5 essais par
 * fenêtre de 15 min, indexés sur l'email cible (cf. spec §Hypothèses).
 * Exposée pour que les tests d'intégration utilisent la même config.
 */
export const LOGIN_RATE_LIMIT = {
  attempts: 5,
  windowMs: 15 * 60_000,
} as const

/**
 * Use case `loginWithEmail` (KAN-3 — flow de connexion).
 *
 * Étapes :
 *   1. Validation Zod (email format, password non vide)
 *   2. Rate-limit fenêtre fixe par email
 *   3. Appel provider Auth — toute issue mappée vers `InvalidCredentialsError`
 *   4. Lecture des rôles pour la redirection client
 *
 * Erreurs typées (cf. errors.ts) :
 *   - AuthValidationError     (input non conforme)
 *   - RateLimitedError        (5 essais dépassés)
 *   - InvalidCredentialsError (provider a refusé — opaque par design)
 */
export async function loginWithEmail(
  input: unknown,
  deps: LoginDeps,
): Promise<LoginOutput> {
  const parsed = LoginInput.safeParse(input)
  if (!parsed.success) {
    throw new AuthValidationError(
      "Validation du formulaire échouée.",
      parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    )
  }

  const { email, password } = parsed.data

  // L'email est déjà normalisé (trim + lowercase via Zod), la clé de
  // rate-limit est donc stable malgré la casse fournie par l'utilisateur.
  const limit = await rateLimit(
    `auth:login:${email}`,
    LOGIN_RATE_LIMIT.attempts,
    LOGIN_RATE_LIMIT.windowMs,
    deps.store,
  )
  if (!limit.allowed) {
    throw new RateLimitedError(limit.retryAfterMs)
  }

  const signed = await deps.signInWithPassword({ email, password })
  if (!signed) {
    throw new InvalidCredentialsError()
  }

  const roles = await deps.loadRoles(signed.userId)
  return { userId: signed.userId, roles }
}
