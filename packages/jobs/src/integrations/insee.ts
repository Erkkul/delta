import { type InseeAdapter, type InseeSiretRecord } from "@delta/core/producer"

/**
 * Client API Sirene INSEE V3.11 (KAN-16). Plan public, ≤ 30 req/min,
 * clé d'API sans expiration posée en header `X-INSEE-Api-Key-Integration`.
 *
 * Endpoint : https://api.insee.fr/api-sirene/3.11/siret/<siret>
 * Doc : portail-api.insee.fr → Catalogue → API Sirene → Documentation
 *
 * Réponses :
 *   - 200 : payload avec `etablissement.uniteLegale.periodesUniteLegale[0]`
 *           contenant `denominationUniteLegale` ; on extrait cette dénomination
 *           (ou les nom/prénom si entreprise individuelle).
 *   - 404 : SIRET introuvable → on retourne `null` (rejet métier en aval).
 *   - 401/403 : clé invalide → throw, l'Inngest job retry.
 *   - 429 : quota dépassé → throw, retry exponentiel Inngest.
 *   - 5xx : INSEE down → throw, retry.
 */

const INSEE_BASE_URL = "https://api.insee.fr/api-sirene/3.11"
const INSEE_HEADER_NAME = "X-INSEE-Api-Key-Integration"

export type InseeClientConfig = {
  apiKey: string
  /** Override fetch (pour les tests). Par défaut, fetch global. */
  fetchImpl?: typeof fetch
}

export function createInseeClient(config: InseeClientConfig): InseeAdapter {
  const doFetch = config.fetchImpl ?? fetch
  return {
    async fetchSiretRecord(siret: string): Promise<InseeSiretRecord | null> {
      const response = await doFetch(`${INSEE_BASE_URL}/siret/${siret}`, {
        headers: {
          [INSEE_HEADER_NAME]: config.apiKey,
          Accept: "application/json",
        },
      })

      if (response.status === 404) return null
      if (!response.ok) {
        const body = await response.text().catch(() => "")
        throw new Error(
          `Sirene API ${String(response.status)} on /siret/${siret}: ${body.slice(0, 200)}`,
        )
      }

      const payload = (await response.json()) as InseeSiretPayload
      return {
        siret,
        legal_name_official: extractDenomination(payload),
      }
    },
  }
}

/**
 * Forme minimale du payload Sirene V3.11 utilisée par Delta. Les autres
 * champs (adresse, dates, etc.) sont ignorés volontairement — on consomme
 * uniquement la dénomination pour le contrôle de cohérence (KAN-16).
 *
 * Structure de référence (cf. doc Sirene V3.11) :
 *   etablissement.uniteLegale.{denominationUniteLegale, prenomUsuelUniteLegale,
 *     nomUniteLegale, nomUsageUniteLegale, periodesUniteLegale[0].*}
 *
 * Délibérément lax sur le typage runtime — c'est un payload INSEE, on
 * traite tout comme optionnel et on échoue gracieusement.
 */
type InseeSiretPayload = {
  etablissement?: {
    uniteLegale?: {
      denominationUniteLegale?: string | null
      prenomUsuelUniteLegale?: string | null
      nomUniteLegale?: string | null
      nomUsageUniteLegale?: string | null
      periodesUniteLegale?: Array<{
        denominationUniteLegale?: string | null
      }>
    }
  }
}

function extractDenomination(payload: InseeSiretPayload): string | null {
  const ul = payload.etablissement?.uniteLegale
  if (!ul) return null

  // 1. Dénomination courante (personnes morales : EARL, SARL, etc.)
  const current = sanitize(ul.denominationUniteLegale)
  if (current) return current

  // 2. Dénomination de la dernière période (parfois posée là plutôt qu'au niveau racine)
  const last = ul.periodesUniteLegale?.[0]
  const periodDenom = sanitize(last?.denominationUniteLegale)
  if (periodDenom) return periodDenom

  // 3. Nom commercial d'usage
  const usage = sanitize(ul.nomUsageUniteLegale)
  if (usage) return usage

  // 4. Personne physique (auto-entrepreneur) : prénom + nom
  const prenom = sanitize(ul.prenomUsuelUniteLegale)
  const nom = sanitize(ul.nomUniteLegale)
  if (prenom || nom) return `${prenom ?? ""} ${nom ?? ""}`.trim()

  return null
}

function sanitize(v: string | null | undefined): string | null {
  if (!v) return null
  // INSEE renvoie [ND] pour les champs non diffusés (cf. payload de test
  // SIREN 309634954). On les traite comme absents.
  if (v === "[ND]" || v.trim().length === 0) return null
  return v
}
