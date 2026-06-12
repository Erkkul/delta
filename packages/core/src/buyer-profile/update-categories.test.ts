import { type ProductCategory } from "@delta/contracts/product"
import { describe, expect, it, vi } from "vitest"

import {
  BuyerRoleForbiddenError,
  BuyerValidationError,
  RateLimitedError,
} from "../errors"
import { type RateLimitStore } from "../rate-limit/rate-limit"

import { type BuyerProfile } from "./adapters"
import {
  BUYER_CATEGORIES_RATE_LIMIT,
  updateBuyerCategories,
} from "./update-categories"

const USER_ID = "user-1"

function noopStore(): RateLimitStore {
  return {
    incrementAndExpire: () =>
      Promise.resolve({
        count: 1,
        ttlMs: BUYER_CATEGORIES_RATE_LIMIT.windowMs,
      }),
  }
}

function exhaustedStore(): RateLimitStore {
  return {
    incrementAndExpire: () => Promise.resolve({ count: 999, ttlMs: 30_000 }),
  }
}

function makeProfile(categories: ProductCategory[]): BuyerProfile {
  return {
    user_id: USER_ID,
    display_name: null,
    address_label: "14 rue de Lévis 75017 Paris",
    city: "Paris",
    postcode: "75017",
    has_location: true,
    preferred_categories: categories,
  }
}

function makeDeps(
  overrides: Partial<Parameters<typeof updateBuyerCategories>[2]> = {},
) {
  const setCategories = vi
    .fn()
    .mockImplementation((_uid: string, categories: ProductCategory[]) =>
      Promise.resolve(makeProfile(categories)),
    )
  const hasBuyerRole = vi.fn().mockResolvedValue(true)
  return {
    setCategories,
    hasBuyerRole,
    store: noopStore(),
    ...overrides,
  }
}

describe("updateBuyerCategories", () => {
  it("refuse un user sans rôle acheteur", async () => {
    const deps = makeDeps({ hasBuyerRole: vi.fn().mockResolvedValue(false) })
    await expect(
      updateBuyerCategories({ preferred_categories: ["fruits"] }, USER_ID, deps),
    ).rejects.toBeInstanceOf(BuyerRoleForbiddenError)
    expect(deps.setCategories).not.toHaveBeenCalled()
  })

  it("applique le rate-limit", async () => {
    const deps = makeDeps({ store: exhaustedStore() })
    await expect(
      updateBuyerCategories({ preferred_categories: ["fruits"] }, USER_ID, deps),
    ).rejects.toBeInstanceOf(RateLimitedError)
  })

  it("rejette une catégorie hors whitelist", async () => {
    const deps = makeDeps()
    await expect(
      updateBuyerCategories(
        { preferred_categories: ["fromage_frais"] },
        USER_ID,
        deps,
      ),
    ).rejects.toBeInstanceOf(BuyerValidationError)
    expect(deps.setCategories).not.toHaveBeenCalled()
  })

  it("rejette une clé inconnue (strict)", async () => {
    const deps = makeDeps()
    await expect(
      updateBuyerCategories(
        { preferred_categories: ["fruits"], foo: "bar" },
        USER_ID,
        deps,
      ),
    ).rejects.toBeInstanceOf(BuyerValidationError)
  })

  it("accepte une liste vide (réinitialisation)", async () => {
    const deps = makeDeps()
    const result = await updateBuyerCategories(
      { preferred_categories: [] },
      USER_ID,
      deps,
    )
    expect(deps.setCategories).toHaveBeenCalledWith(USER_ID, [])
    expect(result.preferred_categories).toEqual([])
  })

  it("dédoublonne les catégories en préservant l'ordre", async () => {
    const deps = makeDeps()
    const result = await updateBuyerCategories(
      { preferred_categories: ["fruits", "legumes", "fruits"] },
      USER_ID,
      deps,
    )
    expect(deps.setCategories).toHaveBeenCalledWith(USER_ID, [
      "fruits",
      "legumes",
    ])
    expect(result.preferred_categories).toEqual(["fruits", "legumes"])
  })
})
