import { NextResponse } from "next/server"

import { getServerSupabase } from "@/lib/supabase/server"

/**
 * POST /api/v1/auth/logout (KAN-3).
 *
 * Révoque la session Supabase de l'utilisateur courant (les cookies
 * httpOnly sont effacés par `@supabase/ssr`). Idempotent — appelable
 * même sans session active (renvoie 204).
 *
 * Limite acceptée au MVP (cf. specs/KAN-3/design.md §Risques) :
 * l'access token JWT reste techniquement valide jusqu'à son
 * expiration naturelle (1 h). Pas de blacklist côté serveur.
 */
export async function POST() {
  const supabase = await getServerSupabase()
  await supabase.auth.signOut().catch(() => {
    // Sans session active : Supabase renvoie une erreur. On l'ignore
    // pour rester idempotent.
  })
  return new NextResponse(null, { status: 204 })
}
