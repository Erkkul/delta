import {
  type BuyerProfile,
  type BuyerProfileAdapter,
  type BuyerProfilePatch,
  type BuyerRoleChecker,
  type GeocodeAdapter,
} from "@delta/core/buyer-profile"
import { buyerProfilesRepo, type BuyerProfileRow } from "@delta/db"
import { type Database } from "@delta/db/types"
import { usersRepo } from "@delta/db/users"
import { type SupabaseClient } from "@supabase/supabase-js"

import { geocodeAddress as geocodeAdresseGouv } from "@/lib/geocoding/adresse-gouv"

type Client = SupabaseClient<Database>

/**
 * Mappe une `BuyerProfileRow` (forme DB, sans la geography) vers la forme
 * métier `BuyerProfile`. `hasLocation` est calculé séparément (la geography
 * n'est jamais projetée — cf. repo).
 */
function toBuyerProfile(row: BuyerProfileRow, hasLocation: boolean): BuyerProfile {
  return {
    user_id: row.user_id,
    display_name: row.display_name,
    address_label: row.address_label,
    city: row.city,
    postcode: row.postcode,
    has_location: hasLocation,
  }
}

/**
 * Présence d'une zone géocodée pour le caller. Requête légère dédiée car la
 * colonne `location` (geography) n'est pas projetée par le repo. Le filtre
 * `not("location", "is", null)` renvoie la row uniquement si la position est
 * posée.
 */
async function hasLocation(client: Client, userId: string): Promise<boolean> {
  const { data, error } = await client
    .from("buyer_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .not("location", "is", null)
    .maybeSingle()
  if (error) throw error
  return data !== null
}

/**
 * Implémentation de `BuyerProfileAdapter` pour les route handlers user-facing
 * (RLS appliquée). Le caller fournit le client utilisateur pour que toutes
 * les opérations soient gated par `auth.uid() = user_id`.
 */
export function getBuyerProfileAdapter(client: Client): BuyerProfileAdapter {
  return {
    async findByUserId(userId) {
      const row = await buyerProfilesRepo.findByUserId(client, userId)
      if (!row) return null
      return toBuyerProfile(row, await hasLocation(client, userId))
    },

    async upsert(userId, patch: BuyerProfilePatch) {
      const existing = await buyerProfilesRepo.findByUserId(client, userId)
      const row = existing
        ? await buyerProfilesRepo.update(client, userId, patch)
        : await buyerProfilesRepo.create(client, userId, patch)
      // has_location recalculé après coup par le use case (setLocation suit).
      return toBuyerProfile(row, false)
    },

    async setLocation(longitude, latitude) {
      await buyerProfilesRepo.setLocationViaRpc(client, longitude, latitude)
    },
  }
}

/**
 * Implémentation de `GeocodeAdapter` — wrapper sur l'API Adresse Gouv.fr
 * (publique, sans clé). Réutilise le helper partagé du module geocoding.
 */
export function getGeocodeAdapter(): GeocodeAdapter {
  return {
    async geocodeAddress(address) {
      return geocodeAdresseGouv(address)
    },
  }
}

/**
 * Implémentation de `BuyerRoleChecker` — lit `users.roles` via le repo
 * `users` (RLS : le user lit toujours sa propre row).
 */
export function getBuyerRoleChecker(client: Client): BuyerRoleChecker {
  return {
    async hasBuyerRole(userId) {
      const row = await usersRepo.findById(client, userId)
      return row?.roles?.includes("acheteur") ?? false
    },
  }
}
