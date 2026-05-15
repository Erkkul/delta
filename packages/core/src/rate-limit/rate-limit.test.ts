import { beforeEach, describe, expect, it, vi } from "vitest"

import { rateLimit, type RateLimitStore } from "./rate-limit"
import { createUpstashStore } from "./upstash"

/**
 * Store en mémoire pour les tests. Reproduit la sémantique attendue
 * d'INCR + PEXPIRE atomique : si la clé n'existe pas, créée à 1 avec
 * TTL = windowMs ; sinon incrémentée et TTL conservé. Le faux horloge
 * `vi.useFakeTimers()` permet de simuler l'expiration sans dormir.
 */
function memoryStore(now: () => number): RateLimitStore {
  const records = new Map<string, { count: number; expiresAt: number }>()
  return {
    incrementAndExpire(key, windowMs) {
      const current = records.get(key)
      const t = now()
      if (!current || current.expiresAt <= t) {
        const rec = { count: 1, expiresAt: t + windowMs }
        records.set(key, rec)
        return Promise.resolve({ count: 1, ttlMs: windowMs })
      }
      current.count += 1
      return Promise.resolve({
        count: current.count,
        ttlMs: current.expiresAt - t,
      })
    },
  }
}

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-14T10:00:00.000Z"))
  })

  it("autorise les N premières tentatives dans la fenêtre", async () => {
    const store = memoryStore(() => Date.now())
    for (let i = 1; i <= 5; i += 1) {
      const res = await rateLimit("k", 5, 60_000, store)
      expect(res.allowed).toBe(true)
      expect(res.remaining).toBe(5 - i)
    }
  })

  it("refuse la N+1e tentative et expose retryAfterMs", async () => {
    const store = memoryStore(() => Date.now())
    for (let i = 0; i < 5; i += 1) {
      await rateLimit("k", 5, 60_000, store)
    }
    const res = await rateLimit("k", 5, 60_000, store)
    expect(res.allowed).toBe(false)
    expect(res.remaining).toBe(0)
    expect(res.retryAfterMs).toBeGreaterThan(0)
    expect(res.retryAfterMs).toBeLessThanOrEqual(60_000)
  })

  it("réautorise après expiration de la fenêtre", async () => {
    const store = memoryStore(() => Date.now())
    for (let i = 0; i < 5; i += 1) {
      await rateLimit("k", 5, 60_000, store)
    }
    expect((await rateLimit("k", 5, 60_000, store)).allowed).toBe(false)

    vi.advanceTimersByTime(60_001)
    const res = await rateLimit("k", 5, 60_000, store)
    expect(res.allowed).toBe(true)
    expect(res.remaining).toBe(4)
  })

  it("isole les clés", async () => {
    const store = memoryStore(() => Date.now())
    for (let i = 0; i < 5; i += 1) {
      await rateLimit("a", 5, 60_000, store)
    }
    const res = await rateLimit("b", 5, 60_000, store)
    expect(res.allowed).toBe(true)
    expect(res.remaining).toBe(4)
  })

  it("rejette une limite ou une fenêtre invalides", async () => {
    const store = memoryStore(() => Date.now())
    await expect(rateLimit("k", 0, 60_000, store)).rejects.toThrow()
    await expect(rateLimit("k", 5, 0, store)).rejects.toThrow()
  })
})

function fakeResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response
}

describe("createUpstashStore", () => {
  it("appelle le pipeline avec INCR + PTTL et le bon token", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(fakeResponse([{ result: 1 }, { result: 60_000 }]))
    const store = createUpstashStore({
      url: "https://upstash.example/",
      token: "test-token",
      fetch: fetchMock,
    })

    const res = await store.incrementAndExpire("auth:login:user@x.fr", 60_000)

    expect(res).toEqual({ count: 1, ttlMs: 60_000 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const call = fetchMock.mock.calls[0]
    expect(call?.[0]).toBe("https://upstash.example/pipeline")
    const init = call?.[1]
    expect(init?.method).toBe("POST")
    expect((init?.headers as Record<string, string>).authorization).toBe(
      "Bearer test-token",
    )
    expect(JSON.parse(init?.body as string)).toEqual([
      ["INCR", "auth:login:user@x.fr"],
      ["PTTL", "auth:login:user@x.fr"],
    ])
  })

  it("re-pose le TTL si PTTL renvoie -1 (clé sans TTL)", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(fakeResponse([{ result: 3 }, { result: -1 }]))
      .mockResolvedValueOnce(fakeResponse([]))
    const store = createUpstashStore({
      url: "https://upstash.example",
      token: "t",
      fetch: fetchMock,
    })

    const res = await store.incrementAndExpire("k", 60_000)
    expect(res.ttlMs).toBe(60_000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/pexpire/k/60000")
  })

  it("relance si le pipeline répond non-ok", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(fakeResponse({}, false, 500))
    const store = createUpstashStore({
      url: "https://upstash.example",
      token: "t",
      fetch: fetchMock,
    })
    await expect(store.incrementAndExpire("k", 60_000)).rejects.toThrow(
      /HTTP 500/,
    )
  })
})
