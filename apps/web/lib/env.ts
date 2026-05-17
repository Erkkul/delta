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

const StripeEnv = z.object({
  STRIPE_SECRET_KEY: z.string().regex(/^sk_(test|live)_/),
  STRIPE_WEBHOOK_SECRET_PLATFORM: z.string().regex(/^whsec_/),
  STRIPE_WEBHOOK_SECRET_CONNECT: z.string().regex(/^whsec_/),
})

const InseeEnv = z.object({
  INSEE_SIRENE_API_KEY: z.string().min(8),
})

const InngestEnv = z.object({
  INNGEST_EVENT_KEY: z.string().min(8),
  INNGEST_SIGNING_KEY: z.string().min(8),
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

/**
 * Validation lazy Stripe (KAN-16). Trois variables : la secret key pour
 * les appels API (création compte Connect, Account Links) et deux webhook
 * secrets distincts (cf. tech/setup.md § Stripe — destinations platform
 * et Connect séparées depuis la nouvelle UX Workbench).
 */
export function stripeEnv() {
  const parsed = StripeEnv.safeParse({
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET_PLATFORM: process.env.STRIPE_WEBHOOK_SECRET_PLATFORM,
    STRIPE_WEBHOOK_SECRET_CONNECT: process.env.STRIPE_WEBHOOK_SECRET_CONNECT,
  })
  if (!parsed.success) {
    throw new Error(
      "Variables Stripe manquantes ou malformées (STRIPE_SECRET_KEY, " +
        "STRIPE_WEBHOOK_SECRET_PLATFORM, STRIPE_WEBHOOK_SECRET_CONNECT). " +
        "Voir apps/web/.env.local.example.",
    )
  }
  return parsed.data
}

/**
 * Validation lazy de la clé API Sirene INSEE (KAN-16). Posée en header
 * `X-INSEE-Api-Key-Integration` sur chaque requête vers `api.insee.fr`.
 * Plan public, sans expiration (cf. tech/setup.md § API Sirene INSEE).
 */
export function inseeEnv() {
  const parsed = InseeEnv.safeParse({
    INSEE_SIRENE_API_KEY: process.env.INSEE_SIRENE_API_KEY,
  })
  if (!parsed.success) {
    throw new Error(
      "Variable INSEE_SIRENE_API_KEY manquante. " +
        "Voir apps/web/.env.local.example.",
    )
  }
  return parsed.data
}

/**
 * Validation lazy Inngest (KAN-16). Event key pour émettre, signing key
 * pour vérifier la signature des appels d'Inngest cloud vers
 * /api/v1/inngest.
 */
export function inngestEnv() {
  const parsed = InngestEnv.safeParse({
    INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
    INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
  })
  if (!parsed.success) {
    throw new Error(
      "Variables Inngest manquantes (INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY). " +
        "Voir apps/web/.env.local.example.",
    )
  }
  return parsed.data
}
