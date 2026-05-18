import { randomBytes } from "node:crypto"

import {
  type ProductPhotoMime,
  type ProductPhotoUploadInput,
  type ProductPhotoUploadOutput,
} from "@delta/contracts/product"
import { type SupabaseClient } from "@supabase/supabase-js"

/**
 * Helper Storage pour le bucket `product-photos` (KAN-21).
 *
 * Différences avec `producer-photos.ts` (KAN-17) — divergence assumée :
 *   - Path **random** `{user_id}/{product_id}/<random8>.<ext>` au lieu de
 *     déterministe (`{user_id}/logo.<ext>`). Une photo produit appartient
 *     à une collection variable, pas à un slot fixe.
 *   - `upsert: false` au lieu de `upsert: true`. Pas de remplacement
 *     silencieux ; toute collision (improbable, 4 milliards de combinaisons)
 *     remonte comme erreur.
 *
 * Pipeline upload côté UI :
 *   1. POST /api/v1/producer/products/[id]/photos  → cette fonction
 *   2. PUT <upload_url>  (client direct, Content-Type exact)
 *   3. POST /api/v1/producer/products/[id]/photos/confirm  → persiste DB
 */

const BUCKET = "product-photos"
/** Durée de vie de l'URL signée pour le PUT direct depuis le client. */
const SIGNED_URL_EXPIRES_IN = 60 // secondes

const MIME_TO_EXT: Record<ProductPhotoMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

/**
 * Génère un identifiant court (8 hex). 4 milliards de combinaisons —
 * largement suffisant pour éviter une collision dans le périmètre
 * `{user_id}/{product_id}/` (qq dizaines de photos par produit max).
 */
function randomShortId(): string {
  return randomBytes(4).toString("hex")
}

/**
 * Construit un path canonique dans le bucket `product-photos`. Le 1ᵉʳ
 * segment doit être `auth.uid()::text` pour passer la RLS Storage
 * `product_photos_insert_owner` (cf. migration KAN-21).
 */
export function buildProductPhotoPath(
  userId: string,
  productId: string,
  mime: ProductPhotoMime,
  randomId: string = randomShortId(),
): string {
  const ext = MIME_TO_EXT[mime]
  return `${userId}/${productId}/${randomId}.${ext}`
}

/**
 * Génère une URL signée d'upload pour `product-photos` + retourne l'URL
 * publique finale (le bucket est public en lecture).
 */
export async function createProductPhotoUploadUrl(
  client: SupabaseClient,
  userId: string,
  productId: string,
  input: ProductPhotoUploadInput,
): Promise<ProductPhotoUploadOutput> {
  const path = buildProductPhotoPath(userId, productId, input.content_type)

  const { data, error } = await client.storage
    .from(BUCKET)
    .createSignedUploadUrl(path, { upsert: false })

  if (error || !data) {
    throw new Error(
      `Échec création URL signée upload : ${error?.message ?? "réponse vide"}`,
    )
  }

  const publicUrl = client.storage.from(BUCKET).getPublicUrl(path).data
    .publicUrl

  return {
    path,
    upload_url: data.signedUrl,
    public_url: publicUrl,
    token_expires_in: SIGNED_URL_EXPIRES_IN,
  }
}

/**
 * Supprime un fichier du bucket `product-photos`. RLS impose `auth.uid()` =
 * 1ᵉʳ segment du path → le client utilisateur suffit.
 *
 * Tolère 404 silencieusement : un fichier déjà absent (cron de purge,
 * race) n'est pas une erreur métier.
 */
export async function deleteProductPhoto(
  client: SupabaseClient,
  path: string,
): Promise<void> {
  const { error } = await client.storage.from(BUCKET).remove([path])
  if (error && !/not found/i.test(error.message)) {
    throw new Error(`Échec suppression photo : ${error.message}`)
  }
}
