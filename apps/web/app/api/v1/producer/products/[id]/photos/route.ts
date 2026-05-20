import {
  PRODUCT_ERROR_CODES,
  ProductPhotoDeleteInput,
  ProductPhotoUploadInput,
  type ProductSnapshot,
} from "@delta/contracts/product"
import { product as coreProduct } from "@delta/core"
import {
  ProductNotFoundError,
  ProductPhotoNotFoundError,
  ProductValidationError,
} from "@delta/core/errors"
import { type NextRequest, NextResponse } from "next/server"

import { getRoleChecker } from "@/lib/producer/adapters"
import { getProductAdapter } from "@/lib/products/adapters"
import { serializeError } from "@/lib/serialize-error"
import {
  createProductPhotoUploadUrl,
  deleteProductPhoto,
} from "@/lib/storage/product-photos"
import { getServerSupabase } from "@/lib/supabase/server"

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/v1/producer/products/[id]/photos (KAN-21).
 *
 * Étape 1 du pipeline upload : génère une URL signée Storage pour le PUT
 * direct côté client. Vérifie que le produit existe + appartient au caller,
 * et que `photos.length < 4` avant signature. La persistance DB est
 * différée à l'étape 3 (`POST /photos/confirm`).
 *
 * Codes : 200 / 400 / 401 / 403 / 404 / 409
 */
export async function POST(req: NextRequest, ctx: Params) {
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
  const parsed = ProductPhotoUploadInput.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation échouée.",
        code: PRODUCT_ERROR_CODES.PhotoMimeRejected,
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    )
  }

  try {
    const product = await coreProduct.getOwnerProduct(
      productId,
      user.id,
      getProductAdapter(supabase),
    )
    if (product.deleted_at !== null) {
      return NextResponse.json(
        { error: "Produit introuvable.", code: PRODUCT_ERROR_CODES.NotFound },
        { status: 404 },
      )
    }
    if (product.photos.length >= 4) {
      return NextResponse.json(
        {
          error: "Limite de 4 photos atteinte pour ce produit.",
          code: PRODUCT_ERROR_CODES.PhotoLimitReached,
        },
        { status: 409 },
      )
    }

    const out = await createProductPhotoUploadUrl(
      supabase,
      user.id,
      productId,
      parsed.data,
    )
    return NextResponse.json(out, { status: 200 })
  } catch (err) {
    if (err instanceof ProductNotFoundError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 404 },
      )
    }
    console.error("[api/v1/producer/products/[id]/photos] POST failed", {
      userId: user.id,
      productId,
      error: serializeError(err),
    })
    return NextResponse.json(
      {
        error: "Échec génération URL d'upload.",
        code: PRODUCT_ERROR_CODES.Unknown,
      },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/v1/producer/products/[id]/photos (KAN-21).
 *
 * Retire la photo d'index `index` du tableau `photos` + supprime le fichier
 * Storage correspondant (best-effort, tolère 404 Storage). Renvoie le
 * snapshot complet du produit mis à jour.
 *
 * Codes : 200 / 400 / 401 / 403 / 404
 */
export async function DELETE(req: NextRequest, ctx: Params) {
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
  const parsed = ProductPhotoDeleteInput.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation échouée.",
        code: PRODUCT_ERROR_CODES.ValidationFailed,
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    )
  }

  try {
    const { product, removedPath } = await coreProduct.removeProductPhoto(
      productId,
      parsed.data,
      user.id,
      getProductAdapter(supabase),
    )
    // Best-effort : si le remove Storage échoue, le tableau DB est déjà à
    // jour côté UI. Le fichier devient orphelin — accepté au MVP, à
    // ramasser plus tard par un cron de réconciliation.
    await deleteProductPhoto(supabase, removedPath).catch((err) => {
      console.warn("[api/v1/producer/products/[id]/photos] Storage remove failed", {
        path: removedPath,
        error: serializeError(err),
      })
    })
    return NextResponse.json(toSnapshot(product), { status: 200 })
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
    if (err instanceof ProductPhotoNotFoundError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 404 },
      )
    }
    console.error("[api/v1/producer/products/[id]/photos] DELETE failed", {
      userId: user.id,
      productId,
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
