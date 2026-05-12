import { auth as coreAuth } from "@delta/core"
import { usersRepo } from "@delta/db/users"
import { type NextRequest, NextResponse } from "next/server"

import { getAdminSupabase, getServerSupabase } from "@/lib/supabase/server"

/**
 * Callback OAuth Supabase. Couvre :
 *   - L'échange du `code` d'autorisation contre une session Supabase
 *     (cookies httpOnly via @supabase/ssr).
 *   - Le rattrapage du rôle métier quand le provider OAuth ne transmet
 *     pas notre `raw_user_meta_data.role` (cas Google) — on prend le
 *     `role` passé en query param, on met à jour `public.users` via
 *     client admin si nécessaire.
 *
 * Sécurité :
 *   - On accepte uniquement les `next` paths relatifs (préfixe `/`) pour
 *     éviter open redirect.
 *   - On valide le `role` côté serveur ; si invalide ou absent, on
 *     conserve le rôle déjà projeté par le trigger DB.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const roleParam = coreAuth.parseRole(url.searchParams.get("role"))
  const nextParam = url.searchParams.get("next") ?? "/"
  const safeNext = nextParam.startsWith("/") ? nextParam : "/"

  if (!code) {
    return NextResponse.redirect(new URL("/signup?error=missing_code", url))
  }

  const supabase = await getServerSupabase()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.user) {
    return NextResponse.redirect(
      new URL("/signup?error=oauth_exchange_failed", url),
    )
  }

  if (roleParam) {
    const admin = getAdminSupabase()
    const existing = await usersRepo.findById(admin, data.user.id)
    if (!existing) {
      await usersRepo.create(admin, {
        id: data.user.id,
        email: data.user.email ?? "",
        role: roleParam,
      })
    } else if (existing.role !== roleParam) {
      await usersRepo.updateRole(admin, data.user.id, roleParam)
    }
  }

  const dest = roleParam
    ? coreAuth.onboardingPathForRole(roleParam)
    : safeNext
  return NextResponse.redirect(new URL(dest, url))
}
