import { z } from "zod"

/**
 * Politique de mot de passe partagée entre SignupInput (KAN-2) et
 * ResetPasswordInput (KAN-157). Source unique de vérité, alignée avec la
 * config Supabase Auth (`tech/setup.md` 2026-05-08, décision produit
 * 2026-05-13) : 10 caractères min, au moins une majuscule, une minuscule
 * et un chiffre.
 *
 * `passwordHint` est le message affiché sous le champ password côté UI
 * (kept ici pour rester synchronisé avec la regex sans risque de drift).
 */
export const PASSWORD_MIN = 10

export const PASSWORD_REGEX = {
  lower: /[a-z]/,
  upper: /[A-Z]/,
  digit: /[0-9]/,
} as const

export const passwordHint =
  "10 caractères minimum, au moins une majuscule, une minuscule et un chiffre."

export const Password = z
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
