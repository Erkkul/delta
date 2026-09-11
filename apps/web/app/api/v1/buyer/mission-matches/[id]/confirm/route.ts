import { MISSION_MATCH_ERROR_CODES } from "@delta/contracts/mission-match"
import { confirmMissionMatch } from "@delta/core/mission-match"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getBuyerRoleChecker } from "@/lib/buyer/adapters"
import { getMissionMatchAdapter } from "@/lib/mission-match/adapters"
import { mapMissionMatchError } from "@/lib/mission-match/http-errors"
import { serializeError } from "@/lib/serialize-error"
import { getServerSupabase } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const MissionMatchId = z.string().uuid()

/**
 * POST /api/v1/buyer/mission-matches/[id]/confirm (KAN-31 — action
 * "Confirmer" de AC-07).
 *
 * Accepte le match uniquement (transition + décrément stock, atomique côté
 * DB). Ne déclenche PAS le paiement Stripe — hors scope KAN-31, cf.
 * specs/KAN-31/proposal.md § Hypothèses.
 *
 * Codes : 200 / 400 / 401 / 403 / 404 / 409 / 500
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: "Non authentifié.", code: MISSION_MATCH_ERROR_CODES.Unknown },
      { status: 401 },
    )
  }

  if (!(await getBuyerRoleChecker(supabase).hasBuyerRole(user.id))) {
    return NextResponse.json(
      { error: "Rôle acheteur requis.", code: MISSION_MATCH_ERROR_CODES.RoleForbidden },
      { status: 403 },
    )
  }

  const { id } = await params
  const parsed = MissionMatchId.safeParse(id)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Identifiant de match invalide.", code: MISSION_MATCH_ERROR_CODES.ValidationFailed },
      { status: 400 },
    )
  }

  try {
    const detail = await confirmMissionMatch(
      parsed.data,
      user.id,
      getMissionMatchAdapter(supabase),
    )
    return NextResponse.json(detail, { status: 200 })
  } catch (err) {
    const mapped = mapMissionMatchError(err)
    if (mapped) return mapped

    console.error("[api/v1/buyer/mission-matches/[id]/confirm] POST failed", {
      userId: user.id,
      error: serializeError(err),
    })
    return NextResponse.json(
      { error: "Erreur serveur, réessayez plus tard.", code: MISSION_MATCH_ERROR_CODES.Unknown },
      { status: 500 },
    )
  }
}
