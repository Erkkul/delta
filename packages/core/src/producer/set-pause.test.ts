import { describe, expect, it, vi } from "vitest"

import {
  ProducerProfileNotFoundError,
  ProducerRoleForbiddenError,
  ProducerValidationError,
} from "../errors"

import { type Producer } from "./adapters"
import { setProducerPause } from "./set-pause"

const USER_ID = "user-1"

function makeProducer(overrides: Partial<Producer> = {}): Producer {
  return {
    id: "producer-1",
    user_id: USER_ID,
    siret: null,
    legal_name: null,
    legal_form: null,
    naf_code: null,
    siret_status: "verified",
    siret_verified_at: "2026-05-17T10:00:00Z",
    siret_rejection_reason: null,
    stripe_account_id: null,
    stripe_status: "active",
    payouts_enabled: true,
    charges_enabled: true,
    requirements_currently_due: [],
    display_name: "EARL Dubois",
    public_description: null,
    profile_photo_url: null,
    farm_photos: [],
    labels: [],
    pickup_public_zone: null,
    pickup_address: null,
    pickup_days: [],
    pickup_hours_start: null,
    pickup_hours_end: null,
    paused: false,
    paused_at: null,
    ...overrides,
  }
}

function makeDeps(overrides: Partial<Parameters<typeof setProducerPause>[2]> = {}) {
  return {
    hasProducerRole: vi.fn().mockResolvedValue(true),
    findByUserId: vi.fn().mockResolvedValue(makeProducer()),
    findByStripeAccountId: vi.fn(),
    ensureForUser: vi.fn(),
    updateSiretDeclaration: vi.fn(),
    setSiretVerificationResult: vi.fn(),
    setStripeAccount: vi.fn(),
    applyStripeAccountUpdate: vi.fn(),
    updateProfile: vi.fn(),
    setPauseState: vi
      .fn()
      .mockImplementation((_uid: string, paused: boolean) =>
        Promise.resolve(
          makeProducer({
            paused,
            paused_at: paused ? "2026-05-17T12:00:00Z" : null,
          }),
        ),
      ),
    setPickupLocation: vi.fn(),
    ...overrides,
  }
}

describe("setProducerPause", () => {
  it("met la boutique en pause", async () => {
    const deps = makeDeps()
    const r = await setProducerPause({ paused: true }, USER_ID, deps)
    expect(r.paused).toBe(true)
    expect(r.paused_at).toBe("2026-05-17T12:00:00Z")
    expect(deps.setPauseState).toHaveBeenCalledWith(USER_ID, true)
  })

  it("réactive la boutique", async () => {
    const deps = makeDeps()
    const r = await setProducerPause({ paused: false }, USER_ID, deps)
    expect(r.paused).toBe(false)
    expect(r.paused_at).toBeNull()
    expect(deps.setPauseState).toHaveBeenCalledWith(USER_ID, false)
  })

  it("rejette sans le rôle producteur", async () => {
    const deps = makeDeps({
      hasProducerRole: vi.fn().mockResolvedValue(false),
    })
    await expect(
      setProducerPause({ paused: true }, USER_ID, deps),
    ).rejects.toBeInstanceOf(ProducerRoleForbiddenError)
    expect(deps.setPauseState).not.toHaveBeenCalled()
  })

  it("rejette si la row producteur n'existe pas", async () => {
    const deps = makeDeps({
      findByUserId: vi.fn().mockResolvedValue(null),
    })
    await expect(
      setProducerPause({ paused: true }, USER_ID, deps),
    ).rejects.toBeInstanceOf(ProducerProfileNotFoundError)
    expect(deps.setPauseState).not.toHaveBeenCalled()
  })

  it("rejette sur input invalide", async () => {
    const deps = makeDeps()
    await expect(
      setProducerPause({ paused: "yes" }, USER_ID, deps),
    ).rejects.toBeInstanceOf(ProducerValidationError)
  })
})
