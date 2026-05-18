import { ProductPhotoReorderInput } from "@delta/contracts/product"

import {
  ProductNotFoundError,
  ProductPhotoInvalidReorderError,
  ProductValidationError,
} from "../../errors"
import { type Product, type ProductAdapter } from "../adapters"

export type ReorderProductPhotosDeps = ProductAdapter

/**
 * Use case `reorderProductPhotos` (KAN-21).
 *
 * Étapes :
 *   1. Validation Zod (`ProductPhotoReorderInput` — `from !== to` déjà rattrapé).
 *   2. Vérification existence + non-suppression du produit (`findById`).
 *   3. Vérification `from` et `to` dans `[0, photos.length - 1]`.
 *   4. Permutation via `deps.reorderPhotos`.
 *
 * `photos[0]` reste la couverture par convention — un swap `from=2, to=0`
 * fait passer la photo 2 en couverture (effet voulu côté UI).
 *
 * Erreurs typées :
 *   - ProductValidationError
 *   - ProductNotFoundError
 *   - ProductPhotoInvalidReorderError
 */
export async function reorderProductPhotos(
  productId: string,
  input: unknown,
  ownerId: string,
  deps: ReorderProductPhotosDeps,
): Promise<Product> {
  const parsed = ProductPhotoReorderInput.safeParse(input)
  if (!parsed.success) {
    throw new ProductValidationError(
      "Validation échouée.",
      parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    )
  }
  const { from, to } = parsed.data

  const product = await deps.findById(productId, ownerId)
  if (!product || product.deleted_at !== null) {
    throw new ProductNotFoundError()
  }
  const len = product.photos.length
  if (from >= len || to >= len) {
    throw new ProductPhotoInvalidReorderError(
      `Position hors plage (${len} photo${len > 1 ? "s" : ""} actuellement).`,
    )
  }

  // Move-then-shift : retire l'entrée à `from`, l'insère en `to`. La
  // couverture (photos[0]) se met à jour naturellement quand `to === 0`.
  const next = [...product.photos]
  const [moved] = next.splice(from, 1)
  if (!moved) {
    throw new ProductPhotoInvalidReorderError()
  }
  next.splice(to, 0, moved)

  return deps.updatePhotos(productId, ownerId, next)
}
