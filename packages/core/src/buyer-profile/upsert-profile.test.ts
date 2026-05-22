import { describe, expect, it, vi } from "vitest"

import {
  BuyerRoleForbiddenError,
  BuyerValidationError,
  RateLimitedError,
} from "../errors"
import { type RateLimitStore } from "../rate-limit/rate-limit"

import { type BuyerProfile } from "./adapters"
import {
  BUYER_PROFILE_UPSERT_RATE_LIMIT,
  upsertBuyerProfile,
} from "./upsert-profile"

const USER_ID = "user-1"

function noopStore(): RateLimitStore {
  return {
    incrementAndExpire: () =>
      Promise.resolve({
        count: 1,
        ttlMs: BUYER_PROFILE_UPSERT_RATE_LIMIT.windowMs,
      }),
  }
}

function exhaustedStore(): RateLimitStore {
  return {
    incrementAndExpire: () => Promise.resolve({ count: 999, ttlMs: 30_000 }),
  }
}

function makeProfile(overrides: Partial<BuyerProfile> = {}): BuyerProfile {
  return {
    user_id: USER_ID,
    display_name: null,
    address_label: "14 rue de Lévis 75017 Paris",
    city: "Paris",
    postcode: "75017",
    has_location: false,
    ...overrides,
  }
}

function makeDeps(
  overrides: Partial<Parameters<typeof upsertBuyerProfile>[2]> = {},
) {
  const findByUserId = vi.fn().mockResolvedValue(makeProfile())
  const upsert = vi
    .fn()
    .mockImplementation((_uid: string, patch: Partial<BuyerProfile>) =>
      Promise.resolve(makeProfile(patch)),
    )
  const setLocation = vi.fn().mockResolvedValue(undefined)
  const geocodeAddress = vi.fn().mockResolvedValue({
    longitude: 2.31,
    latitude: 48.88,
    score: 0.97,
    label: "14 rue de Lévis 75017 Paris",
  })
  const hasBuyerRole = vi.fn().mockResolvedValue(true)

  return {
    findByUserId,
    hasBuyerRole,
    upsert,
    setLocation,
    geocodeAddress,
    store: noopStore(),
    ...overrides,
  }
}

const VALID_INPUT = {
  address_label: "14 rue de Lévis 75017 Paris",
  city: "Paris",
  postcode: "75017",
}

describe("upsertBuyerProfile", () => {
  it("refuse un user sans rôle acheteur", async () => {
    const deps = makeDeps({ hasBuyerRole: vi.fn().mockResolvedValue(false) })
    await expect(
      upsertBuyerProfile(VALID_INPUT, USER_ID, deps),
    ).rejects.toBeInstanceOf(BuyerRoleForbiddenError)
    expect(deps.upsert).not.toHaveBeenCalled()
  })

  it("applique le rate-limit", async () => {
    const deps = makeDeps({ store: exhaustedStore() })
    await expect(
      upsertBuyerProfile(VALID_INPUT, USER_ID, deps),
    ).rejects.toBeInstanceOf(RateLimitedError)
  })

  it("rejette un input invalide (adresse trop courte)", async () => {
    const deps = makeDeps()
    await expect(
      upsertBuyerProfile({ address_label: "abc" }, USER_ID, deps),
    ).rejects.toBeInstanceOf(BuyerValidationError)
  })

  it("écrit directement les coordonnées explicites sans appeler le géocodage", async () => {
    const deps = makeDeps()
    const result = await upsertBuyerProfile(
      { ...VALID_INPUT, longitude: 2.31, latitude: 48.88 },
      USER_ID,
      deps,
    )
    expect(deps.geocodeAddress).not.toHaveBeenCalled()
    expect(deps.setLocation).toHaveBeenCalledWith(2.31, 48.88)
    expect(result.has_location).toBe(true)
  })

  it("géocode best-effort quand les coordonnées sont absentes", async () => {
    const deps = makeDeps()
    const result = await upsertBuyerProfile(VALID_INPUT, USER_ID, deps)
    expect(deps.geocodeAddress).toHaveBeenCalledWith(VALID_INPUT.address_label)
    expect(deps.setLocation).toHaveBeenCalledWith(2.31, 48.88)
    expect(result.has_location).toBe(true)
  })

  it("laisse la position nulle si le score de géocodage est trop faible", async () => {
    const deps = makeDeps({
      geocodeAddress: vi.fn().mockResolvedValue({
        longitude: 2.31,
        latitude: 48.88,
        score: 0.2,
        label: "x",
      }),
    })
    const result = await upsertBuyerProfile(VALID_INPUT, USER_ID, deps)
    expect(deps.setLocation).toHaveBeenCalledWith(null, null)
    expect(result.has_location).toBe(false)
  })

  it("ne bloque pas l'upsert si le géocodage échoue", async () => {
    const deps = makeDeps({
      geocodeAddress: vi.fn().mockRejectedValue(new Error("network")),
    })
    const result = await upsertBuyerProfile(VALID_INPUT, USER_ID, deps)
    expect(deps.upsert).toHaveBeenCalledTimes(1)
    expect(deps.setLocation).toHaveBeenCalledWith(null, null)
    expect(result.has_location).toBe(false)
  })
})
