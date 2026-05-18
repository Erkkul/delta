import { type ProductStatus } from "@delta/contracts/product"

/**
 * État stock dérivé à l'affichage (KAN-22).
 *
 *   - `empty`  : `stock === 0` quel que soit le statut. Le rendu n'utilise
 *                le badge « Épuisé » que pour les produits `status = 'active'`
 *                (pour les brouillons et désactivés, le badge de statut prime).
 *                Le drapeau `showSoldOutBadge` porte cette nuance.
 *   - `low`    : `stock > 0 && low_stock_threshold != null && stock <= low_stock_threshold`.
 *   - `ok`     : tous les autres cas.
 *
 * La règle est inclusive (`stock <= threshold` → `low`) — cohérent avec le
 * helper text « Notification quand stock ≤ ce seuil » côté formulaire PR-05.
 *
 * Helper pur, testable hors React, exposé via `@delta/core/product`. La
 * notification effective (event Inngest `product.stock_low` + canal
 * email/in-app) est portée par KAN-56 — KAN-22 ne livre que la couche
 * visuelle de l'état dérivé.
 */
export type StockDisplayKind = "ok" | "low" | "empty"

export type StockDisplayState = {
  kind: StockDisplayKind
  /** Indique au rendu s'il doit basculer le badge `status-badge` vers « Épuisé ». */
  showSoldOutBadge: boolean
}

export function getStockDisplayState(input: {
  stock: number
  low_stock_threshold: number | null
  status: ProductStatus
}): StockDisplayState {
  if (input.stock === 0) {
    return {
      kind: "empty",
      showSoldOutBadge: input.status === "active",
    }
  }
  if (
    input.low_stock_threshold != null &&
    input.stock <= input.low_stock_threshold
  ) {
    return { kind: "low", showSoldOutBadge: false }
  }
  return { kind: "ok", showSoldOutBadge: false }
}
