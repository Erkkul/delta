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
 *
 * Tout est instancié **lazy** dans `getHandler()` : Next 15 fait une étape
 * "collect page data" au build qui évalue les modules de routes ; si on
 * instanciait `serve()` au top-level, on validerait les env vars au build
 * et ça planterait sur Vercel (les env vars sont posées en runtime, pas
 * dispo pendant la phase de build). `force-dynamic` garantit en plus
 * qu'aucune route handler n'est pré-rendue.
 */
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

let cachedHandler: ReturnType<typeof serve> | null = null

function getHandler() {
  if (cachedHandler) return cachedHandler

  // Validation eager des env vars à la 1ère requête (fail-fast côté runtime).
  inngestEnv()
  const insee = inseeEnv()

  const admin = getAdminSupabase()
  const producerAdapter = getProducerAdapter(admin)

  const functions = buildDeltaFunctions({
    producer: producerAdapter,
    insee: { apiKey: insee.INSEE_SIRENE_API_KEY },
  })

  cachedHandler = serve({ client: inngest, functions })
  return cachedHandler
}

type Handler = ReturnType<typeof serve>

export const GET: Handler["GET"] = (...args) => getHandler().GET(...args)
export const POST: Handler["POST"] = (...args) => getHandler().POST(...args)
export const PUT: Handler["PUT"] = (...args) => getHandler().PUT(...args)
