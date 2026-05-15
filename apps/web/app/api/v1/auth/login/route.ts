import { LOGIN_ERROR_CODES, type LoginOutput } from "@delta/contracts/auth"
import { auth as coreAuth } from "@delta/core"
import {
  AuthValidationError,
  InvalidCredentialsError,
  RateLimitedError,
} from "@delta/core/errors"
import { usersRepo } from "@delta/db/users"
import { type NextRequest, NextResponse } from "next/server"

import { getAdminSupabase, getServerSupabase } from "@/lib/supabase/server"
import { getRateLimitStore } from "@/lib/upstash"

/**
 * POST /api/v1/auth/login (KAN-3).
 *
 * Input  : { email, password }
 * Output (200) : { userId, roles }
 * Codes  : 200 / 400 (validation) / 401 (identifiants invalides — opaque) /
 *          429 (rate-limit dépassé, header `Retry-After` posé)
 *
 * La session est posée côté serveur via le client `@supabase/ssr` (cookies
 * httpOnly), pas via le client admin. Le client admin ne sert qu'à lire
 * `users.roles` pour la redirection client (bypass RLS).
 *
 * Anti-énumération : le message d'erreur 401 reste identique que l'email
 * existe ou non, que le mot de passe soit faux ou que l'email ne soit
 * pas vérifié.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as unknown
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Body JSON manquant ou invalide.", code: LOGIN_ERROR_CODES.ValidationFailed },
      { status: 400 },
    )
  }

  const supabase = await getServerSupabase()
  const admin = getAdminSupabase()

  try {
    const result: LoginOutput = await coreAuth.loginWithEmail(body, {
      store: getRateLimitStore(),
      async signInWithPassword(input) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: input.email,
          password: input.password,
        })
        // Toute erreur Supabase = échec opaque, peu importe le code
        // (`invalid_credentials`, `email_not_confirmed`, etc.) — on
        // ne fuit aucune information sur l'existence du compte.
        //
        // TODO(KAN-157) : l'utilisateur dont `email_not_confirmed`
        // est avalé ici sera bloqué silencieusement. Prévoir un
        // renvoi OTP via le flow "Mot de passe oublié" (cf.
        // specs/KAN-3/notes.md § Points à traiter dans KAN-157).
        if (error || !data.user) return null
        return { userId: data.user.id }
      },
      async loadRoles(userId) {
        const row = await usersRepo.findById(admin, userId)
        return row?.roles ?? []
      },
    })

    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    if (err instanceof AuthValidationError) {
      return NextResponse.json(
        { error: "Validation échouée.", code: err.code, issues: err.issues },
        { status: 400 },
      )
    }
    if (err instanceof RateLimitedError) {
      const retryAfterSeconds = Math.max(1, Math.ceil(err.retryAfterMs / 1000))
      return NextResponse.json(
        {
          error:
            "Trop de tentatives, réessayez dans quelques minutes.",
          code: err.code,
          retryAfterSeconds,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds) },
        },
      )
    }
    if (err instanceof InvalidCredentialsError) {
      return NextResponse.json(
        { error: "Identifiants invalides.", code: err.code },
        { status: 401 },
      )
    }
    return NextResponse.json(
      {
        error: "Erreur serveur, réessayez plus tard.",
        code: LOGIN_ERROR_CODES.Unknown,
      },
      { status: 500 },
    )
  }
}
