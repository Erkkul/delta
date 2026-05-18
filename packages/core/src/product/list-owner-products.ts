import { ProductListQuery } from "@delta/contracts/product"

import { ProductValidationError } from "../errors"

import {
  type ProductAdapter,
  type ProductListResult,
} from "./adapters"

export type ListOwnerProductsDeps = ProductAdapter

/**
 * Use case `listOwnerProducts` (KAN-20).
 *
 * Délègue le filtrage au repo (status + recherche FTS) et retourne
 * `{ items, nextCursor }`. Pagination keyset par `created_at DESC` (cf.
 * design.md §UI — la liste producteur est triée par date de création).
 *
 * Erreurs typées :
 *   - ProductValidationError (query string malformée)
 */
export async function listOwnerProducts(
  query: unknown,
  ownerId: string,
  deps: ListOwnerProductsDeps,
): Promise<ProductListResult> {
  const parsed = ProductListQuery.safeParse(query)
  if (!parsed.success) {
    throw new ProductValidationError(
      "Paramètres de recherche invalides.",
      parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    )
  }
  const { status, q, limit, cursor } = parsed.data

  return deps.findByOwner(ownerId, {
    status,
    q: q && q.length > 0 ? q : null,
    limit,
    cursor: cursor ?? null,
  })
}
