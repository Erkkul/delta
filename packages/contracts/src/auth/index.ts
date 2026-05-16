import { z } from "zod"

import { Password } from "./password-policy"

export { PASSWORD_MIN, PASSWORD_REGEX, Password, passwordHint } from "./password-policy"

export const ROLES = ["acheteur", "rameneur", "producteur"] as const

export const Role = z.enum(ROLES)
export type Role = z.infer<typeof Role>

const Email = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: "Adresse email invalide." })

/**
 * Signup AU-02. Plus de rôle ni de checkboxes : les consents sont
 * implicites (décision 2026-05-13). Le route handler ajoute
 * `consents = { termsVersion, privacyVersion, acceptedAt }` au
 * `raw_user_meta_data` Supabase ; le trigger DB les projette en
 * `users.metadata.consents` à la création.
 */
export const SignupInput = z.object({
  email: Email,
  password: Password,
  termsVersion: z.string().min(1),
  privacyVersion: z.string().min(1),
})
export type SignupInput = z.infer<typeof SignupInput>

export const SignupOutput = z.object({
  userId: z.string().uuid(),
})
export type SignupOutput = z.infer<typeof SignupOutput>

/**
 * Vérification OTP AU-04. 6 chiffres.
 */
export const OtpVerificationInput = z.object({
  email: Email,
  otp: z.string().regex(/^\d{6}$/, "Le code doit faire 6 chiffres."),
})
export type OtpVerificationInput = z.infer<typeof OtpVerificationInput>

/**
 * Sélection multi-rôle AU-06. 1 à 3 rôles distincts.
 */
export const RoleSelectionInput = z.object({
  roles: z
    .array(Role)
    .min(1, "Choisissez au moins un rôle.")
    .max(3)
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "Les rôles doivent être distincts.",
    }),
})
export type RoleSelectionInput = z.infer<typeof RoleSelectionInput>

export const RoleSelectionOutput = z.object({
  userId: z.string().uuid(),
  roles: z.array(Role),
})
export type RoleSelectionOutput = z.infer<typeof RoleSelectionOutput>

export const LoginInput = z.object({
  email: Email,
  password: z.string().min(1, "Mot de passe requis."),
})
export type LoginInput = z.infer<typeof LoginInput>

export const LoginOutput = z.object({
  userId: z.string().uuid(),
  roles: z.array(Role),
})
export type LoginOutput = z.infer<typeof LoginOutput>

/**
 * Récupération de mot de passe (KAN-157) — AU-FP1. Anti-énumération côté
 * adapter HTTP : la réponse est toujours 204, quel que soit l'état du
 * compte.
 */
export const ForgotPasswordInput = z.object({
  email: Email,
})
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInput>

/**
 * Reset effectif (KAN-157) — AU-FP3. Le `token` est l'OTP 6 chiffres
 * reçu par mail (Supabase recovery flow, `type: 'recovery'`). Politique
 * de mot de passe identique au signup (partagée via `Password`).
 */
export const ResetPasswordInput = z.object({
  email: Email,
  token: z.string().regex(/^\d{6}$/, "Le code doit faire 6 chiffres."),
  newPassword: Password,
})
export type ResetPasswordInput = z.infer<typeof ResetPasswordInput>

export const ResetPasswordOutput = z.object({
  userId: z.string().uuid(),
})
export type ResetPasswordOutput = z.infer<typeof ResetPasswordOutput>

export const SIGNUP_ERROR_CODES = {
  ValidationFailed: "AUTH_VALIDATION_FAILED",
  EmailAlreadyTaken: "AUTH_EMAIL_ALREADY_TAKEN",
  WeakPassword: "AUTH_WEAK_PASSWORD",
  OtpInvalid: "AUTH_OTP_INVALID",
  RoleSelectionInvalid: "AUTH_ROLE_SELECTION_INVALID",
  Unknown: "AUTH_UNKNOWN",
} as const
export type SignupErrorCode =
  (typeof SIGNUP_ERROR_CODES)[keyof typeof SIGNUP_ERROR_CODES]

/**
 * Codes d'erreur exposés par `POST /api/v1/auth/login` (KAN-3).
 * `InvalidCredentials` est volontairement opaque : on ne distingue jamais
 * email inconnu de mauvais mot de passe (anti-énumération, cf.
 * specs/KAN-3/design.md §Risques techniques).
 */
export const LOGIN_ERROR_CODES = {
  ValidationFailed: "AUTH_VALIDATION_FAILED",
  InvalidCredentials: "AUTH_INVALID_CREDENTIALS",
  RateLimited: "AUTH_RATE_LIMITED",
  Unknown: "AUTH_UNKNOWN",
} as const
export type LoginErrorCode =
  (typeof LOGIN_ERROR_CODES)[keyof typeof LOGIN_ERROR_CODES]

/**
 * Codes d'erreur exposés par les endpoints de récupération (KAN-157).
 * `forgot-password` ne renvoie jamais autre chose que `Validation` ou
 * `RateLimited` (anti-énumération : tout échec d'envoi est avalé en 204).
 * `reset-password` mappe les échecs OTP / token vers `InvalidRecoveryToken`
 * — opaque par design comme `InvalidCredentials` côté login.
 */
export const RESET_PASSWORD_ERROR_CODES = {
  ValidationFailed: "AUTH_VALIDATION_FAILED",
  WeakPassword: "AUTH_WEAK_PASSWORD",
  InvalidRecoveryToken: "AUTH_INVALID_RECOVERY_TOKEN",
  RateLimited: "AUTH_RATE_LIMITED",
  Unknown: "AUTH_UNKNOWN",
} as const
export type ResetPasswordErrorCode =
  (typeof RESET_PASSWORD_ERROR_CODES)[keyof typeof RESET_PASSWORD_ERROR_CODES]
