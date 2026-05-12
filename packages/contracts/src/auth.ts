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

const ConsentTrue = z.literal(true, {
  errorMap: () => ({
    message: "Cette acceptation est obligatoire.",
  }),
})

export const SignupInput = z.object({
  email: Email,
  password: Password,
  role: Role,
  acceptedTerms: ConsentTrue,
  acceptedPrivacy: ConsentTrue,
  termsVersion: z.string().min(1),
  privacyVersion: z.string().min(1),
})
export type SignupInput = z.infer<typeof SignupInput>

export const SignupOutput = z.object({
  userId: z.string().uuid(),
  role: Role,
})
export type SignupOutput = z.infer<typeof SignupOutput>

export const LoginInput = z.object({
  email: Email,
  password: z.string().min(1, "Mot de passe requis."),
})
export type LoginInput = z.infer<typeof LoginInput>

export const LoginOutput = z.object({
  userId: z.string().uuid(),
  role: Role,
})
export type LoginOutput = z.infer<typeof LoginOutput>

export const SIGNUP_ERROR_CODES = {
  ValidationFailed: "AUTH_VALIDATION_FAILED",
  EmailAlreadyTaken: "AUTH_EMAIL_ALREADY_TAKEN",
  WeakPassword: "AUTH_WEAK_PASSWORD",
  Unknown: "AUTH_UNKNOWN",
} as const
export type SignupErrorCode =
  (typeof SIGNUP_ERROR_CODES)[keyof typeof SIGNUP_ERROR_CODES]
