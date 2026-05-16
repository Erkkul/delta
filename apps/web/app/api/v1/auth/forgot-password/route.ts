import { RESET_PASSWORD_ERROR_CODES } from "@delta/contracts/auth"
import { auth as coreAuth } from "@delta/core"
import { AuthValidationError, RateLimitedError } from "@delta/core/errors"
import { type NextRequest, NextResponse } from "next/server"

import { getAdminSupabase } from "@/lib/supabase/server"
import { getRateLimitStore } from "@/lib/upstash"

/**
 * POST /api/v1/auth/forgot-password (KAN-157 — AU-FP1).
 *
 * Input  : { email }
 * Output (204) : aucun body
 * Codes  : 204 / 400 (validation) / 429 (rate-limit dépassé)
 *
 * Anti-énumération stricte : on retourne TOUJOURS 204 si l'email est
 * bien formé, peu importe que le compte existe ou non. Le rate-limit
 * Upstash (3/h/email) protège contre le spam ; en cas de dépassement,
 * 429 est exposé avec un `Retry-After` car le client doit pouvoir
 * réagir (l'attaquant a déjà obtenu cette info en envoyant 4 fois).
 *
 * L'envoi du mail est délégué à Supabase Auth (`resetPasswordForEmail`),
 * qui ne distingue pas non plus côté serveur. Toute issue (email
 * inconnu, throttling Supabase) est avalée par l'adapter — voir
 * specs/KAN-157/design.md §Risques.
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

  const admin = getAdminSupabase()

  try {
    await coreAuth.requestPasswordReset(body, {
      store: getRateLimitStore(),
      async sendRecoveryEmail(email) {
        // Délègue à Supabase Auth. Aucune erreur n'est remontée : si
        // l'email est inconnu, Supabase ne se plaint pas non plus. On
        // capture quand même les erreurs réseau pour ne pas leaker une
        // 500 au client.
        await admin.auth.resetPasswordForEmail(email).catch(() => {
          // Anti-énumération : on swallow.
        })
      },
    })

    return new NextResponse(null, { status: 204 })
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
    return NextResponse.json(
      {
        error: "Erreur serveur, réessayez plus tard.",
        code: RESET_PASSWORD_ERROR_CODES.Unknown,
      },
      { status: 500 },
    )
  }
}
