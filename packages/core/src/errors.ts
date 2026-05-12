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

export type AuthErrorCode =
  | EmailAlreadyTakenError["code"]
  | WeakPasswordError["code"]
  | AuthValidationError["code"]
