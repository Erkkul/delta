import { z } from "zod"

import { ProductStatus } from "./shared"

/**
 * Body de `POST /api/v1/producer/products/[id]/status` (KAN-23).
 *
 * Endpoint d'action séparé du `PATCH` CRUD : on accepte uniquement les
 * statuts persistables (`active | draft | disabled`). Le statut dérivé
 * `sold_out` n'est jamais transitionable — il est calculé à l'affichage
 * (cf. `getStockDisplayState`, KAN-22).
 */
export const ProductTransitionStatusInput = z
  .object({
    status: ProductStatus,
  })
  .strict()
export type ProductTransitionStatusInput = z.infer<
  typeof ProductTransitionStatusInput
>
