import { ProductNotFoundError } from "../errors"

import { type Product, type ProductAdapter } from "./adapters"

export type GetOwnerProductDeps = ProductAdapter

/**
 * Use case `getOwnerProduct` (KAN-20). Récupère un produit appartenant au
 * caller, sinon `ProductNotFoundError`. La RLS garantit qu'on ne peut
 * pas lire un produit d'un autre user (équivalence 404 / 403).
 */
export async function getOwnerProduct(
  productId: string,
  ownerId: string,
  deps: GetOwnerProductDeps,
): Promise<Product> {
  const product = await deps.findById(productId, ownerId)
  if (!product) {
    throw new ProductNotFoundError()
  }
  return product
}
