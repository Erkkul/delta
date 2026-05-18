import { type SupabaseClient } from "@supabase/supabase-js"

import {
  type Database,
  type ProductInsert,
  type ProductRow,
  type ProductStatus,
  type ProductUpdate,
} from "../types"

type Client = SupabaseClient<Database>

export type ProductsListFilters = {
  status: "all" | ProductStatus
  q: string | null
  limit: number
  cursor: string | null
}

export type ProductsListPage = {
  items: ProductRow[]
  nextCursor: string | null
}

/**
 * Repo `products` (KAN-20). Source unique de vérité du catalogue
 * producteur. Toutes les lectures excluent les rows soft-deleted par
 * défaut ; le caller peut directement requêter `deleted_at` si besoin
 * (futur écran corbeille).
 *
 * Caller : client utilisateur — la RLS `products_*_owner` garantit
 * l'isolation (FORCE RLS activée par la migration).
 */
export const productsRepo = {
  async create(client: Client, input: ProductInsert): Promise<ProductRow> {
    const { data, error } = await client
      .from("products")
      .insert(input)
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  async findById(
    client: Client,
    productId: string,
    ownerId: string,
  ): Promise<ProductRow | null> {
    const { data, error } = await client
      .from("products")
      .select("*")
      .eq("id", productId)
      .eq("producer_user_id", ownerId)
      .is("deleted_at", null)
      .maybeSingle()
    if (error) throw error
    return data ?? null
  },

  /**
   * Lecture pour PATCH/DELETE — inclut les soft-deleted afin que le use
   * case `softDeleteProduct` puisse distinguer « introuvable » et
   * « déjà supprimé ».
   */
  async findByIdIncludingDeleted(
    client: Client,
    productId: string,
    ownerId: string,
  ): Promise<ProductRow | null> {
    const { data, error } = await client
      .from("products")
      .select("*")
      .eq("id", productId)
      .eq("producer_user_id", ownerId)
      .maybeSingle()
    if (error) throw error
    return data ?? null
  },

  async findByOwner(
    client: Client,
    ownerId: string,
    filters: ProductsListFilters,
  ): Promise<ProductsListPage> {
    let query = client
      .from("products")
      .select("*")
      .eq("producer_user_id", ownerId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      // limit + 1 pour détecter si une page suivante existe
      .limit(filters.limit + 1)

    if (filters.status !== "all") {
      query = query.eq("status", filters.status)
    }
    if (filters.cursor) {
      query = query.lt("created_at", filters.cursor)
    }
    if (filters.q) {
      // websearch_to_tsquery — accepte une syntaxe utilisateur tolérante
      // (« miel acacia », « -alcool »…). Cast en français via la config
      // de la colonne générée search_vector (cf. migration).
      query = query.textSearch("search_vector", filters.q, {
        type: "websearch",
        config: "french",
      })
    }

    const { data, error } = await query
    if (error) throw error
    const rows = data ?? []
    let nextCursor: string | null = null
    if (rows.length > filters.limit) {
      const last = rows[filters.limit - 1]
      if (last) nextCursor = last.created_at
      rows.length = filters.limit
    }
    return { items: rows, nextCursor }
  },

  async update(
    client: Client,
    productId: string,
    ownerId: string,
    patch: ProductUpdate,
  ): Promise<ProductRow> {
    const { data, error } = await client
      .from("products")
      .update(patch)
      .eq("id", productId)
      .eq("producer_user_id", ownerId)
      .is("deleted_at", null)
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  async softDelete(
    client: Client,
    productId: string,
    ownerId: string,
  ): Promise<ProductRow> {
    const { data, error } = await client
      .from("products")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", productId)
      .eq("producer_user_id", ownerId)
      .is("deleted_at", null)
      .select("*")
      .single()
    if (error) throw error
    return data
  },
}
