import { z } from "zod"

import { ProductCategory } from "../product/shared"

/**
 * Query string pour `GET /api/v1/catalogue` (KAN-28 — AC-04).
 *
 * Catalogue acheteur public : ne liste que les produits visibles via le
 * chemin de lecture publique `catalogue_products` (statut `active`,
 * producteur vérifié + payouts ON + non en pause, fenêtre de disponibilité
 * couvrante). La RLS / la vue garantissent la visibilité — ce contrat ne
 * porte que le filtrage acheteur.
 *
 * - `q` : recherche FTS sur name + description (Postgres `websearch_to_tsquery`,
 *   config `french`)
 * - `category` : filtre catégorie (enum `product_category`)
 * - `producer` : filtre par producteur (uuid `producer_user_id`)
 * - `limit` : 1..50, par défaut 20
 * - `cursor` : ISO timestamp de `created_at` du dernier item de la page
 *   précédente (pagination keyset, ordre `created_at DESC` — cohérent avec
 *   `ProductListQuery` KAN-20)
 *
 * Hors scope KAN-28 (différé KAN-42 / matching) : filtres zone d'origine,
 * disponibilité par trajet, trajet actif. Cf. specs/KAN-28/proposal.md.
 */
export const CatalogueQuery = z
  .object({
    q: z.string().trim().max(200).optional(),
    category: ProductCategory.optional(),
    producer: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
    cursor: z.string().datetime({ offset: true }).optional(),
  })
  .strict()
export type CatalogueQuery = z.infer<typeof CatalogueQuery>
