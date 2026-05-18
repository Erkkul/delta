import {
  ProducerProfileUpdateInput,
  type ProducerProfileUpdateInput as ProducerProfileUpdateInputT,
} from "@delta/contracts/producer"

import {
  ProducerProfileNotFoundError,
  ProducerRoleForbiddenError,
  ProducerValidationError,
  RateLimitedError,
} from "../errors"
import { rateLimit, type RateLimitStore } from "../rate-limit/rate-limit"

import {
  type GeocodeAdapter,
  type Producer,
  type ProducerAdapter,
  type ProducerProfilePatch,
  type RoleChecker,
} from "./adapters"

export type UpdateProducerProfileDeps = ProducerAdapter &
  RoleChecker &
  GeocodeAdapter & {
    store: RateLimitStore
  }

/**
 * Politique rate-limit pour `PATCH /api/v1/producer/profile` :
 * 60 patches par heure et par user (couvre l'autosave optimiste du form ;
 * la friction est volontairement faible, on durcira si nécessaire). Exposée
 * pour les tests d'intégration.
 */
export const PRODUCER_PROFILE_UPDATE_RATE_LIMIT = {
  attempts: 60,
  windowMs: 60 * 60_000,
} as const

/**
 * Seuil de confiance API Adresse Gouv.fr en dessous duquel on ne persiste
 * pas les coordonnées (cf. specs/KAN-17/design.md §Risques).
 */
const GEOCODE_SCORE_THRESHOLD = 0.5

/**
 * Use case `updateProducerProfile` (KAN-17).
 *
 * Étapes :
 *   1. Vérifie le rôle producteur (ProducerRoleForbiddenError sinon)
 *   2. Rate-limit fenêtre fixe par user
 *   3. Validation Zod de l'input (`ProducerProfileUpdateInput`)
 *   4. Vérifie que la row producteur existe (ProducerProfileNotFoundError sinon)
 *   5. Persiste le patch via `updateProfile`
 *   6. Si l'adresse a été touchée :
 *      - Si coordonnées explicites fournies par le client → `setPickupLocation(lng, lat)`
 *      - Sinon, si adresse non-null → tentative de géocodage serveur ; si échec ou
 *        score < seuil, position laissée à null sans bloquer la mise à jour
 *      - Si adresse passée à null → position remise à null
 *
 * Erreurs typées :
 *   - ProducerRoleForbiddenError
 *   - ProducerValidationError
 *   - ProducerProfileNotFoundError
 *   - RateLimitedError
 *
 * Le géocodage ne bloque jamais le patch — le texte d'adresse reste la
 * source de vérité. Position recalculable plus tard (job de rattrapage ou
 * nouvelle édition).
 */
export async function updateProducerProfile(
  input: unknown,
  userId: string,
  deps: UpdateProducerProfileDeps,
): Promise<Producer> {
  if (!(await deps.hasProducerRole(userId))) {
    throw new ProducerRoleForbiddenError()
  }

  const limit = await rateLimit(
    `producer:profile:${userId}`,
    PRODUCER_PROFILE_UPDATE_RATE_LIMIT.attempts,
    PRODUCER_PROFILE_UPDATE_RATE_LIMIT.windowMs,
    deps.store,
  )
  if (!limit.allowed) {
    throw new RateLimitedError(limit.retryAfterMs)
  }

  const parsed = ProducerProfileUpdateInput.safeParse(input)
  if (!parsed.success) {
    throw new ProducerValidationError(
      "Validation du formulaire échouée.",
      parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    )
  }
  const data: ProducerProfileUpdateInputT = parsed.data

  const current = await deps.findByUserId(userId)
  if (!current) {
    throw new ProducerProfileNotFoundError()
  }

  const patch: ProducerProfilePatch = stripCoords(data)
  const updated = await deps.updateProfile(userId, patch)

  // Recalcul de la position uniquement si l'adresse a été touchée.
  const addressTouched = Object.prototype.hasOwnProperty.call(
    data,
    "pickup_address",
  )
  if (addressTouched) {
    await applyPickupLocation(data, deps)
  }

  return updated
}

/**
 * Retire les coordonnées du patch transmis au repo (la `pickup_location`
 * passe par une RPC dédiée). Les autres champs sont conservés tels quels.
 */
function stripCoords(data: ProducerProfileUpdateInputT): ProducerProfilePatch {
  const patch: ProducerProfilePatch = {}
  if ("display_name" in data) patch.display_name = data.display_name
  if ("public_description" in data)
    patch.public_description = data.public_description
  if ("profile_photo_url" in data)
    patch.profile_photo_url = data.profile_photo_url
  if (data.farm_photos !== undefined) patch.farm_photos = data.farm_photos
  if (data.labels !== undefined) patch.labels = data.labels
  if ("pickup_public_zone" in data)
    patch.pickup_public_zone = data.pickup_public_zone
  if ("pickup_address" in data) patch.pickup_address = data.pickup_address
  if (data.pickup_days !== undefined) patch.pickup_days = data.pickup_days
  if ("pickup_hours_start" in data)
    patch.pickup_hours_start = data.pickup_hours_start
  if ("pickup_hours_end" in data)
    patch.pickup_hours_end = data.pickup_hours_end
  return patch
}

async function applyPickupLocation(
  data: ProducerProfileUpdateInputT,
  deps: GeocodeAdapter & ProducerAdapter,
): Promise<void> {
  // 1. Adresse effacée → reset position.
  if (data.pickup_address === null) {
    await deps.setPickupLocation(null, null)
    return
  }
  // 2. Coords explicites client → écriture directe (sans appel API).
  if (
    data.pickup_longitude != null &&
    data.pickup_latitude != null
  ) {
    await deps.setPickupLocation(data.pickup_longitude, data.pickup_latitude)
    return
  }
  // 3. Texte changé sans coords → tentative géocodage serveur (best-effort).
  if (typeof data.pickup_address === "string" && data.pickup_address.length > 0) {
    try {
      const r = await deps.geocodeAddress(data.pickup_address)
      if (r && r.score >= GEOCODE_SCORE_THRESHOLD) {
        await deps.setPickupLocation(r.longitude, r.latitude)
      } else {
        await deps.setPickupLocation(null, null)
      }
    } catch {
      // Best-effort : on accepte de laisser la position null.
      await deps.setPickupLocation(null, null)
    }
  }
}
