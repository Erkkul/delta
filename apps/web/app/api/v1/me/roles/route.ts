import { auth as coreAuth } from "@delta/core"
import { AuthValidationError } from "@delta/core/errors"
import { usersRepo } from "@delta/db/users"
import { type NextRequest, NextResponse } from "next/server"

import { getAdminSupabase, getServerSupabase } from "@/lib/supabase/server"

/**
 * PATCH /api/v1/me/roles (KAN-2 v2 — multi-rôle, décision 2026-05-13).
 *
 * Input : { roles: Role[] } — 1 à 3 rôles distincts.
 * Output (200) : { userId, roles }
 *
 * Sécurité :
 *   - L'authentification utilisateur est faite via `supabase.auth.getUser()`
 *     (cookies SSR). On extrait `user.id` du JWT, **jamais** du body.
 *   - L'opération DB est ensuite faite avec le client admin
 *     (`SUPABASE_SECRET_KEY`) pour éviter les modes d'échec liés à la
 *     propagation de la session côté PostgREST (cookies, JWT refresh, etc.).
 *     La RLS reste active comme defense-in-depth pour tout accès direct
 *     non-authentifié (client publishable).
 *   - Le code écrit strictement à la ligne `users` correspondant au
 *     `user.id` issu du JWT — impossible de muter une autre ligne.
 *
 * Filet de sécurité :
 *   - Si la ligne `public.users` n'existe pas (cas où le trigger
 *     `handle_new_auth_user` n'a pas tourné, ex. race au signup), on la
 *     crée via `usersRepo.create` côté admin avant d'enregistrer les rôles.
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

  const admin = getAdminSupabase()

  try {
    const result = await coreAuth.applyRoleSelection(user.id, body, {
      async updateRoles(userId, roles) {
        const existing = await usersRepo.findById(admin, userId)
        if (!existing) {
          // Filet : trigger DB pas exécuté (race, migration partielle).
          const created = await usersRepo.create(admin, {
            id: userId,
            email: user.email ?? "",
            roles,
          })
          return { roles: created.roles }
        }
        const updated = await usersRepo.updateRoles(admin, userId, roles)
        return { roles: updated.roles }
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
    // Log structuré côté Vercel pour faciliter le debug en preview/prod.
    // Inclut le code Postgres si disponible (`42703` colonne inconnue,
    // `PGRST116` ligne absente, `42P01` table inconnue, etc.).
    const meta = inspectError(err)
    console.error("[api/v1/me/roles] PATCH failed", {
      userId: user.id,
      pgCode: meta.code,
      pgMessage: meta.message,
      pgHint: meta.hint,
      pgDetails: meta.details,
    })
    return NextResponse.json(
      {
        error: meta.userFacing,
        ...(process.env.NODE_ENV !== "production" && meta.code
          ? { debug: { code: meta.code, message: meta.message } }
          : {}),
      },
      { status: 500 },
    )
  }
}

type ErrorMeta = {
  code?: string
  message?: string
  hint?: string
  details?: string
  userFacing: string
}

function inspectError(err: unknown): ErrorMeta {
  const obj = (err ?? {}) as Record<string, unknown>
  const code = typeof obj.code === "string" ? obj.code : undefined
  const message = typeof obj.message === "string" ? obj.message : undefined
  const hint = typeof obj.hint === "string" ? obj.hint : undefined
  const details = typeof obj.details === "string" ? obj.details : undefined

  let userFacing = "Erreur serveur, réessayez plus tard."
  if (code === "42703" || code === "42P01") {
    userFacing =
      "Schéma DB obsolète côté serveur. Vérifiez que la migration `users` a bien été appliquée."
  } else if (code === "PGRST116") {
    userFacing =
      "Votre compte est introuvable côté DB, recommencez l'inscription."
  } else if (code === "42501") {
    userFacing = "Permission refusée côté DB."
  }
  return { code, message, hint, details, userFacing }
}
