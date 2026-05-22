import {
  BUYER_PROFILE_ERROR_CODES,
  type BuyerProfileSnapshot,
} from "@delta/contracts/buyer-profile"
import { buyerProfile as coreBuyerProfile } from "@delta/core"
import {
  BuyerRoleForbiddenError,
  BuyerValidationError,
  RateLimitedError,
} from "@delta/core/errors"
import { type NextRequest, NextResponse } from "next/server"

import {
  getBuyerProfileAdapter,
  getBuyerRoleChecker,
  getGeocodeAdapter,
} from "@/lib/buyer/adapters"
import { serializeError } from "@/lib/serialize-error"
import { getServerSupabase } from "@/lib/supabase/server"
import { getRateLimitStore } from "@/lib/upstash"

/**
 * GET /api/v1/me/buyer-profile (KAN-25).
 *
 * Renvoie le snapshot du profil acheteur du caller, ou `null` si aucune zone
 * n'a encore été enregistrée. Codes : 200 / 401 / 403
 */
export async function GET() {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: "Non authentifié.", code: BUYER_PROFILE_ERROR_CODES.Unknown },
      { status: 401 },
    )
  }

  const role = getBuyerRoleChecker(supabase)
  if (!(await role.hasBuyerRole(user.id))) {
    return NextResponse.json(
      {
        error: "Rôle acheteur requis.",
        code: BUYER_PROFILE_ERROR_CODES.RoleForbidden,
      },
      { status: 403 },
    )
  }

  const profile = await getBuyerProfileAdapter(supabase).findByUserId(user.id)
  if (!profile) {
    return NextResponse.json(null, { status: 200 })
  }

  const snapshot: BuyerProfileSnapshot = {
    display_name: profile.display_name,
    address_label: profile.address_label,
    city: profile.city,
    postcode: profile.postcode,
    has_location: profile.has_location,
  }
  return NextResponse.json(snapshot, { status: 200 })
}

/**
 * PUT /api/v1/me/buyer-profile (KAN-25 — KAN-81 onboarding + KAN-82 édition).
 *
 * Upsert de la zone d'habitation (+ nom facultatif). Le géocodage est
 * best-effort et ne bloque jamais l'écriture du texte.
 *
 * Codes : 200 / 400 / 401 / 403 / 429
 */
export async function PUT(req: NextRequest) {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: "Non authentifié.", code: BUYER_PROFILE_ERROR_CODES.Unknown },
      { status: 401 },
    )
  }

  const body = (await req.json().catch(() => null)) as unknown
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      {
        error: "Body JSON manquant ou invalide.",
        code: BUYER_PROFILE_ERROR_CODES.ValidationFailed,
      },
      { status: 400 },
    )
  }

  try {
    const updated = await coreBuyerProfile.upsertBuyerProfile(body, user.id, {
      ...getBuyerProfileAdapter(supabase),
      ...getBuyerRoleChecker(supabase),
      ...getGeocodeAdapter(),
      store: getRateLimitStore(),
    })
    const snapshot: BuyerProfileSnapshot = {
      display_name: updated.display_name,
      address_label: updated.address_label,
      city: updated.city,
      postcode: updated.postcode,
      has_location: updated.has_location,
    }
    return NextResponse.json(snapshot, { status: 200 })
  } catch (err) {
    if (err instanceof BuyerRoleForbiddenError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 403 },
      )
    }
    if (err instanceof RateLimitedError) {
      const retryAfterSeconds = Math.max(1, Math.ceil(err.retryAfterMs / 1000))
      return NextResponse.json(
        {
          error: "Trop de modifications, réessayez plus tard.",
          code: BUYER_PROFILE_ERROR_CODES.RateLimited,
          retryAfterSeconds,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds) },
        },
      )
    }
    if (err instanceof BuyerValidationError) {
      return NextResponse.json(
        { error: "Validation échouée.", code: err.code, issues: err.issues },
        { status: 400 },
      )
    }
    console.error("[api/v1/me/buyer-profile] PUT failed", {
      userId: user.id,
      error: serializeError(err),
    })
    return NextResponse.json(
      {
        error: "Erreur serveur, réessayez plus tard.",
        code: BUYER_PROFILE_ERROR_CODES.Unknown,
      },
      { status: 500 },
    )
  }
}
