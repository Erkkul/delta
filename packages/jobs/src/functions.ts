import { createInseeClient, type InseeClientConfig } from "./integrations/insee"
import {
  createVerifySiretFunction,
  type VerifySiretFunctionDeps,
} from "./producer/verify-siret-function"

/**
 * Dépendances producteur sans la partie INSEE (le builder construit le
 * client Sirene à partir de `InseeClientConfig` et le merge ici).
 */
export type ProducerJobDeps = Omit<VerifySiretFunctionDeps, "fetchSiretRecord">

/**
 * Builder de la liste de fonctions Inngest à enregistrer côté serve handler
 * (`apps/web/app/api/v1/inngest/route.ts`). Le caller fournit les adapters
 * concrets (Supabase admin pour la DB, clé INSEE pour Sirene) ; `@delta/jobs`
 * reste agnostique du runtime web.
 */
export function buildDeltaFunctions(deps: {
  producer: ProducerJobDeps
  insee: InseeClientConfig
}) {
  const insee = createInseeClient(deps.insee)

  return [
    createVerifySiretFunction({
      ...deps.producer,
      ...insee,
    }),
  ]
}
