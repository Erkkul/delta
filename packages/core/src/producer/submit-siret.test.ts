import { describe, expect, it, vi } from "vitest"

import {
  ProducerRoleForbiddenError,
  ProducerValidationError,
  RateLimitedError,
  SiretAlreadyVerifiedError,
} from "../errors"
import { type RateLimitStore } from "../rate-limit/rate-limit"

import { type Producer } from "./adapters"
import {
  SIRET_DECLARATION_RATE_LIMIT,
  submitSiretDeclaration,
} from "./submit-siret"

const USER_ID = "user-1"
const PRODUCER_ID = "producer-1"

const VALID_INPUT = {
  siret: "78945612300012",
  legal_name: "EARL Marie Dubois — Maraîchage du Bocage",
  legal_form: "EARL",
  naf_code: "01.13Z",
}

function noopStore(): RateLimitStore {
  return {
    incrementAndExpire: () =>
      Promise.resolve({
        count: 1,
        ttlMs: SIRET_DECLARATION_RATE_LIMIT.windowMs,
      }),
  }
}

function exhaustedStore(): RateLimitStore {
  return {
    incrementAndExpire: () => Promise.resolve({ count: 99, ttlMs: 30_000 }),
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

describe("submitSiretDeclaration", () => {
  it("crée la déclaration et programme le job sur input valide", async () => {
    const ensureForUser = vi.fn().mockResolvedValue(freshProducer())
    const updateSiretDeclaration = vi
      .fn()
      .mockResolvedValue(
        freshProducer({ siret: VALID_INPUT.siret, siret_status: "pending" }),
      )
    const scheduleSiretVerification = vi.fn().mockResolvedValue(undefined)

    const out = await submitSiretDeclaration(VALID_INPUT, USER_ID, {
      hasProducerRole: vi.fn().mockResolvedValue(true),
      findByUserId: vi.fn(),
      findByStripeAccountId: vi.fn(),
      ensureForUser,
      updateSiretDeclaration,
      setSiretVerificationResult: vi.fn(),
      setStripeAccount: vi.fn(),
      applyStripeAccountUpdate: vi.fn(),
      scheduleSiretVerification,
      store: noopStore(),
    })

    expect(out).toEqual({ siret_status: "pending" })
    expect(updateSiretDeclaration).toHaveBeenCalledWith(USER_ID, {
      siret: VALID_INPUT.siret,
      legal_name: VALID_INPUT.legal_name,
      legal_form: VALID_INPUT.legal_form,
      naf_code: VALID_INPUT.naf_code,
      siret_status: "pending",
    })
    expect(scheduleSiretVerification).toHaveBeenCalledWith(PRODUCER_ID)
  })

  it("rejette ProducerRoleForbiddenError si le user n'a pas le rôle producteur", async () => {
    const updateSiretDeclaration = vi.fn()
    const scheduleSiretVerification = vi.fn()
    await expect(
      submitSiretDeclaration(VALID_INPUT, USER_ID, {
        hasProducerRole: vi.fn().mockResolvedValue(false),
        findByUserId: vi.fn(),
        findByStripeAccountId: vi.fn(),
        ensureForUser: vi.fn(),
        updateSiretDeclaration,
        setSiretVerificationResult: vi.fn(),
        setStripeAccount: vi.fn(),
        applyStripeAccountUpdate: vi.fn(),
        scheduleSiretVerification,
        store: noopStore(),
      }),
    ).rejects.toBeInstanceOf(ProducerRoleForbiddenError)
    expect(updateSiretDeclaration).not.toHaveBeenCalled()
    expect(scheduleSiretVerification).not.toHaveBeenCalled()
  })

  it("rejette RateLimitedError avec retryAfterMs si la limite est dépassée", async () => {
    const scheduleSiretVerification = vi.fn()
    try {
      await submitSiretDeclaration(VALID_INPUT, USER_ID, {
        hasProducerRole: vi.fn().mockResolvedValue(true),
        findByUserId: vi.fn(),
        findByStripeAccountId: vi.fn(),
        ensureForUser: vi.fn(),
        updateSiretDeclaration: vi.fn(),
        setSiretVerificationResult: vi.fn(),
        setStripeAccount: vi.fn(),
        applyStripeAccountUpdate: vi.fn(),
        scheduleSiretVerification,
        store: exhaustedStore(),
      })
      expect.fail("Devait throw RateLimitedError")
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitedError)
      expect((err as RateLimitedError).retryAfterMs).toBe(30_000)
    }
    expect(scheduleSiretVerification).not.toHaveBeenCalled()
  })

  it("rejette ProducerValidationError sur input invalide", async () => {
    await expect(
      submitSiretDeclaration(
        { ...VALID_INPUT, siret: "12345" },
        USER_ID,
        {
          hasProducerRole: vi.fn().mockResolvedValue(true),
          findByUserId: vi.fn(),
          findByStripeAccountId: vi.fn(),
          ensureForUser: vi.fn(),
          updateSiretDeclaration: vi.fn(),
          setSiretVerificationResult: vi.fn(),
          setStripeAccount: vi.fn(),
          applyStripeAccountUpdate: vi.fn(),
          scheduleSiretVerification: vi.fn(),
          store: noopStore(),
        },
      ),
    ).rejects.toBeInstanceOf(ProducerValidationError)
  })

  it("rejette SiretAlreadyVerifiedError si le SIRET est déjà verified", async () => {
    const updateSiretDeclaration = vi.fn()
    await expect(
      submitSiretDeclaration(VALID_INPUT, USER_ID, {
        hasProducerRole: vi.fn().mockResolvedValue(true),
        findByUserId: vi.fn(),
        findByStripeAccountId: vi.fn(),
        ensureForUser: vi
          .fn()
          .mockResolvedValue(freshProducer({ siret_status: "verified" })),
        updateSiretDeclaration,
        setSiretVerificationResult: vi.fn(),
        setStripeAccount: vi.fn(),
        applyStripeAccountUpdate: vi.fn(),
        scheduleSiretVerification: vi.fn(),
        store: noopStore(),
      }),
    ).rejects.toBeInstanceOf(SiretAlreadyVerifiedError)
    expect(updateSiretDeclaration).not.toHaveBeenCalled()
  })

  it("autorise la re-soumission après un statut rejected", async () => {
    const updateSiretDeclaration = vi
      .fn()
      .mockResolvedValue(
        freshProducer({ siret: VALID_INPUT.siret, siret_status: "pending" }),
      )
    const scheduleSiretVerification = vi.fn().mockResolvedValue(undefined)
    const out = await submitSiretDeclaration(VALID_INPUT, USER_ID, {
      hasProducerRole: vi.fn().mockResolvedValue(true),
      findByUserId: vi.fn(),
      findByStripeAccountId: vi.fn(),
      ensureForUser: vi
        .fn()
        .mockResolvedValue(freshProducer({ siret_status: "rejected" })),
      updateSiretDeclaration,
      setSiretVerificationResult: vi.fn(),
      setStripeAccount: vi.fn(),
      applyStripeAccountUpdate: vi.fn(),
      scheduleSiretVerification,
      store: noopStore(),
    })
    expect(out.siret_status).toBe("pending")
    expect(scheduleSiretVerification).toHaveBeenCalledTimes(1)
  })
})
