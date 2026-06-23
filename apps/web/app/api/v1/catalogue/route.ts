import {
  CATALOGUE_ERROR_CODES,
  CatalogueQuery,
  type CataloguePage,
} from "@delta/contracts/catalogue"
import { catalogueRepo, mapCatalogueProduct } from "@delta/db/catalogue"
import { type NextRequest, NextResponse } from "next/server"

import { serializeError } from "@/lib/serialize-error"
import { getServerSupabase } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/catalogue (KAN-28 — AC-04).
 *
 * Catalogue acheteur public : liste paginée des produits visibles via la vue
 * `catalogue_products`. Filtrage `q` (FTS), `category`, `producer` ; pagination
 * keyset `cursor` (= `created_at` du dernier item). Aucun gating de session :
 * la vue n'expose que des données publiques (la page acheteur, elle, est gatée
 * par rôle).
 *
 * Codes : 200 / 400 / 500
 */
export async function GET(req: NextRequest) {
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries())
  const parsed = CatalogueQuery.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Paramètres de recherche invalides.",
        code: CATALOGUE_ERROR_CODES.ValidationFailed,
        issues: parsed.error.issues,
      },
      { status: 400 },
    )
  }

  try {
    const supabase = await getServerSupabase()
    const { items, nextCursor } = await catalogueRepo.list(supabase, {
      q: parsed.data.q,
      category: parsed.data.category,
      producer: parsed.data.producer,
      limit: parsed.data.limit,
      cursor: parsed.data.cursor,
    })
    const payload: CataloguePage = {
      items: items.map(mapCatalogueProduct),
      nextCursor,
    }
    return NextResponse.json(payload, { status: 200 })
  } catch (err) {
    console.error("[api/v1/catalogue] GET failed", {
      error: serializeError(err),
    })
    return NextResponse.json(
      {
        error: "Erreur serveur, réessayez plus tard.",
        code: CATALOGUE_ERROR_CODES.Unknown,
      },
      { status: 500 },
    )
  }
}
