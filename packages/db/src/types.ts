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
      buyer_profiles: {
        Row: BuyerProfileRow
        Insert: BuyerProfileInsert
        Update: BuyerProfileUpdate
        Relationships: []
      }
      wishlist_items: {
        Row: WishlistItemRow
        Insert: WishlistItemInsert
        Update: WishlistItemUpdate
        Relationships: []
      }
      trips: {
        Row: TripRow
        Insert: TripInsert
        Update: TripUpdate
        Relationships: []
      }
      missions: {
        Row: MissionRow
        Insert: MissionInsert
        Update: MissionUpdate
        Relationships: []
      }
      mission_buyers: {
        Row: MissionBuyerRow
        Insert: MissionBuyerInsert
        Update: MissionBuyerUpdate
        Relationships: []
      }
      notifications: {
        Row: NotificationRow
        Insert: NotificationInsert
        Update: NotificationUpdate
        Relationships: []
      }
    }
    Views: {
      catalogue_products: {
        Row: CatalogueProductRow
        Relationships: []
      }
      mission_match_details: {
        Row: MissionMatchDetailViewRow
        Relationships: []
      }
    }
    Functions: {
      reveal_pickup_address: {
        Args: { producer_id: string }
        Returns: string | null
      }
      set_pickup_location: {
        Args: { p_longitude: number | null; p_latitude: number | null }
        Returns: undefined
      }
      set_buyer_location: {
        Args: { p_longitude: number | null; p_latitude: number | null }
        Returns: undefined
      }
      /**
       * KAN-31 — confirmation atomique d'un match (transition
       * `mission_buyers.status` → `accepted` + décrément stock produit).
       * SECURITY DEFINER, cf. migration 20260911120000_create_missions.sql.
       */
      confirm_mission_match: {
        Args: { p_mission_buyer_id: string }
        Returns: MissionBuyerRow
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
      product_label: ProductLabel
      trip_capacity: TripCapacity
      trip_status: TripStatus
      mission_status: MissionStatus
      mission_buyer_status: MissionBuyerStatus
      notification_channel: NotificationChannel
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

export type ProductLabel =
  | "bio_ab"
  | "demeter"
  | "nature_et_progres"
  | "label_rouge"
  | "hve_3"
  | "producteur_fermier"

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
  labels: ProductLabel[]
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
  labels?: ProductLabel[]
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
  labels?: ProductLabel[]
  photos?: ProductPhoto[]
  deleted_at?: string | null
}

// ─── Catalogue public (KAN-28) ───────────────────────────────────────────
// Row de la vue `public.catalogue_products` (projection publique curée :
// produit + producteur public). Voir migration 20260623180000. La colonne
// `search_vector` (tsvector) existe sur la vue pour le FTS server-side
// (`.textSearch`) mais n'est jamais projetée dans les SELECT applicatifs —
// donc absente de la Row.
export type CatalogueProductRow = {
  id: string
  producer_user_id: string
  name: string
  description: string | null
  category: ProductCategory
  packaging: ProductPackaging
  unit_price_cents: number
  labels: ProductLabel[]
  photos: ProductPhoto[]
  created_at: string
  producer_display_name: string
  producer_zone: string | null
}

// ─── Buyer profiles (KAN-25) ─────────────────────────────────────────────
// La colonne `location` (geography Point) n'est jamais lue/écrite via
// supabase-js en direct : écriture via la RPC set_buyer_location, et elle
// n'est pas projetée dans les SELECT applicatifs (donc absente de la Row).

export type BuyerProfileRow = {
  user_id: string
  display_name: string | null
  address_label: string | null
  city: string | null
  postcode: string | null
  // Sous-ensemble de product_category déclaré comme centres d'intérêt (KAN-26).
  preferred_categories: ProductCategory[]
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type BuyerProfileInsert = {
  user_id: string
  display_name?: string | null
  address_label?: string | null
  city?: string | null
  postcode?: string | null
  preferred_categories?: ProductCategory[]
  deleted_at?: string | null
}

export type BuyerProfileUpdate = {
  display_name?: string | null
  address_label?: string | null
  city?: string | null
  postcode?: string | null
  preferred_categories?: ProductCategory[]
  deleted_at?: string | null
}

// ─── Wishlist items (KAN-30) ─────────────────────────────────────────────
// Wishlist privée acheteur (« Mes envies », AC-06). Une row = un produit
// précis souhaité. RLS self-only (aucune lecture cross-user). Aucun statut ni
// prix stocké (dérivé par le matching KAN-42 / appliqué au match KAN-31). Le
// retrait est un soft delete (deleted_at). Voir migration 20260911100000.

export type WishlistItemRow = {
  id: string
  user_id: string
  product_id: string
  created_at: string
  deleted_at: string | null
}

export type WishlistItemInsert = {
  user_id: string
  product_id: string
}

export type WishlistItemUpdate = {
  deleted_at?: string | null
}

// ─── Trips / Missions / Mission buyers / Notifications (KAN-31) ─────────
// Socle DB minimal posé par KAN-31 (ticket sans lien Jira actif — projet
// KAN supprimé le 2026-09-11). Voir migration 20260911120000 pour le détail
// des colonnes, contraintes et RLS. `trips` n'a pas de géométrie PostGIS
// (déférée à la feature de déclaration de trajet réelle) ; `missions` n'a
// pas de state machine mission-level câblée (décision produit du seuil de
// confirmation non tranchée) — cf. specs/KAN-31/design.md.

export type TripCapacity = "sac" | "coffre" | "break"
export type TripStatus = "active" | "completed" | "cancelled"

export type TripRow = {
  id: string
  rameneur_user_id: string
  rameneur_display_name: string | null
  origin_label: string
  destination_label: string
  depart_date: string
  return_date: string | null
  capacity: TripCapacity
  status: TripStatus
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type TripInsert = {
  rameneur_user_id: string
  rameneur_display_name?: string | null
  origin_label: string
  destination_label: string
  depart_date: string
  return_date?: string | null
  capacity: TripCapacity
  status?: TripStatus
}

export type TripUpdate = {
  status?: TripStatus
  deleted_at?: string | null
}

/** Cf. ARCHITECTURE.md §6.1 pour le graphe complet de la state machine mission. */
export type MissionStatus =
  | "draft"
  | "reserved"
  | "awaiting_buyers"
  | "confirmed"
  | "picked_up"
  | "delivered"
  | "closed"
  | "cancelled_no_buyer"
  | "cancelled_no_stock"
  | "cancelled_rameneur_dropout"

export type MissionRow = {
  id: string
  trip_id: string
  producer_user_id: string
  status: MissionStatus
  reserved_at: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type MissionInsert = {
  trip_id: string
  producer_user_id: string
  status: MissionStatus
  reserved_at?: string
}

export type MissionUpdate = {
  status?: MissionStatus
  deleted_at?: string | null
}

export type MissionBuyerStatus = "pending" | "accepted" | "declined" | "expired"

export type MissionBuyerRow = {
  id: string
  mission_id: string
  buyer_id: string
  product_id: string
  quantity: number
  unit_price_cents: number
  status: MissionBuyerStatus
  confirmation_deadline: string
  responded_at: string | null
  created_at: string
  updated_at: string
}

export type MissionBuyerInsert = {
  mission_id: string
  buyer_id: string
  product_id: string
  quantity?: number
  unit_price_cents: number
  status?: MissionBuyerStatus
  confirmation_deadline?: string
}

export type MissionBuyerUpdate = {
  status?: MissionBuyerStatus
  responded_at?: string | null
}

export type NotificationChannel = "in_app" | "email" | "push"

export type NotificationRow = {
  id: string
  user_id: string
  type: string
  channel: NotificationChannel
  payload: Record<string, unknown>
  idempotency_key: string
  read_at: string | null
  created_at: string
}

export type NotificationInsert = {
  user_id: string
  type: string
  channel?: NotificationChannel
  payload?: Record<string, unknown>
  idempotency_key: string
}

export type NotificationUpdate = {
  read_at?: string | null
}

/**
 * Vue `mission_match_details` (KAN-31, migration 20260911120000). Lecture
 * composée mission_buyers × products × missions × trips × producers,
 * `security_invoker = off` avec prédicat `buyer_id = auth.uid()` embarqué
 * (cf. commentaire de la vue en migration).
 */
export type MissionMatchDetailViewRow = {
  id: string
  buyer_id: string
  status: MissionBuyerStatus
  confirmation_deadline: string
  responded_at: string | null
  quantity: number
  unit_price_cents: number
  product_id: string
  product_name: string
  producer_user_id: string
  producer_display_name: string | null
  producer_zone: string | null
  rameneur_user_id: string
  rameneur_display_name: string | null
  origin_label: string
  destination_label: string
  depart_date: string
}
