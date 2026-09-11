import {
  expirePendingMissionMatches,
  type ExpirePendingMissionMatchesDeps,
} from "@delta/core/mission-match"

import { inngest } from "../inngest-client"

/**
 * Fonction Inngest cron `expire-pending-mission-matches` (KAN-31).
 *
 * Auto-suffisante : ne dépend d'aucun event émis par une autre feature
 * (aucun flow de réservation rameneur n'existe encore pour émettre un
 * `mission_buyer.confirmation_requested` — cf. specs/KAN-31/design.md §
 * Dépendances). Tourne toutes les 15 min et bascule en `expired` tout
 * `mission_buyers` `pending` dont la deadline est dépassée.
 *
 * Idempotent par construction : l'UPDATE ne cible que `status = 'pending'`,
 * un rerun ne touche donc jamais une row déjà expirée.
 */
export function createExpirePendingMissionMatchesFunction(
  deps: ExpirePendingMissionMatchesDeps,
) {
  return inngest.createFunction(
    { id: "expire-pending-mission-matches", name: "Expiration des matches en attente" },
    { cron: "*/15 * * * *" },
    async ({ step }) => {
      const count = await step.run("expire-past-deadline", () =>
        expirePendingMissionMatches(new Date(), deps),
      )
      return { expired: count }
    },
  )
}
