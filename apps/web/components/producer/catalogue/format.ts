/**
 * Helpers de formatage partagés par les composants catalogue (KAN-20).
 */

export function formatEuros(cents: number): string {
  const euros = cents / 100
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: euros % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(euros)
}

/**
 * Convertit une chaîne « 8,50 » ou « 8.50 » en centimes (entier). Retourne
 * `null` si la chaîne n'est pas un nombre valide.
 */
export function parseEurosToCents(value: string): number | null {
  const normalized = value.trim().replace(",", ".")
  if (normalized === "") return null
  const n = Number.parseFloat(normalized)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

export function formatEurosInput(cents: number | null): string {
  if (cents == null) return ""
  const euros = cents / 100
  return euros.toString().replace(".", ",")
}
