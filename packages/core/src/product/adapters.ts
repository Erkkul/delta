import {
  type ProductCategory,
  type ProductPackaging,
  type ProductPhoto,
  type ProductPhotoEntry,
  type ProductStatus,
} from "@delta/contracts/product"

/**
 * Adapters pour les use cases catalogue (KAN-20). Suivent le pattern
 * `core/producer/adapters.ts` : interface fine, implémentée côté
 * `apps/web/lib/products/adapters.ts` (route handlers) ou plus tard
 * côté jobs (cron, expirations).
 */

/**
 * Forme métier d'un produit partagée entre core et adapters. Doublonne
 * volontairement `ProductRow` de `@delta/db` pour ne pas coupler core à
 * db (cf. ARCHITECTURE §4.1).
 */
export type Product = {
  id: string
  producer_user_id: string
  name: string
  description: string | null
  category: ProductCategory
  packaging: ProductPackaging
  unit_price_cents: number
  stock: number
  low_stock_threshold: number | null
  availability_from: string | null
  availability_to: string | null
  status: ProductStatus
  labels: string[]
  photos: ProductPhoto[]
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/**
 * Patch partiel envoyé au repo. Reflète les champs éditables par
 * `PATCH /api/v1/producer/products/[id]`.
 */
export type ProductPatch = {
  name?: string
  description?: string | null
  category?: ProductCategory
  packaging?: ProductPackaging
  unit_price_cents?: number
  stock?: number
  low_stock_threshold?: number | null
  availability_from?: string | null
  availability_to?: string | null
  status?: ProductStatus
  labels?: string[]
}

/**
 * Input de création (post-validation Zod). Le `producer_user_id` est
 * injecté par le use case à partir de l'auth caller — il ne fait pas
 * partie de l'input applicatif.
 */
export type ProductCreate = {
  name: string
  description: string | null
  category: ProductCategory
  packaging: ProductPackaging
  unit_price_cents: number
  stock: number
  low_stock_threshold: number | null
  availability_from: string | null
  availability_to: string | null
  status: ProductStatus
  labels: string[]
}

/**
 * Query de listing owner — passée au repo. `q` est transformé en
 * `websearch_to_tsquery` côté SQL.
 *
 * `'sold_out'` (KAN-23) est un filtre dérivé : traduit côté repo en
 * `WHERE status = 'active' AND stock = 0`. Pas une valeur d'enum DB.
 */
export type ProductListQueryFilters = {
  status: "all" | ProductStatus | "sold_out"
  q: string | null
  limit: number
  cursor: string | null
}

export type ProductListResult = {
  items: Product[]
  nextCursor: string | null
}

export type ProductAdapter = {
  create(ownerId: string, input: ProductCreate): Promise<Product>
  /**
   * Récupère un produit non soft-deleted. Retourne `null` si introuvable
   * ou si le `ownerId` ne correspond pas (la RLS rejette de toute façon
   * le SELECT, on garde la garde applicative pour les callers admin
   * éventuels).
   */
  findById(productId: string, ownerId: string): Promise<Product | null>
  findByOwner(
    ownerId: string,
    filters: ProductListQueryFilters,
  ): Promise<ProductListResult>
  update(
    productId: string,
    ownerId: string,
    patch: ProductPatch,
  ): Promise<Product>
  /**
   * Soft delete : pose `deleted_at = now()`. Le caller doit avoir
   * vérifié l'existence + non-suppression du produit avant d'appeler
   * (les erreurs typées sont levées côté use case).
   */
  softDelete(productId: string, ownerId: string): Promise<Product>

  /**
   * Écrit le tableau `photos` complet (KAN-21). Le use case appelle
   * `findById` puis recompose le tableau (append / splice / swap) avant
   * d'invoquer cette méthode — évite un double SELECT côté adapter.
   *
   * Le CHECK DB `products_photos_max` (`jsonb_array_length ≤ 4`)
   * rattrape les races concurrentes. L'adapter web traduit le code
   * Postgres `23514` en `ProductPhotoLimitReachedError`.
   */
  updatePhotos(
    productId: string,
    ownerId: string,
    photos: ProductPhotoEntry[],
  ): Promise<Product>
}
