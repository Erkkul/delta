import { type Role } from "@delta/contracts/auth"
import { type SupabaseClient } from "@supabase/supabase-js"

import { type Database, type UserRow } from "../types"

type Client = SupabaseClient<Database>

export type CreateUserInput = {
  id: string
  email: string
  role: Role
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
   * Insertion explicite — réservée au client admin ou au callback OAuth
   * lorsque le trigger Postgres n'a pas pu projeter le rôle correct (cf.
   * spec KAN-2 § Risques techniques : sync auth.users ↔ users métier).
   */
  async create(client: Client, input: CreateUserInput): Promise<UserRow> {
    const { data, error } = await client
      .from("users")
      .insert({
        id: input.id,
        email: input.email.trim().toLowerCase(),
        role: input.role,
        metadata: input.metadata ?? {},
      })
      .select("*")
      .single()
    if (error) throw error
    return data
  },

  async updateRole(
    client: Client,
    id: string,
    role: Role,
  ): Promise<UserRow> {
    const { data, error } = await client
      .from("users")
      .update({ role })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return data
  },
}
