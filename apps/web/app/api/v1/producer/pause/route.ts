import { PRODUCER_PROFILE_ERROR_CODES } from "@delta/contracts/producer"
import { producer as coreProducer } from "@delta/core"
import {
  ProducerProfileNotFoundError,
  ProducerRoleForbiddenError,
  ProducerValidationError,
} from "@delta/core/errors"
import { type NextRequest, NextResponse } from "next/server"

import { getProducerAdapter, getRoleChecker } from "@/lib/producer/adapters"
import { serializeError } from "@/lib/serialize-error"
import { getServerSupabase } from "@/lib/supabase/server"

/**
 * POST /api/v1/producer/pause (KAN-17).
 *
 * Bascule le flag `producers.paused`. Quand `true`, les produits du
 * producteur sont masqués du catalogue acheteur (gating RLS futur, KAN-20).
 *
 * Input  : { paused: boolean }
 * Output : { paused, paused_at }
 * Codes  : 200 / 400 / 401 / 403 / 404
 */
export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: "Non authentifié.", code: PRODUCER_PROFILE_ERROR_CODES.Unknown },
      { status: 401 },
    )
  }

  const body = (await req.json().catch(() => null)) as unknown
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      {
        error: "Body JSON manquant ou invalide.",
        code: PRODUCER_PROFILE_ERROR_CODES.ValidationFailed,
      },
      { status: 400 },
    )
  }

  try {
    const updated = await coreProducer.setProducerPause(body, user.id, {
      ...getProducerAdapter(supabase),
      ...getRoleChecker(supabase),
    })
    return NextResponse.json(
      { paused: updated.paused, paused_at: updated.paused_at },
      { status: 200 },
    )
  } catch (err) {
    if (err instanceof ProducerRoleForbiddenError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 403 },
      )
    }
    if (err instanceof ProducerProfileNotFoundError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 404 },
      )
    }
    if (err instanceof ProducerValidationError) {
      return NextResponse.json(
        { error: "Validation échouée.", code: err.code, issues: err.issues },
        { status: 400 },
      )
    }
    console.error("[api/v1/producer/pause] POST failed", {
      userId: user.id,
      error: serializeError(err),
    })
    return NextResponse.json(
      {
        error: "Erreur serveur, réessayez plus tard.",
        code: PRODUCER_PROFILE_ERROR_CODES.Unknown,
      },
      { status: 500 },
    )
  }
}
