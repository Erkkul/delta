import { producersRepo } from "@delta/db"
import { usersRepo } from "@delta/db/users"
import { redirect } from "next/navigation"

import { ProducerOnboardingClient } from "./producteur-client"

import { getServerSupabase } from "@/lib/supabase/server"


export const dynamic = "force-dynamic"

export const metadata = {
  title: "Onboarding producteur — Delta",
}

/**
 * Page d'entrée du wizard producteur (KAN-16 + KAN-17). Server Component qui :
 *   1. Vérifie la session (redirige sur /signup sinon)
 *   2. Vérifie le rôle `producteur` (redirige sur /onboarding/role sinon)
 *   3. Charge l'état courant du producer (profil, SIRET status, Stripe status)
 *      pour déterminer l'étape de départ du wizard
 *   4. Passe au client component qui pilote l'état du formulaire
 *
 * Détermination de la phase initiale :
 *   - `display_name` vide        → étape 1 (profil ferme, KAN-17)
 *   - SIRET non soumis           → étape 2 (KAN-16)
 *   - Stripe en cours / suite    → étape 3 (KAN-16)
 *   - payouts_enabled            → done
 */
export default async function ProducerOnboardingPage() {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const userRow = await usersRepo.findById(supabase, user.id)
  if (!userRow?.roles?.includes("producteur")) {
    redirect("/onboarding/role")
  }

  const producer = await producersRepo.findByUserId(supabase, user.id)

  return (
    <ProducerOnboardingClient
      initialState={{
        display_name: producer?.display_name ?? null,
        public_description: producer?.public_description ?? null,
        profile_photo_url: producer?.profile_photo_url ?? null,
        farm_photos: producer?.farm_photos ?? [],
        labels: producer?.labels ?? [],
        pickup_public_zone: producer?.pickup_public_zone ?? null,
        pickup_address: producer?.pickup_address ?? null,
        pickup_days: producer?.pickup_days ?? [],
        pickup_hours_start: producer?.pickup_hours_start ?? null,
        pickup_hours_end: producer?.pickup_hours_end ?? null,
        paused: producer?.paused ?? false,
        paused_at: producer?.paused_at ?? null,
        siret_status: producer?.siret_status ?? "not_submitted",
        stripe_status: producer?.stripe_status ?? "not_created",
        payouts_enabled: producer?.payouts_enabled ?? false,
        siret_rejection_reason: producer?.siret_rejection_reason ?? null,
        stripe_account_id: producer?.stripe_account_id ?? null,
        requirements_currently_due: producer?.requirements_currently_due ?? [],
      }}
    />
  )
}
