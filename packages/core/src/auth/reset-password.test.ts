import { describe, expect, it, vi } from "vitest"

import {
  AuthValidationError,
  InvalidRecoveryTokenError,
  RateLimitedError,
  WeakPasswordError,
} from "../errors"
import { type RateLimitStore } from "../rate-limit/rate-limit"

import {
  RESET_PASSWORD_RATE_LIMIT,
  resetPasswordWithOtp,
} from "./reset-password"

const VALID_INPUT = {
  email: "user@example.fr",
  token: "123456",
  newPassword: "Motdepasse2026",
}

function noopStore(): RateLimitStore {
  return {
    incrementAndExpire() {
      return Promise.resolve({
        count: 1,
        ttlMs: RESET_PASSWORD_RATE_LIMIT.windowMs,
      })
    },
  }
}

function exhaustedStore(): RateLimitStore {
  return {
    incrementAndExpire() {
      return Promise.resolve({ count: 99, ttlMs: 9_000 })
    },
  }
}

describe("resetPasswordWithOtp", () => {
  it("renvoie { userId } sur succès", async () => {
    const verifyAndUpdate = vi.fn().mockResolvedValue({ userId: "u1" })
    const res = await resetPasswordWithOtp(VALID_INPUT, {
      verifyAndUpdate,
      store: noopStore(),
    })
    expect(res).toEqual({ userId: "u1" })
    expect(verifyAndUpdate).toHaveBeenCalledWith({
      email: "user@example.fr",
      token: "123456",
      newPassword: "Motdepasse2026",
    })
  })

  it("normalise l'email avant rate-limit et appel adapter", async () => {
    const verifyAndUpdate = vi.fn().mockResolvedValue({ userId: "u1" })
    const incrementAndExpire = vi
      .fn()
      .mockResolvedValue({ count: 1, ttlMs: 1 })
    await resetPasswordWithOtp(
      { ...VALID_INPUT, email: "  USER@Example.FR " },
      { verifyAndUpdate, store: { incrementAndExpire } },
    )
    expect(verifyAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ email: "user@example.fr" }),
    )
    expect(incrementAndExpire).toHaveBeenCalledWith(
      "auth:reset-password:user@example.fr",
      RESET_PASSWORD_RATE_LIMIT.windowMs,
    )
  })

  it("rejette un OTP non numérique via AuthValidationError sans appeler l'adapter", async () => {
    const verifyAndUpdate = vi.fn()
    await expect(
      resetPasswordWithOtp(
        { ...VALID_INPUT, token: "12345A" },
        { verifyAndUpdate, store: noopStore() },
      ),
    ).rejects.toBeInstanceOf(AuthValidationError)
    expect(verifyAndUpdate).not.toHaveBeenCalled()
  })

  it("rejette un nouveau mot de passe trop faible (politique partagée)", async () => {
    const verifyAndUpdate = vi.fn()
    await expect(
      resetPasswordWithOtp(
        { ...VALID_INPUT, newPassword: "Aa1" },
        { verifyAndUpdate, store: noopStore() },
      ),
    ).rejects.toBeInstanceOf(AuthValidationError)
    expect(verifyAndUpdate).not.toHaveBeenCalled()
  })

  it("renvoie InvalidRecoveryTokenError quand l'adapter renvoie null (anti-énumération)", async () => {
    // Token faux / expiré / déjà consommé / email inconnu : mêmes
    // conditions, même erreur opaque.
    const verifyAndUpdate = vi.fn().mockResolvedValue(null)
    await expect(
      resetPasswordWithOtp(VALID_INPUT, {
        verifyAndUpdate,
        store: noopStore(),
      }),
    ).rejects.toBeInstanceOf(InvalidRecoveryTokenError)
  })

  it("propage RateLimitedError avec retryAfterMs si la limite est dépassée", async () => {
    const verifyAndUpdate = vi.fn()
    try {
      await resetPasswordWithOtp(VALID_INPUT, {
        verifyAndUpdate,
        store: exhaustedStore(),
      })
      expect.fail("Devait throw RateLimitedError")
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitedError)
      expect((err as RateLimitedError).retryAfterMs).toBe(9_000)
    }
    expect(verifyAndUpdate).not.toHaveBeenCalled()
  })

  it("laisse remonter une WeakPasswordError throwée par l'adapter", async () => {
    // Cas où Supabase rejette la nouvelle politique malgré la pré-validation
    // Zod (ex : HIBP leaked password protection activé en Pro).
    const verifyAndUpdate = vi
      .fn()
      .mockRejectedValue(new WeakPasswordError("Mot de passe compromis."))
    await expect(
      resetPasswordWithOtp(VALID_INPUT, {
        verifyAndUpdate,
        store: noopStore(),
      }),
    ).rejects.toBeInstanceOf(WeakPasswordError)
  })

  it("expose la baseline de rate-limit (5 / 15 min)", () => {
    expect(RESET_PASSWORD_RATE_LIMIT.attempts).toBe(5)
    expect(RESET_PASSWORD_RATE_LIMIT.windowMs).toBe(15 * 60_000)
  })
})
