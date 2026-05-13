import {
  createBrowserClient as createSsrBrowserClient,
  createServerClient as createSsrServerClient,
  type CookieMethodsServer,
} from "@supabase/ssr"
import { createClient as createJsClient } from "@supabase/supabase-js"

import { type Database } from "./types"

/**
 * Trois clients Supabase typés `<Database>` (cf. ARCHITECTURE.md §9 + §2.1).
 *
 *   - browser : publishable key, sessions persistées via @supabase/ssr +
 *               cookies httpOnly. Utilisé dans les Client Components.
 *   - server  : publishable key + cookies SSR/Edge. Utilisé dans les RSC,
 *               Server Actions et Route Handlers pour lire/écrire au nom
 *               de l'utilisateur connecté (RLS-on).
 *   - admin   : secret key, bypass RLS. À réserver aux opérations
 *               privilégiées (création de ligne `users` côté serveur, jobs).
 *
 * Aucun client ne doit être créé en module-level dans le code applicatif :
 * toujours instancier à chaque requête pour éviter les fuites de session
 * entre utilisateurs (cf. doc @supabase/ssr).
 */
export type DeltaSupabaseClient = ReturnType<typeof createBrowserClient>

export function createBrowserClient(opts: {
  supabaseUrl: string
  supabasePublishableKey: string
}) {
  return createSsrBrowserClient<Database>(
    opts.supabaseUrl,
    opts.supabasePublishableKey,
  )
}

export function createServerClient(opts: {
  supabaseUrl: string
  supabasePublishableKey: string
  cookies: CookieMethodsServer
}) {
  return createSsrServerClient<Database>(
    opts.supabaseUrl,
    opts.supabasePublishableKey,
    { cookies: opts.cookies },
  )
}

/**
 * Client admin bypass-RLS. Utilise la `SUPABASE_SECRET_KEY` (cf. journal §18
 * entrée 1.3) et n'a aucun cookie : pas de session utilisateur attachée.
 */
export function createAdminClient(opts: {
  supabaseUrl: string
  supabaseSecretKey: string
}) {
  return createJsClient<Database>(opts.supabaseUrl, opts.supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
