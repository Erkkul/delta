import { type StripeAccountStatus } from "@delta/contracts/producer"

import { type Producer, type ProducerAdapter } from "./adapters"

/**
 * Forme minimale du payload `account.updated` consommée par le use case.
 * Doublonne volontairement les types Stripe SDK pour ne pas coupler le
 * core à la lib vendor (cf. ARCHITECTURE.md §4.1). Le webhook handler
 * dans `apps/web` mappe le payload Stripe brut vers cette forme.
 */
export type StripeAccountUpdatePayload = {
  accountId: string
  payoutsEnabled: boolean
  chargesEnabled: boolean
  detailsSubmitted: boolean
  requirementsCurrentlyDue: string[]
}

/**
 * Dérive le `stripe_status` métier à partir des flags Stripe Connect.
 * Mapping (cf. specs/KAN-16/design.md §Modèle) :
 *   - payouts_enabled = true                              → active
 *   - details_submitted = true, payouts_enabled = false   → restricted
 *   - details_submitted = true, requirements vide         → restricted
 *   - details_submitted = false                            → pending
 *   - tous flags false ET requirements vide                → disabled (état terminal)
 *
 * Cette logique reste simple — Stripe expose une mosaïque de flags, on
 * la condense en 5 valeurs métier pour piloter l'UI. À affiner si on
 * découvre des cas limites en prod.
 */
export function deriveStripeStatus(input: {
  payoutsEnabled: boolean
  chargesEnabled: boolean
  detailsSubmitted: boolean
  requirementsCurrentlyDue: string[]
}): StripeAccountStatus {
  if (input.payoutsEnabled) return "active"
  if (input.detailsSubmitted) return "restricted"
  if (
    !input.chargesEnabled &&
    !input.detailsSubmitted &&
    input.requirementsCurrentlyDue.length === 0
  ) {
    return "disabled"
  }
  return "pending"
}

/**
 * Use case `applyStripeAccountUpdate` (KAN-16 — webhook `account.updated`).
 *
 * Étapes :
 *   1. Dérive le `stripe_status` métier
 *   2. Met à jour la row producteur via `stripe_account_id` (FK lookup)
 *
 * Renvoie `null` si aucun producteur n'a le `stripe_account_id` reçu
 * (cas légitime : ancien compte test, ou compte créé manuellement côté
 * Stripe dashboard hors flow Delta). Le webhook handler logge un warn
 * mais répond 200 — Stripe arrête de retry.
 */
export async function applyStripeAccountUpdate(
  payload: StripeAccountUpdatePayload,
  deps: ProducerAdapter,
): Promise<Producer | null> {
  const stripe_status = deriveStripeStatus(payload)
  return deps.applyStripeAccountUpdate(payload.accountId, {
    stripe_status,
    payouts_enabled: payload.payoutsEnabled,
    charges_enabled: payload.chargesEnabled,
    requirements_currently_due: payload.requirementsCurrentlyDue,
  })
}
