import { type CataloguePublicProduct } from "@delta/contracts/catalogue"

import { type CatalogueProductRow } from "../types"

/**
 * Mappe une row de la vue `catalogue_products` vers le DTO public
 * `CataloguePublicProduct` (KAN-28). Ne conserve que la première photo
 * (carte / vignette) et restructure le producteur en objet imbriqué.
 */
export function mapCatalogueProduct(
  row: CatalogueProductRow,
): CataloguePublicProduct {
  const first = row.photos?.[0]
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    packaging: row.packaging,
    unit_price_cents: row.unit_price_cents,
    labels: row.labels ?? [],
    photo: first ? { url: first.url, alt: first.alt ?? null } : null,
    producer: {
      id: row.producer_user_id,
      display_name: row.producer_display_name,
      zone: row.producer_zone,
    },
    created_at: row.created_at,
  }
}
