import { rateLimit as coreRateLimit } from "@delta/core"

import { rateLimitEnv } from "./env"

/**
 * Singleton du `RateLimitStore` Upstash partagé entre route handlers
 * (login, et plus tard endpoints sensibles). Lazy : on n'instancie
 * pas le store tant qu'aucune route ne le demande, ce qui évite de
 * planter au boot en l'absence des env vars (utile en E2E).
 */
let cached: ReturnType<typeof coreRateLimit.createUpstashStore> | null = null

export function getRateLimitStore() {
  if (cached) return cached
  const env = rateLimitEnv()
  cached = coreRateLimit.createUpstashStore({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  })
  return cached
}
