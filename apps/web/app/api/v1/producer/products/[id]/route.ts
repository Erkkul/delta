import {
  PRODUCT_ERROR_CODES,
  type ProductSnapshot,
  type ProductStatus,
} from "@delta/contracts/product"
import { product as coreProduct } from "@delta/core"
import {
  ProductAlreadyDeletedError,
  ProductNotFoundError,
  ProductTransitionInvalidError,
  ProductValidationError,
} from "@delta/core/errors"
import { type NextRequest, NextResponse } from "next/server"

import { getRoleChecker } from "@/lib/producer/adapters"
import { getProductAdapter } from "@/lib/products/adapters"
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
 * PATCH /api/v1/producer/products/[id] (KAN-20 — KAN-70, étendu KAN-23).
 *
 * Patch partiel du produit. Body validé par `ProductUpdateInput`.
 *
 * KAN-23 : si le body contient `status` ET que le statut diffère du
 * courant, on applique d'abord les autres champs via `updateProduct`,
 * puis on délègue la transition à `transitionProductStatus` (qui valide
 * les préconditions). Cet ordre garantit que les préconditions sont
 * vérifiées sur l'état **post-update** (sinon publier en remplissant
 * description + photos dans la même requête échouerait).
 *
 * En cas d'échec de la transition (préconditions manquantes), les autres
 * champs sont déjà persistés — c'est le comportement attendu (l'utilisateur
 * conserve ses modifications, il doit juste corriger les préconditions
 * manquantes).
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

  // Si `status` est présent dans le body, on l'extrait pour le router
  // séparément via `transitionProductStatus` (KAN-23). Sinon, le PATCH
  // resterait un update naïf qui contournerait les préconditions.
  const adapter = getProductAdapter(supabase)
  const bodyRecord = body as Record<string, unknown>
  const requestedStatus =
    typeof bodyRecord["status"] === "string"
      ? (bodyRecord["status"] as ProductStatus)
      : null
  const updateBody: Record<string, unknown> = { ...bodyRecord }
  if (requestedStatus !== null) {
    delete updateBody["status"]
  }

  try {
    let current = await coreProduct.updateProduct(
      id,
      updateBody,
      user.id,
      adapter,
    )

    if (requestedStatus !== null && requestedStatus !== current.status) {
      const today = new Date().toISOString().slice(0, 10)
      current = await coreProduct.transitionProductStatus(
        id,
        requestedStatus,
        user.id,
        today,
        adapter,
      )
    }

    return NextResponse.json(toSnapshot(current), { status: 200 })
  } catch (err) {
    if (err instanceof ProductValidationError) {
      return NextResponse.json(
        { error: "Validation échouée.", code: err.code, issues: err.issues },
        { status: 400 },
      )
    }
    if (err instanceof ProductTransitionInvalidError) {
      return NextResponse.json(
        { error: err.message, code: err.code, details: err.details },
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
