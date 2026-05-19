import { describe, expect, it } from "vitest"

import { ProductTransitionStatusInput } from "./transition-status"

describe("ProductTransitionStatusInput", () => {
  it("accepte active / draft / disabled", () => {
    expect(
      ProductTransitionStatusInput.safeParse({ status: "active" }).success,
    ).toBe(true)
    expect(
      ProductTransitionStatusInput.safeParse({ status: "draft" }).success,
    ).toBe(true)
    expect(
      ProductTransitionStatusInput.safeParse({ status: "disabled" }).success,
    ).toBe(true)
  })

  it("refuse sold_out (statut dérivé, non transitionable)", () => {
    expect(
      ProductTransitionStatusInput.safeParse({ status: "sold_out" }).success,
    ).toBe(false)
  })

  it("refuse les valeurs inconnues", () => {
    expect(
      ProductTransitionStatusInput.safeParse({ status: "archived" }).success,
    ).toBe(false)
  })

  it("refuse un body sans champ status", () => {
    expect(ProductTransitionStatusInput.safeParse({}).success).toBe(false)
  })

  it("refuse les champs additionnels (strict)", () => {
    expect(
      ProductTransitionStatusInput.safeParse({ status: "active", extra: 1 })
        .success,
    ).toBe(false)
  })
})
