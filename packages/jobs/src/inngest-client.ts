import { EventSchemas, Inngest } from "inngest"

/**
 * Liste des events émis dans le repo Delta. Typage strict via `EventSchemas`
 * pour que `inngest.send` et les fonctions consommatrices partagent le même
 * contrat sur `data`.
 *
 * Premier event (KAN-16) : `producer.siret.requested` consommé par
 * `functions/producer/verify-siret.ts`. À étendre au fur et à mesure des
 * features (matching, notifs, timers mission).
 */
type DeltaEvents = {
  "producer.siret.requested": {
    data: {
      producer_id: string
    }
  }
}

/**
 * Client Inngest partagé entre l'émetteur (route handlers d'apps/web qui
 * font `inngest.send(...)`) et le serve handler (apps/web/app/api/v1/inngest)
 * qui enregistre les fonctions.
 *
 * `id` = identifiant logique de l'app sur Inngest cloud, partagé sur tous
 * les environnements. Les keys (`INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`)
 * sont lues automatiquement depuis l'env par le SDK.
 */
export const inngest = new Inngest({
  id: "delta",
  schemas: new EventSchemas().fromRecord<DeltaEvents>(),
})

export type { DeltaEvents }
