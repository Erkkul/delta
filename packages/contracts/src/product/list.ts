import { z } from "zod"

import { ProductStatus } from "./shared"

/**
 * Query string pour `GET /api/v1/producer/products` (KAN-20).
 *
 * - `status` : filtre (par défaut tous les statuts non soft-deleted)
 * - `q` : recherche FTS sur name + description (Postgres `websearch_to_tsquery`)
 * - `limit` : 1..50, par défaut 20
 * - `cursor` : ISO timestamp de `created_at` du dernier item de la page
 *   précédente (pagination keyset). Le serveur garantit l'ordre `created_at DESC`.
 */
export const ProductListQuery = z
  .object({
    status: z
      .union([z.literal("all"), ProductStatus])
      .optional()
      .default("all"),
    q: z.string().trim().max(200).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
    cursor: z.string().datetime({ offset: true }).optional(),
  })
  .strict()
export type ProductListQuery = z.infer<typeof ProductListQuery>
