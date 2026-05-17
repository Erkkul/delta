import {
  PRODUCER_PROFILE_ERROR_CODES,
  ProducerPhotoDeleteInput,
  ProducerPhotoUploadInput,
} from "@delta/contracts/producer"
import { type NextRequest, NextResponse } from "next/server"

import { getRoleChecker } from "@/lib/producer/adapters"
import {
  createPhotoUploadUrl,
  deletePhoto,
} from "@/lib/storage/producer-photos"
import { getServerSupabase } from "@/lib/supabase/server"

/**
 * POST /api/v1/producer/photos (KAN-17).
 *
 * Génère une URL signée pour uploader une photo (logo ou galerie) dans le
 * bucket `producer-photos`. Le client effectue ensuite un `PUT <upload_url>`
 * puis appelle `PATCH /api/v1/producer/profile` avec l'URL publique pour
 * persister la référence.
 *
 * Codes : 200 / 400 / 401 / 403
 */
export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: "Non authentifié.", code: PRODUCER_PROFILE_ERROR_CODES.Unknown },
      { status: 401 },
    )
  }

  const role = getRoleChecker(supabase)
  if (!(await role.hasProducerRole(user.id))) {
    return NextResponse.json(
      {
        error: "Rôle producteur requis.",
        code: PRODUCER_PROFILE_ERROR_CODES.RoleForbidden,
      },
      { status: 403 },
    )
  }

  const body = (await req.json().catch(() => null)) as unknown
  const parsed = ProducerPhotoUploadInput.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation échouée.",
        code: PRODUCER_PROFILE_ERROR_CODES.ValidationFailed,
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    )
  }

  try {
    const out = await createPhotoUploadUrl(supabase, user.id, parsed.data)
    return NextResponse.json(out, { status: 200 })
  } catch (err) {
    console.error("[api/v1/producer/photos] POST failed", {
      userId: user.id,
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      {
        error: "Échec génération URL d'upload.",
        code: PRODUCER_PROFILE_ERROR_CODES.Unknown,
      },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/v1/producer/photos (KAN-17).
 *
 * Body : { kind, slot? }. Supprime le ou les fichiers correspondants dans
 * le bucket `producer-photos` (toutes extensions, RLS appliquée). N'écrit
 * pas dans `producers` — le caller doit ensuite PATCH pour mettre à jour
 * `profile_photo_url` ou `farm_photos`.
 *
 * Codes : 200 / 400 / 401 / 403
 */
export async function DELETE(req: NextRequest) {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: "Non authentifié.", code: PRODUCER_PROFILE_ERROR_CODES.Unknown },
      { status: 401 },
    )
  }

  const role = getRoleChecker(supabase)
  if (!(await role.hasProducerRole(user.id))) {
    return NextResponse.json(
      {
        error: "Rôle producteur requis.",
        code: PRODUCER_PROFILE_ERROR_CODES.RoleForbidden,
      },
      { status: 403 },
    )
  }

  const body = (await req.json().catch(() => null)) as unknown
  const parsed = ProducerPhotoDeleteInput.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation échouée.",
        code: PRODUCER_PROFILE_ERROR_CODES.ValidationFailed,
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    )
  }

  try {
    await deletePhoto(supabase, user.id, parsed.data)
    return NextResponse.json({ deleted: true }, { status: 200 })
  } catch (err) {
    console.error("[api/v1/producer/photos] DELETE failed", {
      userId: user.id,
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      {
        error: "Échec suppression photo.",
        code: PRODUCER_PROFILE_ERROR_CODES.Unknown,
      },
      { status: 500 },
    )
  }
}
