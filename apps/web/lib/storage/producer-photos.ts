import {
  type ProducerPhotoMime,
  type ProducerPhotoUploadInput,
  type ProducerPhotoUploadOutput,
} from "@delta/contracts/producer"
import { type SupabaseClient } from "@supabase/supabase-js"

const BUCKET = "producer-photos"
/** Durée de vie de l'URL signée pour le PUT direct depuis le client. */
const SIGNED_URL_EXPIRES_IN = 60 // secondes

const MIME_TO_EXT: Record<ProducerPhotoMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

/**
 * Construit le chemin canonique d'une photo producteur dans le bucket
 * `producer-photos`. Convention :
 *   {auth_user_id}/logo.<ext>
 *   {auth_user_id}/farm-<slot>.<ext>
 *
 * Le 1er segment doit être `auth.uid()::text` pour passer la RLS storage
 * (cf. supabase/policies/storage.sql).
 */
export function buildPhotoPath(
  userId: string,
  input: ProducerPhotoUploadInput,
): string {
  const ext = MIME_TO_EXT[input.content_type]
  if (input.kind === "logo") {
    return `${userId}/logo.${ext}`
  }
  const slot = input.slot ?? 0
  return `${userId}/farm-${slot}.${ext}`
}

/**
 * Génère une URL signée d'upload pour `producer-photos` + retourne l'URL
 * publique finale (le bucket est public en lecture).
 *
 * Le client effectue ensuite un `PUT <upload_url>` avec le `Content-Type`
 * exact (ProducerPhotoMime). Une fois l'upload réussi, le client appelle
 * `PATCH /api/v1/producer/profile` pour persister `profile_photo_url` ou
 * une entrée dans `farm_photos`.
 */
export async function createPhotoUploadUrl(
  client: SupabaseClient,
  userId: string,
  input: ProducerPhotoUploadInput,
): Promise<ProducerPhotoUploadOutput> {
  const path = buildPhotoPath(userId, input)

  const { data, error } = await client.storage
    .from(BUCKET)
    .createSignedUploadUrl(path, { upsert: true })

  if (error || !data) {
    throw new Error(
      `Échec création URL signée upload : ${error?.message ?? "réponse vide"}`,
    )
  }

  const publicUrl = client.storage.from(BUCKET).getPublicUrl(path)
    .data.publicUrl

  return {
    path,
    upload_url: data.signedUrl,
    public_url: publicUrl,
    token_expires_in: SIGNED_URL_EXPIRES_IN,
  }
}

/**
 * Supprime une photo de `producer-photos`. RLS impose `auth.uid()` =
 * premier segment du path → le client utilisateur suffit.
 */
export async function deletePhoto(
  client: SupabaseClient,
  userId: string,
  input: { kind: "logo" | "farm"; slot?: number; content_type?: ProducerPhotoMime },
): Promise<void> {
  // On supprime tous les fichiers possibles (jpg/png/webp) pour le slot
  // car on n'a pas forcément le content_type d'origine côté DELETE.
  const slotPart = input.kind === "logo" ? "logo" : `farm-${input.slot ?? 0}`
  const paths = (["jpg", "png", "webp"] as const).map(
    (ext) => `${userId}/${slotPart}.${ext}`,
  )

  const { error } = await client.storage.from(BUCKET).remove(paths)
  if (error) {
    // L'absence d'un fichier n'est pas une erreur métier — on ignore.
    if (!/not found/i.test(error.message)) {
      throw new Error(`Échec suppression photo : ${error.message}`)
    }
  }
}
