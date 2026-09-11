import { z } from "zod"

import { CataloguePublicProduct } from "../catalogue/product"

/**
 * Plafond d'envies actives par acheteur (maquette AC-06 : « N envies sur 20
 * max »). Règle métier appliquée côté serveur (cf. specs/KAN-30/design.md).
 */
export const WISHLIST_MAX = 20

/**
 * Body de `POST /api/v1/wishlist` (KAN-30 — ajout d'une envie depuis AC-05).
 * Une envie = un produit précis d'un producteur précis (décision D1).
 */
export const WishlistAddInput = z
  .object({
    productId: z.string().uuid(),
  })
  .strict()
export type WishlistAddInput = z.infer<typeof WishlistAddInput>

/**
 * Une envie telle qu'affichée sur AC-06 (« Mes envies »). La projection
 * produit réutilise `CataloguePublicProduct` (vue publique catalogue KAN-28) :
 * une envie dont le produit n'est plus visible n'est pas renvoyée.
 *
 * Pas de champ `status` : au MVP toute envie est en état `pending`. L'état
 * enrichi (match probable / à confirmer) sera dérivé par le matching (KAN-42).
 */
export const WishlistItem = z.object({
  id: z.string().uuid(),
  product: CataloguePublicProduct,
  created_at: z.string(),
})
export type WishlistItem = z.infer<typeof WishlistItem>

/**
 * Réponse de `GET /api/v1/wishlist`.
 * - `items` : envies actives *visibles* (jointure catalogue), triées récence.
 * - `count` : nombre d'envies actives (ce qui compte vis-à-vis du plafond),
 *   potentiellement > `items.length` si une envie pointe un produit devenu
 *   invisible (cf. specs/KAN-30/design.md § Risques — envie orpheline).
 * - `max` : plafond (`WISHLIST_MAX`).
 */
export const WishlistPage = z.object({
  items: z.array(WishlistItem),
  count: z.number().int().nonnegative(),
  max: z.number().int().positive(),
})
export type WishlistPage = z.infer<typeof WishlistPage>

/**
 * Codes d'erreur des endpoints wishlist. Mapping HTTP côté route handler.
 */
export const WISHLIST_ERROR_CODES = {
  ValidationFailed: "WISHLIST_VALIDATION_FAILED",
  RoleForbidden: "WISHLIST_ROLE_FORBIDDEN",
  ProductNotFound: "WISHLIST_PRODUCT_NOT_FOUND",
  AlreadyAdded: "WISHLIST_ALREADY_ADDED",
  LimitReached: "WISHLIST_LIMIT_REACHED",
  Unknown: "WISHLIST_UNKNOWN",
} as const
export type WishlistErrorCode =
  (typeof WISHLIST_ERROR_CODES)[keyof typeof WISHLIST_ERROR_CODES]
