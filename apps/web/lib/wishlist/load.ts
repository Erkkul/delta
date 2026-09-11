import { WISHLIST_MAX, type WishlistPage } from "@delta/contracts/wishlist"
import { catalogueRepo, mapCatalogueProduct } from "@delta/db/catalogue"
import { type Database } from "@delta/db/types"
import { wishlistRepo } from "@delta/db/wishlist"
import { type SupabaseClient } from "@supabase/supabase-js"

type Client = SupabaseClient<Database>

/**
 * Charge la wishlist d'un acheteur sous la forme `WishlistPage` (KAN-30).
 *
 * Deux lectures RLS-safe :
 *   1. `wishlist_items` (self only) → envies actives, ordre récence.
 *   2. `catalogue_products` (vue publique) → projection produit visible.
 *
 * La jointure applicative sur `product_id` implémente la règle « envie
 * orpheline masquée » (cf. specs/KAN-30/design.md § Risques) : une envie dont
 * le produit n'est plus visible n'apparaît pas dans `items`. `count` reste le
 * nombre d'envies actives (ce qui compte vis-à-vis du plafond), donc peut
 * dépasser `items.length`.
 */
export async function loadWishlistPage(
  client: Client,
  userId: string,
): Promise<WishlistPage> {
  const rows = await wishlistRepo.listActive(client, userId)
  const count = rows.length

  const productRows = await catalogueRepo.listByIds(
    client,
    rows.map((r) => r.product_id),
  )
  const productById = new Map(productRows.map((p) => [p.id, p]))

  const items = rows.flatMap((row) => {
    const product = productById.get(row.product_id)
    if (!product) return []
    return [
      {
        id: row.id,
        product: mapCatalogueProduct(product),
        created_at: row.created_at,
      },
    ]
  })

  return { items, count, max: WISHLIST_MAX }
}
