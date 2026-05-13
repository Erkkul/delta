import { auth as coreAuth } from "@delta/core"
import { AuthValidationError } from "@delta/core/errors"
import { usersRepo } from "@delta/db/users"
import { type NextRequest, NextResponse } from "next/server"

import { getServerSupabase } from "@/lib/supabase/server"

/**
 * PATCH /api/v1/me/roles (KAN-2 v2 — multi-rôle, décision 2026-05-13).
 *
 * Input : { roles: Role[] } — 1 à 3 rôles distincts.
 * Output (200) : { userId, roles }
 *
 * La RLS `users_update_self` autorise le user à mettre à jour son
 * propre `roles`. Pas besoin de client admin ici — on passe par la
 * session utilisateur.
 */
export async function PATCH(req: NextRequest) {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as unknown
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Body JSON manquant ou invalide." },
      { status: 400 },
    )
  }

  try {
    const result = await coreAuth.applyRoleSelection(user.id, body, {
      async updateRoles(userId, roles) {
        const row = await usersRepo.updateRoles(supabase, userId, roles)
        return { roles: row.roles }
      },
    })
    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    if (err instanceof AuthValidationError) {
      return NextResponse.json(
        {
          error: "Sélection de rôle invalide.",
          code: err.code,
          issues: err.issues,
        },
        { status: 400 },
      )
    }
    return NextResponse.json(
      { error: "Erreur serveur, réessayez plus tard." },
      { status: 500 },
    )
  }
}
