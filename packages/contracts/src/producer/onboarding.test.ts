import { describe, expect, it } from "vitest"

import {
  LegalForm,
  LEGAL_FORMS,
  SIRET_DECLARATION_ERROR_CODES,
  SIRET_STATUSES,
  SiretDeclarationInput,
  SiretStatus,
  STRIPE_ACCOUNT_STATUSES,
  STRIPE_ONBOARDING_LINK_ERROR_CODES,
  StripeAccountStatus,
  StripeOnboardingLinkOutput,
} from "./onboarding"

describe("SiretStatus", () => {
  it("accepte les 4 valeurs valides", () => {
    for (const s of SIRET_STATUSES) {
      expect(SiretStatus.parse(s)).toBe(s)
    }
  })

  it("rejette une valeur inconnue", () => {
    expect(() => SiretStatus.parse("validated")).toThrow()
  })
})

describe("StripeAccountStatus", () => {
  it("accepte les 5 valeurs valides", () => {
    for (const s of STRIPE_ACCOUNT_STATUSES) {
      expect(StripeAccountStatus.parse(s)).toBe(s)
    }
  })

  it("rejette une valeur inconnue", () => {
    expect(() => StripeAccountStatus.parse("ready")).toThrow()
  })
})

describe("LegalForm", () => {
  it("accepte les 6 formes whitelist", () => {
    for (const f of LEGAL_FORMS) {
      expect(LegalForm.parse(f)).toBe(f)
    }
  })

  it("rejette une forme hors whitelist (élargissable plus tard)", () => {
    expect(() => LegalForm.parse("SCI")).toThrow()
  })
})

describe("SiretDeclarationInput", () => {
  const valid = {
    siret: "78945612300012",
    legal_name: "EARL Marie Dubois — Maraîchage du Bocage",
    legal_form: "EARL",
    naf_code: "01.13Z",
  }

  it("accepte une déclaration valide", () => {
    const parsed = SiretDeclarationInput.parse(valid)
    expect(parsed.siret).toBe("78945612300012")
  })

  it("strip les espaces du SIRET avant validation (format lisible maquette)", () => {
    const parsed = SiretDeclarationInput.parse({
      ...valid,
      siret: "789 456 123 00012",
    })
    expect(parsed.siret).toBe("78945612300012")
  })

  it("rejette un SIRET de moins de 14 chiffres", () => {
    expect(() =>
      SiretDeclarationInput.parse({ ...valid, siret: "1234567" }),
    ).toThrow()
  })

  it("rejette un SIRET avec des lettres", () => {
    expect(() =>
      SiretDeclarationInput.parse({ ...valid, siret: "ABCDEF12345678" }),
    ).toThrow()
  })

  it("rejette un SIRET trop long", () => {
    expect(() =>
      SiretDeclarationInput.parse({ ...valid, siret: "789456123000123" }),
    ).toThrow()
  })

  it("rejette une raison sociale vide ou < 2 caractères", () => {
    expect(() =>
      SiretDeclarationInput.parse({ ...valid, legal_name: "" }),
    ).toThrow()
    expect(() =>
      SiretDeclarationInput.parse({ ...valid, legal_name: "A" }),
    ).toThrow()
  })

  it("rejette un code NAF malformé", () => {
    expect(() =>
      SiretDeclarationInput.parse({ ...valid, naf_code: "0113Z" }),
    ).toThrow()
    expect(() =>
      SiretDeclarationInput.parse({ ...valid, naf_code: "01.13ZZ" }),
    ).toThrow()
    expect(() =>
      SiretDeclarationInput.parse({ ...valid, naf_code: "01.13z" }),
    ).toThrow()
  })

  it("accepte un code NAF sans lettre finale", () => {
    expect(() =>
      SiretDeclarationInput.parse({ ...valid, naf_code: "01.13" }),
    ).not.toThrow()
  })

  it("rejette une forme juridique hors whitelist", () => {
    expect(() =>
      SiretDeclarationInput.parse({ ...valid, legal_form: "SCI" }),
    ).toThrow()
  })
})

describe("StripeOnboardingLinkOutput", () => {
  it("accepte une URL valide et un timestamp ISO", () => {
    const out = StripeOnboardingLinkOutput.parse({
      url: "https://connect.stripe.com/setup/s/acct_1abc",
      expires_at: "2026-05-17T10:30:00.000Z",
    })
    expect(out.url).toMatch(/^https:\/\//)
  })

  it("rejette une URL malformée", () => {
    expect(() =>
      StripeOnboardingLinkOutput.parse({
        url: "not-a-url",
        expires_at: "2026-05-17T10:30:00.000Z",
      }),
    ).toThrow()
  })
})

describe("Error codes", () => {
  it("expose les codes SIRET attendus", () => {
    expect(SIRET_DECLARATION_ERROR_CODES.SiretAlreadyVerified).toBe(
      "PRODUCER_SIRET_ALREADY_VERIFIED",
    )
  })

  it("expose les codes Stripe attendus", () => {
    expect(
      STRIPE_ONBOARDING_LINK_ERROR_CODES.StripeAccountAlreadyEnabled,
    ).toBe("PRODUCER_STRIPE_ACCOUNT_ALREADY_ENABLED")
  })
})
