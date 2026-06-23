import { type SupabaseClient } from "@supabase/supabase-js"

import {
  type CatalogueProductRow,
  type Database,
  type ProductCategory,
} from "../types"

type Client = SupabaseClient<Database>

/** Colonnes projetées par les lectures catalogue (jamais `search_vector`). */
const CATALOGUE_COLUMNS =
  "id, producer_user_id, name, description, category, packaging, unit_price_cents, labels, photos, created_at, producer_display_name, producer_zone"

export type CatalogueListFilters = {
  q?: string
  category?: ProductCategory
  producer?: string
  limit: number
  cursor?: string
}

export type CatalogueListPage = {
  items: CatalogueProductRow[]
  nextCursor: string | null
}

/**
 * Repo `catalogue_products` (KAN-28). Lecture publique du catalogue acheteur
 * via la vue curée `public.catalogue_products` (cf. migration
 * 20260623180000). La vue applique déjà la visibilité (statut, producteur
 * vérifié, fenêtre dispo) ; le repo ne porte que le filtrage acheteur et la
 * pagination keyset sur `created_at DESC` (même convention que le listing
 * producteur KAN-20).
 *
 * Caller : client utilisateur (ou anon) — la vue est accordée à `anon` et
 * `authenticated`, aucune donnée producteur sensible n'est exposée.
 */
export const catalogueRepo = {
  async list(
    client: Client,
    filters: CatalogueListFilters,
  ): Promise<CatalogueListPage> {
    let query = client
      .from("catalogue_products")
      .select(CATALOGUE_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(filters.limit + 1)

    if (filters.category) query = query.eq("category", filters.category)
    if (filters.producer) query = query.eq("producer_user_id", filters.producer)
    if (filters.cursor) query = query.lt("created_at", filters.cursor)
    if (filters.q) {
      query = query.textSearch("search_vector", filters.q, {
        type: "websearch",
        config: "french",
      })
    }

    const { data, error } = await query
    if (error) throw error

    const rows = (data ?? []) as unknown as CatalogueProductRow[]
    const hasMore = rows.length > filters.limit
    const items = hasMore ? rows.slice(0, filters.limit) : rows
    const nextCursor = hasMore
      ? (items[items.length - 1]?.created_at ?? null)
      : null

    return { items, nextCursor }
  },

  async getById(
    client: Client,
    id: string,
  ): Promise<CatalogueProductRow | null> {
    const { data, error } = await client
      .from("catalogue_products")
      .select(CATALOGUE_COLUMNS)
      .eq("id", id)
      .maybeSingle()
    if (error) throw error
    return data ?? null
  },
}
