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

// ─── Producer profile (KAN-17) ───────────────────────────────────────────

/**
 * Le profil producteur n'existe pas encore (row absente). Cas typique : un
 * user vient de sélectionner le rôle producteur mais n'a pas encore validé
 * l'étape SIRET. Mapping HTTP : 404.
 */
export class ProducerProfileNotFoundError extends Error {
  readonly code = "PRODUCER_PROFILE_NOT_FOUND" as const

  constructor() {
    super("Aucun profil producteur trouvé pour cet utilisateur.")
    this.name = "ProducerProfileNotFoundError"
  }
}

/**
 * Le géocodage de l'adresse de récupération a échoué (API Adresse
 * indisponible OU score < seuil). Au MVP : non-bloquant côté core (le texte
 * est tout de même persisté, la position reste null). Cette erreur n'est
 * levée que si le caller exige strictement un géocodage réussi.
 */
export class AddressGeocodeFailedError extends Error {
  readonly code = "PRODUCER_ADDRESS_GEOCODE_FAILED" as const

  constructor(message = "Impossible de géocoder cette adresse.") {
    super(message)
    this.name = "AddressGeocodeFailedError"
  }
}

/**
 * Le quota de photos de ferme (3 max) est atteint. Mapping HTTP : 409.
 */
export class PhotoLimitReachedError extends Error {
  readonly code = "PRODUCER_PHOTO_LIMIT_REACHED" as const

  constructor() {
    super("Limite de 3 photos de ferme atteinte.")
    this.name = "PhotoLimitReachedError"
  }
}

/**
 * Le MIME type uploadé n'est pas dans la whitelist (jpeg/png/webp). Mapping
 * HTTP : 400.
 */
export class PhotoMimeRejectedError extends Error {
  readonly code = "PRODUCER_PHOTO_MIME_REJECTED" as const

  constructor(mime: string) {
    super(`Type d'image non supporté : ${mime}.`)
    this.name = "PhotoMimeRejectedError"
  }
}

export type ProducerProfileErrorCode =
  | ProducerValidationError["code"]
  | ProducerRoleForbiddenError["code"]
  | ProducerProfileNotFoundError["code"]
  | AddressGeocodeFailedError["code"]
  | PhotoLimitReachedError["code"]
  | PhotoMimeRejectedError["code"]
  | RateLimitedError["code"]

// ─── Product catalogue (KAN-20) ──────────────────────────────────────────

/**
 * Erreur de validation métier pour le CRUD catalogue (KAN-20). Calque
 * d'`AuthValidationError` / `ProducerValidationError` côté payload.
 * Mapping HTTP : 400.
 */
export class ProductValidationError extends Error {
  readonly code = "PRODUCT_VALIDATION_FAILED" as const

  constructor(
    message: string,
    public readonly issues: ReadonlyArray<{ path: string; message: string }>,
  ) {
    super(message)
    this.name = "ProductValidationError"
  }
}

/**
 * Produit introuvable (id inconnu OU appartenant à un autre user — la RLS
 * masque les deux cas indifféremment). Mapping HTTP : 404.
 */
export class ProductNotFoundError extends Error {
  readonly code = "PRODUCT_NOT_FOUND" as const

  constructor() {
    super("Produit introuvable.")
    this.name = "ProductNotFoundError"
  }
}

/**
 * Action tentée sur un produit dont le user n'est pas le owner. En pratique,
 * la RLS renvoie une 404 (anti-énumération) ; ce code reste utilisé pour les
 * tests unitaires côté core et pour les futurs callers admin / staff.
 * Mapping HTTP : 403.
 */
export class ProductForbiddenError extends Error {
  readonly code = "PRODUCT_FORBIDDEN" as const

  constructor() {
    super("Vous n'êtes pas propriétaire de ce produit.")
    this.name = "ProductForbiddenError"
  }
}

/**
 * Suppression d'un produit déjà soft-deleted. Idempotence applicative :
 * on lève une erreur typée plutôt que de laisser le PATCH retomber sur
 * `not found`. Mapping HTTP : 409.
 */
export class ProductAlreadyDeletedError extends Error {
  readonly code = "PRODUCT_ALREADY_DELETED" as const

  constructor() {
    super("Ce produit est déjà supprimé.")
    this.name = "ProductAlreadyDeletedError"
  }
}

/**
 * Quota de 4 photos par produit atteint (KAN-21). Mapping HTTP : 409.
 * Levée par `addProductPhoto` lorsque `photos.length === 4`. Le CHECK DB
 * `products_photos_max` rattrape par ailleurs les races concurrentes —
 * l'adapter web traduit alors le code Postgres `23514` (check_violation)
 * vers ce même code applicatif.
 */
export class ProductPhotoLimitReachedError extends Error {
  readonly code = "PRODUCT_PHOTO_LIMIT_REACHED" as const

  constructor() {
    super("Limite de 4 photos atteinte pour ce produit.")
    this.name = "ProductPhotoLimitReachedError"
  }
}

/**
 * Index photo hors plage (KAN-21). Mapping HTTP : 404. Levée quand
 * `removeProductPhoto` ou `reorderProductPhotos` reçoit un index `>= photos.length`.
 */
export class ProductPhotoNotFoundError extends Error {
  readonly code = "PRODUCT_PHOTO_NOT_FOUND" as const

  constructor() {
    super("Photo introuvable à cet index.")
    this.name = "ProductPhotoNotFoundError"
  }
}

/**
 * Réordonnement invalide (KAN-21). Mapping HTTP : 400. Levée si
 * `from === to` ou si une des positions est hors plage.
 */
export class ProductPhotoInvalidReorderError extends Error {
  readonly code = "PRODUCT_PHOTO_INVALID_REORDER" as const

  constructor(message = "Le réordonnement est invalide.") {
    super(message)
    this.name = "ProductPhotoInvalidReorderError"
  }
}

/**
 * MIME type uploadé hors whitelist (KAN-21). Mapping HTTP : 400. Levée
 * par la validation Zod côté `ProductPhotoUploadInput`.
 */
export class ProductPhotoMimeRejectedError extends Error {
  readonly code = "PRODUCT_PHOTO_MIME_REJECTED" as const

  constructor(mime: string) {
    super(`Type d'image non supporté : ${mime}.`)
    this.name = "ProductPhotoMimeRejectedError"
  }
}

/**
 * Path Storage ne commençant pas par `{auth.uid()}/{product_id}/` (KAN-21).
 * Anti-tampering sur l'endpoint `confirm` : un client malveillant ne peut
 * pas faire référencer une photo qui ne lui appartient pas. Mapping HTTP : 400.
 */
export class ProductPhotoPathRejectedError extends Error {
  readonly code = "PRODUCT_PHOTO_PATH_REJECTED" as const

  constructor() {
    super("Le chemin de la photo ne correspond pas à ce produit.")
    this.name = "ProductPhotoPathRejectedError"
  }
}

// ─── Product status transitions (KAN-23) ─────────────────────────────────

/**
 * Transition de statut produit refusée (KAN-23).
 *
 * Deux cas :
 *   - Transition hors graphe (`active → active`, statut inconnu, etc.) :
 *     `details.reason = "invalid_transition"`, `details.missing = []`.
 *   - Préconditions de publication manquantes (`* → active`) :
 *     `details.reason = "missing_preconditions"`, `details.missing` liste
 *     les clés (`name`, `description`, `price`, `stock`, `photos`,
 *     `availability`).
 *
 * Mapping HTTP : 400. L'UI affiche un message ciblé via `details.missing`.
 */
export class ProductTransitionInvalidError extends Error {
  readonly code = "PRODUCT_TRANSITION_INVALID" as const

  constructor(
    public readonly details: {
      reason: "invalid_transition" | "missing_preconditions"
      missing: ReadonlyArray<
        | "name"
        | "description"
        | "price"
        | "stock"
        | "photos"
        | "availability"
      >
    },
    message = "Transition de statut refusée.",
  ) {
    super(message)
    this.name = "ProductTransitionInvalidError"
  }
}

export type ProductErrorCode =
  | ProductValidationError["code"]
  | ProductNotFoundError["code"]
  | ProductForbiddenError["code"]
  | ProductAlreadyDeletedError["code"]
  | ProductPhotoLimitReachedError["code"]
  | ProductPhotoNotFoundError["code"]
  | ProductPhotoInvalidReorderError["code"]
  | ProductPhotoMimeRejectedError["code"]
  | ProductPhotoPathRejectedError["code"]
  | ProductTransitionInvalidError["code"]

// ─── Buyer profile (KAN-25) ──────────────────────────────────────────────

/**
 * Erreur de validation métier pour le profil acheteur (KAN-25). Calque
 * d'`AuthValidationError` côté payload. Mapping HTTP : 400.
 */
export class BuyerValidationError extends Error {
  readonly code = "BUYER_VALIDATION_FAILED" as const

  constructor(
    message: string,
    public readonly issues: ReadonlyArray<{ path: string; message: string }>,
  ) {
    super(message)
    this.name = "BuyerValidationError"
  }
}

/**
 * Action acheteur tentée par un user qui n'a pas le rôle `acheteur` dans
 * `users.roles`. Mapping HTTP : 403.
 */
export class BuyerRoleForbiddenError extends Error {
  readonly code = "BUYER_ROLE_FORBIDDEN" as const

  constructor() {
    super("Le rôle acheteur est requis pour cette action.")
    this.name = "BuyerRoleForbiddenError"
  }
}

export type BuyerErrorCode =
  | BuyerValidationError["code"]
  | BuyerRoleForbiddenError["code"]
  | RateLimitedError["code"]
