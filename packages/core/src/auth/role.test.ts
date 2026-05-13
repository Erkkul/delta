import { describe, expect, it } from "vitest"

import {
  nextOnboardingPath,
  normalizeRoles,
  onboardingPathForRole,
  parseRole,
} from "./role"

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

describe("nextOnboardingPath", () => {
  it("priorité rameneur quand cumulé", () => {
    expect(nextOnboardingPath(["acheteur", "rameneur"])).toBe(
      "/onboarding/rameneur",
    )
    expect(nextOnboardingPath(["producteur", "rameneur"])).toBe(
      "/onboarding/rameneur",
    )
    expect(
      nextOnboardingPath(["acheteur", "rameneur", "producteur"]),
    ).toBe("/onboarding/rameneur")
  })

  it("priorité producteur quand cumulé avec acheteur", () => {
    expect(nextOnboardingPath(["acheteur", "producteur"])).toBe(
      "/onboarding/producteur",
    )
  })

  it("acheteur seul", () => {
    expect(nextOnboardingPath(["acheteur"])).toBe("/onboarding/acheteur")
  })

  it("tableau vide → /welcome", () => {
    expect(nextOnboardingPath([])).toBe("/welcome")
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

describe("normalizeRoles", () => {
  it("dédoublonne", () => {
    expect(normalizeRoles(["acheteur", "acheteur"])).toEqual(["acheteur"])
  })

  it("tri canonique (acheteur, rameneur, producteur)", () => {
    expect(normalizeRoles(["producteur", "acheteur", "rameneur"])).toEqual([
      "acheteur",
      "rameneur",
      "producteur",
    ])
  })

  it("tableau vide reste vide", () => {
    expect(normalizeRoles([])).toEqual([])
  })

  it("un seul rôle reste tel quel", () => {
    expect(normalizeRoles(["rameneur"])).toEqual(["rameneur"])
  })
})
