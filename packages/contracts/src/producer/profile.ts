import { z } from "zod"

/**
 * Profil & ferme producteur (KAN-17).
 *
 * Couche publique de `producers` (la couche SIRET / Stripe vit dans
 * `./onboarding.ts`). Les schémas ici sont consommés par :
 *   - PATCH /api/v1/producer/profile        (édition partielle)
 *   - POST  /api/v1/producer/photos         (upload signé)
 *   - POST  /api/v1/producer/pause          (toggle boutique en pause)
 *
 * Tous les champs sont optionnels en update (patch partiel). La forme
 * "complète" (`ProducerProfileSchema`) est le snapshot retourné par GET —
 * elle accepte des valeurs nulles pour les champs non encore renseignés.
 */

// ─── Enums alignés sur les types DB ──────────────────────────────────────

export const PRODUCER_LABELS = [
  "bio_ab",
  "demeter",
  "nature_et_progres",
  "hve_3",
  "producteur_fermier",
] as const
export const ProducerLabel = z.enum(PRODUCER_LABELS)
export type ProducerLabel = z.infer<typeof ProducerLabel>

/** Libellés FR à afficher dans les chips (source UI partagée). */
export const PRODUCER_LABEL_FR: Record<ProducerLabel, string> = {
  bio_ab: "Bio AB",
  demeter: "Demeter",
  nature_et_progres: "Nature & Progrès",
  hve_3: "HVE niveau 3",
  producteur_fermier: "Producteur fermier",
}

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const
export const Weekday = z.enum(WEEKDAYS)
export type Weekday = z.infer<typeof Weekday>

export const WEEKDAY_FR: Record<Weekday, string> = {
  mon: "Lun",
  tue: "Mar",
  wed: "Mer",
  thu: "Jeu",
  fri: "Ven",
  sat: "Sam",
  sun: "Dim",
}

// ─── Sous-schémas réutilisables ──────────────────────────────────────────

/** Photo de la ferme (logo ou galerie). URL d'un objet Storage. */
export const FarmPhoto = z.object({
  url: z.string().url(),
  alt: z.string().max(120).optional(),
})
export type FarmPhoto = z.infer<typeof FarmPhoto>

/**
 * Format `HH:mm` (heure locale de la ferme, pas de timezone côté MVP).
 * Aligné avec la colonne `time` côté DB.
 */
const TimeHHmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure attendue au format HH:mm.")

// ─── Inputs / Outputs ────────────────────────────────────────────────────

/**
 * Patch partiel — chaque champ optionnel. `null` est accepté pour réinitialiser
 * un champ texte (ex : effacer la description). Pour les arrays (`labels`,
 * `farm_photos`, `pickup_days`), on passe la nouvelle valeur complète.
 */
export const ProducerProfileUpdateInput = z
  .object({
    display_name: z
      .string()
      .trim()
      .min(2, "Le nom de la ferme doit faire au moins 2 caractères.")
      .max(80, "Le nom de la ferme ne doit pas dépasser 80 caractères.")
      .nullable()
      .optional(),
    public_description: z
      .string()
      .trim()
      .max(500, "La description ne doit pas dépasser 500 caractères.")
      .nullable()
      .optional(),
    profile_photo_url: z.string().url().nullable().optional(),
    farm_photos: z
      .array(FarmPhoto)
      .max(3, "3 photos de ferme maximum.")
      .optional(),
    labels: z.array(ProducerLabel).max(8).optional(),
    pickup_public_zone: z
      .string()
      .trim()
      .min(2, "La zone publique doit faire au moins 2 caractères.")
      .max(120, "La zone publique ne doit pas dépasser 120 caractères.")
      .nullable()
      .optional(),
    pickup_address: z
      .string()
      .trim()
      .min(5, "L'adresse doit faire au moins 5 caractères.")
      .max(250, "L'adresse ne doit pas dépasser 250 caractères.")
      .nullable()
      .optional(),
    /**
     * Coordonnées géocodées côté client (résultat API Adresse Gouv.fr).
     * Optionnelles : si l'API retourne un score faible, le client peut
     * omettre les coords et seulement le texte sera persisté. Le serveur
     * peut aussi recalculer côté server-side avant écriture (ARCHITECTURE.md
     * §5).
     */
    pickup_longitude: z.number().gte(-180).lte(180).nullable().optional(),
    pickup_latitude: z.number().gte(-90).lte(90).nullable().optional(),
    pickup_days: z.array(Weekday).max(7).optional(),
    pickup_hours_start: TimeHHmm.nullable().optional(),
    pickup_hours_end: TimeHHmm.nullable().optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.pickup_hours_start == null ||
      v.pickup_hours_end == null ||
      v.pickup_hours_end > v.pickup_hours_start,
    {
      message: "L'heure de fin doit être postérieure à l'heure de début.",
      path: ["pickup_hours_end"],
    },
  )
  .refine(
    (v) =>
      // Si on déclare une coordonnée, il faut les deux ensemble.
      (v.pickup_longitude == null && v.pickup_latitude == null) ||
      (v.pickup_longitude != null && v.pickup_latitude != null),
    {
      message:
        "Les coordonnées doivent être renseignées toutes les deux ou aucune.",
      path: ["pickup_latitude"],
    },
  )
export type ProducerProfileUpdateInput = z.infer<
  typeof ProducerProfileUpdateInput
>

/**
 * Snapshot complet renvoyé par `GET /api/v1/producer/profile`. Inclut
 * l'adresse exacte (réservée au owner).
 */
export const ProducerProfileSnapshot = z.object({
  id: z.string().uuid(),
  display_name: z.string().nullable(),
  public_description: z.string().nullable(),
  profile_photo_url: z.string().url().nullable(),
  farm_photos: z.array(FarmPhoto),
  labels: z.array(ProducerLabel),
  pickup_public_zone: z.string().nullable(),
  pickup_address: z.string().nullable(),
  pickup_days: z.array(Weekday),
  pickup_hours_start: z.string().nullable(),
  pickup_hours_end: z.string().nullable(),
  paused: z.boolean(),
  paused_at: z.string().nullable(),
  /**
   * SIRET et Stripe inclus en lecture seule pour piloter les états UI
   * (chip « SIRET vérifié », affichage statut paiement).
   */
  siret_status: z.enum(["not_submitted", "pending", "verified", "rejected"]),
  stripe_status: z.enum([
    "not_created",
    "pending",
    "active",
    "restricted",
    "disabled",
  ]),
  payouts_enabled: z.boolean(),
})
export type ProducerProfileSnapshot = z.infer<typeof ProducerProfileSnapshot>

// ─── Upload photos ───────────────────────────────────────────────────────

export const PRODUCER_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const
export const ProducerPhotoMime = z.enum(PRODUCER_PHOTO_MIME_TYPES)
export type ProducerPhotoMime = z.infer<typeof ProducerPhotoMime>

/**
 * Demande d'URL signée pour un upload Storage. Le slot identifie le rôle
 * de la photo : `logo` (1 par compte) ou `farm-<0|1|2>` (galerie).
 */
export const ProducerPhotoUploadInput = z.object({
  kind: z.enum(["logo", "farm"]),
  slot: z.number().int().min(0).max(2).optional(),
  content_type: ProducerPhotoMime,
})
export type ProducerPhotoUploadInput = z.infer<typeof ProducerPhotoUploadInput>

export const ProducerPhotoUploadOutput = z.object({
  /** Chemin canonique dans le bucket (`{user_id}/<slot>.<ext>`). */
  path: z.string(),
  /** URL signée pour `PUT` direct depuis le client. */
  upload_url: z.string().url(),
  /** URL publique finale à persister sur `producers` après upload. */
  public_url: z.string().url(),
  /** Expiration en secondes de l'URL signée. */
  token_expires_in: z.number().int().positive(),
})
export type ProducerPhotoUploadOutput = z.infer<
  typeof ProducerPhotoUploadOutput
>

export const ProducerPhotoDeleteInput = z.object({
  kind: z.enum(["logo", "farm"]),
  slot: z.number().int().min(0).max(2).optional(),
})
export type ProducerPhotoDeleteInput = z.infer<typeof ProducerPhotoDeleteInput>

// ─── Pause boutique ──────────────────────────────────────────────────────

export const ProducerPauseInput = z.object({
  paused: z.boolean(),
})
export type ProducerPauseInput = z.infer<typeof ProducerPauseInput>

// ─── Codes d'erreur ──────────────────────────────────────────────────────

export const PRODUCER_PROFILE_ERROR_CODES = {
  ValidationFailed: "PRODUCER_VALIDATION_FAILED",
  RoleForbidden: "PRODUCER_ROLE_FORBIDDEN",
  ProfileNotFound: "PRODUCER_PROFILE_NOT_FOUND",
  AddressGeocodeFailed: "PRODUCER_ADDRESS_GEOCODE_FAILED",
  PhotoLimitReached: "PRODUCER_PHOTO_LIMIT_REACHED",
  PhotoMimeRejected: "PRODUCER_PHOTO_MIME_REJECTED",
  RateLimited: "PRODUCER_RATE_LIMITED",
  Unknown: "PRODUCER_UNKNOWN",
} as const
export type ProducerProfileErrorCode =
  (typeof PRODUCER_PROFILE_ERROR_CODES)[keyof typeof PRODUCER_PROFILE_ERROR_CODES]
