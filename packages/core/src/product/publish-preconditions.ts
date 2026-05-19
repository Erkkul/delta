import { type Product } from "./adapters"

/**
 * Préconditions de publication d'un produit (KAN-23).
 *
 * Un produit ne peut transitionner vers `status = 'active'` que si toutes
 * les préconditions ci-dessous sont remplies. Côté UI, le bloc « Pour
 * publier, il faut » de la section 5 du formulaire PR-05 est alimenté par
 * cette fonction.
 *
 * Pure et synchrone — réutilisée côté core (use case
 * `transitionProductStatus`) et côté React (`<ProductForm />`).
 *
 * Décisions :
 *   - description : non null **et** non vide après trim. Pas de longueur
 *     minimum (cf. specs/KAN-23/proposal.md § Hypothèses).
 *   - stock : strictement > 0. On refuse de publier un produit dont le
 *     badge serait immédiatement « Épuisé ». Si le stock tombe à 0 après
 *     publication, le produit reste `active` (badge dérivé côté UI).
 *   - photos : au moins une.
 *   - availability_to : si renseignée, ne doit pas être échue. La date
 *     courante est passée en paramètre pour rester pure et testable —
 *     l'appelant fournit `new Date().toISOString().slice(0, 10)`.
 *   - name / price : redondants avec les CHECK DB et les bornes Zod
 *     (`length ≥ 1`, `unit_price_cents > 0`) mais re-vérifiés ici par
 *     sécurité pour ne pas dépendre de l'ordre des validations.
 */

export type PublishPrecondition =
  | "name"
  | "description"
  | "price"
  | "stock"
  | "photos"
  | "availability"

export type PublishPreconditionsResult = {
  ok: boolean
  missing: ReadonlyArray<PublishPrecondition>
}

export function getPublishPreconditions(
  product: Pick<
    Product,
    | "name"
    | "description"
    | "unit_price_cents"
    | "stock"
    | "photos"
    | "availability_to"
  >,
  today: string,
): PublishPreconditionsResult {
  const missing: PublishPrecondition[] = []

  if (product.name.trim().length === 0) {
    missing.push("name")
  }
  if (product.description == null || product.description.trim().length === 0) {
    missing.push("description")
  }
  if (product.unit_price_cents <= 0) {
    missing.push("price")
  }
  if (product.stock <= 0) {
    missing.push("stock")
  }
  if (product.photos.length === 0) {
    missing.push("photos")
  }
  if (product.availability_to != null && product.availability_to < today) {
    missing.push("availability")
  }

  return { ok: missing.length === 0, missing }
}

/** Libellés FR des préconditions, pour le rendu de la liste cochée côté UI. */
export const PUBLISH_PRECONDITION_FR: Record<PublishPrecondition, string> = {
  name: "Un nom",
  description: "Une description",
  price: "Un prix supérieur à 0 €",
  stock: "Au moins 1 article en stock",
  photos: "Au moins 1 photo",
  availability: "Une fenêtre de disponibilité valide",
}
