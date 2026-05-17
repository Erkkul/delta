import { describe, expect, it, vi } from "vitest"

import {
  ProducerRoleForbiddenError,
  RateLimitedError,
  StripeAccountAlreadyEnabledError,
  StripeUpstreamError,
} from "../errors"
import { type RateLimitStore } from "../rate-limit/rate-limit"

import { type Producer } from "./adapters"
import {
  requestStripeOnboardingLink,
  STRIPE_LINK_RATE_LIMIT,
} from "./request-stripe-link"

const USER_ID = "user-1"
const PRODUCER_ID = "producer-1"

const INPUT = {
  email: "marie@bocage.fr",
  returnUrl: "https://delta.fr/onboarding/producteur/stripe/return",
  refreshUrl: "https://delta.fr/onboarding/producteur/stripe/refresh",
}

function noopStore(): RateLimitStore {
  return {
    incrementAndExpire: () =>
      Promise.resolve({
        count: 1,
        ttlMs: STRIPE_LINK_RATE_LIMIT.windowMs,
      }),
  }
}

function exhaustedStore(): RateLimitStore {
  return {
    incrementAndExpire: () => Promise.resolve({ count: 99, ttlMs: 60_000 }),
  }
}

function freshProducer(overrides: Partial<Producer> = {}): Producer {
  return {
    id: PRODUCER_ID,
    user_id: USER_ID,
    siret: null,
    legal_name: null,
    legal_form: null,
    naf_code: null,
    siret_status: "not_submitted",
    siret_verified_at: null,
    siret_rejection_reason: null,
    stripe_account_id: null,
    stripe_status: "not_created",
    payouts_enabled: false,
    charges_enabled: false,
    requirements_currently_due: [],
    ...overrides,
  }
}

describe("requestStripeOnboardingLink", () => {
  it("crée le compte Stripe puis renvoie un Account Link d'onboarding sur premier appel", async () => {
    const ensureForUser = vi.fn().mockResolvedValue(freshProducer())
    const createConnectAccount = vi
      .fn()
      .mockResolvedValue({ accountId: "acct_test_1" })
    const setStripeAccount = vi
      .fn()
      .mockResolvedValue(
        freshProducer({
          stripe_account_id: "acct_test_1",
          stripe_status: "pending",
        }),
      )
    const createAccountLink = vi.fn().mockResolvedValue({
      url: "https://connect.stripe.com/setup/s/acct_test_1",
      expiresAt: "2026-05-17T10:30:00.000Z",
    })
    const createAccountUpdateLink = vi.fn()

    const out = await requestStripeOnboardingLink(INPUT, USER_ID, {
      hasProducerRole: vi.fn().mockResolvedValue(true),
      findByUserId: vi.fn(),
      findByStripeAccountId: vi.fn(),
      ensureForUser,
      updateSiretDeclaration: vi.fn(),
      setSiretVerificationResult: vi.fn(),
      setStripeAccount,
      applyStripeAccountUpdate: vi.fn(),
      createConnectAccount,
      createAccountLink,
      createAccountUpdateLink,
      store: noopStore(),
    })

    expect(createConnectAccount).toHaveBeenCalledWith({ email: INPUT.email })
    expect(setStripeAccount).toHaveBeenCalledWith(USER_ID, "acct_test_1")
    expect(createAccountLink).toHaveBeenCalledWith({
      accountId: "acct_test_1",
      refreshUrl: INPUT.refreshUrl,
      returnUrl: INPUT.returnUrl,
    })
    // On vient de créer le compte → flow onboarding initial, PAS update.
    expect(createAccountUpdateLink).not.toHaveBeenCalled()
    expect(out).toEqual({
      url: "https://connect.stripe.com/setup/s/acct_test_1",
      expires_at: "2026-05-17T10:30:00.000Z",
    })
  })

  it("réutilise le stripe_account_id existant et génère un Account Link de type update (KAN-158)", async () => {
    const createConnectAccount = vi.fn()
    const setStripeAccount = vi.fn()
    const createAccountLink = vi.fn()
    const createAccountUpdateLink = vi
      .fn()
      .mockResolvedValue({ url: "https://x", expiresAt: "2026-05-17T11:00:00Z" })
    await requestStripeOnboardingLink(INPUT, USER_ID, {
      hasProducerRole: vi.fn().mockResolvedValue(true),
      findByUserId: vi.fn(),
      findByStripeAccountId: vi.fn(),
      ensureForUser: vi
        .fn()
        .mockResolvedValue(
          freshProducer({
            stripe_account_id: "acct_existing",
            stripe_status: "restricted",
          }),
        ),
      updateSiretDeclaration: vi.fn(),
      setSiretVerificationResult: vi.fn(),
      setStripeAccount,
      applyStripeAccountUpdate: vi.fn(),
      createConnectAccount,
      createAccountLink,
      createAccountUpdateLink,
      store: noopStore(),
    })
    expect(createConnectAccount).not.toHaveBeenCalled()
    expect(setStripeAccount).not.toHaveBeenCalled()
    // Compte pré-existant → flow update, PAS onboarding.
    expect(createAccountLink).not.toHaveBeenCalled()
    expect(createAccountUpdateLink).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: "acct_existing" }),
    )
  })

  it("rejette ProducerRoleForbiddenError si le user n'a pas le rôle producteur", async () => {
    await expect(
      requestStripeOnboardingLink(INPUT, USER_ID, {
        hasProducerRole: vi.fn().mockResolvedValue(false),
        findByUserId: vi.fn(),
        findByStripeAccountId: vi.fn(),
        ensureForUser: vi.fn(),
        updateSiretDeclaration: vi.fn(),
        setSiretVerificationResult: vi.fn(),
        setStripeAccount: vi.fn(),
        applyStripeAccountUpdate: vi.fn(),
        createConnectAccount: vi.fn(),
        createAccountLink: vi.fn(),
        createAccountUpdateLink: vi.fn(),
        store: noopStore(),
      }),
    ).rejects.toBeInstanceOf(ProducerRoleForbiddenError)
  })

  it("rejette StripeAccountAlreadyEnabledError si payouts_enabled = true", async () => {
    const createConnectAccount = vi.fn()
    const createAccountLink = vi.fn()
    const createAccountUpdateLink = vi.fn()
    await expect(
      requestStripeOnboardingLink(INPUT, USER_ID, {
        hasProducerRole: vi.fn().mockResolvedValue(true),
        findByUserId: vi.fn(),
        findByStripeAccountId: vi.fn(),
        ensureForUser: vi.fn().mockResolvedValue(
          freshProducer({
            stripe_account_id: "acct_active",
            stripe_status: "active",
            payouts_enabled: true,
            charges_enabled: true,
          }),
        ),
        updateSiretDeclaration: vi.fn(),
        setSiretVerificationResult: vi.fn(),
        setStripeAccount: vi.fn(),
        applyStripeAccountUpdate: vi.fn(),
        createConnectAccount,
        createAccountLink,
        createAccountUpdateLink,
        store: noopStore(),
      }),
    ).rejects.toBeInstanceOf(StripeAccountAlreadyEnabledError)
    expect(createConnectAccount).not.toHaveBeenCalled()
    expect(createAccountLink).not.toHaveBeenCalled()
    expect(createAccountUpdateLink).not.toHaveBeenCalled()
  })

  it("rejette RateLimitedError si la limite est dépassée", async () => {
    try {
      await requestStripeOnboardingLink(INPUT, USER_ID, {
        hasProducerRole: vi.fn().mockResolvedValue(true),
        findByUserId: vi.fn(),
        findByStripeAccountId: vi.fn(),
        ensureForUser: vi.fn(),
        updateSiretDeclaration: vi.fn(),
        setSiretVerificationResult: vi.fn(),
        setStripeAccount: vi.fn(),
        applyStripeAccountUpdate: vi.fn(),
        createConnectAccount: vi.fn(),
        createAccountLink: vi.fn(),
        createAccountUpdateLink: vi.fn(),
        store: exhaustedStore(),
      })
      expect.fail("Devait throw RateLimitedError")
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitedError)
      expect((err as RateLimitedError).retryAfterMs).toBe(60_000)
    }
  })

  it("convertit les erreurs Stripe SDK en StripeUpstreamError (création compte)", async () => {
    await expect(
      requestStripeOnboardingLink(INPUT, USER_ID, {
        hasProducerRole: vi.fn().mockResolvedValue(true),
        findByUserId: vi.fn(),
        findByStripeAccountId: vi.fn(),
        ensureForUser: vi.fn().mockResolvedValue(freshProducer()),
        updateSiretDeclaration: vi.fn(),
        setSiretVerificationResult: vi.fn(),
        setStripeAccount: vi.fn(),
        applyStripeAccountUpdate: vi.fn(),
        createConnectAccount: vi
          .fn()
          .mockRejectedValue(new Error("Stripe 503")),
        createAccountLink: vi.fn(),
        createAccountUpdateLink: vi.fn(),
        store: noopStore(),
      }),
    ).rejects.toBeInstanceOf(StripeUpstreamError)
  })

  it("convertit les erreurs createAccountUpdateLink en StripeUpstreamError (KAN-158)", async () => {
    await expect(
      requestStripeOnboardingLink(INPUT, USER_ID, {
        hasProducerRole: vi.fn().mockResolvedValue(true),
        findByUserId: vi.fn(),
        findByStripeAccountId: vi.fn(),
        ensureForUser: vi.fn().mockResolvedValue(
          freshProducer({
            stripe_account_id: "acct_existing",
            stripe_status: "restricted",
          }),
        ),
        updateSiretDeclaration: vi.fn(),
        setSiretVerificationResult: vi.fn(),
        setStripeAccount: vi.fn(),
        applyStripeAccountUpdate: vi.fn(),
        createConnectAccount: vi.fn(),
        createAccountLink: vi.fn(),
        createAccountUpdateLink: vi
          .fn()
          .mockRejectedValue(new Error("Stripe 502")),
        store: noopStore(),
      }),
    ).rejects.toBeInstanceOf(StripeUpstreamError)
  })
})
