import { type Producer, type InseeAdapter, type ProducerAdapter } from "./adapters"

/**
 * Use case `verifySiretWithInsee` (KAN-16 — appelé par le job Inngest
 * `producer.siret.requested`).
 *
 * Étapes :
 *   1. Lit la row producteur courante
 *   2. Si siret = null ou statut != 'pending', skip (idempotent)
 *   3. Appelle Sirene INSEE
 *   4. Compare la dénomination renvoyée avec `legal_name` déclaré
 *   5. Persiste le résultat : verified ou rejected (avec raison)
 *
 * La comparaison est **fuzzy** : on normalise les deux côtés (lowercase,
 * suppression accents, suppression de la forme juridique et autres
 * tokens parasites) et on vérifie l'inclusion plutôt qu'une égalité
 * stricte. Les graphies divergent souvent (avec / sans EARL, accents,
 * abréviations) — strict equality générerait trop de faux rejets.
 *
 * Si le SIRET n'existe pas dans la base Sirene (Sirene renvoie 404 /
 * record vide), on rejette avec raison explicite. Si Sirene est down,
 * l'erreur remonte et Inngest fera un retry exponentiel.
 */
export async function verifySiretWithInsee(
  producerId: string,
  deps: ProducerAdapter & InseeAdapter,
): Promise<Producer> {
  const producer = await findProducerById(producerId, deps)

  if (!producer.siret || producer.siret_status !== "pending") {
    // Idempotent — un retry après succès ne refait pas le travail.
    return producer
  }
  if (!producer.legal_name) {
    return deps.setSiretVerificationResult(producerId, {
      status: "rejected",
      reason: "Raison sociale manquante.",
    })
  }

  const record = await deps.fetchSiretRecord(producer.siret)
  if (!record) {
    return deps.setSiretVerificationResult(producerId, {
      status: "rejected",
      reason: "SIRET introuvable dans la base Sirene.",
    })
  }

  const officialName = record.legal_name_official ?? ""
  if (!matchesLegalName(producer.legal_name, officialName)) {
    return deps.setSiretVerificationResult(producerId, {
      status: "rejected",
      reason: `La raison sociale déclarée ("${producer.legal_name}") ne correspond pas à celle enregistrée à l'INSEE ("${officialName}").`,
    })
  }

  return deps.setSiretVerificationResult(producerId, { status: "verified" })
}

/**
 * Helper : lookup par id. Le repo n'expose pas directement findById
 * (par design — on accède toujours par user_id ou stripe_account_id),
 * mais ici on a juste un producer_id en main (transmis par l'event
 * Inngest). On passe par `findByUserId` après un préalable find côté
 * appelant ? Non : trop indirect. À la place, on étend l'adapter avec
 * une méthode `findById` privée au use case.
 */
async function findProducerById(
  producerId: string,
  deps: ProducerAdapter,
): Promise<Producer> {
  // Pour éviter d'élargir ProducerAdapter au cas où le seul consommateur
  // de findById serait ce use case, on fait un cast typé : l'adapter
  // d'apps/web/packages/jobs implémente findById en sus.
  const adapter = deps as ProducerAdapter & {
    findById(id: string): Promise<Producer | null>
  }
  const found = await adapter.findById(producerId)
  if (!found) {
    throw new Error(`Producer ${producerId} introuvable (event obsolète ?)`)
  }
  return found
}

/**
 * Compare la raison sociale déclarée à la dénomination officielle Sirene
 * avec normalisation tolérante :
 *   1. Lowercase
 *   2. Suppression des accents (NFD + diacritiques)
 *   3. Suppression de tokens parasites (formes juridiques, ponctuation)
 *   4. Trim + dédoublonnage des espaces
 *
 * Match si l'un contient l'autre après normalisation. On évite Levenshtein
 * pour le MVP (simplicité, déterministe) — à upgrader si on découvre trop
 * de faux rejets ou faux positifs en prod.
 */
export function matchesLegalName(declared: string, official: string): boolean {
  const a = normalizeForCompare(declared)
  const b = normalizeForCompare(official)
  if (a.length === 0 || b.length === 0) return false
  return a.includes(b) || b.includes(a)
}

const LEGAL_FORM_TOKENS = [
  "earl",
  "scea",
  "sarl",
  "auto-entrepreneur",
  "auto entrepreneur",
  "sas",
  "sasu",
  "gaec",
  "eurl",
  "snc",
  "sci",
]

function normalizeForCompare(input: string): string {
  let s = input.normalize("NFD").replace(/[̀-ͯ]/g, "")
  s = s.toLowerCase()
  for (const token of LEGAL_FORM_TOKENS) {
    // Bornes de mot lexicales pour ne pas tronquer un mot qui contiendrait
    // le token (ex: "PASsion" ne doit pas matcher "sas").
    s = s.replace(new RegExp(`\\b${token}\\b`, "g"), " ")
  }
  s = s.replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ")
  return s
}
