import {
  RESET_PASSWORD_ERROR_CODES,
  type ResetPasswordOutput,
} from "@delta/contracts/auth"
import { auth as coreAuth } from "@delta/core"
import {
  AuthValidationError,
  InvalidRecoveryTokenError,
  RateLimitedError,
  WeakPasswordError,
} from "@delta/core/errors"
import { type NextRequest, NextResponse } from "next/server"

import { getServerSupabase } from "@/lib/supabase/server"
import { getRateLimitStore } from "@/lib/upstash"

/**
 * POST /api/v1/auth/reset-password (KAN-157 — AU-FP3).
 *
 * Input  : { email, token, newPassword }
 * Output (200) : { userId }
 * Codes  : 200 / 400 (validation, mdp faible) / 401 (token invalide ou
 *          expiré — opaque) / 429 (rate-limit dépassé)
 *
 * Flow Supabase :
 *   1. `verifyOtp({ email, token, type: 'recovery' })` → ouvre une
 *      session de recovery courte (cookies httpOnly via `@supabase/ssr`).
 *   2. `updateUser({ password })` → applique le nouveau mot de passe.
 *      La config `secure password change ON` (cf. tech/setup.md) invalide
 *      les autres sessions Supabase.
 *   3. `signOut()` → ferme la session de recovery. Le client est ensuite
 *      redirigé vers `/login` pour une connexion explicite avec le nouveau
 *      mot de passe (cf. specs/KAN-157/design.md § État UI).
 *
 * Anti-énumération : tout échec (OTP faux, expiré, déjà consommé, email
 * inconnu) renvoie `InvalidRecoveryTokenError` → 401 avec message
 * générique. Seule la politique mdp peut remonter une erreur distincte
 * (400 WeakPassword), assumée car le hint est déjà public au signup.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as unknown
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      {
        error: "Body JSON manquant ou invalide.",
        code: RESET_PASSWORD_ERROR_CODES.ValidationFailed,
      },
      { status: 400 },
    )
  }

  const supabase = await getServerSupabase()

  try {
    const result: ResetPasswordOutput = await coreAuth.resetPasswordWithOtp(
      body,
      {
        store: getRateLimitStore(),
        async verifyAndUpdate(input) {
          const { data, error } = await supabase.auth.verifyOtp({
            email: input.email,
            token: input.token,
            type: "recovery",
          })
          // Anti-énumération : toute issue (token faux, expiré, email
          // inconnu, OTP déjà consommé) → `null`.
          if (error || !data.session || !data.user) return null

          const { error: updateError } = await supabase.auth.updateUser({
            password: input.newPassword,
          })
          if (updateError) {
            // Supabase peut rejeter le mdp pour cause de politique (HIBP
            // leaked password protection en Pro, ou règle dashboard
            // renforcée). Distingué côté API car le hint est déjà public.
            const code = updateError.code ?? ""
            const message = updateError.message
            if (code === "weak_password" || /weak/i.test(message)) {
              throw new WeakPasswordError(message)
            }
            return null
          }

          // Ferme la session de recovery — le caller redirige vers /login.
          await supabase.auth.signOut().catch(() => {
            // Idempotent ; on ignore l'erreur.
          })

          return { userId: data.user.id }
        },
      },
    )

    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    if (err instanceof AuthValidationError) {
      return NextResponse.json(
        { error: "Validation échouée.", code: err.code, issues: err.issues },
        { status: 400 },
      )
    }
    if (err instanceof WeakPasswordError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 400 },
      )
    }
    if (err instanceof RateLimitedError) {
      const retryAfterSeconds = Math.max(1, Math.ceil(err.retryAfterMs / 1000))
      return NextResponse.json(
        {
          error: "Trop de tentatives, réessayez plus tard.",
          code: err.code,
          retryAfterSeconds,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds) },
        },
      )
    }
    if (err instanceof InvalidRecoveryTokenError) {
      return NextResponse.json(
        { error: "Code de récupération invalide ou expiré.", code: err.code },
        { status: 401 },
      )
    }
    return NextResponse.json(
      {
        error: "Erreur serveur, réessayez plus tard.",
        code: RESET_PASSWORD_ERROR_CODES.Unknown,
      },
      { status: 500 },
    )
  }
}
