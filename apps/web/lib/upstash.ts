import { rateLimit as coreRateLimit } from "@delta/core"
import { type RateLimitStore } from "@delta/core/rate-limit"

import { rateLimitEnv } from "./env"

/**
 * `RateLimitStore` Upstash partagé entre route handlers (login, endpoints
 * sensibles). **Lazy jusqu'à l'appel** : la lecture des env vars et la
 * création du store sous-jacent sont différées à la première invocation de
 * `incrementAndExpire`, pas au moment où la route récupère le store.
 *
 * Pourquoi : si les variables Upstash manquent ou si le store est
 * injoignable, l'erreur doit survenir **pendant** l'appel rate-limit (dans le
 * `try` du use case), pas à la construction des dépendances de la route. Cela
 * permet au fail-open de `loginWithEmail` d'absorber une panne Upstash au lieu
 * de renvoyer un 500 opaque à toutes les connexions (cf. incident 2026-09-11).
 *
 * Le store réel n'est mémoïsé qu'après une création réussie : un échec
 * (env manquante à un instant T) n'est pas mis en cache, donc la première
 * requête après remise en état repart proprement.
 */
let cached: RateLimitStore | null = null

function getUnderlyingStore(): RateLimitStore {
  if (cached) return cached
  const env = rateLimitEnv()
  cached = coreRateLimit.createUpstashStore({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  })
  return cached
}

export function getRateLimitStore(): RateLimitStore {
  return {
    incrementAndExpire(key, windowMs) {
      // Toute erreur (env manquante via `rateLimitEnv`, réseau Upstash) est
      // propagée comme rejet de la promesse → gérée par le caller.
      return getUnderlyingStore().incrementAndExpire(key, windowMs)
    },
  }
}
