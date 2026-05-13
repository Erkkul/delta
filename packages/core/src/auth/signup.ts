import { SignupInput, type SignupOutput } from "@delta/contracts/auth"

import {
  AuthValidationError,
  EmailAlreadyTakenError,
  WeakPasswordError,
} from "../errors"

import { buildConsentRecord, type ConsentRecord } from "./consent"

/**
 * Métadonnées projetées dans `auth.users.raw_user_meta_data` lors du
 * signup email/password. Le trigger Postgres `on_auth_user_created`
 * copie `consents` dans `users.metadata.consents`. Pas de `role` ici :
 * la sélection multi-rôle se fait à l'écran AU-06 après vérif email
 * (décision 2026-05-13).
 */
export type SignupUserMetadata = {
  consents: ConsentRecord
}

export type AuthAdapter = {
  createUserWithPassword(input: {
    email: string
    password: string
    metadata: SignupUserMetadata
  }): Promise<{ userId: string }>
}

/**
 * Use case `signupWithEmail` (AU-02). Fonction pure de coordination.
 * Valide l'input via le contrat Zod, construit les métadonnées RGPD,
 * délègue la création Auth à l'adapter. Vérification email obligatoire
 * = la session n'est PAS active à la sortie de cet appel : l'utilisateur
 * doit passer par AU-04 (verify OTP) avant que la session ne soit
 * établie côté Supabase.
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
): Promise<SignupOutput> {
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
    metadata: { consents },
  })

  return { userId }
}

/**
 * Mappe une erreur du provider Auth (Supabase) vers une erreur métier typée.
 * Codes documentés Supabase Auth (gotrue) :
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
