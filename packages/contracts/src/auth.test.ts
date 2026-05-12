import { describe, expect, it } from "vitest"

import {
  LoginInput,
  Role,
  ROLES,
  SignupInput,
  SignupOutput,
} from "./auth"

describe("Role", () => {
  it("accepte les trois valeurs valides", () => {
    for (const r of ROLES) {
      expect(Role.parse(r)).toBe(r)
    }
  })

  it("rejette une valeur inconnue", () => {
    expect(() => Role.parse("admin")).toThrow()
  })
})

const validSignup = {
  email: "user@example.fr",
  password: "Motdepasse2026",
  role: "acheteur" as const,
  acceptedTerms: true,
  acceptedPrivacy: true,
  termsVersion: "2026-05-12",
  privacyVersion: "2026-05-12",
}

describe("SignupInput", () => {
  it("accepte un signup valide", () => {
    const parsed = SignupInput.parse(validSignup)
    expect(parsed.email).toBe("user@example.fr")
  })

  it("normalise l'email (trim + lowercase)", () => {
    const parsed = SignupInput.parse({
      ...validSignup,
      email: "  USER@Example.FR ",
    })
    expect(parsed.email).toBe("user@example.fr")
  })

  it("rejette un mot de passe trop court", () => {
    expect(() =>
      SignupInput.parse({ ...validSignup, password: "Aa1" }),
    ).toThrow()
  })

  it("exige acceptedTerms = true", () => {
    expect(() =>
      SignupInput.parse({ ...validSignup, acceptedTerms: false }),
    ).toThrow()
  })

  it("exige acceptedPrivacy = true", () => {
    expect(() =>
      SignupInput.parse({ ...validSignup, acceptedPrivacy: false }),
    ).toThrow()
  })

  it("rejette une version de CGU vide", () => {
    expect(() =>
      SignupInput.parse({ ...validSignup, termsVersion: "" }),
    ).toThrow()
  })
})

describe("SignupOutput", () => {
  it("accepte un payload bien formé", () => {
    const parsed = SignupOutput.parse({
      userId: "11111111-1111-4111-8111-111111111111",
      role: "rameneur",
    })
    expect(parsed.role).toBe("rameneur")
  })

  it("rejette un userId non UUID", () => {
    expect(() =>
      SignupOutput.parse({ userId: "abc", role: "rameneur" }),
    ).toThrow()
  })
})

describe("LoginInput", () => {
  it("accepte un login minimal", () => {
    const parsed = LoginInput.parse({
      email: "User@Example.fr",
      password: "anything-non-empty",
    })
    expect(parsed.email).toBe("user@example.fr")
  })

  it("rejette un email invalide", () => {
    expect(() =>
      LoginInput.parse({ email: "pas-un-email", password: "x" }),
    ).toThrow()
  })
})
