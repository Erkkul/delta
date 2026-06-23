import { z } from "zod"

import { ProductCategory, ProductPackaging } from "../product/shared"

/**
 * Photo publique d'un produit catalogue (première entrée de `products.photos`).
 * `url` pointe vers le bucket Storage public `product-photos`.
 */
export const CataloguePhoto = z.object({
  url: z.string(),
  alt: z.string().nullable(),
})
export type CataloguePhoto = z.infer<typeof CataloguePhoto>

/**
 * Projection producteur **publique** affichée sur une carte / fiche catalogue.
 * Whitelist stricte : jamais SIRET, identifiants Stripe ou adresse exacte de
 * collecte (cf. specs/KAN-28/design.md § Modèle de données).
 */
export const CatalogueProducer = z.object({
  id: z.string().uuid(),
  display_name: z.string(),
  zone: z.string().nullable(),
})
export type CatalogueProducer = z.infer<typeof CatalogueProducer>

/**
 * Produit tel qu'exposé côté acheteur (cartes AC-03/AC-04, fiche AC-05).
 * Sortie de `GET /api/v1/catalogue` et de la lecture server-side de la fiche.
 * Les `labels` ne sont pas re-validés contre l'enum produit (tolérance aux
 * valeurs futures) — l'affichage filtre les libellés connus.
 */
export const CataloguePublicProduct = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  category: ProductCategory,
  packaging: ProductPackaging,
  unit_price_cents: z.number().int().nonnegative(),
  labels: z.array(z.string()),
  photo: CataloguePhoto.nullable(),
  producer: CatalogueProducer,
  created_at: z.string(),
})
export type CataloguePublicProduct = z.infer<typeof CataloguePublicProduct>

/**
 * Page de résultats catalogue : items + curseur keyset (`created_at` du
 * dernier item, `null` si dernière page).
 */
export const CataloguePage = z.object({
  items: z.array(CataloguePublicProduct),
  nextCursor: z.string().nullable(),
})
export type CataloguePage = z.infer<typeof CataloguePage>

/**
 * Codes d'erreur des endpoints catalogue. Mapping HTTP côté route handler.
 */
export const CATALOGUE_ERROR_CODES = {
  ValidationFailed: "CATALOGUE_VALIDATION_FAILED",
  NotFound: "CATALOGUE_NOT_FOUND",
  Unknown: "CATALOGUE_UNKNOWN",
} as const
export type CatalogueErrorCode =
  (typeof CATALOGUE_ERROR_CODES)[keyof typeof CATALOGUE_ERROR_CODES]
