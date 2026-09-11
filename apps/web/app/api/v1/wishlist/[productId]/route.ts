import { WISHLIST_ERROR_CODES } from "@delta/contracts/wishlist"
import { wishlistRepo } from "@delta/db/wishlist"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getBuyerRoleChecker } from "@/lib/buyer/adapters"
import { serializeError } from "@/lib/serialize-error"
import { getServerSupabase } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const ProductId = z.string().uuid()

/**
 * DELETE /api/v1/wishlist/[productId] (KAN-30 — retrait d'une envie).
 *
 * Soft delete de l'envie active du caller pour ce produit. Idempotent : 204
 * même si l'envie n'existait pas / était déjà retirée.
 * Codes : 204 / 400 / 401 / 403 / 500
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: "Non authentifié.", code: WISHLIST_ERROR_CODES.Unknown },
      { status: 401 },
    )
  }

  if (!(await getBuyerRoleChecker(supabase).hasBuyerRole(user.id))) {
    return NextResponse.json(
      { error: "Rôle acheteur requis.", code: WISHLIST_ERROR_CODES.RoleForbidden },
      { status: 403 },
    )
  }

  const { productId } = await params
  const parsed = ProductId.safeParse(productId)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Identifiant produit invalide.", code: WISHLIST_ERROR_CODES.ValidationFailed },
      { status: 400 },
    )
  }

  try {
    await wishlistRepo.softRemoveByProduct(supabase, user.id, parsed.data)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error("[api/v1/wishlist/[productId]] DELETE failed", {
      userId: user.id,
      error: serializeError(err),
    })
    return NextResponse.json(
      { error: "Erreur serveur, réessayez plus tard.", code: WISHLIST_ERROR_CODES.Unknown },
      { status: 500 },
    )
  }
}
