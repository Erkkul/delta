import { ProductCreateInput } from "@delta/contracts/product"

import { ProductValidationError } from "../errors"

import { type Product, type ProductAdapter } from "./adapters"

export type CreateProductDeps = ProductAdapter

/**
 * Use case `createProduct` (KAN-20 — KAN-69).
 *
 * Étapes :
 *   1. Validation Zod stricte (`ProductCreateInput`).
 *   2. Normalisation des champs nullables (description / dates) — on
 *      passe `null` au repo plutôt que `undefined` pour rester en phase
 *      avec la forme DB.
 *   3. Insertion via `deps.create(ownerId, …)`.
 *
 * La vérification du rôle producteur est laissée à l'adapter HTTP (cf.
 * route handler) : le use case reste agnostique du contexte d'auth.
 *
 * Erreurs typées :
 *   - ProductValidationError (input invalide)
 */
export async function createProduct(
  input: unknown,
  ownerId: string,
  deps: CreateProductDeps,
): Promise<Product> {
  const parsed = ProductCreateInput.safeParse(input)
  if (!parsed.success) {
    throw new ProductValidationError(
      "Validation du formulaire échouée.",
      parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    )
  }
  const data = parsed.data

  return deps.create(ownerId, {
    name: data.name,
    description: data.description ?? null,
    category: data.category,
    packaging: data.packaging,
    unit_price_cents: data.unit_price_cents,
    stock: data.stock,
    availability_from: data.availability_from ?? null,
    availability_to: data.availability_to ?? null,
    status: data.status,
    labels: data.labels ?? [],
  })
}
