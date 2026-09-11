import { type SupabaseClient } from "@supabase/supabase-js"

import { type Database, type WishlistItemRow } from "../types"

type Client = SupabaseClient<Database>

const SELECT_COLUMNS = "id, user_id, product_id, created_at, deleted_at"

/** Code Postgres d'une violation de contrainte d'unicité. */
const PG_UNIQUE_VIOLATION = "23505"

/**
 * Levée quand un acheteur tente d'ajouter à ses envies un produit qui y est
 * déjà (envie active). Correspond à la violation de l'index unique partiel
 * `wishlist_items_user_product_active_uniq`. Mappée en 409 par le route
 * handler.
 */
export class WishlistAlreadyExistsError extends Error {
  constructor() {
    super("Ce produit est déjà dans vos envies.")
    this.name = "WishlistAlreadyExistsError"
  }
}

/**
 * Repo `wishlist_items` (KAN-30). Wishlist privée acheteur, RLS self-only
 * (miroir de `buyerProfilesRepo`). Le client injecté est toujours le client
 * utilisateur : chaque opération est gated par `auth.uid() = user_id`.
 *
 * Le plafond de 20 envies actives n'est PAS porté ici : il est appliqué par
 * le route handler (COUNT via `countActive` avant `add`), cf.
 * specs/KAN-30/design.md.
 */
export const wishlistRepo = {
  /** Envies actives de l'acheteur, triées par récence (plus récentes d'abord). */
  async listActive(
    client: Client,
    userId: string,
  ): Promise<WishlistItemRow[]> {
    const { data, error } = await client
      .from("wishlist_items")
      .select(SELECT_COLUMNS)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
    if (error) throw error
    return data ?? []
  },

  /** Nombre d'envies actives (ce qui compte vis-à-vis du plafond). */
  async countActive(client: Client, userId: string): Promise<number> {
    const { count, error } = await client
      .from("wishlist_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null)
    if (error) throw error
    return count ?? 0
  },

  /** Envie active de l'acheteur pour ce produit, ou `null`. */
  async findActiveByProduct(
    client: Client,
    userId: string,
    productId: string,
  ): Promise<WishlistItemRow | null> {
    const { data, error } = await client
      .from("wishlist_items")
      .select(SELECT_COLUMNS)
      .eq("user_id", userId)
      .eq("product_id", productId)
      .is("deleted_at", null)
      .maybeSingle()
    if (error) throw error
    return data ?? null
  },

  /**
   * Ajoute une envie. Sur violation d'unicité (produit déjà en envie active),
   * lève `WishlistAlreadyExistsError`. RLS `wishlist_items_insert_self`.
   */
  async add(
    client: Client,
    userId: string,
    productId: string,
  ): Promise<WishlistItemRow> {
    const { data, error } = await client
      .from("wishlist_items")
      .insert({ user_id: userId, product_id: productId })
      .select(SELECT_COLUMNS)
      .single()
    if (error) {
      if (error.code === PG_UNIQUE_VIOLATION) {
        throw new WishlistAlreadyExistsError()
      }
      throw error
    }
    return data
  },

  /**
   * Retire une envie (soft delete). Renvoie `true` si une envie active a été
   * retirée, `false` si aucune n'existait (idempotent). RLS
   * `wishlist_items_update_self`.
   */
  async softRemoveByProduct(
    client: Client,
    userId: string,
    productId: string,
  ): Promise<boolean> {
    const { data, error } = await client
      .from("wishlist_items")
      .update({ deleted_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("product_id", productId)
      .is("deleted_at", null)
      .select("id")
    if (error) throw error
    return (data?.length ?? 0) > 0
  },
}
