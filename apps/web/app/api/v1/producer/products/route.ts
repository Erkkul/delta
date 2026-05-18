import {
  PRODUCT_ERROR_CODES,
  type ProductListSnapshot,
  type ProductSnapshot,
} from "@delta/contracts/product"
import { product as coreProduct } from "@delta/core"
import {
  ProductValidationError,
} from "@delta/core/errors"
import { type NextRequest, NextResponse } from "next/server"

import { getProductAdapter } from "@/lib/products/adapters"
import { getRoleChecker } from "@/lib/producer/adapters"
import { serializeError } from "@/lib/serialize-error"
import { getServerSupabase } from "@/lib/supabase/server"

/**
 * GET /api/v1/producer/products (KAN-20).
 *
 * Liste paginée du catalogue du producteur connecté. Query params validés
 * par `ProductListQuery` (status / q / limit / cursor). La RLS
 * `products_select_owner` garantit qu'on ne reçoit que ses produits.
 *
 * Codes : 200 / 400 / 401 / 403
 */
export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url)
  const query = Object.fromEntries(searchParams.entries())

  try {
    const result = await coreProduct.listOwnerProducts(
      query,
      user.id,
      getProductAdapter(supabase),
    )
    const snapshot: ProductListSnapshot = {
      items: result.items.map(toSnapshot),
      nextCursor: result.nextCursor,
    }
    return NextResponse.json(snapshot, { status: 200 })
  } catch (err) {
    if (err instanceof ProductValidationError) {
      return NextResponse.json(
        { error: "Paramètres invalides.", code: err.code, issues: err.issues },
        { status: 400 },
      )
    }
    console.error("[api/v1/producer/products] GET failed", {
      userId: user.id,
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
 * POST /api/v1/producer/products (KAN-20 — KAN-69).
 *
 * Crée un nouveau produit pour le producteur connecté. Body validé par
 * `ProductCreateInput`. Retourne le snapshot complet.
 *
 * Codes : 201 / 400 / 401 / 403
 */
export async function POST(req: NextRequest) {
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
    const created = await coreProduct.createProduct(
      body,
      user.id,
      getProductAdapter(supabase),
    )
    return NextResponse.json(toSnapshot(created), { status: 201 })
  } catch (err) {
    if (err instanceof ProductValidationError) {
      return NextResponse.json(
        { error: "Validation échouée.", code: err.code, issues: err.issues },
        { status: 400 },
      )
    }
    console.error("[api/v1/producer/products] POST failed", {
      userId: user.id,
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
