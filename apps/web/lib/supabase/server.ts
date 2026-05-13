import { createAdminClient, createServerClient } from "@delta/db/client"
import { cookies } from "next/headers"

import { serverEnv } from "../env"

/**
 * Client Supabase pour les Server Components, Server Actions et Route
 * Handlers. Tourne avec la publishable key + cookies utilisateur → RLS
 * appliquée au nom de l'utilisateur connecté.
 *
 * À instancier par requête (Next 15 : `cookies()` est asynchrone). Ne
 * jamais mémoïser au niveau module.
 */
export async function getServerSupabase() {
  const env = serverEnv()
  const cookieStore = await cookies()
  return createServerClient({
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // RSC : cookies() est read-only depuis un Server Component.
          // Le middleware (à venir) prendra le relais pour rafraîchir.
        }
      },
    },
  })
}

/**
 * Client Supabase admin (bypass RLS). Utiliser uniquement pour les
 * opérations privilégiées (création d'un user via Auth admin, finalisation
 * d'un row métier au callback OAuth). Ne jamais exposer ce client à du
 * code utilisateur, ni le retourner dans une réponse HTTP.
 */
export function getAdminSupabase() {
  const env = serverEnv()
  return createAdminClient({
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseSecretKey: env.SUPABASE_SECRET_KEY,
  })
}
