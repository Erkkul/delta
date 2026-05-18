import {
  type Product,
  type ProductAdapter,
  type ProductCreate,
  type ProductPatch,
} from "@delta/core/product"
import { productsRepo, type ProductRow } from "@delta/db"
import { type Database } from "@delta/db/types"
import { type SupabaseClient } from "@supabase/supabase-js"

/**
 * Mappe une `ProductRow` (forme DB) vers `Product` (forme métier exposée
 * au core). One-to-one — les deux types sont volontairement dupliqués
 * pour éviter le couplage core ↔ db (cf. core/product/adapters.ts).
 */
function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    producer_user_id: row.producer_user_id,
    name: row.name,
    description: row.description,
    category: row.category,
    packaging: row.packaging,
    unit_price_cents: row.unit_price_cents,
    stock: row.stock,
    low_stock_threshold: row.low_stock_threshold,
    availability_from: row.availability_from,
    availability_to: row.availability_to,
    status: row.status,
    labels: row.labels ?? [],
    photos: row.photos ?? [],
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  }
}

type Client = SupabaseClient<Database>

/**
 * Adapter `ProductAdapter` pour les route handlers user-facing — toutes
 * les opérations passent par le client utilisateur (RLS appliquée).
 *
 * Pour la suppression, on utilise `findByIdIncludingDeleted` afin que le
 * use case `softDeleteProduct` puisse lever `ProductAlreadyDeletedError`
 * si le produit est déjà soft-deleted (sans cette finesse, le find
 * retomberait sur `null` et on renverrait `ProductNotFoundError` pour
 * deux cas distincts).
 */
export function getProductAdapter(client: Client): ProductAdapter {
  return {
    async create(ownerId: string, input: ProductCreate) {
      const row = await productsRepo.create(client, {
        producer_user_id: ownerId,
        name: input.name,
        description: input.description ?? null,
        category: input.category,
        packaging: input.packaging,
        unit_price_cents: input.unit_price_cents,
        stock: input.stock,
        availability_from: input.availability_from,
        availability_to: input.availability_to,
        status: input.status,
        labels: input.labels,
      })
      return toProduct(row)
    },

    async findById(productId: string, ownerId: string) {
      // On utilise `findByIdIncludingDeleted` pour que le use case
      // softDelete puisse distinguer not-found / already-deleted. Les
      // autres use cases (update, get) filtrent eux-mêmes `deleted_at`
      // via le check côté use case ou les contraintes repo.
      const row = await productsRepo.findByIdIncludingDeleted(
        client,
        productId,
        ownerId,
      )
      return row ? toProduct(row) : null
    },

    async findByOwner(ownerId, filters) {
      const page = await productsRepo.findByOwner(client, ownerId, filters)
      return {
        items: page.items.map(toProduct),
        nextCursor: page.nextCursor,
      }
    },

    async update(productId: string, ownerId: string, patch: ProductPatch) {
      const row = await productsRepo.update(client, productId, ownerId, patch)
      return toProduct(row)
    },

    async softDelete(productId: string, ownerId: string) {
      const row = await productsRepo.softDelete(client, productId, ownerId)
      return toProduct(row)
    },
  }
}

export { toProduct }
