import { describe, expect, it, vi } from "vitest"

import { AuthValidationError, RateLimitedError } from "../errors"
import { type RateLimitStore } from "../rate-limit/rate-limit"

import {
  FORGOT_PASSWORD_RATE_LIMIT,
  requestPasswordReset,
} from "./forgot-password"

const VALID_INPUT = { email: "user@example.fr" }

function noopStore(): RateLimitStore {
  return {
    incrementAndExpire() {
      return Promise.resolve({
        count: 1,
        ttlMs: FORGOT_PASSWORD_RATE_LIMIT.windowMs,
      })
    },
  }
}

function exhaustedStore(): RateLimitStore {
  return {
    incrementAndExpire() {
      return Promise.resolve({ count: 99, ttlMs: 12_345 })
    },
  }
}

describe("requestPasswordReset", () => {
  it("appelle sendRecoveryEmail avec l'email normalisé", async () => {
    const sendRecoveryEmail = vi.fn().mockResolvedValue(undefined)
    await requestPasswordReset(VALID_INPUT, {
      sendRecoveryEmail,
      store: noopStore(),
    })
    expect(sendRecoveryEmail).toHaveBeenCalledWith("user@example.fr")
  })

  it("normalise l'email avant rate-limit et envoi (trim + lowercase)", async () => {
    const sendRecoveryEmail = vi.fn().mockResolvedValue(undefined)
    const incrementAndExpire = vi
      .fn()
      .mockResolvedValue({ count: 1, ttlMs: 1 })
    await requestPasswordReset(
      { email: "  USER@Example.FR " },
      { sendRecoveryEmail, store: { incrementAndExpire } },
    )
    expect(sendRecoveryEmail).toHaveBeenCalledWith("user@example.fr")
    expect(incrementAndExpire).toHaveBeenCalledWith(
      "auth:forgot-password:user@example.fr",
      FORGOT_PASSWORD_RATE_LIMIT.windowMs,
    )
  })

  it("rejette un email invalide via AuthValidationError sans envoyer", async () => {
    const sendRecoveryEmail = vi.fn()
    await expect(
      requestPasswordReset(
        { email: "pas-un-email" },
        { sendRecoveryEmail, store: noopStore() },
      ),
    ).rejects.toBeInstanceOf(AuthValidationError)
    expect(sendRecoveryEmail).not.toHaveBeenCalled()
  })

  it("propage RateLimitedError quand la limite est dépassée", async () => {
    const sendRecoveryEmail = vi.fn()
    try {
      await requestPasswordReset(VALID_INPUT, {
        sendRecoveryEmail,
        store: exhaustedStore(),
      })
      expect.fail("Devait throw RateLimitedError")
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitedError)
      expect((err as RateLimitedError).retryAfterMs).toBe(12_345)
    }
    expect(sendRecoveryEmail).not.toHaveBeenCalled()
  })

  it("autorise jusqu'à 3 demandes par fenêtre", () => {
    // Sanity check sur la baseline de la spec (3/h/email).
    expect(FORGOT_PASSWORD_RATE_LIMIT.attempts).toBe(3)
    expect(FORGOT_PASSWORD_RATE_LIMIT.windowMs).toBe(60 * 60_000)
  })
})
