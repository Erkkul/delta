import { type Role } from "@delta/contracts/auth"
import { describe, expect, it, vi } from "vitest"

import {
  AuthValidationError,
  InvalidCredentialsError,
  RateLimitedError,
} from "../errors"
import { type RateLimitStore } from "../rate-limit/rate-limit"

import { LOGIN_RATE_LIMIT, loginWithEmail } from "./login"

const VALID_INPUT = {
  email: "user@example.fr",
  password: "Motdepasse2026",
}

function noopStore(): RateLimitStore {
  return {
    incrementAndExpire() {
      return Promise.resolve({ count: 1, ttlMs: LOGIN_RATE_LIMIT.windowMs })
    },
  }
}

function exhaustedStore(): RateLimitStore {
  return {
    incrementAndExpire() {
      return Promise.resolve({ count: 99, ttlMs: 5_000 })
    },
  }
}

describe("loginWithEmail", () => {
  it("renvoie { userId, roles } sur credentials valides", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ userId: "u1" })
    const loadRoles = vi.fn().mockResolvedValue(["acheteur"] as Role[])
    const res = await loginWithEmail(VALID_INPUT, {
      signInWithPassword,
      loadRoles,
      store: noopStore(),
    })
    expect(res).toEqual({ userId: "u1", roles: ["acheteur"] })
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.fr",
      password: "Motdepasse2026",
    })
  })

  it("normalise l'email avant d'appeler le provider et de poser le rate-limit", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ userId: "u1" })
    const loadRoles = vi.fn().mockResolvedValue([])
    const incrementAndExpire = vi
      .fn()
      .mockResolvedValue({ count: 1, ttlMs: 1 })
    const store: RateLimitStore = { incrementAndExpire }
    await loginWithEmail(
      { ...VALID_INPUT, email: "  USER@Example.FR " },
      { signInWithPassword, loadRoles, store },
    )
    expect(signInWithPassword).toHaveBeenCalledWith(
      expect.objectContaining({ email: "user@example.fr" }),
    )
    expect(incrementAndExpire).toHaveBeenCalledWith(
      "auth:login:user@example.fr",
      LOGIN_RATE_LIMIT.windowMs,
    )
  })

  it("rejette un email invalide via AuthValidationError sans appeler le provider", async () => {
    const signInWithPassword = vi.fn()
    await expect(
      loginWithEmail(
        { email: "pas-un-email", password: "x" },
        {
          signInWithPassword,
          loadRoles: vi.fn(),
          store: noopStore(),
        },
      ),
    ).rejects.toBeInstanceOf(AuthValidationError)
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it("rejette un mot de passe vide via AuthValidationError", async () => {
    await expect(
      loginWithEmail(
        { email: "user@example.fr", password: "" },
        {
          signInWithPassword: vi.fn(),
          loadRoles: vi.fn(),
          store: noopStore(),
        },
      ),
    ).rejects.toBeInstanceOf(AuthValidationError)
  })

  it("renvoie InvalidCredentialsError quand l'adapter renvoie null (anti-énumération)", async () => {
    // Pendant énumération hypothétique : email inconnu vs mauvais mdp →
    // le caller mappe les deux vers `null`. Le use case doit propager
    // la MÊME erreur dans les deux cas.
    const cases: Array<null> = [null, null]
    for (const provider of cases) {
      const signInWithPassword = vi.fn().mockResolvedValue(provider)
      await expect(
        loginWithEmail(VALID_INPUT, {
          signInWithPassword,
          loadRoles: vi.fn(),
          store: noopStore(),
        }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError)
    }
  })

  it("renvoie RateLimitedError avec retryAfterMs si la limite est dépassée", async () => {
    const signInWithPassword = vi.fn()
    try {
      await loginWithEmail(VALID_INPUT, {
        signInWithPassword,
        loadRoles: vi.fn(),
        store: exhaustedStore(),
      })
      expect.fail("Devait throw RateLimitedError")
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitedError)
      expect((err as RateLimitedError).retryAfterMs).toBe(5_000)
    }
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it("n'appelle pas loadRoles si le provider refuse", async () => {
    const loadRoles = vi.fn()
    await expect(
      loginWithEmail(VALID_INPUT, {
        signInWithPassword: vi.fn().mockResolvedValue(null),
        loadRoles,
        store: noopStore(),
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError)
    expect(loadRoles).not.toHaveBeenCalled()
  })
})
