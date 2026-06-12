import { z } from "zod"

import { ProductCategory } from "../product/shared"

/**
 * Profil acheteur — zone d'habitation (KAN-25) + préférences catégories (KAN-26).
 *
 * Consommé par :
 *   - GET /api/v1/me/buyer-profile             (snapshot, null si non créé)
 *   - PUT /api/v1/me/buyer-profile             (upsert zone : onboarding KAN-81 + édition KAN-82)
 *   - PUT /api/v1/me/buyer-profile/categories  (préférences : onboarding KAN-83 + édition KAN-84)
 *
 * La zone est géocodée côté client via l'API Adresse Gouv.fr ; les
 * coordonnées (latitude/longitude) accompagnent le label retenu. Le serveur
 * peut recalculer en best-effort si elles sont absentes (cf. core use case).
 */

/**
 * Input d'upsert. `display_name` est facultatif (cf. specs/KAN-25/notes.md —
 * conflit maquette ↔ KAN-81). La zone (`address_label`) est requise dès qu'on
 * soumet le formulaire ; le « Passer » de l'onboarding n'appelle simplement
 * pas l'endpoint.
 */
export const BuyerProfileUpsertInput = z
  .object({
    display_name: z
      .string()
      .trim()
      .min(2, "Le nom doit faire au moins 2 caractères.")
      .max(80, "Le nom ne doit pas dépasser 80 caractères.")
      .nullable()
      .optional(),
    address_label: z
      .string()
      .trim()
      .min(5, "L'adresse doit faire au moins 5 caractères.")
      .max(250, "L'adresse ne doit pas dépasser 250 caractères."),
    city: z
      .string()
      .trim()
      .min(1, "La ville est requise.")
      .max(120, "La ville ne doit pas dépasser 120 caractères.")
      .nullable()
      .optional(),
    postcode: z
      .string()
      .trim()
      .regex(/^[0-9]{5}$/, "Le code postal doit comporter 5 chiffres.")
      .nullable()
      .optional(),
    /**
     * Coordonnées de la suggestion Adresse Gouv.fr retenue (WGS84). Toutes
     * deux ensemble ou aucune. Si omises, le serveur tente un géocodage
     * best-effort à partir du label.
     */
    longitude: z.number().gte(-180).lte(180).optional(),
    latitude: z.number().gte(-90).lte(90).optional(),
  })
  .strict()
  .refine(
    (v) =>
      (v.longitude == null && v.latitude == null) ||
      (v.longitude != null && v.latitude != null),
    {
      message:
        "Les coordonnées doivent être renseignées toutes les deux ou aucune.",
      path: ["latitude"],
    },
  )
export type BuyerProfileUpsertInput = z.infer<typeof BuyerProfileUpsertInput>

/**
 * Nombre de catégories produit existantes (enum `product_category`). Borne
 * haute de `preferred_categories` : une préférence ne peut excéder le
 * catalogue de catégories.
 */
const PRODUCT_CATEGORY_COUNT = 8

/**
 * Input des préférences catégories acheteur (KAN-26 — KAN-83 onboarding +
 * KAN-84 paramètres). Sous-ensemble de l'enum `product_category` ; liste vide
 * autorisée (« aucune préférence »). Endpoint dédié
 * `PUT /api/v1/me/buyer-profile/categories` pour ne pas toucher au contrat
 * d'upsert de la zone (qui exige `address_label`) — cf. specs/KAN-26/notes.md.
 */
export const BuyerCategoriesInput = z
  .object({
    preferred_categories: z
      .array(ProductCategory)
      .max(
        PRODUCT_CATEGORY_COUNT,
        "Trop de catégories sélectionnées.",
      ),
  })
  .strict()
export type BuyerCategoriesInput = z.infer<typeof BuyerCategoriesInput>

/**
 * Snapshot renvoyé par GET / PUT. `has_location` indique si une zone
 * géocodée est posée (la geography brute n'est jamais exposée).
 * `preferred_categories` liste les centres d'intérêt déclarés (KAN-26).
 */
export const BuyerProfileSnapshot = z.object({
  display_name: z.string().nullable(),
  address_label: z.string().nullable(),
  city: z.string().nullable(),
  postcode: z.string().nullable(),
  has_location: z.boolean(),
  preferred_categories: z.array(ProductCategory),
})
export type BuyerProfileSnapshot = z.infer<typeof BuyerProfileSnapshot>

// ─── Codes d'erreur ──────────────────────────────────────────────────────

export const BUYER_PROFILE_ERROR_CODES = {
  ValidationFailed: "BUYER_VALIDATION_FAILED",
  RoleForbidden: "BUYER_ROLE_FORBIDDEN",
  RateLimited: "AUTH_RATE_LIMITED",
  Unknown: "BUYER_UNKNOWN",
} as const
export type BuyerProfileErrorCode =
  (typeof BUYER_PROFILE_ERROR_CODES)[keyof typeof BUYER_PROFILE_ERROR_CODES]
