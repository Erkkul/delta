import { STRIPE_ONBOARDING_LINK_ERROR_CODES } from "@delta/contracts/producer"
import { producer as coreProducer } from "@delta/core"
import {
  ProducerRoleForbiddenError,
  RateLimitedError,
  StripeAccountAlreadyEnabledError,
  StripeUpstreamError,
} from "@delta/core/errors"
import { type NextRequest, NextResponse } from "next/server"

import {
  getProducerAdapter,
  getRoleChecker,
} from "@/lib/producer/adapters"
import { getStripeConnectAdapter } from "@/lib/stripe/client"
import { getServerSupabase } from "@/lib/supabase/server"
import { getRateLimitStore } from "@/lib/upstash"

/**
 * POST /api/v1/producer/onboarding/stripe-link (KAN-16).
 *
 * Auth : JWT user (cookies SSR). L'email du user est lu côté serveur
 * depuis `auth.user`, pas depuis le body — pas de body attendu.
 *
 * Output (200) : { url, expires_at } — Account Link Stripe à suivre côté
 *                client par redirection (window.location = url).
 * Codes  : 200 / 401 (non authentifié) / 403 (rôle ≠ producteur) /
 *          409 (compte Stripe déjà actif) / 429 (rate-limit) /
 *          502 (Stripe upstream — retry safe)
 *
 * L'endpoint est idempotent côté compte : si `producers.stripe_account_id`
 * existe déjà, on réutilise le compte et on génère juste un nouvel Account
 * Link (le précédent expire en ≤ 5 min).
 */
export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      {
        error: "Non authentifié.",
        code: STRIPE_ONBOARDING_LINK_ERROR_CODES.Unknown,
      },
      { status: 401 },
    )
  }
  if (!user.email) {
    return NextResponse.json(
      {
        error: "Email utilisateur manquant.",
        code: STRIPE_ONBOARDING_LINK_ERROR_CODES.Unknown,
      },
      { status: 400 },
    )
  }

  // Construit les URLs de retour absolues (Stripe les exige absolues).
  // Source : header `origin` posé par Next, fallback sur le host.
  const origin =
    req.headers.get("origin") ??
    `https://${req.headers.get("host") ?? "delta-web-gamma.vercel.app"}`

  try {
    const result = await coreProducer.requestStripeOnboardingLink(
      {
        email: user.email,
        returnUrl: `${origin}/onboarding/producteur/stripe/return`,
        refreshUrl: `${origin}/onboarding/producteur/stripe/refresh`,
      },
      user.id,
      {
        ...getProducerAdapter(supabase),
        ...getRoleChecker(supabase),
        ...getStripeConnectAdapter(),
        store: getRateLimitStore(),
      },
    )
    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    if (err instanceof ProducerRoleForbiddenError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 403 },
      )
    }
    if (err instanceof RateLimitedError) {
      const retryAfterSeconds = Math.max(1, Math.ceil(err.retryAfterMs / 1000))
      return NextResponse.json(
        {
          error: "Trop de demandes, réessayez plus tard.",
          code: STRIPE_ONBOARDING_LINK_ERROR_CODES.RateLimited,
          retryAfterSeconds,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds) },
        },
      )
    }
    if (err instanceof StripeAccountAlreadyEnabledError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 409 },
      )
    }
    if (err instanceof StripeUpstreamError) {
      return NextResponse.json(
        {
          error: "Stripe est temporairement indisponible, réessayez.",
          code: err.code,
        },
        { status: 502 },
      )
    }
    console.error("[api/v1/producer/onboarding/stripe-link] POST failed", {
      userId: user.id,
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      {
        error: "Erreur serveur, réessayez plus tard.",
        code: STRIPE_ONBOARDING_LINK_ERROR_CODES.Unknown,
      },
      { status: 500 },
    )
  }
}
