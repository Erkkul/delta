/**
 * Adapters typés pour les use cases buyer-profile (KAN-25). Définissent la
 * surface d'I/O nécessaire ; implémentés côté `apps/web/lib/buyer/`. Le core
 * reste pur (cf. ARCHITECTURE.md §4.1). Réutilise `GeocodeAdapter` du module
 * producer (même API Adresse Gouv.fr).
 */

export type { GeocodeAdapter, GeocodeResult } from "../producer/adapters"

/**
 * Forme métier du profil acheteur partagée entre core et adapters.
 * Doublonne volontairement `BuyerProfileRow` de `@delta/db`. `has_location`
 * indique si une zone géocodée est posée (la geography brute ne traverse
 * jamais le core).
 */
export type BuyerProfile = {
  user_id: string
  display_name: string | null
  address_label: string | null
  city: string | null
  postcode: string | null
  has_location: boolean
}

/** Patch des champs non-géo. La `location` passe par `setLocation`. */
export type BuyerProfilePatch = {
  display_name?: string | null
  address_label?: string | null
  city?: string | null
  postcode?: string | null
}

export type BuyerProfileAdapter = {
  findByUserId(userId: string): Promise<BuyerProfile | null>
  /**
   * Upsert idempotent des champs non-géo : crée la row si absente, sinon
   * met à jour. Retourne la row à jour.
   */
  upsert(userId: string, patch: BuyerProfilePatch): Promise<BuyerProfile>
  /**
   * Met à jour la colonne PostGIS `location` via RPC dédiée. Les deux args
   * nuls réinitialisent la position.
   */
  setLocation(longitude: number | null, latitude: number | null): Promise<void>
}

export type BuyerRoleChecker = {
  /** Indique si le user a le rôle `acheteur` dans `users.roles`. */
  hasBuyerRole(userId: string): Promise<boolean>
}
