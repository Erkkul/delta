import {
  BuyerProfileUpsertInput,
  type BuyerProfileUpsertInput as BuyerProfileUpsertInputT,
} from "@delta/contracts/buyer-profile"

import {
  BuyerRoleForbiddenError,
  BuyerValidationError,
  RateLimitedError,
} from "../errors"
import { rateLimit, type RateLimitStore } from "../rate-limit/rate-limit"

import {
  type BuyerProfile,
  type BuyerProfileAdapter,
  type BuyerProfilePatch,
  type BuyerRoleChecker,
  type GeocodeAdapter,
} from "./adapters"

export type UpsertBuyerProfileDeps = BuyerProfileAdapter &
  BuyerRoleChecker &
  GeocodeAdapter & {
    store: RateLimitStore
  }

/**
 * Politique rate-limit pour `PUT /api/v1/me/buyer-profile` : 30 écritures
 * par heure et par user. Couvre onboarding + ajustements de zone.
 */
export const BUYER_PROFILE_UPSERT_RATE_LIMIT = {
  attempts: 30,
  windowMs: 60 * 60_000,
} as const

/**
 * Seuil de confiance API Adresse Gouv.fr en dessous duquel on ne persiste
 * pas les coordonnées (aligné avec le use case producteur, KAN-17).
 */
const GEOCODE_SCORE_THRESHOLD = 0.5

/**
 * Use case `upsertBuyerProfile` (KAN-25 — KAN-81 onboarding + KAN-82 édition).
 *
 * Étapes :
 *   1. Vérifie le rôle acheteur (BuyerRoleForbiddenError sinon)
 *   2. Rate-limit fenêtre fixe par user
 *   3. Validation Zod (`BuyerProfileUpsertInput`)
 *   4. Upsert des champs non-géo (création lazy de la row si absente)
 *   5. Pose la zone géographique :
 *      - coordonnées explicites client → écriture directe
 *      - sinon géocodage best-effort du label ; si échec ou score < seuil,
 *        position laissée à null sans bloquer l'upsert
 *
 * Le géocodage ne bloque jamais l'upsert — le texte d'adresse reste la
 * source de vérité, la position est recalculable plus tard.
 */
export async function upsertBuyerProfile(
  input: unknown,
  userId: string,
  deps: UpsertBuyerProfileDeps,
): Promise<BuyerProfile> {
  if (!(await deps.hasBuyerRole(userId))) {
    throw new BuyerRoleForbiddenError()
  }

  const limit = await rateLimit(
    `buyer:profile:${userId}`,
    BUYER_PROFILE_UPSERT_RATE_LIMIT.attempts,
    BUYER_PROFILE_UPSERT_RATE_LIMIT.windowMs,
    deps.store,
  )
  if (!limit.allowed) {
    throw new RateLimitedError(limit.retryAfterMs)
  }

  const parsed = BuyerProfileUpsertInput.safeParse(input)
  if (!parsed.success) {
    throw new BuyerValidationError(
      "Validation du formulaire échouée.",
      parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    )
  }
  const data: BuyerProfileUpsertInputT = parsed.data

  const patch: BuyerProfilePatch = {
    address_label: data.address_label,
  }
  if ("display_name" in data) patch.display_name = data.display_name ?? null
  if ("city" in data) patch.city = data.city ?? null
  if ("postcode" in data) patch.postcode = data.postcode ?? null

  const updated = await deps.upsert(userId, patch)
  const hasLocation = await applyLocation(data, deps)

  return { ...updated, has_location: hasLocation }
}

/**
 * Pose la zone géographique. Retourne `true` si une position a été
 * effectivement écrite, `false` si elle a été laissée/remise à null.
 */
async function applyLocation(
  data: BuyerProfileUpsertInputT,
  deps: GeocodeAdapter & BuyerProfileAdapter,
): Promise<boolean> {
  // 1. Coords explicites client → écriture directe (sans appel API).
  if (data.longitude != null && data.latitude != null) {
    await deps.setLocation(data.longitude, data.latitude)
    return true
  }
  // 2. Pas de coords → géocodage best-effort du label.
  try {
    const r = await deps.geocodeAddress(data.address_label)
    if (r && r.score >= GEOCODE_SCORE_THRESHOLD) {
      await deps.setLocation(r.longitude, r.latitude)
      return true
    }
    await deps.setLocation(null, null)
    return false
  } catch {
    await deps.setLocation(null, null)
    return false
  }
}
