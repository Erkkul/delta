import { z } from "zod"

/**
 * Enums alignés sur les types Postgres `product_category`,
 * `product_packaging`, `product_status` créés par la migration KAN-20
 * (`supabase/migrations/20260518000000_create_products.sql`).
 *
 * Toute modification ici doit être miroir d'une migration SQL ajoutant
 * la nouvelle valeur (`ALTER TYPE … ADD VALUE …`).
 */

export const PRODUCT_CATEGORIES = [
  "miel_et_ruche",
  "fruits",
  "legumes",
  "cereales_legumineuses",
  "conserves_confitures",
  "pain_biscuits",
  "huiles",
  "boissons_non_alcoolisees",
] as const
export const ProductCategory = z.enum(PRODUCT_CATEGORIES)
export type ProductCategory = z.infer<typeof ProductCategory>

/** Libellés FR à afficher côté UI. */
export const PRODUCT_CATEGORY_FR: Record<ProductCategory, string> = {
  miel_et_ruche: "Miel et produits de la ruche",
  fruits: "Fruits",
  legumes: "Légumes",
  cereales_legumineuses: "Céréales et légumineuses",
  conserves_confitures: "Conserves et confitures",
  pain_biscuits: "Pain et biscuits",
  huiles: "Huiles",
  boissons_non_alcoolisees: "Boissons (non alcoolisées)",
}

/** Emoji utilisé sur les cartes produit (PR-04 / PR-05). */
export const PRODUCT_CATEGORY_EMOJI: Record<ProductCategory, string> = {
  miel_et_ruche: "🍯",
  fruits: "🍎",
  legumes: "🥬",
  cereales_legumineuses: "🌾",
  conserves_confitures: "🥫",
  pain_biscuits: "🥖",
  huiles: "🫒",
  boissons_non_alcoolisees: "🧃",
}

export const PRODUCT_PACKAGINGS = [
  "pot_250g",
  "pot_500g",
  "pot_1kg",
  "bouteille_50cl",
  "bouteille_75cl",
  "sachet_500g",
  "carton_6",
  "au_kilo",
] as const
export const ProductPackaging = z.enum(PRODUCT_PACKAGINGS)
export type ProductPackaging = z.infer<typeof ProductPackaging>

export const PRODUCT_PACKAGING_FR: Record<ProductPackaging, string> = {
  pot_250g: "Pot 250 g",
  pot_500g: "Pot 500 g",
  pot_1kg: "Pot 1 kg",
  bouteille_50cl: "Bouteille 50 cl",
  bouteille_75cl: "Bouteille 75 cl",
  sachet_500g: "Sachet 500 g",
  carton_6: "Carton de 6",
  au_kilo: "Au kilo",
}

/** Libellé court utilisé sous le prix (« /pot », « /btl », « /kg »…). */
export const PRODUCT_PACKAGING_UNIT_SHORT: Record<ProductPackaging, string> = {
  pot_250g: "pot",
  pot_500g: "pot",
  pot_1kg: "pot",
  bouteille_50cl: "btl",
  bouteille_75cl: "btl",
  sachet_500g: "sachet",
  carton_6: "carton",
  au_kilo: "kg",
}

export const PRODUCT_STATUSES = ["active", "draft", "disabled"] as const
export const ProductStatus = z.enum(PRODUCT_STATUSES)
export type ProductStatus = z.infer<typeof ProductStatus>

export const PRODUCT_STATUS_FR: Record<ProductStatus, string> = {
  active: "Actif",
  draft: "Brouillon",
  disabled: "Désactivé",
}

/**
 * Codes d'erreur retournés par les endpoints `/api/v1/producer/products[/...]`
 * (KAN-20). Mapping HTTP côté route handler.
 */
export const PRODUCT_ERROR_CODES = {
  ValidationFailed: "PRODUCT_VALIDATION_FAILED",
  NotFound: "PRODUCT_NOT_FOUND",
  Forbidden: "PRODUCT_FORBIDDEN",
  AlreadyDeleted: "PRODUCT_ALREADY_DELETED",
  InvalidPrice: "PRODUCT_INVALID_PRICE",
  InvalidAvailabilityWindow: "PRODUCT_INVALID_AVAILABILITY_WINDOW",
  NameTooLong: "PRODUCT_NAME_TOO_LONG",
  Unknown: "PRODUCT_UNKNOWN",
} as const
export type ProductErrorCode =
  (typeof PRODUCT_ERROR_CODES)[keyof typeof PRODUCT_ERROR_CODES]
