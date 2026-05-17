import { type Role } from "@delta/contracts/auth"

/**
 * Schéma de la base Delta tel que vu par `@supabase/supabase-js`.
 *
 * Cible : régénérer ce fichier via `supabase gen types typescript --project-id
 * knyfrnxkqyyirnsyijfk --schema public` une fois que plusieurs tables seront
 * en place. Pour KAN-2 + KAN-16, on déclare les tables à la main.
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
      producers: {
        Row: ProducerRow
        Insert: ProducerInsert
        Update: ProducerUpdate
        Relationships: []
      }
      stripe_webhook_events: {
        Row: StripeWebhookEventRow
        Insert: StripeWebhookEventInsert
        Update: never
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: Role
      producer_siret_status: ProducerSiretStatus
      producer_stripe_status: ProducerStripeStatus
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

// ─── Producers (KAN-16) ──────────────────────────────────────────────────

export type ProducerSiretStatus =
  | "not_submitted"
  | "pending"
  | "verified"
  | "rejected"

export type ProducerStripeStatus =
  | "not_created"
  | "pending"
  | "active"
  | "restricted"
  | "disabled"

export type ProducerRow = {
  id: string
  user_id: string
  siret: string | null
  legal_name: string | null
  legal_form: string | null
  naf_code: string | null
  siret_status: ProducerSiretStatus
  siret_verified_at: string | null
  siret_rejection_reason: string | null
  stripe_account_id: string | null
  stripe_status: ProducerStripeStatus
  payouts_enabled: boolean
  charges_enabled: boolean
  requirements_currently_due: string[]
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type ProducerInsert = {
  user_id: string
  siret?: string | null
  legal_name?: string | null
  legal_form?: string | null
  naf_code?: string | null
  siret_status?: ProducerSiretStatus
  siret_verified_at?: string | null
  siret_rejection_reason?: string | null
  stripe_account_id?: string | null
  stripe_status?: ProducerStripeStatus
  payouts_enabled?: boolean
  charges_enabled?: boolean
  requirements_currently_due?: string[]
}

export type ProducerUpdate = {
  siret?: string | null
  legal_name?: string | null
  legal_form?: string | null
  naf_code?: string | null
  siret_status?: ProducerSiretStatus
  siret_verified_at?: string | null
  siret_rejection_reason?: string | null
  stripe_account_id?: string | null
  stripe_status?: ProducerStripeStatus
  payouts_enabled?: boolean
  charges_enabled?: boolean
  requirements_currently_due?: string[]
  deleted_at?: string | null
}

// ─── Stripe webhook events (KAN-16) ──────────────────────────────────────

export type StripeWebhookEventRow = {
  event_id: string
  event_type: string
  payload: Record<string, unknown>
  received_at: string
}

export type StripeWebhookEventInsert = {
  event_id: string
  event_type: string
  payload: Record<string, unknown>
}
