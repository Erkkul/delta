import { z } from "zod"

import { ProductPhotoEntry } from "./photos"
import {
  ProductCategory,
  ProductPackaging,
  ProductStatus,
} from "./shared"

/**
 * Photo produit (KAN-21). Préparée en DB par KAN-20 (colonne `photos jsonb`,
 * CHECK `jsonb_array_length ≤ 4`), câblée par KAN-21. Format `{ url, path, alt? }`
 * — `path` redondant avec `url` pour éviter le reparsing au DELETE Storage
 * (cf. specs/KAN-21/design.md § Risques techniques).
 *
 * Alias rétrocompat — la forme canonique est `ProductPhotoEntry` (photos.ts).
 */
export const ProductPhoto = ProductPhotoEntry
export type ProductPhoto = z.infer<typeof ProductPhoto>

/**
 * Snapshot complet d'un produit renvoyé par `GET`, `POST` et `PATCH`. Inclut
 * les colonnes préparées pour KAN-21 (photos) et KAN-24 (labels) — vides au
 * MVP de KAN-20 mais déjà exposées pour ne pas casser les consumers au moment
 * du câblage.
 */
export const ProductSnapshot = z.object({
  id: z.string().uuid(),
  producer_user_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  category: ProductCategory,
  packaging: ProductPackaging,
  unit_price_cents: z.number().int(),
  stock: z.number().int(),
  low_stock_threshold: z.number().int().nullable(),
  availability_from: z.string().nullable(),
  availability_to: z.string().nullable(),
  status: ProductStatus,
  labels: z.array(z.string()),
  photos: z.array(ProductPhoto),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
})
export type ProductSnapshot = z.infer<typeof ProductSnapshot>

/**
 * Réponse de `GET /api/v1/producer/products` : liste paginée + curseur.
 */
export const ProductListSnapshot = z.object({
  items: z.array(ProductSnapshot),
  nextCursor: z.string().datetime({ offset: true }).nullable(),
})
export type ProductListSnapshot = z.infer<typeof ProductListSnapshot>
