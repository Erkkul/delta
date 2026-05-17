import { producer as coreProducer } from "@delta/core"
import { type NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"

import {
  getProducerAdapter,
  getStripeEventStore,
} from "@/lib/producer/adapters"
import { constructStripeEvent } from "@/lib/stripe/client"
import { getAdminSupabase } from "@/lib/supabase/server"

/**
 * POST /api/v1/webhooks/stripe (KAN-16 — premier handler webhook Stripe du repo).
 *
 * Cf. ARCHITECTURE.md §8.2 :
 *   1. Vérification signature (deux secrets : platform + Connect)
 *   2. Lecture event.id
 *   3. INSERT idempotent dans stripe_webhook_events
 *      → si déjà inséré, l'event a déjà été traité, on ignore (200 OK)
 *   4. Dispatch sur event.type → use case core
 *   5. Réponse 200 (Stripe arrête de retry)
 *
 * Sécurité :
 *   - Pas d'authentification user — Stripe ne fournit qu'une signature.
 *   - Lit le **raw body** (string) avant tout parsing JSON : la vérification
 *     de signature exige l'octet original byte-pour-byte. `req.json()` ne
 *     conviendrait pas.
 *   - Utilise le client admin Supabase (service_role) — pas de session user
 *     côté webhook.
 *
 * Events supportés au MVP (KAN-16) :
 *   - `account.updated` (KYC Connect Express)
 *
 * Tous les autres event types sont acceptés (200) mais ignorés
 * silencieusement — les destinations Stripe écoutent au-delà de ce que
 * Delta consomme aujourd'hui (cf. tech/setup.md § Stripe Connect Express
 * — 7 events platform + 4 events Connect configurés en avance pour ne
 * pas avoir à recâbler à chaque feature paiement).
 */

// Webhook Stripe : on ne veut pas que Next parse le body, sinon la
// signature ne valide pas. `runtime = "nodejs"` + lecture brute via
// `req.text()`.
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    return new NextResponse("Missing Stripe-Signature header", { status: 400 })
  }

  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = constructStripeEvent(rawBody, signature)
  } catch (err) {
    console.warn("[api/v1/webhooks/stripe] signature invalide", {
      error: err instanceof Error ? err.message : String(err),
    })
    return new NextResponse("Invalid signature", { status: 400 })
  }

  const admin = getAdminSupabase()
  const eventStore = getStripeEventStore(admin)

  // Idempotence : si l'INSERT échoue sur conflict, l'event a déjà été traité.
  const isNew = await eventStore.insertIfNew({
    event_id: event.id,
    event_type: event.type,
    payload: event as unknown as Record<string, unknown>,
  })
  if (!isNew) {
    return new NextResponse("Already processed", { status: 200 })
  }

  try {
    await dispatchEvent(event, admin)
    return new NextResponse("OK", { status: 200 })
  } catch (err) {
    console.error("[api/v1/webhooks/stripe] dispatch failed", {
      eventId: event.id,
      eventType: event.type,
      error: err instanceof Error ? err.message : String(err),
    })
    // On a déjà INSERT l'event ; on retourne 500 pour que Stripe retry.
    // L'INSERT idempotent garantit qu'on ne crée pas de doublon.
    // Note : ce comportement crée une row "fantôme" dans stripe_webhook_events
    // si le dispatch échoue définitivement. À surveiller post-launch.
    return new NextResponse("Processing failed", { status: 500 })
  }
}

async function dispatchEvent(
  event: Stripe.Event,
  admin: ReturnType<typeof getAdminSupabase>,
): Promise<void> {
  switch (event.type) {
    case "account.updated": {
      const account = event.data.object
      const producer = getProducerAdapter(admin)
      await coreProducer.applyStripeAccountUpdate(
        {
          accountId: account.id,
          payoutsEnabled: account.payouts_enabled ?? false,
          chargesEnabled: account.charges_enabled ?? false,
          detailsSubmitted: account.details_submitted ?? false,
          requirementsCurrentlyDue:
            account.requirements?.currently_due ?? [],
        },
        producer,
      )
      return
    }
    default:
      // Event type non encore câblé côté Delta — on l'a stocké pour
      // l'idempotence, et on répond 200 pour que Stripe arrête de retry.
      return
  }
}
