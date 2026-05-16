import { type RateLimitStore } from "./rate-limit"

/**
 * Adapter `RateLimitStore` au-dessus de l'API REST d'Upstash Redis.
 * Pas de SDK : un fetch direct suffit, et garde le bundle Vercel/Edge
 * léger. Pattern : pipeline `INCR` puis `PTTL` (millis). Si `PTTL`
 * renvoie -1 (clé sans TTL — anormal, mais filet), on pose
 * immédiatement `PEXPIRE` à la fenêtre.
 *
 * Endpoint pipeline d'Upstash : `POST /pipeline` avec body JSON
 *   [["INCR", key], ["PTTL", key]]
 * Auth : header `Authorization: Bearer <UPSTASH_REDIS_REST_TOKEN>`.
 */
export type UpstashStoreOptions = {
  url: string
  token: string
  /**
   * `fetch` injectable pour les tests. Par défaut, le `fetch` global
   * (Node 20 / browser / Edge). Ne pas mémoriser de référence côté
   * module : permet à Next.js de patcher `fetch` (cache RSC).
   */
  fetch?: typeof globalThis.fetch
}

type PipelineResult = ReadonlyArray<{ result?: number; error?: string }>

export function createUpstashStore(opts: UpstashStoreOptions): RateLimitStore {
  const { url, token } = opts
  const doFetch = opts.fetch ?? globalThis.fetch

  return {
    async incrementAndExpire(key, windowMs) {
      const endpoint = `${url.replace(/\/$/, "")}/pipeline`
      const res = await doFetch(endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", key],
          ["PTTL", key],
        ]),
      })
      if (!res.ok) {
        throw new Error(
          `Upstash pipeline a renvoyé HTTP ${String(res.status)}`,
        )
      }
      const body = (await res.json()) as PipelineResult
      const incr = body[0]?.result
      const pttl = body[1]?.result
      if (typeof incr !== "number") {
        throw new Error("Upstash INCR : résultat inattendu.")
      }

      // `PTTL` renvoie -1 si la clé existe sans TTL (cas anormal car
      // on INCR à 0 puis on poserait l'expiration). -2 si elle n'existe
      // plus (race rare). Dans les deux cas on (re)pose l'expiration
      // pour garantir la borne et on prend `windowMs` comme TTL effectif.
      let ttlMs = typeof pttl === "number" ? pttl : -1
      if (ttlMs < 0) {
        await doFetch(
          `${url.replace(/\/$/, "")}/pexpire/${encodeKey(key)}/${String(windowMs)}`,
          {
            method: "POST",
            headers: { authorization: `Bearer ${token}` },
          },
        )
        ttlMs = windowMs
      }

      return { count: incr, ttlMs }
    },
  }
}

function encodeKey(key: string): string {
  return encodeURIComponent(key)
}
