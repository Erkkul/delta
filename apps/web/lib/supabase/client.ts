"use client"

import { createBrowserClient } from "@delta/db/client"

/**
 * Client Supabase pour les Client Components. Singleton par tab (le
 * SDK @supabase/ssr partage la session via cookies httpOnly).
 *
 * Doit être appelé depuis du code "use client". Le module est sûr à
 * inliner dans le bundle : seules les valeurs publishable / URL sont
 * exposées.
 */
let cached: ReturnType<typeof createBrowserClient> | null = null

export function getBrowserSupabase() {
  if (cached) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY manquants.",
    )
  }
  cached = createBrowserClient({
    supabaseUrl: url,
    supabasePublishableKey: key,
  })
  return cached
}
