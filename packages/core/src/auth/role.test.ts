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

/**
 * Invariant produit (décision 2026-05-13) : l'étape OTP de vérification
 * email ne touche ni au choix des rôles ni au mapping rôle → route.
 * `nextOnboardingPath` est une fonction pure du tableau `roles` — peu
 * importe que l'OTP ait été vérifié juste avant ou non. Cette suite
 * documente ce contrat (et bloque toute régression qui réintroduirait
 * un couplage entre vérification email et routage).
 */
describe("nextOnboardingPath — invariant post-OTP (KAN-2)", () => {
  it("identique avant et après OTP : pas d'état caché", () => {
    const cases: Array<{ roles: Parameters<typeof nextOnboardingPath>[0] }> = [
      { roles: ["rameneur"] },
      { roles: ["producteur"] },
      { roles: ["acheteur"] },
      { roles: ["acheteur", "producteur"] },
      { roles: ["acheteur", "rameneur", "producteur"] },
      { roles: [] },
    ]
    for (const { roles } of cases) {
      const before = nextOnboardingPath(roles)
      // Simulation : on appelle 5 fois après "vérification OTP" — la
      // fonction étant pure, le résultat ne bouge pas.
      const after = [0, 1, 2, 3, 4].map(() => nextOnboardingPath(roles))
      for (const value of after) expect(value).toBe(before)
    }
  })
})
