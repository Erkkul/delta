import { SignupInput, type Role, type SignupOutput } from "@delta/contracts/auth"

import {
  AuthValidationError,
  EmailAlreadyTakenError,
  WeakPasswordError,
} from "../errors"

import { buildConsentRecord, type ConsentRecord } from "./consent"

/**
 * Métadonnées projetées dans `auth.users.raw_user_meta_data`. Le trigger
 * Postgres `on_auth_user_created` lit `role` pour insérer la ligne
 * `public.users` ; `consents` est conservé pour audit RGPD (US-01.10).
 */
export type SignupUserMetadata = {
  role: Role
  consents: ConsentRecord
}

export type AuthAdapter = {
  createUserWithPassword(input: {
    email: string
    password: string
    metadata: SignupUserMetadata
  }): Promise<{ userId: string }>
}

export type SignupResult = SignupOutput

/**
 * Use case `signupWithEmail` — fonction pure de coordination domain.
 * Valide l'input via le contrat Zod, construit les métadonnées RGPD,
 * délègue la création Auth à l'adapter, et renvoie un `SignupResult`
 * typé pour l'adapter HTTP.
 *
 * Erreurs typées (cf. errors.ts) :
 *   - AuthValidationError       (input non conforme au schéma Zod)
 *   - EmailAlreadyTakenError    (Supabase Auth a refusé : email déjà pris)
 *   - WeakPasswordError         (Supabase Auth a refusé : password trop faible)
 */
export async function signupWithEmail(
  input: unknown,
  auth: AuthAdapter,
  now: Date = new Date(),
): Promise<SignupResult> {
  const parsed = SignupInput.safeParse(input)
  if (!parsed.success) {
    throw new AuthValidationError(
      "Validation du formulaire échouée.",
      parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    )
  }

  const data = parsed.data

  const consents = buildConsentRecord({
    termsVersion: data.termsVersion,
    privacyVersion: data.privacyVersion,
    now,
  })

  const { userId } = await auth.createUserWithPassword({
    email: data.email,
    password: data.password,
    metadata: { role: data.role, consents },
  })

  return { userId, role: data.role }
}

/**
 * Mappe une erreur du provider Auth (Supabase) vers une erreur métier typée.
 * Centralise les codes d'erreur connus pour éviter de leur logique dans
 * l'adapter HTTP. Codes documentés Supabase Auth (gotrue) :
 *   - `user_already_exists` / `email_address_already_in_use`
 *   - `weak_password`
 */
export function mapAuthProviderError(
  err: { code?: string; message?: string } | null,
  email: string,
): Error | null {
  if (!err) return null
  const code = err.code ?? ""
  if (
    code === "user_already_exists" ||
    code === "email_address_already_in_use"
  ) {
    return new EmailAlreadyTakenError(email)
  }
  if (code === "weak_password") {
    return new WeakPasswordError(err.message)
  }
  return null
}
