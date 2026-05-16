import { z } from "zod"

/**
 * Validation des variables d'environnement Next côté serveur. Fail-fast
 * au boot d'une route handler / RSC plutôt qu'un `undefined` baladeur.
 *
 * Convention `NEXT_PUBLIC_*` / sans préfixe : cf. journal §18 entrée 1.11.
 */
const ServerEnv = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  SUPABASE_SECRET_KEY: z.string().min(20),
})

const PublicEnv = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
})

const RateLimitEnv = z.object({
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(10),
})

let cached: z.infer<typeof ServerEnv> | null = null

export function serverEnv() {
  if (cached) return cached
  const parsed = ServerEnv.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  })
  if (!parsed.success) {
    throw new Error(
      "Variables d'environnement Supabase manquantes côté serveur. " +
        "Voir apps/web/.env.local.example.",
    )
  }
  cached = parsed.data
  return cached
}

export function publicEnv() {
  return PublicEnv.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  })
}

/**
 * Validation lazy des variables Upstash (rate-limit). Isolée pour
 * pouvoir booter l'app sans Upstash en dev — seules les routes qui
 * appellent `getRateLimitStore()` exigent ces variables.
 */
export function rateLimitEnv() {
  const parsed = RateLimitEnv.safeParse({
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  if (!parsed.success) {
    throw new Error(
      "Variables Upstash manquantes (UPSTASH_REDIS_REST_URL / " +
        "UPSTASH_REDIS_REST_TOKEN). Voir apps/web/.env.local.example.",
    )
  }
  return parsed.data
}
