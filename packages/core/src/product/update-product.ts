import {
  ProductUpdateInput,
  type ProductUpdateInput as ProductUpdateInputT,
} from "@delta/contracts/product"

import { ProductNotFoundError, ProductValidationError } from "../errors"

import {
  type Product,
  type ProductAdapter,
  type ProductPatch,
} from "./adapters"

export type UpdateProductDeps = ProductAdapter

/**
 * Use case `updateProduct` (KAN-20 — KAN-70).
 *
 * Étapes :
 *   1. Validation Zod (`ProductUpdateInput`, patch partiel).
 *   2. Vérification existence + ownership (`findById`).
 *   3. Application du patch.
 *
 * Le repo + la RLS garantissent qu'un produit appartenant à un autre user
 * n'est pas modifiable. On lève `ProductNotFoundError` pour les deux cas
 * (anti-énumération applicative — cohérent KAN-3).
 *
 * Erreurs typées :
 *   - ProductValidationError
 *   - ProductNotFoundError
 */
export async function updateProduct(
  productId: string,
  input: unknown,
  ownerId: string,
  deps: UpdateProductDeps,
): Promise<Product> {
  const parsed = ProductUpdateInput.safeParse(input)
  if (!parsed.success) {
    throw new ProductValidationError(
      "Validation du formulaire échouée.",
      parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    )
  }
  const data: ProductUpdateInputT = parsed.data

  const current = await deps.findById(productId, ownerId)
  if (!current) {
    throw new ProductNotFoundError()
  }

  const patch: ProductPatch = {}
  if (data.name !== undefined) patch.name = data.name
  if ("description" in data) patch.description = data.description ?? null
  if (data.category !== undefined) patch.category = data.category
  if (data.packaging !== undefined) patch.packaging = data.packaging
  if (data.unit_price_cents !== undefined)
    patch.unit_price_cents = data.unit_price_cents
  if (data.stock !== undefined) patch.stock = data.stock
  if ("low_stock_threshold" in data)
    patch.low_stock_threshold = data.low_stock_threshold ?? null
  if ("availability_from" in data)
    patch.availability_from = data.availability_from ?? null
  if ("availability_to" in data)
    patch.availability_to = data.availability_to ?? null
  if (data.labels !== undefined) patch.labels = data.labels
  if (data.status !== undefined) patch.status = data.status

  return deps.update(productId, ownerId, patch)
}
