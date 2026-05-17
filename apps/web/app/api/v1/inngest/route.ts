import { buildDeltaFunctions, inngest } from "@delta/jobs"
import { serve } from "inngest/next"

import { inseeEnv, inngestEnv } from "@/lib/env"
import { getProducerAdapter } from "@/lib/producer/adapters"
import { getAdminSupabase } from "@/lib/supabase/server"

/**
 * Serve handler Inngest (KAN-16 — premier endpoint jobs du repo).
 *
 * Inngest cloud appelle ce endpoint pour exécuter les fonctions Delta.
 * Le SDK gère :
 *   - GET  /api/v1/inngest : introspection des fonctions (sync app)
 *   - PUT  /api/v1/inngest : enregistrement initial / register
 *   - POST /api/v1/inngest : exécution d'une fonction (event reçu)
 *
 * Les adapters concrets (Supabase admin + clé INSEE) sont construits ici
 * et passés au builder de fonctions de `@delta/jobs`. Pattern :
 *   - core ne dépend de rien (pure)
 *   - jobs dépend de core (use cases) mais pas d'apps/web (clients concrets)
 *   - apps/web injecte ici les clients réels et les passe à jobs
 */

// Lazy : on n'instancie pas le client admin Supabase au module-load
// pour ne pas planter Vercel à la cold-start si les env vars sont absentes
// (E2E sandboxé). La fonction `buildHandler` est appelée par chaque
// méthode HTTP exposée par `serve`.
function buildHandler() {
  // Validation eager des env vars (fail-fast).
  inngestEnv()
  const insee = inseeEnv()

  const admin = getAdminSupabase()
  const producerAdapter = getProducerAdapter(admin)

  const functions = buildDeltaFunctions({
    producer: producerAdapter,
    insee: { apiKey: insee.INSEE_SIRENE_API_KEY },
  })

  return serve({
    client: inngest,
    functions,
  })
}

const handler = buildHandler()
export const { GET, POST, PUT } = handler
