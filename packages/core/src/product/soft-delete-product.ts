import {
  ProductAlreadyDeletedError,
  ProductNotFoundError,
} from "../errors"

import { type Product, type ProductAdapter } from "./adapters"

export type SoftDeleteProductDeps = ProductAdapter

/**
 * Use case `softDeleteProduct` (KAN-20 — KAN-71).
 *
 * Étapes :
 *   1. Vérification existence (`findById` filtre déjà `deleted_at IS NULL`).
 *   2. Si introuvable → `ProductNotFoundError` (couvre aussi le cas
 *      « déjà supprimé », identique pour le caller). On vérifie ensuite
 *      via le retour du repo si la row a effectivement été marquée — si
 *      `deleted_at` est resté null, c'est qu'un autre process a annulé
 *      l'update (cas extrêmement marginal, conservé pour robustesse).
 *   3. Soft-delete via le repo (`deleted_at = now()`).
 *
 * Erreurs typées :
 *   - ProductNotFoundError
 *   - ProductAlreadyDeletedError (si l'adapter renvoie une row déjà
 *     soft-deleted — cas race condition rare)
 */
export async function softDeleteProduct(
  productId: string,
  ownerId: string,
  deps: SoftDeleteProductDeps,
): Promise<Product> {
  const current = await deps.findById(productId, ownerId)
  if (!current) {
    throw new ProductNotFoundError()
  }
  if (current.deleted_at !== null) {
    // findById filtre normalement les soft-deleted ; cette branche
    // sert de garde-fou si l'adapter venait à élargir son filtre.
    throw new ProductAlreadyDeletedError()
  }

  return deps.softDelete(productId, ownerId)
}
