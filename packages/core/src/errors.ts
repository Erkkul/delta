/**
 * Erreurs métier typées (cf. ARCHITECTURE.md §4.3). Le `code` littéral permet
 * aux adapters HTTP de mapper sans connaître la classe.
 */
export class EmailAlreadyTakenError extends Error {
  readonly code = "AUTH_EMAIL_ALREADY_TAKEN" as const

  constructor(email: string) {
    super(`Un compte existe déjà pour ${email}.`)
    this.name = "EmailAlreadyTakenError"
  }
}

export class WeakPasswordError extends Error {
  readonly code = "AUTH_WEAK_PASSWORD" as const

  constructor(message = "Mot de passe trop faible.") {
    super(message)
    this.name = "WeakPasswordError"
  }
}

export class AuthValidationError extends Error {
  readonly code = "AUTH_VALIDATION_FAILED" as const

  constructor(
    message: string,
    public readonly issues: ReadonlyArray<{ path: string; message: string }>,
  ) {
    super(message)
    this.name = "AuthValidationError"
  }
}

/**
 * Erreur générique d'échec d'authentification (KAN-3 — login).
 * Volontairement opaque : retournée à la fois quand l'email n'existe
 * pas, quand le mot de passe est faux, ou quand l'email n'est pas
 * vérifié. Ne JAMAIS distinguer côté API (anti-énumération, cf.
 * specs/KAN-3/design.md §Risques).
 */
export class InvalidCredentialsError extends Error {
  readonly code = "AUTH_INVALID_CREDENTIALS" as const

  constructor() {
    super("Identifiants invalides.")
    this.name = "InvalidCredentialsError"
  }
}

/**
 * Limite de tentatives atteinte (KAN-3 — protection brute-force).
 * `retryAfterMs` est exposé pour qu'un adapter HTTP puisse poser le
 * header `Retry-After` (en secondes, arrondi sup.).
 */
export class RateLimitedError extends Error {
  readonly code = "AUTH_RATE_LIMITED" as const

  constructor(public readonly retryAfterMs: number) {
    super("Trop de tentatives, réessayez plus tard.")
    this.name = "RateLimitedError"
  }
}

/**
 * Token de récupération invalide ou expiré (KAN-157 — reset password).
 * Volontairement opaque : retournée que l'OTP soit faux, déjà consommé,
 * expiré, ou que l'email soit inconnu (anti-énumération, cf.
 * specs/KAN-157/design.md §Risques).
 */
export class InvalidRecoveryTokenError extends Error {
  readonly code = "AUTH_INVALID_RECOVERY_TOKEN" as const

  constructor() {
    super("Code de récupération invalide ou expiré.")
    this.name = "InvalidRecoveryTokenError"
  }
}

export type AuthErrorCode =
  | EmailAlreadyTakenError["code"]
  | WeakPasswordError["code"]
  | AuthValidationError["code"]
  | InvalidCredentialsError["code"]
  | InvalidRecoveryTokenError["code"]
  | RateLimitedError["code"]

// ─── Producer onboarding (KAN-16) ────────────────────────────────────────

/**
 * Erreur de validation métier pour l'onboarding producteur (KAN-16). Calque
 * d'`AuthValidationError` côté payload — séparée pour pouvoir mapper le code
 * HTTP indépendamment côté handler.
 */
export class ProducerValidationError extends Error {
  readonly code = "PRODUCER_VALIDATION_FAILED" as const

  constructor(
    message: string,
    public readonly issues: ReadonlyArray<{ path: string; message: string }>,
  ) {
    super(message)
    this.name = "ProducerValidationError"
  }
}

/**
 * Action producteur tentée par un user qui n'a pas le rôle `producteur`
 * dans `users.roles`. Retournée par les use cases d'onboarding avant tout
 * effet de bord. Mapping HTTP : 403.
 */
export class ProducerRoleForbiddenError extends Error {
  readonly code = "PRODUCER_ROLE_FORBIDDEN" as const

  constructor() {
    super("Le rôle producteur est requis pour cette action.")
    this.name = "ProducerRoleForbiddenError"
  }
}

/**
 * Le SIRET du producteur est déjà `verified` — modification bloquée au MVP
 * (cf. specs/KAN-16/proposal.md §Out of scope). Mapping HTTP : 409.
 */
export class SiretAlreadyVerifiedError extends Error {
  readonly code = "PRODUCER_SIRET_ALREADY_VERIFIED" as const

  constructor() {
    super("Votre SIRET est déjà vérifié et ne peut plus être modifié.")
    this.name = "SiretAlreadyVerifiedError"
  }
}

/**
 * Le compte Stripe Connect du producteur est déjà `payouts_enabled = true`
 * — pas besoin de relancer un Account Link. Mapping HTTP : 409.
 */
export class StripeAccountAlreadyEnabledError extends Error {
  readonly code = "PRODUCER_STRIPE_ACCOUNT_ALREADY_ENABLED" as const

  constructor() {
    super("Votre compte Stripe est déjà actif, aucune action requise.")
    this.name = "StripeAccountAlreadyEnabledError"
  }
}

/**
 * Erreur upstream Stripe (5xx, timeout) lors de la création d'un compte ou
 * d'un Account Link. Mapping HTTP : 502 (retry safe côté client).
 */
export class StripeUpstreamError extends Error {
  readonly code = "PRODUCER_STRIPE_UPSTREAM" as const

  constructor(message = "Stripe est temporairement indisponible.") {
    super(message)
    this.name = "StripeUpstreamError"
  }
}

export type ProducerErrorCode =
  | ProducerValidationError["code"]
  | ProducerRoleForbiddenError["code"]
  | SiretAlreadyVerifiedError["code"]
  | StripeAccountAlreadyEnabledError["code"]
  | StripeUpstreamError["code"]
  | RateLimitedError["code"]
