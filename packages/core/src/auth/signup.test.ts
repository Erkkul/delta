import { describe, expect, it, vi } from "vitest"

import {
  AuthValidationError,
  EmailAlreadyTakenError,
  WeakPasswordError,
} from "../errors"

import { mapAuthProviderError, signupWithEmail } from "./signup"

const validInput = {
  email: "jeanne.dupont@example.fr",
  password: "Motdepasse2026",
  role: "acheteur" as const,
  acceptedTerms: true,
  acceptedPrivacy: true,
  termsVersion: "2026-05-12",
  privacyVersion: "2026-05-12",
}

describe("signupWithEmail", () => {
  it("crée le user et renvoie {userId, role}", async () => {
    const createUserWithPassword = vi
      .fn()
      .mockResolvedValue({ userId: "uuid-1" })
    const result = await signupWithEmail(
      validInput,
      { createUserWithPassword },
      new Date("2026-05-12T10:00:00.000Z"),
    )
    expect(result).toEqual({ userId: "uuid-1", role: "acheteur" })
    expect(createUserWithPassword).toHaveBeenCalledWith({
      email: "jeanne.dupont@example.fr",
      password: "Motdepasse2026",
      metadata: {
        role: "acheteur",
        consents: {
          termsVersion: "2026-05-12",
          privacyVersion: "2026-05-12",
          acceptedAt: "2026-05-12T10:00:00.000Z",
        },
      },
    })
  })

  it("normalise l'email (trim + lowercase)", async () => {
    const createUserWithPassword = vi
      .fn()
      .mockResolvedValue({ userId: "uuid-2" })
    await signupWithEmail(
      { ...validInput, email: "  Jean.Dupont@Example.FR " },
      { createUserWithPassword },
    )
    expect(createUserWithPassword).toHaveBeenCalledWith(
      expect.objectContaining({ email: "jean.dupont@example.fr" }),
    )
  })

  it("rejette un email invalide via AuthValidationError", async () => {
    await expect(
      signupWithEmail(
        { ...validInput, email: "pas-un-email" },
        { createUserWithPassword: vi.fn() },
      ),
    ).rejects.toBeInstanceOf(AuthValidationError)
  })

  it("rejette un password trop court (< 10)", async () => {
    await expect(
      signupWithEmail(
        { ...validInput, password: "Aa1" },
        { createUserWithPassword: vi.fn() },
      ),
    ).rejects.toBeInstanceOf(AuthValidationError)
  })

  it("rejette un password sans majuscule", async () => {
    await expect(
      signupWithEmail(
        { ...validInput, password: "abcdefgh12" },
        { createUserWithPassword: vi.fn() },
      ),
    ).rejects.toBeInstanceOf(AuthValidationError)
  })

  it("rejette un password sans minuscule", async () => {
    await expect(
      signupWithEmail(
        { ...validInput, password: "ABCDEFGH12" },
        { createUserWithPassword: vi.fn() },
      ),
    ).rejects.toBeInstanceOf(AuthValidationError)
  })

  it("rejette un password sans chiffre", async () => {
    await expect(
      signupWithEmail(
        { ...validInput, password: "Motdepassetrop" },
        { createUserWithPassword: vi.fn() },
      ),
    ).rejects.toBeInstanceOf(AuthValidationError)
  })

  it("rejette un rôle inconnu", async () => {
    await expect(
      signupWithEmail(
        { ...validInput, role: "admin" },
        { createUserWithPassword: vi.fn() },
      ),
    ).rejects.toBeInstanceOf(AuthValidationError)
  })

  it("rejette si acceptedTerms = false", async () => {
    await expect(
      signupWithEmail(
        { ...validInput, acceptedTerms: false },
        { createUserWithPassword: vi.fn() },
      ),
    ).rejects.toBeInstanceOf(AuthValidationError)
  })

  it("rejette si acceptedPrivacy = false", async () => {
    await expect(
      signupWithEmail(
        { ...validInput, acceptedPrivacy: false },
        { createUserWithPassword: vi.fn() },
      ),
    ).rejects.toBeInstanceOf(AuthValidationError)
  })

  it("propage AuthValidationError avec les issues détaillées", async () => {
    try {
      await signupWithEmail(
        { ...validInput, email: "", password: "" },
        { createUserWithPassword: vi.fn() },
      )
      expect.fail("Devait throw")
    } catch (err) {
      expect(err).toBeInstanceOf(AuthValidationError)
      const validationErr = err as AuthValidationError
      expect(validationErr.issues.length).toBeGreaterThan(0)
      expect(validationErr.issues[0]?.path).toBeTruthy()
    }
  })
})

describe("mapAuthProviderError", () => {
  it("renvoie null sans erreur", () => {
    expect(mapAuthProviderError(null, "x@y.fr")).toBeNull()
  })

  it("mappe user_already_exists vers EmailAlreadyTakenError", () => {
    const err = mapAuthProviderError(
      { code: "user_already_exists", message: "Email taken" },
      "x@y.fr",
    )
    expect(err).toBeInstanceOf(EmailAlreadyTakenError)
    expect((err as EmailAlreadyTakenError).code).toBe(
      "AUTH_EMAIL_ALREADY_TAKEN",
    )
  })

  it("mappe email_address_already_in_use vers EmailAlreadyTakenError", () => {
    expect(
      mapAuthProviderError(
        { code: "email_address_already_in_use" },
        "x@y.fr",
      ),
    ).toBeInstanceOf(EmailAlreadyTakenError)
  })

  it("mappe weak_password vers WeakPasswordError", () => {
    const err = mapAuthProviderError(
      { code: "weak_password", message: "trop court" },
      "x@y.fr",
    )
    expect(err).toBeInstanceOf(WeakPasswordError)
    expect((err as WeakPasswordError).message).toBe("trop court")
  })

  it("renvoie null sur code inconnu", () => {
    expect(
      mapAuthProviderError({ code: "rate_limited" }, "x@y.fr"),
    ).toBeNull()
  })
})
