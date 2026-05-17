import {
  PRODUCER_PROFILE_ERROR_CODES,
  type ProducerProfileSnapshot,
} from "@delta/contracts/producer"
import { producer as coreProducer } from "@delta/core"
import {
  ProducerProfileNotFoundError,
  ProducerRoleForbiddenError,
  ProducerValidationError,
  RateLimitedError,
} from "@delta/core/errors"
import { type NextRequest, NextResponse } from "next/server"

import {
  getGeocodeAdapter,
  getProducerAdapter,
  getRoleChecker,
} from "@/lib/producer/adapters"
import { getServerSupabase } from "@/lib/supabase/server"
import { serializeError } from "@/lib/serialize-error"
import { getRateLimitStore } from "@/lib/upstash"

/**
 * GET /api/v1/producer/profile (KAN-17).
 *
 * Renvoie le snapshot complet du profil producteur du caller, y compris
 * `pickup_address` (exposable au owner uniquement — RLS garantit qu'aucun
 * autre user n'arrive ici).
 *
 * Codes : 200 / 401 / 403 / 404
 */
export async function GET() {
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

  const adapter = getProducerAdapter(supabase)
  const role = getRoleChecker(supabase)
  if (!(await role.hasProducerRole(user.id))) {
    return NextResponse.json(
      {
        error: "Rôle producteur requis.",
        code: PRODUCER_PROFILE_ERROR_CODES.RoleForbidden,
      },
      { status: 403 },
    )
  }

  const producer = await adapter.findByUserId(user.id)
  if (!producer) {
    return NextResponse.json(
      {
        error: "Profil producteur introuvable.",
        code: PRODUCER_PROFILE_ERROR_CODES.ProfileNotFound,
      },
      { status: 404 },
    )
  }

  const snapshot: ProducerProfileSnapshot = {
    id: producer.id,
    display_name: producer.display_name,
    public_description: producer.public_description,
    profile_photo_url: producer.profile_photo_url,
    farm_photos: producer.farm_photos,
    labels: producer.labels,
    pickup_public_zone: producer.pickup_public_zone,
    pickup_address: producer.pickup_address,
    pickup_days: producer.pickup_days,
    pickup_hours_start: producer.pickup_hours_start,
    pickup_hours_end: producer.pickup_hours_end,
    paused: producer.paused,
    paused_at: producer.paused_at,
    siret_status: producer.siret_status,
    stripe_status: producer.stripe_status,
    payouts_enabled: producer.payouts_enabled,
  }
  return NextResponse.json(snapshot, { status: 200 })
}

/**
 * PATCH /api/v1/producer/profile (KAN-17).
 *
 * Patch partiel des champs publics et de l'adresse de récupération.
 * Le géocodage est tenté côté serveur si l'adresse change sans coordonnées
 * explicites — best-effort, ne bloque jamais l'écriture du texte.
 *
 * Codes : 200 / 400 / 401 / 403 / 404 / 429
 */
export async function PATCH(req: NextRequest) {
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
    const updated = await coreProducer.updateProducerProfile(body, user.id, {
      ...getProducerAdapter(supabase),
      ...getRoleChecker(supabase),
      ...getGeocodeAdapter(),
      store: getRateLimitStore(),
    })
    const snapshot: ProducerProfileSnapshot = {
      id: updated.id,
      display_name: updated.display_name,
      public_description: updated.public_description,
      profile_photo_url: updated.profile_photo_url,
      farm_photos: updated.farm_photos,
      labels: updated.labels,
      pickup_public_zone: updated.pickup_public_zone,
      pickup_address: updated.pickup_address,
      pickup_days: updated.pickup_days,
      pickup_hours_start: updated.pickup_hours_start,
      pickup_hours_end: updated.pickup_hours_end,
      paused: updated.paused,
      paused_at: updated.paused_at,
      siret_status: updated.siret_status,
      stripe_status: updated.stripe_status,
      payouts_enabled: updated.payouts_enabled,
    }
    return NextResponse.json(snapshot, { status: 200 })
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
    if (err instanceof RateLimitedError) {
      const retryAfterSeconds = Math.max(1, Math.ceil(err.retryAfterMs / 1000))
      return NextResponse.json(
        {
          error: "Trop de modifications, réessayez plus tard.",
          code: PRODUCER_PROFILE_ERROR_CODES.RateLimited,
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
        { error: "Validation échouée.", code: err.code, issues: err.issues },
        { status: 400 },
      )
    }
    console.error("[api/v1/producer/profile] PATCH failed", {
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
