export type ExpirePendingMissionMatchesDeps = {
  /** Marque `expired` tous les matches `pending` dont la deadline est dépassée. Renvoie le nombre de rows affectées. */
  expirePendingPastDeadline(now: Date): Promise<number>
}

/**
 * Use case `expirePendingMissionMatches` (KAN-31 — sweep périodique).
 * Consommé par le job Inngest cron `expire-pending-mission-matches`
 * (packages/jobs). `now` passé en paramètre pour rester pur/testable.
 */
export async function expirePendingMissionMatches(
  now: Date,
  deps: ExpirePendingMissionMatchesDeps,
): Promise<number> {
  return deps.expirePendingPastDeadline(now)
}
