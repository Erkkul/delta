import { verifySiretWithInsee } from "@delta/core/producer"

import { inngest } from "../inngest-client"

import { type VerifySiretFunctionDeps } from "./types"

export type { VerifySiretFunctionDeps }

/**
 * Fabrique la fonction Inngest `producer.siret.requested` → handler
 * `verify-siret-function`. La déps (adapters Producer + Insee) est
 * injectée par l'appelant (apps/web qui monte le serve handler) pour
 * que le job reste testable et que le wiring DB soit côté apps/web.
 *
 * Configuration Inngest :
 *   - `id` : `verify-siret-producer` (stable, c'est l'identifiant Inngest)
 *   - `event` : déclencheur — chaque émission de `producer.siret.requested`
 *     déclenche une exécution
 *   - retry exponentiel automatique côté Inngest (3 tentatives par défaut,
 *     ajustable via `retries`)
 *
 * Idempotence : si le statut SIRET n'est plus `pending` au moment du
 * traitement (un retry après succès), le use case core skip sans effet.
 */
export function createVerifySiretFunction(deps: VerifySiretFunctionDeps) {
  return inngest.createFunction(
    {
      id: "verify-siret-producer",
      name: "Vérification SIRET via Sirene INSEE",
      retries: 3,
    },
    { event: "producer.siret.requested" },
    async ({ event, step }) => {
      const { producer_id } = event.data

      await step.run("verify-with-insee", async () => {
        await verifySiretWithInsee(producer_id, deps)
      })

      return { producer_id }
    },
  )
}
