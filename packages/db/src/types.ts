import { type Role } from "@delta/contracts/auth"

/**
 * Schéma de la base Delta tel que vu par `@supabase/supabase-js`.
 *
 * Cible : régénérer ce fichier via `supabase gen types typescript --project-id
 * knyfrnxkqyyirnsyijfk --schema public` une fois que plusieurs tables seront
 * en place. Pour KAN-2, on déclare uniquement `users` à la main.
 */
export type Database = {
  public: {
    Tables: {
      users: {
        Row: UserRow
        Insert: UserInsert
        Update: UserUpdate
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: Role
    }
    CompositeTypes: Record<string, never>
  }
}

export type UserRow = {
  id: string
  email: string
  roles: Role[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type UserInsert = {
  id: string
  email: string
  roles?: Role[]
  metadata?: Record<string, unknown>
}

export type UserUpdate = {
  email?: string
  roles?: Role[]
  metadata?: Record<string, unknown>
  deleted_at?: string | null
}
