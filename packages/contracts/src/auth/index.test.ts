import { describe, expect, it } from "vitest"

import {
  ForgotPasswordInput,
  LoginInput,
  OtpVerificationInput,
  PASSWORD_MIN,
  Password,
  ResetPasswordInput,
  ResetPasswordOutput,
  Role,
  ROLES,
  RoleSelectionInput,
  SignupInput,
  SignupOutput,
  passwordHint,
} from "./index"

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

describe("passwordPolicy (partagée signup + reset)", () => {
  it("exporte une politique de 10 caractères minimum", () => {
    expect(PASSWORD_MIN).toBe(10)
  })

  it("hint UI mentionne explicitement la règle 10/maj/min/digit", () => {
    expect(passwordHint).toContain("10")
    expect(passwordHint.toLowerCase()).toContain("majuscule")
    expect(passwordHint.toLowerCase()).toContain("minuscule")
    expect(passwordHint.toLowerCase()).toContain("chiffre")
  })

  it("accepte un mot de passe conforme", () => {
    expect(() => Password.parse("Motdepasse2026")).not.toThrow()
  })

  it("rejette < 10 caractères", () => {
    expect(() => Password.parse("Aa12345")).toThrow()
  })

  it("rejette sans majuscule", () => {
    expect(() => Password.parse("motdepasse2026")).toThrow()
  })

  it("rejette sans minuscule", () => {
    expect(() => Password.parse("MOTDEPASSE2026")).toThrow()
  })

  it("rejette sans chiffre", () => {
    expect(() => Password.parse("Motdepasseseul")).toThrow()
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

  it("normalise l'email (trim + lowercase)", () => {
    const parsed = LoginInput.parse({
      email: "  USER@Example.FR ",
      password: "x",
    })
    expect(parsed.email).toBe("user@example.fr")
  })

  it("rejette un email invalide", () => {
    expect(() =>
      LoginInput.parse({ email: "pas-un-email", password: "x" }),
    ).toThrow()
  })

  it("rejette un mot de passe vide", () => {
    expect(() =>
      LoginInput.parse({ email: "user@example.fr", password: "" }),
    ).toThrow()
  })

  it("n'applique PAS la politique 10 caractères (le contrôle de force est au signup uniquement)", () => {
    // Important : le login doit accepter n'importe quel mot de passe non
    // vide pour ne pas leaker le format historiquement accepté. La
    // vérification de force se fait uniquement au signup / reset.
    expect(() =>
      LoginInput.parse({ email: "user@example.fr", password: "abc" }),
    ).not.toThrow()
  })
})

describe("ForgotPasswordInput (KAN-157)", () => {
  it("accepte un email valide", () => {
    const parsed = ForgotPasswordInput.parse({ email: "User@Example.fr" })
    expect(parsed.email).toBe("user@example.fr")
  })

  it("rejette un email mal formé", () => {
    expect(() => ForgotPasswordInput.parse({ email: "pas-un-email" })).toThrow()
  })

  it("rejette un body vide", () => {
    expect(() => ForgotPasswordInput.parse({})).toThrow()
  })
})

describe("ResetPasswordInput (KAN-157)", () => {
  const valid = {
    email: "user@example.fr",
    token: "123456",
    newPassword: "Motdepasse2026",
  }

  it("accepte un payload valide", () => {
    const parsed = ResetPasswordInput.parse(valid)
    expect(parsed.email).toBe("user@example.fr")
    expect(parsed.token).toBe("123456")
  })

  it("normalise l'email (trim + lowercase)", () => {
    const parsed = ResetPasswordInput.parse({
      ...valid,
      email: "  USER@Example.FR ",
    })
    expect(parsed.email).toBe("user@example.fr")
  })

  it("rejette un token non numérique", () => {
    expect(() =>
      ResetPasswordInput.parse({ ...valid, token: "12345A" }),
    ).toThrow()
  })

  it("rejette un token de 5 chiffres", () => {
    expect(() =>
      ResetPasswordInput.parse({ ...valid, token: "12345" }),
    ).toThrow()
  })

  it("applique la politique mot de passe partagée (rejette Aa1)", () => {
    expect(() =>
      ResetPasswordInput.parse({ ...valid, newPassword: "Aa1" }),
    ).toThrow()
  })
})

describe("ResetPasswordOutput (KAN-157)", () => {
  it("accepte un payload bien formé", () => {
    const parsed = ResetPasswordOutput.parse({
      userId: "11111111-1111-4111-8111-111111111111",
    })
    expect(parsed.userId).toBe("11111111-1111-4111-8111-111111111111")
  })

  it("rejette un userId non UUID", () => {
    expect(() => ResetPasswordOutput.parse({ userId: "abc" })).toThrow()
  })
})
