import {
  WISHLIST_ERROR_CODES,
  WISHLIST_MAX,
  WishlistAddInput,
  type WishlistItem,
} from "@delta/contracts/wishlist"
import { catalogueRepo, mapCatalogueProduct } from "@delta/db/catalogue"
import { wishlistRepo, WishlistAlreadyExistsError } from "@delta/db/wishlist"
import { type NextRequest, NextResponse } from "next/server"

import { getBuyerRoleChecker } from "@/lib/buyer/adapters"
import { serializeError } from "@/lib/serialize-error"
import { getServerSupabase } from "@/lib/supabase/server"
import { loadWishlistPage } from "@/lib/wishlist/load"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/wishlist (KAN-30 — AC-06).
 *
 * Renvoie la wishlist privée du caller : envies actives visibles + compteur +
 * plafond. Gating session + rôle acheteur. Codes : 200 / 401 / 403 / 500
 */
export async function GET() {
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

  try {
    const page = await loadWishlistPage(supabase, user.id)
    return NextResponse.json(page, { status: 200 })
  } catch (err) {
    console.error("[api/v1/wishlist] GET failed", {
      userId: user.id,
      error: serializeError(err),
    })
    return NextResponse.json(
      { error: "Erreur serveur, réessayez plus tard.", code: WISHLIST_ERROR_CODES.Unknown },
      { status: 500 },
    )
  }
}

/**
 * POST /api/v1/wishlist (KAN-30 — ajout depuis AC-05).
 *
 * Ajoute un produit aux envies. Vérifie : produit visible (vue catalogue),
 * plafond `WISHLIST_MAX` non atteint, produit pas déjà en envie.
 * Codes : 201 / 400 / 401 / 403 / 404 / 409 / 500
 */
export async function POST(req: NextRequest) {
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

  const body = (await req.json().catch(() => null)) as unknown
  const parsed = WishlistAddInput.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Requête invalide.",
        code: WISHLIST_ERROR_CODES.ValidationFailed,
        issues: parsed.error.issues,
      },
      { status: 400 },
    )
  }

  try {
    // Le produit doit être publiquement visible (vue catalogue = même prédicat
    // que la RLS produit). Sinon 404 — on n'ajoute pas une envie fantôme.
    const productRow = await catalogueRepo.getById(supabase, parsed.data.productId)
    if (!productRow) {
      return NextResponse.json(
        { error: "Produit introuvable ou indisponible.", code: WISHLIST_ERROR_CODES.ProductNotFound },
        { status: 404 },
      )
    }

    // Plafond appliqué côté serveur (cf. specs/KAN-30/design.md).
    const count = await wishlistRepo.countActive(supabase, user.id)
    if (count >= WISHLIST_MAX) {
      return NextResponse.json(
        {
          error: `Vous avez atteint le plafond de ${WISHLIST_MAX} envies. Retirez-en une pour en ajouter une autre.`,
          code: WISHLIST_ERROR_CODES.LimitReached,
        },
        { status: 409 },
      )
    }

    const row = await wishlistRepo.add(supabase, user.id, parsed.data.productId)
    const item: WishlistItem = {
      id: row.id,
      product: mapCatalogueProduct(productRow),
      created_at: row.created_at,
    }
    return NextResponse.json(item, { status: 201 })
  } catch (err) {
    if (err instanceof WishlistAlreadyExistsError) {
      return NextResponse.json(
        { error: err.message, code: WISHLIST_ERROR_CODES.AlreadyAdded },
        { status: 409 },
      )
    }
    console.error("[api/v1/wishlist] POST failed", {
      userId: user.id,
      error: serializeError(err),
    })
    return NextResponse.json(
      { error: "Erreur serveur, réessayez plus tard.", code: WISHLIST_ERROR_CODES.Unknown },
      { status: 500 },
    )
  }
}
