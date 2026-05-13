import { describe, expect, it } from "vitest"

import {
  LoginInput,
  OtpVerificationInput,
  Role,
  ROLES,
  RoleSelectionInput,
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
  termsVersion: "2026-05-12",
  privacyVersion: "2026-05-12",
}

describe("SignupInput", () => {
  it("accepte un signup valide (sans rôle, sans checkboxes — décision 2026-05-13)", () => {
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

  it("rejette un mot de passe trop court (politique 10 caractères)", () => {
    expect(() =>
      SignupInput.parse({ ...validSignup, password: "Aa1" }),
    ).toThrow()
  })

  it("rejette une version de CGU vide", () => {
    expect(() =>
      SignupInput.parse({ ...validSignup, termsVersion: "" }),
    ).toThrow()
  })
})

describe("SignupOutput", () => {
  it("accepte un payload bien formé (juste userId, plus de rôle)", () => {
    const parsed = SignupOutput.parse({
      userId: "11111111-1111-4111-8111-111111111111",
    })
    expect(parsed.userId).toBe("11111111-1111-4111-8111-111111111111")
  })

  it("rejette un userId non UUID", () => {
    expect(() => SignupOutput.parse({ userId: "abc" })).toThrow()
  })
})

describe("OtpVerificationInput", () => {
  it("accepte un OTP 6 chiffres", () => {
    const parsed = OtpVerificationInput.parse({
      email: "user@example.fr",
      otp: "123456",
    })
    expect(parsed.otp).toBe("123456")
  })

  it("rejette un OTP non numérique", () => {
    expect(() =>
      OtpVerificationInput.parse({ email: "user@example.fr", otp: "12345A" }),
    ).toThrow()
  })

  it("rejette un OTP de 5 chiffres", () => {
    expect(() =>
      OtpVerificationInput.parse({ email: "user@example.fr", otp: "12345" }),
    ).toThrow()
  })

  it("rejette un OTP de 7 chiffres", () => {
    expect(() =>
      OtpVerificationInput.parse({ email: "user@example.fr", otp: "1234567" }),
    ).toThrow()
  })
})

describe("RoleSelectionInput", () => {
  it("accepte un seul rôle", () => {
    expect(RoleSelectionInput.parse({ roles: ["acheteur"] }).roles).toEqual([
      "acheteur",
    ])
  })

  it("accepte les trois rôles cumulés", () => {
    const parsed = RoleSelectionInput.parse({
      roles: ["acheteur", "rameneur", "producteur"],
    })
    expect(parsed.roles).toHaveLength(3)
  })

  it("rejette un tableau vide", () => {
    expect(() => RoleSelectionInput.parse({ roles: [] })).toThrow()
  })

  it("rejette les doublons", () => {
    expect(() =>
      RoleSelectionInput.parse({ roles: ["acheteur", "acheteur"] }),
    ).toThrow()
  })

  it("rejette plus de 3 rôles", () => {
    expect(() =>
      RoleSelectionInput.parse({
        roles: ["acheteur", "rameneur", "producteur", "acheteur"],
      }),
    ).toThrow()
  })

  it("rejette un rôle inconnu", () => {
    expect(() =>
      RoleSelectionInput.parse({ roles: ["admin"] }),
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
