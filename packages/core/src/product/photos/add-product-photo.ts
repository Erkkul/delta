import {
  ProductPhotoConfirmInput,
  type ProductPhotoEntry,
} from "@delta/contracts/product"

import {
  ProductNotFoundError,
  ProductPhotoLimitReachedError,
  ProductPhotoPathRejectedError,
  ProductValidationError,
} from "../../errors"
import { type Product, type ProductAdapter } from "../adapters"

const MAX_PHOTOS = 4

export type AddProductPhotoDeps = ProductAdapter

/**
 * Use case `addProductPhoto` (KAN-21).
 *
 * Étapes :
 *   1. Validation Zod (`ProductPhotoConfirmInput`).
 *   2. Anti-tampering du path : doit commencer par `{ownerId}/{productId}/`.
 *   3. Vérification existence + non-suppression du produit (`findById`).
 *   4. Vérification `photos.length < MAX_PHOTOS`.
 *   5. Append via `deps.appendPhoto`.
 *
 * Erreurs typées :
 *   - ProductValidationError
 *   - ProductPhotoPathRejectedError
 *   - ProductNotFoundError
 *   - ProductPhotoLimitReachedError
 */
export async function addProductPhoto(
  productId: string,
  input: unknown,
  ownerId: string,
  deps: AddProductPhotoDeps,
): Promise<Product> {
  const parsed = ProductPhotoConfirmInput.safeParse(input)
  if (!parsed.success) {
    throw new ProductValidationError(
      "Validation échouée.",
      parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    )
  }
  const { path, public_url } = parsed.data

  const expectedPrefix = `${ownerId}/${productId}/`
  if (!path.startsWith(expectedPrefix)) {
    throw new ProductPhotoPathRejectedError()
  }

  const product = await deps.findById(productId, ownerId)
  if (!product || product.deleted_at !== null) {
    throw new ProductNotFoundError()
  }
  if (product.photos.length >= MAX_PHOTOS) {
    throw new ProductPhotoLimitReachedError()
  }

  const entry: ProductPhotoEntry = { url: public_url, path }
  return deps.updatePhotos(productId, ownerId, [...product.photos, entry])
}
