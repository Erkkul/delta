import { auth as coreAuth } from "@delta/core"
import {
  AuthValidationError,
  EmailAlreadyTakenError,
  WeakPasswordError,
} from "@delta/core/errors"
import { type NextRequest, NextResponse } from "next/server"

import { publicEnv } from "@/lib/env"
import { getAdminSupabase } from "@/lib/supabase/server"

/**
 * POST /api/v1/auth/signup (KAN-2 v2 — multi-rôle, décision 2026-05-13).
 *
 * Input : { email, password, termsVersion, privacyVersion }
 * Output (201) : { userId }
 * Codes : 201 / 400 / 409 / 500
 *
 * Pas de rôle en input (déféré à AU-06 Choix rôle). Les consents sont
 * passés à Supabase en `options.data.consents` et copiés en
 * `users.metadata.consents` par le trigger DB. Vérification email
 * obligatoire (Supabase Confirm email ON) — l'utilisateur sera
 * redirigé vers /auth/verify-email après cet appel.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as unknown
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Body JSON manquant ou invalide." },
      { status: 400 },
    )
  }

  const env = publicEnv()
  const admin = getAdminSupabase()

  try {
    const result = await coreAuth.signupWithEmail(body, {
      async createUserWithPassword(input) {
        // signUp envoie le OTP par email (vs admin.createUser qui crée
        // un user déjà confirmé). On garde donc signUp côté serveur en
        // utilisant le client admin (pas de session attachée).
        const { data, error } = await admin.auth.signUp({
          email: input.email,
          password: input.password,
          options: {
            data: { consents: input.metadata.consents },
            emailRedirectTo: `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify`,
          },
        })
        const mapped = coreAuth.mapAuthProviderError(error, input.email)
        if (mapped) throw mapped
        if (error || !data.user) {
          throw new Error(error?.message ?? "Auth provider error")
        }
        return { userId: data.user.id }
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof AuthValidationError) {
      return NextResponse.json(
        { error: "Validation échouée.", code: err.code, issues: err.issues },
        { status: 400 },
      )
    }
    if (err instanceof EmailAlreadyTakenError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 409 },
      )
    }
    if (err instanceof WeakPasswordError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 400 },
      )
    }
    return NextResponse.json(
      { error: "Erreur serveur, réessayez plus tard." },
      { status: 500 },
    )
  }
}
