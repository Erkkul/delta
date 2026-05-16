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
