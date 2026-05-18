import { type ProductStatus } from "@delta/contracts/product"

import {
  ProductNotFoundError,
  ProductTransitionInvalidError,
} from "../errors"

import { type Product, type ProductAdapter } from "./adapters"
import { getPublishPreconditions } from "./publish-preconditions"

export type TransitionProductStatusDeps = ProductAdapter

/**
 * Graphe de transitions retenu (KAN-23) :
 *   - `draft   ↔ active`
 *   - `active  ↔ disabled`
 *   - `draft   → disabled`
 *   - `disabled → draft`
 *
 * Seules les transitions vers `active` ont des préconditions (cf.
 * `getPublishPreconditions`). Toute transition vers le même statut est
 * refusée pour ne pas masquer un bug applicatif (clic répété, sérialisation
 * incohérente côté client).
 */
const ALLOWED_TRANSITIONS: Record<ProductStatus, ReadonlySet<ProductStatus>> = {
  draft: new Set<ProductStatus>(["active", "disabled"]),
  active: new Set<ProductStatus>(["draft", "disabled"]),
  disabled: new Set<ProductStatus>(["active", "draft"]),
}

/**
 * Use case `transitionProductStatus` (KAN-23 — KAN-76).
 *
 * Étapes :
 *   1. Fetch produit owner (sinon `ProductNotFoundError`).
 *   2. Vérification graphe de transitions ; refuser no-op et statuts
 *      inconnus avec `ProductTransitionInvalidError` (`reason =
 *      "invalid_transition"`).
 *   3. Si `targetStatus = 'active'` : appliquer
 *      `getPublishPreconditions` ; si manquant, lever
 *      `ProductTransitionInvalidError` avec
 *      `reason = "missing_preconditions"` et la liste agrégée.
 *   4. Update DB via le repo (`update({ status })`).
 *
 * `today` est passé en paramètre (et non `new Date()` inline) pour rester
 * pur côté tests. Le route handler injecte
 * `new Date().toISOString().slice(0, 10)`.
 */
export async function transitionProductStatus(
  productId: string,
  targetStatus: ProductStatus,
  ownerId: string,
  today: string,
  deps: TransitionProductStatusDeps,
): Promise<Product> {
  const current = await deps.findById(productId, ownerId)
  if (!current) {
    throw new ProductNotFoundError()
  }

  if (current.status === targetStatus) {
    throw new ProductTransitionInvalidError({
      reason: "invalid_transition",
      missing: [],
    })
  }

  const allowed = ALLOWED_TRANSITIONS[current.status]
  if (!allowed.has(targetStatus)) {
    throw new ProductTransitionInvalidError({
      reason: "invalid_transition",
      missing: [],
    })
  }

  if (targetStatus === "active") {
    const pre = getPublishPreconditions(current, today)
    if (!pre.ok) {
      throw new ProductTransitionInvalidError({
        reason: "missing_preconditions",
        missing: pre.missing,
      })
    }
  }

  return deps.update(productId, ownerId, { status: targetStatus })
}
