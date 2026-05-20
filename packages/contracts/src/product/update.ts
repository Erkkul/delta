import { z } from "zod"

import {
  ProductCategory,
  ProductLabel,
  ProductPackaging,
  ProductStatus,
} from "./shared"

/**
 * Schéma d'input pour `PATCH /api/v1/producer/products/[id]` (KAN-20 — KAN-70).
 *
 * Patch partiel : tous les champs sont optionnels. `null` est accepté pour
 * réinitialiser un champ texte nullable (description, fenêtre). Les
 * bornes métier sont identiques à `ProductCreateInput`.
 */
export const ProductUpdateInput = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Le nom du produit ne peut pas être vide.")
      .max(120, "Le nom du produit ne doit pas dépasser 120 caractères.")
      .optional(),
    description: z
      .string()
      .trim()
      .max(2000, "La description ne doit pas dépasser 2000 caractères.")
      .nullable()
      .optional(),
    category: ProductCategory.optional(),
    packaging: ProductPackaging.optional(),
    unit_price_cents: z
      .number()
      .int("Le prix doit être un entier (en centimes).")
      .min(1, "Le prix doit être supérieur à 0.")
      .max(100000, "Le prix ne peut pas dépasser 1 000,00 €.")
      .optional(),
    stock: z
      .number()
      .int("Le stock doit être un entier.")
      .min(0, "Le stock ne peut pas être négatif.")
      .optional(),
    low_stock_threshold: z
      .number()
      .int("Le seuil doit être un entier.")
      .min(0, "Le seuil ne peut pas être négatif.")
      .nullable()
      .optional(),
    availability_from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format AAAA-MM-JJ.")
      .nullable()
      .optional(),
    availability_to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format AAAA-MM-JJ.")
      .nullable()
      .optional(),
    labels: z.array(ProductLabel).max(10).optional(),
    status: ProductStatus.optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.availability_from == null ||
      v.availability_to == null ||
      v.availability_to >= v.availability_from,
    {
      message: "La date de fin doit être postérieure à la date de début.",
      path: ["availability_to"],
    },
  )
export type ProductUpdateInput = z.infer<typeof ProductUpdateInput>
