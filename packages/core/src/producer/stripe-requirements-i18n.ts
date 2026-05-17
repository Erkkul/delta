/**
 * Mapping français des `requirements_currently_due` Stripe Connect (KAN-158).
 *
 * Stripe expose la liste des champs à compléter (KYC, IBAN, document
 * d'identité, etc.) sous forme de chaînes pointées comme
 * `individual.address.city` ou `external_account`. On les traduit en
 * labels lisibles pour l'utilisateur. Plusieurs clés peuvent partager le
 * même label métier (ex : tous les `individual.address.*` partagent
 * « Adresse personnelle ») — c'est la convention voulue pour éviter de
 * lister 4 fois la même catégorie. Le caller (UI) dédoublonne par
 * label lors du rendu.
 *
 * Fallback : si Stripe introduit une clé inconnue (rare, typiquement à
 * l'ouverture d'un nouveau pays), on retourne la clé brute avec
 * `fallback: true` pour ne pas crasher. Le caller serveur peut logger
 * pour qu'on ajoute le mapping FR au fil de l'eau.
 *
 * Source des clés observées : payloads `account.updated` capturés
 * pendant le smoke test KAN-16 (cf. table `stripe_webhook_events`).
 */

export type TranslatedRequirement = {
  /** Clé brute Stripe (ex : `individual.address.city`). */
  key: string
  /** Label FR lisible (ex : « Adresse personnelle ») ou clé brute si fallback. */
  label: string
  /** `true` si aucune traduction trouvée. Le caller peut logger côté serveur. */
  fallback: boolean
}

/**
 * Table de mapping `<clé Stripe, label FR>`. Plusieurs clés peuvent
 * partager le même label métier — la dédup se fait côté UI au rendu.
 *
 * Ordre des entrées : par catégorie (individual.*, representative.*,
 * business_profile.*, company.*, divers). Conserver l'ordre pour
 * faciliter la maintenance.
 */
const STRIPE_REQUIREMENT_LABELS: Record<string, string> = {
  // Identité du représentant (personne physique)
  "individual.first_name": "Identité du représentant",
  "individual.last_name": "Identité du représentant",
  "individual.email": "Email du représentant",
  "individual.phone": "Téléphone du représentant",
  "individual.dob.day": "Date de naissance",
  "individual.dob.month": "Date de naissance",
  "individual.dob.year": "Date de naissance",
  "individual.id_number": "Numéro d'identité (SSN/NIR)",
  "individual.verification.document": "Pièce d'identité du représentant",
  "individual.verification.additional_document":
    "Pièce d'identité du représentant",
  "individual.political_exposure": "Statut politique du représentant",

  // Adresse personnelle du représentant
  "individual.address.line1": "Adresse personnelle",
  "individual.address.line2": "Adresse personnelle",
  "individual.address.city": "Adresse personnelle",
  "individual.address.postal_code": "Adresse personnelle",
  "individual.address.state": "Adresse personnelle",
  "individual.address.country": "Adresse personnelle",

  // Alias `representative.*` (utilisé pour les comptes de type company)
  "representative.first_name": "Identité du représentant",
  "representative.last_name": "Identité du représentant",
  "representative.email": "Email du représentant",
  "representative.dob.day": "Date de naissance",
  "representative.dob.month": "Date de naissance",
  "representative.dob.year": "Date de naissance",
  "representative.verification.document": "Pièce d'identité du représentant",
  "representative.address.line1": "Adresse personnelle",
  "representative.address.city": "Adresse personnelle",
  "representative.address.postal_code": "Adresse personnelle",

  // Profil entreprise / activité
  "business_type": "Type d'activité",
  "business_profile.url": "Site internet de la ferme",
  "business_profile.mcc": "Catégorie d'activité",
  "business_profile.product_description": "Description de l'activité",
  "business_profile.support_email": "Email de contact",
  "business_profile.support_phone": "Téléphone de contact",
  "business_profile.support_url": "URL de support",
  "business_profile.support_address.line1": "Adresse de contact",

  // Société (uniquement pour les types `company`)
  "company.name": "Raison sociale",
  "company.tax_id": "Numéro fiscal",
  "company.address.line1": "Adresse du siège",
  "company.address.city": "Adresse du siège",
  "company.address.postal_code": "Adresse du siège",
  "company.phone": "Téléphone de la société",

  // Compte bancaire / paiements
  "external_account": "Compte bancaire (IBAN)",
  "settings.payments.statement_descriptor": "Descriptif sur relevé bancaire",

  // Acceptation CGU Stripe
  "tos_acceptance.date": "Acceptation des CGU Stripe",
  "tos_acceptance.ip": "Acceptation des CGU Stripe",
  "tos_acceptance.user_agent": "Acceptation des CGU Stripe",
}

/**
 * Traduit une liste de `requirements_currently_due` Stripe en labels FR.
 *
 * Préserve l'ordre des clés en entrée. Ne dédoublonne pas — le caller
 * (typiquement le rendu UI) regroupe par label si besoin.
 *
 * Les clés inconnues sont retournées telles quelles avec `fallback: true`,
 * pour que le caller serveur puisse logger et que l'UI affiche au moins
 * la clé brute (préférable à un crash ou à un masquage silencieux).
 *
 * @example
 * translateRequirements([
 *   "individual.verification.document",
 *   "individual.address.city",
 *   "external_account",
 * ])
 * // → [
 * //   { key: "individual.verification.document", label: "Pièce d'identité du représentant", fallback: false },
 * //   { key: "individual.address.city", label: "Adresse personnelle", fallback: false },
 * //   { key: "external_account", label: "Compte bancaire (IBAN)", fallback: false },
 * // ]
 */
export function translateRequirements(
  keys: readonly string[],
): TranslatedRequirement[] {
  return keys.map((key) => {
    const label = STRIPE_REQUIREMENT_LABELS[key]
    if (label) {
      return { key, label, fallback: false }
    }
    return { key, label: key, fallback: true }
  })
}

/**
 * Helper de dédoublonnage côté caller (UI). Regroupe les requirements
 * par label en préservant l'ordre de première apparition. Exposé ici
 * pour réutilisation et test, plutôt que d'imposer une logique custom
 * à chaque consommateur.
 *
 * @example
 * groupRequirementsByLabel([
 *   { key: "individual.address.city", label: "Adresse personnelle", fallback: false },
 *   { key: "individual.address.line1", label: "Adresse personnelle", fallback: false },
 *   { key: "external_account", label: "Compte bancaire (IBAN)", fallback: false },
 * ])
 * // → [
 * //   { label: "Adresse personnelle", keys: ["individual.address.city", "individual.address.line1"], fallback: false },
 * //   { label: "Compte bancaire (IBAN)", keys: ["external_account"], fallback: false },
 * // ]
 */
export type GroupedRequirement = {
  label: string
  keys: string[]
  fallback: boolean
}

export function groupRequirementsByLabel(
  translated: readonly TranslatedRequirement[],
): GroupedRequirement[] {
  const byLabel = new Map<string, GroupedRequirement>()
  for (const item of translated) {
    const existing = byLabel.get(item.label)
    if (existing) {
      existing.keys.push(item.key)
      // Si au moins un item est non-fallback dans le groupe, le groupe
      // est considéré non-fallback (priorise les vrais labels).
      if (!item.fallback) existing.fallback = false
    } else {
      byLabel.set(item.label, {
        label: item.label,
        keys: [item.key],
        fallback: item.fallback,
      })
    }
  }
  return Array.from(byLabel.values())
}
