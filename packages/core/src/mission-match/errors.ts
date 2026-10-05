/**
 * Erreurs métier typées KAN-31 (cf. ARCHITECTURE.md §4.3).
 */

export class MissionMatchNotFoundError extends Error {
  readonly code = "MISSION_MATCH_NOT_FOUND" as const

  constructor() {
    super("Match introuvable.")
    this.name = "MissionMatchNotFoundError"
  }
}

/** Le match a déjà reçu une réponse (accepted / declined / expired). */
export class MissionMatchAlreadyRespondedError extends Error {
  readonly code = "MISSION_MATCH_ALREADY_RESPONDED" as const

  constructor() {
    super("Ce match a déjà reçu une réponse.")
    this.name = "MissionMatchAlreadyRespondedError"
  }
}

/** Le délai de confirmation est dépassé. */
export class MissionMatchExpiredError extends Error {
  readonly code = "MISSION_MATCH_EXPIRED" as const

  constructor() {
    super("Le délai de confirmation est dépassé.")
    this.name = "MissionMatchExpiredError"
  }
}

/** Stock insuffisant au moment de la confirmation (race condition). */
export class MissionMatchOutOfStockError extends Error {
  readonly code = "MISSION_MATCH_OUT_OF_STOCK" as const

  constructor() {
    super("Stock insuffisant pour confirmer ce match.")
    this.name = "MissionMatchOutOfStockError"
  }
}

/**
 * L'acheteur est actuellement suspendu (KAN-32, pénalité D7 après refus
 * répétés) — bloque la confirmation d'un nouveau match pendant la
 * suspension. Ne bloque PAS le refus (toujours autorisé).
 */
export class MissionMatchBuyerSuspendedError extends Error {
  readonly code = "MISSION_MATCH_BUYER_SUSPENDED" as const

  constructor() {
    super("Compte temporairement suspendu suite à des refus répétés.")
    this.name = "MissionMatchBuyerSuspendedError"
  }
}

export type MissionMatchErrorCode =
  | MissionMatchNotFoundError["code"]
  | MissionMatchAlreadyRespondedError["code"]
  | MissionMatchExpiredError["code"]
  | MissionMatchOutOfStockError["code"]
  | MissionMatchBuyerSuspendedError["code"]
