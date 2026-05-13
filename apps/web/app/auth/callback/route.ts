import { auth as coreAuth } from "@delta/core"
import { usersRepo } from "@delta/db/users"
import { type NextRequest, NextResponse } from "next/server"

import { getAdminSupabase, getServerSupabase } from "@/lib/supabase/server"

/**
 * Callback OAuth Supabase (KAN-2 v2 — décision 2026-05-13).
 *
 * Échange le `code` d'autorisation contre une session (cookies httpOnly
 * via @supabase/ssr). Pour les flows OAuth (Google), les consents
 * RGPD n'ont pas pu être posés via `options.data` (le SDK
 * `signInWithOAuth` ne le supporte pas), donc on les pose ici a
 * posteriori si `users.metadata.consents` est vide. Idempotent.
 *
 * Redirige ensuite vers `/onboarding/role` si `users.roles` est vide
 * (cas standard premier login OAuth), sinon vers `nextOnboardingPath`
 * basé sur les rôles existants.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")

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

  const admin = getAdminSupabase()
  const existing = await usersRepo.findById(admin, data.user.id)

  // Filet de sécurité : si le trigger n'a pas créé la ligne (timing
  // exotique), on insère via le client admin.
  const row =
    existing ??
    (await usersRepo.create(admin, {
      id: data.user.id,
      email: data.user.email ?? "",
      roles: [],
    }))

  // Pose les consents si absents (cas Google OAuth qui ne passe pas
  // par /api/v1/auth/signup).
  const consents = (row.metadata as { consents?: unknown })?.consents
  if (!consents) {
    await usersRepo.updateMetadata(admin, data.user.id, {
      ...row.metadata,
      consents: coreAuth.buildConsentRecord({
        termsVersion: coreAuth.CURRENT_TERMS_VERSION,
        privacyVersion: coreAuth.CURRENT_PRIVACY_VERSION,
      }),
    })
  }

  const dest =
    row.roles.length === 0
      ? "/onboarding/role"
      : coreAuth.nextOnboardingPath(row.roles)
  return NextResponse.redirect(new URL(dest, url))
}
