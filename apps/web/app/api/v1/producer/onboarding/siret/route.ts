import { SIRET_DECLARATION_ERROR_CODES } from "@delta/contracts/producer"
import { producer as coreProducer } from "@delta/core"
import {
  ProducerRoleForbiddenError,
  ProducerValidationError,
  RateLimitedError,
  SiretAlreadyVerifiedError,
} from "@delta/core/errors"
import { type NextRequest, NextResponse } from "next/server"

import {
  getProducerAdapter,
  getRoleChecker,
  getSiretVerificationScheduler,
} from "@/lib/producer/adapters"
import { getServerSupabase } from "@/lib/supabase/server"
import { getRateLimitStore } from "@/lib/upstash"

/**
 * POST /api/v1/producer/onboarding/siret (KAN-16).
 *
 * Input  : SiretDeclarationInput (siret, legal_name, legal_form, naf_code)
 * Output (202) : { siret_status: 'pending' }
 * Codes  : 202 / 400 (validation) / 401 (non authentifié) /
 *          403 (rôle ≠ producteur) / 409 (SIRET déjà verified) /
 *          429 (rate-limit, header Retry-After)
 *
 * La vérification SIRET est asynchrone (job Inngest `producer.siret.requested`).
 * Le client peut continuer à configurer le wizard pendant la vérif —
 * la page `/onboarding/producteur` souscrit à la row `producers` via
 * Realtime pour refléter le passage `pending → verified | rejected`.
 */
export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: "Non authentifié.", code: SIRET_DECLARATION_ERROR_CODES.Unknown },
      { status: 401 },
    )
  }

  const body = (await req.json().catch(() => null)) as unknown
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      {
        error: "Body JSON manquant ou invalide.",
        code: SIRET_DECLARATION_ERROR_CODES.ValidationFailed,
      },
      { status: 400 },
    )
  }

  try {
    const result = await coreProducer.submitSiretDeclaration(body, user.id, {
      ...getProducerAdapter(supabase),
      ...getRoleChecker(supabase),
      ...getSiretVerificationScheduler(),
      store: getRateLimitStore(),
    })
    return NextResponse.json(result, { status: 202 })
  } catch (err) {
    if (err instanceof ProducerRoleForbiddenError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 403 },
      )
    }
    if (err instanceof RateLimitedError) {
      const retryAfterSeconds = Math.max(1, Math.ceil(err.retryAfterMs / 1000))
      return NextResponse.json(
        {
          error: "Trop de soumissions, réessayez plus tard.",
          code: SIRET_DECLARATION_ERROR_CODES.RateLimited,
          retryAfterSeconds,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds) },
        },
      )
    }
    if (err instanceof ProducerValidationError) {
      return NextResponse.json(
        {
          error: "Validation échouée.",
          code: err.code,
          issues: err.issues,
        },
        { status: 400 },
      )
    }
    if (err instanceof SiretAlreadyVerifiedError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 409 },
      )
    }
    console.error("[api/v1/producer/onboarding/siret] POST failed", {
      userId: user.id,
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      {
        error: "Erreur serveur, réessayez plus tard.",
        code: SIRET_DECLARATION_ERROR_CODES.Unknown,
      },
      { status: 500 },
    )
  }
}
