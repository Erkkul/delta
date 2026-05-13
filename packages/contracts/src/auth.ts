import { z } from "zod"

export const ROLES = ["acheteur", "rameneur", "producteur"] as const

export const Role = z.enum(ROLES)
export type Role = z.infer<typeof Role>

const PASSWORD_MIN = 10
const PASSWORD_REGEX = {
  lower: /[a-z]/,
  upper: /[A-Z]/,
  digit: /[0-9]/,
}

const Password = z
  .string()
  .min(PASSWORD_MIN, {
    message: `Le mot de passe doit faire au moins ${String(PASSWORD_MIN)} caractères.`,
  })
  .refine((v) => PASSWORD_REGEX.lower.test(v), {
    message: "Doit contenir au moins une lettre minuscule.",
  })
  .refine((v) => PASSWORD_REGEX.upper.test(v), {
    message: "Doit contenir au moins une lettre majuscule.",
  })
  .refine((v) => PASSWORD_REGEX.digit.test(v), {
    message: "Doit contenir au moins un chiffre.",
  })

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
