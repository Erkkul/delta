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
      products: {
        Row: ProductRow
        Insert: ProductInsert
        Update: ProductUpdate
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      reveal_pickup_address: {
        Args: { producer_id: string }
        Returns: string | null
      }
      set_pickup_location: {
        Args: { p_longitude: number | null; p_latitude: number | null }
        Returns: undefined
      }
    }
    Enums: {
      user_role: Role
      producer_siret_status: ProducerSiretStatus
      producer_stripe_status: ProducerStripeStatus
      producer_label: ProducerLabel
      weekday: Weekday
      product_category: ProductCategory
      product_packaging: ProductPackaging
      product_status: ProductStatus
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

// ─── Producers — extension profil & ferme (KAN-17) ───────────────────────

export type ProducerLabel =
  | "bio_ab"
  | "demeter"
  | "nature_et_progres"
  | "hve_3"
  | "producteur_fermier"

export type Weekday =
  | "mon"
  | "tue"
  | "wed"
  | "thu"
  | "fri"
  | "sat"
  | "sun"

export type FarmPhoto = {
  url: string
  alt?: string
}

export type ProducerRow = {
  id: string
  user_id: string
  // KAN-16 : SIRET
  siret: string | null
  legal_name: string | null
  legal_form: string | null
  naf_code: string | null
  siret_status: ProducerSiretStatus
  siret_verified_at: string | null
  siret_rejection_reason: string | null
  // KAN-16 : Stripe
  stripe_account_id: string | null
  stripe_status: ProducerStripeStatus
  payouts_enabled: boolean
  charges_enabled: boolean
  requirements_currently_due: string[]
  // KAN-17 : profil public
  display_name: string | null
  public_description: string | null
  profile_photo_url: string | null
  farm_photos: FarmPhoto[]
  labels: ProducerLabel[]
  // KAN-17 : adresse de récupération
  pickup_public_zone: string | null
  pickup_address: string | null
  // Note : pickup_location (geography) n'est pas exposée côté TS — toutes
  // les lectures passent par RPC. Le champ existe en DB pour le matching futur.
  pickup_days: Weekday[]
  pickup_hours_start: string | null
  pickup_hours_end: string | null
  // KAN-17 : exploitation
  paused: boolean
  paused_at: string | null
  // Conventions user-data
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
  display_name?: string | null
  public_description?: string | null
  profile_photo_url?: string | null
  farm_photos?: FarmPhoto[]
  labels?: ProducerLabel[]
  pickup_public_zone?: string | null
  pickup_address?: string | null
  pickup_days?: Weekday[]
  pickup_hours_start?: string | null
  pickup_hours_end?: string | null
  paused?: boolean
  paused_at?: string | null
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
  display_name?: string | null
  public_description?: string | null
  profile_photo_url?: string | null
  farm_photos?: FarmPhoto[]
  labels?: ProducerLabel[]
  pickup_public_zone?: string | null
  pickup_address?: string | null
  // pickup_location écrit via RPC distincte (cf. core), pas en update direct
  pickup_days?: Weekday[]
  pickup_hours_start?: string | null
  pickup_hours_end?: string | null
  paused?: boolean
  paused_at?: string | null
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

// ─── Products (KAN-20) ───────────────────────────────────────────────────

export type ProductCategory =
  | "miel_et_ruche"
  | "fruits"
  | "legumes"
  | "cereales_legumineuses"
  | "conserves_confitures"
  | "pain_biscuits"
  | "huiles"
  | "boissons_non_alcoolisees"

export type ProductPackaging =
  | "pot_250g"
  | "pot_500g"
  | "pot_1kg"
  | "bouteille_50cl"
  | "bouteille_75cl"
  | "sachet_500g"
  | "carton_6"
  | "au_kilo"

export type ProductStatus = "active" | "draft" | "disabled"

/**
 * Photo produit (KAN-21). `path` est le chemin canonique dans le bucket
 * `product-photos` (`{user_id}/{product_id}/<random8>.<ext>`) — stocké en plus
 * de `url` pour éviter le reparsing fragile de l'URL au DELETE Storage.
 */
export type ProductPhoto = {
  url: string
  path: string
  alt?: string
}

export type ProductRow = {
  id: string
  producer_user_id: string
  name: string
  description: string | null
  category: ProductCategory
  packaging: ProductPackaging
  unit_price_cents: number
  stock: number
  low_stock_threshold: number | null
  availability_from: string | null
  availability_to: string | null
  status: ProductStatus
  // text[] au MVP de KAN-20 — swap vers product_label[] par KAN-24.
  labels: string[]
  photos: ProductPhoto[]
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type ProductInsert = {
  producer_user_id: string
  name: string
  description?: string | null
  category: ProductCategory
  packaging: ProductPackaging
  unit_price_cents: number
  stock?: number
  low_stock_threshold?: number | null
  availability_from?: string | null
  availability_to?: string | null
  status?: ProductStatus
  labels?: string[]
  photos?: ProductPhoto[]
}

export type ProductUpdate = {
  name?: string
  description?: string | null
  category?: ProductCategory
  packaging?: ProductPackaging
  unit_price_cents?: number
  stock?: number
  low_stock_threshold?: number | null
  availability_from?: string | null
  availability_to?: string | null
  status?: ProductStatus
  labels?: string[]
  photos?: ProductPhoto[]
  deleted_at?: string | null
}
