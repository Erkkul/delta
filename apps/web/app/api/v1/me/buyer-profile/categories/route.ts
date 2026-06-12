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
  getBuyerCategoriesAdapter,
  getBuyerRoleChecker,
} from "@/lib/buyer/adapters"
import { serializeError } from "@/lib/serialize-error"
import { getServerSupabase } from "@/lib/supabase/server"
import { getRateLimitStore } from "@/lib/upstash"

/**
 * PUT /api/v1/me/buyer-profile/categories (KAN-26 — KAN-83 onboarding +
 * KAN-84 paramètres).
 *
 * Upsert des préférences catégories de l'acheteur (sous-ensemble de l'enum
 * product_category). Endpoint dédié pour ne pas toucher au contrat d'upsert
 * de la zone (qui exige `address_label`) ni risquer de réinitialiser la
 * position — cf. specs/KAN-26/notes.md.
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
    const updated = await coreBuyerProfile.updateBuyerCategories(
      body,
      user.id,
      {
        ...getBuyerCategoriesAdapter(supabase),
        ...getBuyerRoleChecker(supabase),
        store: getRateLimitStore(),
      },
    )
    const snapshot: BuyerProfileSnapshot = {
      display_name: updated.display_name,
      address_label: updated.address_label,
      city: updated.city,
      postcode: updated.postcode,
      has_location: updated.has_location,
      preferred_categories: updated.preferred_categories,
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
    console.error("[api/v1/me/buyer-profile/categories] PUT failed", {
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
