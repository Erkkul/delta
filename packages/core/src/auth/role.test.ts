import { describe, expect, it } from "vitest"

import { onboardingPathForRole, parseRole } from "./role"

describe("onboardingPathForRole", () => {
  it("renvoie le path acheteur", () => {
    expect(onboardingPathForRole("acheteur")).toBe("/onboarding/acheteur")
  })

  it("renvoie le path rameneur", () => {
    expect(onboardingPathForRole("rameneur")).toBe("/onboarding/rameneur")
  })

  it("renvoie le path producteur", () => {
    expect(onboardingPathForRole("producteur")).toBe("/onboarding/producteur")
  })
})

describe("parseRole", () => {
  it("accepte les trois rôles valides", () => {
    expect(parseRole("acheteur")).toBe("acheteur")
    expect(parseRole("rameneur")).toBe("rameneur")
    expect(parseRole("producteur")).toBe("producteur")
  })

  it("rejette une valeur inconnue", () => {
    expect(parseRole("admin")).toBeNull()
    expect(parseRole("")).toBeNull()
  })

  it("rejette les types non-string", () => {
    expect(parseRole(undefined)).toBeNull()
    expect(parseRole(null)).toBeNull()
    expect(parseRole(42)).toBeNull()
    expect(parseRole({})).toBeNull()
  })
})
