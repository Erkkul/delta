import {
  PRODUCT_ERROR_CODES,
  type ProductSnapshot,
} from "@delta/contracts/product"
import { product as coreProduct } from "@delta/core"
import {
  ProductNotFoundError,
  ProductPhotoInvalidReorderError,
  ProductValidationError,
} from "@delta/core/errors"
import { type NextRequest, NextResponse } from "next/server"

import { getRoleChecker } from "@/lib/producer/adapters"
import { getProductAdapter } from "@/lib/products/adapters"
import { serializeError } from "@/lib/serialize-error"
import { getServerSupabase } from "@/lib/supabase/server"

type Params = { params: Promise<{ id: string }> }

/**
 * PATCH /api/v1/producer/products/[id]/photos/reorder (KAN-21).
 *
 * Déplace la photo de l'index `from` vers l'index `to` (splice + insert).
 * `photos[0]` reste la couverture par convention — déplacer une photo
 * vers `to = 0` la fait passer en couverture.
 *
 * Aucun appel Storage.
 *
 * Codes : 200 / 400 / 401 / 403 / 404
 */
export async function PATCH(req: NextRequest, ctx: Params) {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: "Non authentifié.", code: PRODUCT_ERROR_CODES.Unknown },
      { status: 401 },
    )
  }

  const role = getRoleChecker(supabase)
  if (!(await role.hasProducerRole(user.id))) {
    return NextResponse.json(
      { error: "Rôle producteur requis.", code: PRODUCT_ERROR_CODES.Forbidden },
      { status: 403 },
    )
  }

  const { id: productId } = await ctx.params
  const body = (await req.json().catch(() => null)) as unknown

  try {
    const product = await coreProduct.reorderProductPhotos(
      productId,
      body,
      user.id,
      getProductAdapter(supabase),
    )
    return NextResponse.json(toSnapshot(product), { status: 200 })
  } catch (err) {
    if (err instanceof ProductValidationError) {
      return NextResponse.json(
        { error: "Validation échouée.", code: err.code, issues: err.issues },
        { status: 400 },
      )
    }
    if (err instanceof ProductPhotoInvalidReorderError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 400 },
      )
    }
    if (err instanceof ProductNotFoundError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 404 },
      )
    }
    console.error(
      "[api/v1/producer/products/[id]/photos/reorder] PATCH failed",
      {
        userId: user.id,
        productId,
        error: serializeError(err),
      },
    )
    return NextResponse.json(
      {
        error: "Erreur serveur, réessayez plus tard.",
        code: PRODUCT_ERROR_CODES.Unknown,
      },
      { status: 500 },
    )
  }
}

function toSnapshot(p: {
  id: string
  producer_user_id: string
  name: string
  description: string | null
  category: ProductSnapshot["category"]
  packaging: ProductSnapshot["packaging"]
  unit_price_cents: number
  stock: number
  low_stock_threshold: number | null
  availability_from: string | null
  availability_to: string | null
  status: ProductSnapshot["status"]
  labels: ProductSnapshot["labels"]
  photos: ProductSnapshot["photos"]
  created_at: string
  updated_at: string
  deleted_at: string | null
}): ProductSnapshot {
  return {
    id: p.id,
    producer_user_id: p.producer_user_id,
    name: p.name,
    description: p.description,
    category: p.category,
    packaging: p.packaging,
    unit_price_cents: p.unit_price_cents,
    stock: p.stock,
    low_stock_threshold: p.low_stock_threshold,
    availability_from: p.availability_from,
    availability_to: p.availability_to,
    status: p.status,
    labels: p.labels,
    photos: p.photos,
    created_at: p.created_at,
    updated_at: p.updated_at,
    deleted_at: p.deleted_at,
  }
}
