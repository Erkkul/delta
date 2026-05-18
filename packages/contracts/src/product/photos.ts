import { z } from "zod"

/**
 * Photos produit (KAN-21). Pipeline upload :
 *   1. POST /api/v1/producer/products/[id]/photos  → URL signée Storage
 *   2. PUT <upload_url>  (client direct vers Supabase Storage)
 *   3. POST /api/v1/producer/products/[id]/photos/confirm  → persiste DB
 *
 * Max 4 photos par produit (CHECK DB `products_photos_max`). La 1ʳᵉ entrée
 * du tableau = couverture, par convention d'ordre (pas de colonne dédiée).
 */

/**
 * MIME types acceptés. Identique à `producer-photos` (KAN-17) — pas de
 * partage de type cross-domaine au MVP, on duplique volontairement.
 */
export const PRODUCT_PHOTO_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const
export const ProductPhotoMime = z.enum(PRODUCT_PHOTO_MIMES)
export type ProductPhotoMime = z.infer<typeof ProductPhotoMime>

/**
 * Tuple persisté dans `products.photos jsonb`. `path` est stocké en plus de
 * `url` pour éviter le reparsing fragile de l'URL publique au DELETE Storage
 * (cf. specs/KAN-21/design.md § Risques techniques).
 *
 * Note : KAN-20 a initialement défini `ProductPhoto = { url, alt? }` dans
 * snapshot.ts. KAN-21 étend la forme — toutes les entrées créées par les
 * endpoints `/photos*` incluront `path`. Les snapshots renvoyés conservent
 * `path` à des fins de débogage côté UI mais l'UI ne s'en sert pas.
 */
export const ProductPhotoEntry = z.object({
  url: z.string().url(),
  path: z.string().min(1),
  alt: z.string().max(120).optional(),
})
export type ProductPhotoEntry = z.infer<typeof ProductPhotoEntry>

/**
 * Input de `POST /api/v1/producer/products/[id]/photos` (signature).
 *
 * `slot` n'est pas exposé : l'index est calculé serveur = `photos.length`
 * (append systématique).
 */
export const ProductPhotoUploadInput = z
  .object({
    content_type: ProductPhotoMime,
  })
  .strict()
export type ProductPhotoUploadInput = z.infer<typeof ProductPhotoUploadInput>

/**
 * Output de `POST /api/v1/producer/products/[id]/photos` :
 *   - `path`       : chemin canonique dans le bucket `product-photos`
 *   - `upload_url` : URL signée pour le PUT direct côté client (~60 s)
 *   - `public_url` : URL finale rendue par `<img src>` côté UI
 *   - `token_expires_in` : durée de validité de l'URL signée (secondes)
 */
export const ProductPhotoUploadOutput = z.object({
  path: z.string(),
  upload_url: z.string().url(),
  public_url: z.string().url(),
  token_expires_in: z.number().int().positive(),
})
export type ProductPhotoUploadOutput = z.infer<typeof ProductPhotoUploadOutput>

/**
 * Input de `POST /api/v1/producer/products/[id]/photos/confirm`. Persiste
 * `{ url: public_url, path }` au tableau `photos` du produit après PUT direct.
 *
 * Le handler vérifie que `path` commence bien par `{auth.uid()}/{product_id}/`
 * (anti-tampering basique). La RLS table `products` empêche par ailleurs
 * d'écrire sur un produit d'un autre user.
 */
export const ProductPhotoConfirmInput = z
  .object({
    path: z.string().min(1),
    public_url: z.string().url(),
  })
  .strict()
export type ProductPhotoConfirmInput = z.infer<typeof ProductPhotoConfirmInput>

/**
 * Input de `DELETE /api/v1/producer/products/[id]/photos` : retire l'entrée
 * d'index `index` du tableau (réindexation par splice) + supprime le fichier
 * Storage correspondant.
 *
 * Bornes : 0..3 (max 4 photos).
 */
export const ProductPhotoDeleteInput = z
  .object({
    index: z.number().int().min(0).max(3),
  })
  .strict()
export type ProductPhotoDeleteInput = z.infer<typeof ProductPhotoDeleteInput>

/**
 * Input de `PATCH /api/v1/producer/products/[id]/photos/reorder` : permute
 * les entrées d'index `from` et `to` (la couverture est `photos[0]`).
 *
 * Refus si `from === to` ou si une des bornes est hors plage (rattrapé en
 * use case sur la base de la longueur actuelle de `photos`).
 */
export const ProductPhotoReorderInput = z
  .object({
    from: z.number().int().min(0).max(3),
    to: z.number().int().min(0).max(3),
  })
  .strict()
  .refine((v) => v.from !== v.to, {
    message: "Les positions doivent être distinctes.",
    path: ["to"],
  })
export type ProductPhotoReorderInput = z.infer<typeof ProductPhotoReorderInput>
