/**
 * Rate-limit fixed-window helper (KAN-3 — anti brute-force login).
 *
 * Volontairement minimal pour le MVP : fenêtre fixe via INCR + EXPIRE
 * sur le store sous-jacent. Acceptable pour protéger `/auth/login`
 * (cf. ARCHITECTURE.md §9.4) ; à upgrader vers sliding window si on
 * doit borner finement le burst rate ailleurs.
 *
 * Réutilisable au-delà de l'auth — le caller fournit la clé, la
 * limite et la fenêtre.
 */

/**
 * Contrat minimal d'un store distribué pour le rate-limit. Une seule
 * primitive : « incrémente atomiquement, retourne la nouvelle valeur
 * et le TTL restant ». Toute implémentation (Upstash REST, Redis
 * natif, store en mémoire pour les tests) doit respecter cette forme.
 */
export type RateLimitStore = {
  /**
   * Incrémente la valeur associée à `key` de 1. Si la clé n'existait
   * pas, la crée à 1 et applique le TTL `windowMs`. Si elle existait,
   * laisse le TTL en place.
   *
   * Retourne `{ count, ttlMs }` :
   *   - `count` : nouvelle valeur (≥ 1)
   *   - `ttlMs` : temps avant expiration de la clé (ms). Si la
   *     primitive sous-jacente ne renvoie pas de TTL, le store peut
   *     retourner `windowMs` par défaut — l'erreur reste bornée par
   *     la fenêtre.
   */
  incrementAndExpire(
    key: string,
    windowMs: number,
  ): Promise<{ count: number; ttlMs: number }>
}

export type RateLimitResult = {
  /** `true` si la requête est autorisée (count ≤ limit). */
  allowed: boolean
  /** Tentatives restantes avant la fin de la fenêtre (jamais < 0). */
  remaining: number
  /** Délai avant que la fenêtre ne soit réinitialisée (ms). */
  retryAfterMs: number
}

/**
 * Vérifie et consomme une tentative pour `key`. Renvoie `allowed=false`
 * si la limite est dépassée. La consommation est atomique côté store
 * (INCR Redis) — pas de race entre check et increment.
 *
 * Exemple : `rateLimit('auth:login:user@x.fr', 5, 15 * 60_000, store)`
 * autorise 5 tentatives par fenêtre de 15 min.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  store: RateLimitStore,
): Promise<RateLimitResult> {
  if (limit < 1) {
    throw new Error("rateLimit: limit doit être >= 1")
  }
  if (windowMs < 1) {
    throw new Error("rateLimit: windowMs doit être >= 1")
  }

  const { count, ttlMs } = await store.incrementAndExpire(key, windowMs)
  const allowed = count <= limit
  const remaining = Math.max(0, limit - count)
  // ttlMs peut être 0/négatif si le store rate la course (clé déjà
  // expirée entre l'INCR et le retour) : on borne à 0 pour ne jamais
  // renvoyer un Retry-After négatif côté HTTP.
  const retryAfterMs = allowed ? 0 : Math.max(0, ttlMs)
  return { allowed, remaining, retryAfterMs }
}
