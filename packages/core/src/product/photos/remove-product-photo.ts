import { ProductPhotoDeleteInput } from "@delta/contracts/product"

import {
  ProductNotFoundError,
  ProductPhotoNotFoundError,
  ProductValidationError,
} from "../../errors"
import { type Product, type ProductAdapter } from "../adapters"

export type RemoveProductPhotoDeps = ProductAdapter

export type RemoveProductPhotoResult = {
  product: Product
  /** Path Storage de la photo retirée, à supprimer côté bucket. */
  removedPath: string
}

/**
 * Use case `removeProductPhoto` (KAN-21).
 *
 * Étapes :
 *   1. Validation Zod (`ProductPhotoDeleteInput`).
 *   2. Vérification existence + non-suppression du produit (`findById`).
 *   3. Vérification `index < photos.length`.
 *   4. Extraction du `path` à supprimer côté Storage (le caller s'en charge).
 *   5. Splice via `deps.removePhotoAt`.
 *
 * Le `path` Storage est renvoyé pour que l'adapter HTTP puisse appeler
 * `client.storage.remove([path])` après la mise à jour DB. Si le remove
 * Storage échoue (404, réseau), le fichier devient orphelin — accepté au
 * MVP (cf. specs/KAN-21/design.md § Risques).
 *
 * Erreurs typées :
 *   - ProductValidationError
 *   - ProductNotFoundError
 *   - ProductPhotoNotFoundError
 */
export async function removeProductPhoto(
  productId: string,
  input: unknown,
  ownerId: string,
  deps: RemoveProductPhotoDeps,
): Promise<RemoveProductPhotoResult> {
  const parsed = ProductPhotoDeleteInput.safeParse(input)
  if (!parsed.success) {
    throw new ProductValidationError(
      "Validation échouée.",
      parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    )
  }
  const { index } = parsed.data

  const product = await deps.findById(productId, ownerId)
  if (!product || product.deleted_at !== null) {
    throw new ProductNotFoundError()
  }
  if (index >= product.photos.length) {
    throw new ProductPhotoNotFoundError()
  }

  const removed = product.photos[index]
  if (!removed) {
    throw new ProductPhotoNotFoundError()
  }

  const next = product.photos.filter((_, i) => i !== index)
  const updated = await deps.updatePhotos(productId, ownerId, next)
  return { product: updated, removedPath: removed.path }
}
