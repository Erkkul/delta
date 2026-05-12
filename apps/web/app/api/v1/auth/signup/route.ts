import { auth as coreAuth } from "@delta/core"
import {
  AuthValidationError,
  EmailAlreadyTakenError,
  WeakPasswordError,
} from "@delta/core/errors"
import { type NextRequest, NextResponse } from "next/server"

import { getAdminSupabase } from "@/lib/supabase/server"

/**
 * POST /api/v1/auth/signup
 *
 * Adapter HTTP fin (cf. ARCHITECTURE.md §4.1). Validation + appel use
 * case `core.auth.signupWithEmail`, qui délègue la création Auth.
 *
 * Codes : 201 / 400 (validation) / 409 (email pris) / 500.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as unknown
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Body JSON manquant ou invalide." },
      { status: 400 },
    )
  }

  const admin = getAdminSupabase()

  try {
    const result = await coreAuth.signupWithEmail(body, {
      async createUserWithPassword(input) {
        const { data, error } = await admin.auth.admin.createUser({
          email: input.email,
          password: input.password,
          email_confirm: false,
          user_metadata: {
            role: input.metadata.role,
            consents: input.metadata.consents,
          },
        })
        const mapped = coreAuth.mapAuthProviderError(error, input.email)
        if (mapped) throw mapped
        if (error || !data.user) {
          throw new Error(error?.message ?? "Auth provider error")
        }
        return { userId: data.user.id }
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof AuthValidationError) {
      return NextResponse.json(
        { error: "Validation échouée.", code: err.code, issues: err.issues },
        { status: 400 },
      )
    }
    if (err instanceof EmailAlreadyTakenError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 409 },
      )
    }
    if (err instanceof WeakPasswordError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 400 },
      )
    }
    return NextResponse.json(
      { error: "Erreur serveur, réessayez plus tard." },
      { status: 500 },
    )
  }
}
