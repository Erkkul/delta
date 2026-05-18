import {
  PRODUCT_ERROR_CODES,
  type ProductSnapshot,
} from "@delta/contracts/product"
import { product as coreProduct } from "@delta/core"
import {
  ProductAlreadyDeletedError,
  ProductNotFoundError,
  ProductValidationError,
} from "@delta/core/errors"
import { type NextRequest, NextResponse } from "next/server"

import { getProductAdapter } from "@/lib/products/adapters"
import { getRoleChecker } from "@/lib/producer/adapters"
import { serializeError } from "@/lib/serialize-error"
import { getServerSupabase } from "@/lib/supabase/server"

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/v1/producer/products/[id] (KAN-20).
 *
 * Renvoie un produit appartenant au caller. La RLS rejette les autres.
 *
 * Codes : 200 / 401 / 403 / 404
 */
export async function GET(_req: NextRequest, ctx: Params) {
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

  const { id } = await ctx.params

  try {
    const product = await coreProduct.getOwnerProduct(
      id,
      user.id,
      getProductAdapter(supabase),
    )
    if (product.deleted_at !== null) {
      return NextResponse.json(
        { error: "Produit introuvable.", code: PRODUCT_ERROR_CODES.NotFound },
        { status: 404 },
      )
    }
    return NextResponse.json(toSnapshot(product), { status: 200 })
  } catch (err) {
    if (err instanceof ProductNotFoundError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 404 },
      )
    }
    console.error("[api/v1/producer/products/[id]] GET failed", {
      userId: user.id,
      productId: id,
      error: serializeError(err),
    })
    return NextResponse.json(
      {
        error: "Erreur serveur, réessayez plus tard.",
        code: PRODUCT_ERROR_CODES.Unknown,
      },
      { status: 500 },
    )
  }
}

/**
 * PATCH /api/v1/producer/products/[id] (KAN-20 — KAN-70).
 *
 * Patch partiel du produit. Body validé par `ProductUpdateInput`.
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

  const { id } = await ctx.params
  const body = (await req.json().catch(() => null)) as unknown
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      {
        error: "Body JSON manquant ou invalide.",
        code: PRODUCT_ERROR_CODES.ValidationFailed,
      },
      { status: 400 },
    )
  }

  try {
    const updated = await coreProduct.updateProduct(
      id,
      body,
      user.id,
      getProductAdapter(supabase),
    )
    return NextResponse.json(toSnapshot(updated), { status: 200 })
  } catch (err) {
    if (err instanceof ProductValidationError) {
      return NextResponse.json(
        { error: "Validation échouée.", code: err.code, issues: err.issues },
        { status: 400 },
      )
    }
    if (err instanceof ProductNotFoundError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 404 },
      )
    }
    console.error("[api/v1/producer/products/[id]] PATCH failed", {
      userId: user.id,
      productId: id,
      error: serializeError(err),
    })
    return NextResponse.json(
      {
        error: "Erreur serveur, réessayez plus tard.",
        code: PRODUCT_ERROR_CODES.Unknown,
      },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/v1/producer/products/[id] (KAN-20 — KAN-71).
 *
 * Soft delete : pose `deleted_at = now()`. Idempotence applicative :
 * un produit déjà supprimé renvoie 409 ProductAlreadyDeletedError.
 *
 * Codes : 200 / 401 / 403 / 404 / 409
 */
export async function DELETE(_req: NextRequest, ctx: Params) {
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

  const { id } = await ctx.params

  try {
    const deleted = await coreProduct.softDeleteProduct(
      id,
      user.id,
      getProductAdapter(supabase),
    )
    return NextResponse.json(toSnapshot(deleted), { status: 200 })
  } catch (err) {
    if (err instanceof ProductNotFoundError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 404 },
      )
    }
    if (err instanceof ProductAlreadyDeletedError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 409 },
      )
    }
    console.error("[api/v1/producer/products/[id]] DELETE failed", {
      userId: user.id,
      productId: id,
      error: serializeError(err),
    })
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
  labels: string[]
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
