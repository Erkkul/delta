import { describe, expect, it, vi } from "vitest"

import {
  applyStripeAccountUpdate,
  deriveStripeStatus,
  type StripeAccountUpdatePayload,
} from "./apply-stripe-update"

const ACCOUNT_ID = "acct_test_1"

const BASE_PAYLOAD: StripeAccountUpdatePayload = {
  accountId: ACCOUNT_ID,
  payoutsEnabled: false,
  chargesEnabled: false,
  detailsSubmitted: false,
  requirementsCurrentlyDue: [],
}

describe("deriveStripeStatus", () => {
  it("retourne 'active' quand payouts_enabled", () => {
    expect(
      deriveStripeStatus({
        payoutsEnabled: true,
        chargesEnabled: true,
        detailsSubmitted: true,
        requirementsCurrentlyDue: [],
      }),
    ).toBe("active")
  })

  it("retourne 'restricted' quand details_submitted mais payouts off", () => {
    expect(
      deriveStripeStatus({
        payoutsEnabled: false,
        chargesEnabled: true,
        detailsSubmitted: true,
        requirementsCurrentlyDue: ["external_account"],
      }),
    ).toBe("restricted")
  })

  it("retourne 'pending' tant que details non soumis mais requirements en cours", () => {
    expect(
      deriveStripeStatus({
        payoutsEnabled: false,
        chargesEnabled: false,
        detailsSubmitted: false,
        requirementsCurrentlyDue: ["business_type", "external_account"],
      }),
    ).toBe("pending")
  })

  it("retourne 'disabled' quand tous flags off et plus aucune requirement", () => {
    expect(
      deriveStripeStatus({
        payoutsEnabled: false,
        chargesEnabled: false,
        detailsSubmitted: false,
        requirementsCurrentlyDue: [],
      }),
    ).toBe("disabled")
  })
})

describe("applyStripeAccountUpdate", () => {
  it("appelle l'adapter avec stripe_status dérivé + flags miroirs", async () => {
    const applyStripeAccountUpdateAdapter = vi
      .fn()
      .mockResolvedValue({ id: "p1" })
    await applyStripeAccountUpdate(
      {
        ...BASE_PAYLOAD,
        payoutsEnabled: true,
        chargesEnabled: true,
        detailsSubmitted: true,
        requirementsCurrentlyDue: [],
      },
      {
        findByUserId: vi.fn(),
        findByStripeAccountId: vi.fn(),
        ensureForUser: vi.fn(),
        updateSiretDeclaration: vi.fn(),
        setSiretVerificationResult: vi.fn(),
        setStripeAccount: vi.fn(),
        applyStripeAccountUpdate: applyStripeAccountUpdateAdapter,
      },
    )
    expect(applyStripeAccountUpdateAdapter).toHaveBeenCalledWith(ACCOUNT_ID, {
      stripe_status: "active",
      payouts_enabled: true,
      charges_enabled: true,
      requirements_currently_due: [],
    })
  })

  it("renvoie null si aucun producteur ne porte le stripe_account_id", async () => {
    const out = await applyStripeAccountUpdate(BASE_PAYLOAD, {
      findByUserId: vi.fn(),
      findByStripeAccountId: vi.fn(),
      ensureForUser: vi.fn(),
      updateSiretDeclaration: vi.fn(),
      setSiretVerificationResult: vi.fn(),
      setStripeAccount: vi.fn(),
      applyStripeAccountUpdate: vi.fn().mockResolvedValue(null),
    })
    expect(out).toBeNull()
  })
})
