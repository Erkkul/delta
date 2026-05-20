import {
  PRODUCT_ERROR_CODES,
  ProductTransitionStatusInput,
  type ProductSnapshot,
} from "@delta/contracts/product"
import { product as coreProduct } from "@delta/core"
import {
  ProductNotFoundError,
  ProductTransitionInvalidError,
} from "@delta/core/errors"
import { type NextRequest, NextResponse } from "next/server"

import { getRoleChecker } from "@/lib/producer/adapters"
import { getProductAdapter } from "@/lib/products/adapters"
import { serializeError } from "@/lib/serialize-error"
import { getServerSupabase } from "@/lib/supabase/server"

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/v1/producer/products/[id]/status (KAN-23 — KAN-76).
 *
 * Endpoint d'action : transitionne un produit vers un nouveau statut
 * (`active | draft | disabled`). Séparé du `PATCH` CRUD pour exposer des
 * erreurs métier ciblées :
 *
 *   - 400 PRODUCT_TRANSITION_INVALID — transition hors graphe ou
 *     préconditions de publication manquantes. `details.missing` liste les
 *     préconditions concernées (`name | description | price | stock |
 *     photos | availability`).
 *   - 404 PRODUCT_NOT_FOUND — produit inconnu ou appartenant à un autre user
 *     (la RLS masque les deux cas).
 *
 * Body Zod : `{ status: 'active' | 'draft' | 'disabled' }`.
 *
 * Le statut dérivé `sold_out` n'est jamais transitionable (cf. KAN-22).
 *
 * Codes : 200 / 400 / 401 / 403 / 404
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

  const { id } = await ctx.params
  const body = (await req.json().catch(() => null)) as unknown
  const parsed = ProductTransitionStatusInput.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Body JSON invalide.",
        code: PRODUCT_ERROR_CODES.ValidationFailed,
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    )
  }

  const today = new Date().toISOString().slice(0, 10)

  try {
    const updated = await coreProduct.transitionProductStatus(
      id,
      parsed.data.status,
      user.id,
      today,
      getProductAdapter(supabase),
    )
    return NextResponse.json(toSnapshot(updated), { status: 200 })
  } catch (err) {
    if (err instanceof ProductTransitionInvalidError) {
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          details: err.details,
        },
        { status: 400 },
      )
    }
    if (err instanceof ProductNotFoundError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 404 },
      )
    }
    console.error("[api/v1/producer/products/[id]/status] POST failed", {
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
