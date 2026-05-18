import { z } from "zod"

import {
  ProductCategory,
  ProductPackaging,
  ProductStatus,
} from "./shared"

/**
 * Schéma d'input pour `POST /api/v1/producer/products` (KAN-20 — KAN-69).
 *
 * Tous les champs métier sont requis sauf description, stock (default 0),
 * status (default 'active') et la fenêtre de disponibilité (les deux
 * dates sont indépendamment nullables, mais l'ordre est vérifié quand
 * elles sont toutes deux fournies).
 *
 * Labels : `string[]` simple au MVP de KAN-20. KAN-24 swap vers une enum
 * `product_label` dédiée (cf. ARCHITECTURE.md §18 entrée 1.22).
 */
export const ProductCreateInput = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Le nom du produit est requis.")
      .max(120, "Le nom du produit ne doit pas dépasser 120 caractères."),
    description: z
      .string()
      .trim()
      .max(2000, "La description ne doit pas dépasser 2000 caractères.")
      .nullable()
      .optional(),
    category: ProductCategory,
    packaging: ProductPackaging,
    unit_price_cents: z
      .number()
      .int("Le prix doit être un entier (en centimes).")
      .min(1, "Le prix doit être supérieur à 0.")
      .max(100000, "Le prix ne peut pas dépasser 1 000,00 €."),
    stock: z
      .number()
      .int("Le stock doit être un entier.")
      .min(0, "Le stock ne peut pas être négatif.")
      .default(0),
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
    // Labels stockés en text[] au MVP — la whitelist enum sera ajoutée
    // par KAN-24 (cf. ARCHITECTURE.md §18 entrée 1.22). On accepte des
    // chaînes simples bornées en longueur pour éviter les payloads
    // pathologiques.
    labels: z
      .array(z.string().trim().min(1).max(40))
      .max(10)
      .optional(),
    status: ProductStatus.default("active"),
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
export type ProductCreateInput = z.infer<typeof ProductCreateInput>
