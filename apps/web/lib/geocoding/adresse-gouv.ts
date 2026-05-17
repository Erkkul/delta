import { type GeocodeResult } from "@delta/core/producer"

/**
 * Client API Adresse Gouv.fr (KAN-17).
 *
 * Source : https://adresse.data.gouv.fr/api-doc/adresse
 * Endpoint : `https://api-adresse.data.gouv.fr/search/?q=<query>&limit=1`
 * - Pas de clé d'API (public)
 * - Pas de quota documenté
 * - Pas de TLS reverse proxy nécessaire — endpoint HTTPS direct
 *
 * Format de réponse (extrait) :
 *   {
 *     "features": [{
 *       "geometry": { "coordinates": [lng, lat] },
 *       "properties": { "label": "...", "score": 0.95, ... }
 *     }]
 *   }
 */

const API_BASE = "https://api-adresse.data.gouv.fr/search/"
const FETCH_TIMEOUT_MS = 4_000

type AdresseGouvFeature = {
  geometry: { coordinates: [number, number] }
  properties: { label: string; score: number }
}

type AdresseGouvResponse = {
  features: AdresseGouvFeature[]
}

/**
 * Géocode une adresse via l'API Adresse Gouv.fr. Retourne `null` si :
 *   - aucun résultat,
 *   - timeout / erreur réseau,
 *   - réponse non-JSON.
 *
 * Le caller (core use case) décide quoi faire du score : au MVP on
 * persiste les coordonnées si `score >= 0.5`, sinon on laisse la position
 * à null (cf. specs/KAN-17/design.md §Risques).
 */
export async function geocodeAddress(
  address: string,
): Promise<GeocodeResult | null> {
  const trimmed = address.trim()
  if (trimmed.length < 5) return null

  const url = `${API_BASE}?q=${encodeURIComponent(trimmed)}&limit=1`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
    if (!response.ok) return null
    const data = (await response.json()) as AdresseGouvResponse
    const top = data.features?.[0]
    if (!top) return null

    const [longitude, latitude] = top.geometry.coordinates
    return {
      longitude,
      latitude,
      score: top.properties.score,
      label: top.properties.label,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
