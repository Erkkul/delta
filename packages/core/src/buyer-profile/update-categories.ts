import { BuyerCategoriesInput } from "@delta/contracts/buyer-profile"

import {
  BuyerRoleForbiddenError,
  BuyerValidationError,
  RateLimitedError,
} from "../errors"
import { rateLimit, type RateLimitStore } from "../rate-limit/rate-limit"

import {
  type BuyerCategoriesAdapter,
  type BuyerProfile,
  type BuyerRoleChecker,
} from "./adapters"

export type UpdateBuyerCategoriesDeps = BuyerCategoriesAdapter &
  BuyerRoleChecker & {
    store: RateLimitStore
  }

/**
 * Politique rate-limit pour `PUT /api/v1/me/buyer-profile/categories` : 30
 * écritures par heure et par user (aligné sur l'upsert zone).
 */
export const BUYER_CATEGORIES_RATE_LIMIT = {
  attempts: 30,
  windowMs: 60 * 60_000,
} as const

/**
 * Use case `updateBuyerCategories` (KAN-26 — KAN-83 onboarding + KAN-84 édition).
 *
 * Étapes :
 *   1. Vérifie le rôle acheteur (BuyerRoleForbiddenError sinon)
 *   2. Rate-limit fenêtre fixe par user
 *   3. Validation Zod (`BuyerCategoriesInput`)
 *   4. Dédoublonnage des catégories (préserve l'ordre de première apparition)
 *   5. Upsert des préférences (création lazy de la row si absente, sans
 *      jamais toucher la zone)
 *
 * La liste vide est valide : elle réinitialise les préférences.
 */
export async function updateBuyerCategories(
  input: unknown,
  userId: string,
  deps: UpdateBuyerCategoriesDeps,
): Promise<BuyerProfile> {
  if (!(await deps.hasBuyerRole(userId))) {
    throw new BuyerRoleForbiddenError()
  }

  const limit = await rateLimit(
    `buyer:categories:${userId}`,
    BUYER_CATEGORIES_RATE_LIMIT.attempts,
    BUYER_CATEGORIES_RATE_LIMIT.windowMs,
    deps.store,
  )
  if (!limit.allowed) {
    throw new RateLimitedError(limit.retryAfterMs)
  }

  const parsed = BuyerCategoriesInput.safeParse(input)
  if (!parsed.success) {
    throw new BuyerValidationError(
      "Validation des préférences échouée.",
      parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    )
  }

  const categories = [...new Set(parsed.data.preferred_categories)]
  return deps.setCategories(userId, categories)
}
