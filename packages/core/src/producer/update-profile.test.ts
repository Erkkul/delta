import { describe, expect, it, vi } from "vitest"

import {
  ProducerProfileNotFoundError,
  ProducerRoleForbiddenError,
  ProducerValidationError,
  RateLimitedError,
} from "../errors"
import { type RateLimitStore } from "../rate-limit/rate-limit"

import { type Producer } from "./adapters"
import {
  PRODUCER_PROFILE_UPDATE_RATE_LIMIT,
  updateProducerProfile,
} from "./update-profile"

const USER_ID = "user-1"
const PRODUCER_ID = "producer-1"

function noopStore(): RateLimitStore {
  return {
    incrementAndExpire: () =>
      Promise.resolve({
        count: 1,
        ttlMs: PRODUCER_PROFILE_UPDATE_RATE_LIMIT.windowMs,
      }),
  }
}

function exhaustedStore(): RateLimitStore {
  return {
    incrementAndExpire: () => Promise.resolve({ count: 999, ttlMs: 30_000 }),
  }
}

function makeProducer(overrides: Partial<Producer> = {}): Producer {
  return {
    id: PRODUCER_ID,
    user_id: USER_ID,
    siret: "78945612300012",
    legal_name: "EARL Dubois",
    legal_form: "EARL",
    naf_code: "01.13Z",
    siret_status: "verified",
    siret_verified_at: "2026-05-17T10:00:00Z",
    siret_rejection_reason: null,
    stripe_account_id: "acct_test",
    stripe_status: "active",
    payouts_enabled: true,
    charges_enabled: true,
    requirements_currently_due: [],
    display_name: null,
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

function makeDeps(overrides: Partial<Parameters<typeof updateProducerProfile>[2]> = {}) {
  const findByUserId = vi.fn().mockResolvedValue(makeProducer())
  const updateProfile = vi
    .fn()
    .mockImplementation((_uid: string, patch: Partial<Producer>) =>
      Promise.resolve(makeProducer(patch)),
    )
  const setPickupLocation = vi.fn().mockResolvedValue(undefined)
  const geocodeAddress = vi.fn().mockResolvedValue({
    longitude: 1.1503,
    latitude: 49.024,
    score: 0.9,
    label: "234 Route du Bocage 27000 Évreux",
  })

  return {
    hasProducerRole: vi.fn().mockResolvedValue(true),
    findByUserId,
    findByStripeAccountId: vi.fn(),
    ensureForUser: vi.fn(),
    updateSiretDeclaration: vi.fn(),
    setSiretVerificationResult: vi.fn(),
    setStripeAccount: vi.fn(),
    applyStripeAccountUpdate: vi.fn(),
    updateProfile,
    setPauseState: vi.fn(),
    setPickupLocation,
    geocodeAddress,
    store: noopStore(),
    ...overrides,
  }
}

describe("updateProducerProfile", () => {
  it("met à jour les champs publics", async () => {
    const deps = makeDeps()
    const result = await updateProducerProfile(
      {
        display_name: "EARL Dubois — Maraîchage du Bocage",
        public_description: "Maraîchère bio depuis 12 ans.",
        labels: ["bio_ab", "hve_3"],
      },
      USER_ID,
      deps,
    )

    expect(result.display_name).toBe("EARL Dubois — Maraîchage du Bocage")
    expect(deps.updateProfile).toHaveBeenCalledWith(USER_ID, {
      display_name: "EARL Dubois — Maraîchage du Bocage",
      public_description: "Maraîchère bio depuis 12 ans.",
      labels: ["bio_ab", "hve_3"],
    })
    // Pas d'adresse touchée → pas d'appel géocodage / location
    expect(deps.geocodeAddress).not.toHaveBeenCalled()
    expect(deps.setPickupLocation).not.toHaveBeenCalled()
  })

  it("rejette ProducerRoleForbiddenError sans le rôle producteur", async () => {
    const deps = makeDeps({
      hasProducerRole: vi.fn().mockResolvedValue(false),
    })
    await expect(
      updateProducerProfile({ display_name: "X" }, USER_ID, deps),
    ).rejects.toBeInstanceOf(ProducerRoleForbiddenError)
    expect(deps.updateProfile).not.toHaveBeenCalled()
  })

  it("rejette RateLimitedError si la fenêtre est dépassée", async () => {
    const deps = makeDeps({ store: exhaustedStore() })
    try {
      await updateProducerProfile({ display_name: "X" }, USER_ID, deps)
      expect.fail("Devait throw RateLimitedError")
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitedError)
      expect((err as RateLimitedError).retryAfterMs).toBe(30_000)
    }
  })

  it("rejette ProducerValidationError sur input invalide", async () => {
    const deps = makeDeps()
    await expect(
      updateProducerProfile({ display_name: "" }, USER_ID, deps),
    ).rejects.toBeInstanceOf(ProducerValidationError)
  })

  it("rejette ProducerProfileNotFoundError si la row n'existe pas", async () => {
    const deps = makeDeps({
      findByUserId: vi.fn().mockResolvedValue(null),
    })
    await expect(
      updateProducerProfile({ display_name: "EARL Test" }, USER_ID, deps),
    ).rejects.toBeInstanceOf(ProducerProfileNotFoundError)
  })

  it("géocode l'adresse côté serveur quand seuls les champs texte sont passés", async () => {
    const deps = makeDeps()
    await updateProducerProfile(
      {
        pickup_address: "234 Route du Bocage, 27000 Évreux",
        pickup_public_zone: "Bocage normand · Évreux (27)",
      },
      USER_ID,
      deps,
    )
    expect(deps.geocodeAddress).toHaveBeenCalledWith(
      "234 Route du Bocage, 27000 Évreux",
    )
    expect(deps.setPickupLocation).toHaveBeenCalledWith(1.1503, 49.024)
  })

  it("ignore le géocodage si coordonnées client fournies", async () => {
    const deps = makeDeps()
    await updateProducerProfile(
      {
        pickup_address: "234 Route du Bocage, 27000 Évreux",
        pickup_longitude: 2.0,
        pickup_latitude: 48.0,
      },
      USER_ID,
      deps,
    )
    expect(deps.geocodeAddress).not.toHaveBeenCalled()
    expect(deps.setPickupLocation).toHaveBeenCalledWith(2.0, 48.0)
  })

  it("remet la position à null quand l'adresse est effacée", async () => {
    const deps = makeDeps()
    await updateProducerProfile({ pickup_address: null }, USER_ID, deps)
    expect(deps.geocodeAddress).not.toHaveBeenCalled()
    expect(deps.setPickupLocation).toHaveBeenCalledWith(null, null)
  })

  it("laisse la position à null si le score géocodage est trop bas", async () => {
    const deps = makeDeps({
      geocodeAddress: vi.fn().mockResolvedValue({
        longitude: 1.0,
        latitude: 49.0,
        score: 0.2,
        label: "Lieu approximatif",
      }),
    })
    await updateProducerProfile(
      { pickup_address: "Adresse ambiguë" },
      USER_ID,
      deps,
    )
    expect(deps.setPickupLocation).toHaveBeenCalledWith(null, null)
  })

  it("tolère un échec du géocodage sans bloquer la mise à jour", async () => {
    const deps = makeDeps({
      geocodeAddress: vi.fn().mockRejectedValue(new Error("API down")),
    })
    const result = await updateProducerProfile(
      { pickup_address: "234 Route du Bocage, 27000 Évreux" },
      USER_ID,
      deps,
    )
    expect(result).toBeDefined()
    expect(deps.setPickupLocation).toHaveBeenCalledWith(null, null)
  })
})
