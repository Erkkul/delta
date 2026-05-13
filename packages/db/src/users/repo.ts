import { type Role } from "@delta/contracts/auth"
import { type SupabaseClient } from "@supabase/supabase-js"

import { type Database, type UserRow } from "../types"

type Client = SupabaseClient<Database>

export type CreateUserInput = {
  id: string
  email: string
  roles?: Role[]
  metadata?: Record<string, unknown>
}

/**
 * Repo `users`. Opérations à passer côté serveur uniquement, sous contrôle
 * RLS (sauf insert : la policy bloque l'INSERT côté client — il faut le
 * trigger ou un client admin).
 *
 * Volontairement plat (pas de classe). On injecte le `client` au cas par
 * cas : le caller choisit s'il utilise le client utilisateur (RLS active)
 * ou le client admin (bypass RLS).
 */
export const usersRepo = {
  async findById(client: Client, id: string): Promise<UserRow | null> {
    const { data, error } = await client
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle()
    if (error) throw error
    return data ?? null
  },

  async findByEmail(client: Client, email: string): Promise<UserRow | null> {
    const normalized = email.trim().toLowerCase()
    const { data, error } = await client
      .from("users")
      .select("*")
      .eq("email", normalized)
      .maybeSingle()
    if (error) throw error
    return data ?? null
  },

  /**
   * Insertion explicite — réservée au client admin (la RLS rejette toute
   * insertion via la clé publishable). Utilisée par le callback OAuth si
   * le trigger DB n'a pas créé la ligne pour une raison de timing.
   */
  async create(client: Client, input: CreateUserInput): Promise<UserRow> {
    const { data, error } = await client
      .from("users")
      .insert({
        id: input.id,
        email: input.email.trim().toLowerCase(),
        roles: input.roles ?? [],
        metadata: input.metadata ?? {},
      })
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  /**
   * Met à jour le tableau `users.roles` (cf. décision 2026-05-13 multi-
   * rôle). Le caller doit utiliser un client porteur de la session
   * utilisateur (RLS `users_update_self`) ou un client admin.
   */
  async updateRoles(
    client: Client,
    id: string,
    roles: Role[],
  ): Promise<UserRow> {
    const { data, error } = await client
      .from("users")
      .update({ roles })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  /**
   * Met à jour `users.metadata` (typiquement pour poser/mettre à jour
   * `consents` après un callback OAuth qui n'est pas passé par /signup).
   * Merge applicatif côté caller (Postgres jsonb sans merge natif).
   */
  async updateMetadata(
    client: Client,
    id: string,
    metadata: Record<string, unknown>,
  ): Promise<UserRow> {
    const { data, error } = await client
      .from("users")
      .update({ metadata })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return data
  },
}
