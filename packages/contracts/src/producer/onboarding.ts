import { z } from "zod"

/**
 * Onboarding producteur (KAN-16).
 *
 * Trois écrans :
 *   1. Profil ferme (étape 1, KAN-17 — hors scope ici)
 *   2. Vérification SIRET (étape 2 — `SiretDeclarationInput` ci-dessous,
 *      consommé par `POST /api/v1/producer/onboarding/siret`)
 *   3. Compte Stripe Connect Express (étape 3 — `StripeOnboardingLinkOutput`,
 *      consommé par `POST /api/v1/producer/onboarding/stripe-link`)
 *
 * Les enums `SiretStatus` et `StripeAccountStatus` doublonnent volontairement
 * les types DB (`ProducerSiretStatus` / `ProducerStripeStatus` dans
 * `@delta/db`) — la convention `core` ne dépend pas de `db`, donc les enums
 * vivent ici (côté contrats) et chaque consommateur les importe.
 */

// ─── Enums statuts ───────────────────────────────────────────────────────

export const SIRET_STATUSES = [
  "not_submitted",
  "pending",
  "verified",
  "rejected",
] as const
export const SiretStatus = z.enum(SIRET_STATUSES)
export type SiretStatus = z.infer<typeof SiretStatus>

export const STRIPE_ACCOUNT_STATUSES = [
  "not_created",
  "pending",
  "active",
  "restricted",
  "disabled",
] as const
export const StripeAccountStatus = z.enum(STRIPE_ACCOUNT_STATUSES)
export type StripeAccountStatus = z.infer<typeof StripeAccountStatus>

// ─── Forme juridique ─────────────────────────────────────────────────────

/**
 * Whitelist des formes juridiques exposées à l'écran SIRET. Aligné avec le
 * `select` de la maquette `pr-02-onboarding-stripe.html`. Non exhaustif côté
 * réalité française — on élargira au fur et à mesure des cas remontés. Côté
 * DB, la colonne `legal_form` reste un text libre pour ne pas bloquer.
 */
export const LEGAL_FORMS = [
  "EARL",
  "SCEA",
  "SARL",
  "Auto-entrepreneur",
  "SAS",
  "GAEC",
] as const
export const LegalForm = z.enum(LEGAL_FORMS)
export type LegalForm = z.infer<typeof LegalForm>

// ─── Inputs / Outputs ────────────────────────────────────────────────────

/**
 * SIRET = 14 chiffres exacts. La maquette accepte des espaces de
 * lecture (`789 456 123 00012`) — on les strip avant validation.
 */
const Siret = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s+/g, ""))
  .pipe(
    z
      .string()
      .regex(/^[0-9]{14}$/, "Le SIRET doit comporter 14 chiffres."),
  )

/**
 * Code NAF (nomenclature d'activités française rev 2). Format `XX.XXY`
 * (2 chiffres, point, 2 chiffres, optionnellement une lettre majuscule).
 * Ex : `01.13Z` (culture de légumes), `10.71B` (cuisson de produits de
 * boulangerie). La maquette pré-renseigne `01.13Z`.
 */
const NafCode = z
  .string()
  .trim()
  .regex(
    /^[0-9]{2}\.[0-9]{2}[A-Z]?$/,
    "Le code NAF doit suivre le format XX.XXY (ex : 01.13Z).",
  )

export const SiretDeclarationInput = z.object({
  siret: Siret,
  legal_name: z
    .string()
    .trim()
    .min(2, "La raison sociale doit faire au moins 2 caractères.")
    .max(200, "La raison sociale ne doit pas dépasser 200 caractères."),
  legal_form: LegalForm,
  naf_code: NafCode,
})
export type SiretDeclarationInput = z.infer<typeof SiretDeclarationInput>

export const SiretDeclarationOutput = z.object({
  siret_status: SiretStatus,
})
export type SiretDeclarationOutput = z.infer<typeof SiretDeclarationOutput>

export const StripeOnboardingLinkOutput = z.object({
  url: z.string().url(),
  expires_at: z.string(), // ISO timestamp
})
export type StripeOnboardingLinkOutput = z.infer<
  typeof StripeOnboardingLinkOutput
>

// ─── Codes d'erreur ──────────────────────────────────────────────────────

/**
 * Codes d'erreur exposés par `POST /api/v1/producer/onboarding/siret`.
 * `SiretAlreadyVerified` correspond au 409 quand l'utilisateur tente de
 * modifier un SIRET déjà validé (modification bloquée au MVP, cf.
 * specs/KAN-16/proposal.md §Out of scope).
 */
export const SIRET_DECLARATION_ERROR_CODES = {
  ValidationFailed: "PRODUCER_VALIDATION_FAILED",
  RoleForbidden: "PRODUCER_ROLE_FORBIDDEN",
  SiretAlreadyVerified: "PRODUCER_SIRET_ALREADY_VERIFIED",
  RateLimited: "PRODUCER_RATE_LIMITED",
  Unknown: "PRODUCER_UNKNOWN",
} as const
export type SiretDeclarationErrorCode =
  (typeof SIRET_DECLARATION_ERROR_CODES)[keyof typeof SIRET_DECLARATION_ERROR_CODES]

/**
 * Codes d'erreur exposés par `POST /api/v1/producer/onboarding/stripe-link`.
 * `StripeAccountAlreadyEnabled` correspond au 409 quand le compte Stripe
 * Connect du producteur est déjà `payouts_enabled = true` — pas besoin de
 * relancer un Account Link.
 */
export const STRIPE_ONBOARDING_LINK_ERROR_CODES = {
  RoleForbidden: "PRODUCER_ROLE_FORBIDDEN",
  StripeAccountAlreadyEnabled: "PRODUCER_STRIPE_ACCOUNT_ALREADY_ENABLED",
  RateLimited: "PRODUCER_RATE_LIMITED",
  StripeUpstream: "PRODUCER_STRIPE_UPSTREAM",
  Unknown: "PRODUCER_UNKNOWN",
} as const
export type StripeOnboardingLinkErrorCode =
  (typeof STRIPE_ONBOARDING_LINK_ERROR_CODES)[keyof typeof STRIPE_ONBOARDING_LINK_ERROR_CODES]
