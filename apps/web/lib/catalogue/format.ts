import {
  PRODUCT_PACKAGING_UNIT_SHORT,
  type ProductPackaging,
} from "@delta/contracts/product"

/** Formate un montant en centimes vers une chaîne « 8,50 € » (locale FR). */
export function formatPriceEur(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  })
}

/** Libellé court d'unité affiché sous le prix (« / pot », « / kg »…). */
export function packagingUnitLabel(packaging: ProductPackaging): string {
  return `/ ${PRODUCT_PACKAGING_UNIT_SHORT[packaging]}`
}
