import { z } from "zod"

import { ProductStatus } from "./shared"

/**
 * Filtre `status` du listing producteur. Inclut les trois statuts
 * persistables + `'all'` (KAN-20) + le statut dérivé `'sold_out'` introduit
 * par KAN-23 (cf. specs/KAN-23/design.md § API/Endpoints).
 *
 * `'sold_out'` n'est PAS une valeur de l'enum DB `product_status` —
 * c'est un filtre dérivé traduit côté repo en
 * `WHERE status = 'active' AND stock = 0`. Cohérent avec le helper
 * `getStockDisplayState` (KAN-22) qui dérive le même état à l'affichage.
 */
export const ProductListStatusFilter = z.union([
  z.literal("all"),
  ProductStatus,
  z.literal("sold_out"),
])
export type ProductListStatusFilter = z.infer<typeof ProductListStatusFilter>

/**
 * Query string pour `GET /api/v1/producer/products` (KAN-20, étendu KAN-23).
 *
 * - `status` : filtre (par défaut tous les statuts non soft-deleted)
 * - `q` : recherche FTS sur name + description (Postgres `websearch_to_tsquery`)
 * - `limit` : 1..50, par défaut 20
 * - `cursor` : ISO timestamp de `created_at` du dernier item de la page
 *   précédente (pagination keyset). Le serveur garantit l'ordre `created_at DESC`.
 */
export const ProductListQuery = z
  .object({
    status: ProductListStatusFilter.optional().default("all"),
    q: z.string().trim().max(200).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
    cursor: z.string().datetime({ offset: true }).optional(),
  })
  .strict()
export type ProductListQuery = z.infer<typeof ProductListQuery>
