import { producersRepo } from "@delta/db"
import { usersRepo } from "@delta/db/users"
import { redirect } from "next/navigation"

import { ProfileClient } from "./profile-client"

import { getServerSupabase } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Profil public — Delta producteur",
}

/**
 * Page d'édition du profil public producteur (KAN-17 — PR-08).
 *
 * Server Component qui :
 *   1. Vérifie la session (redirige sur /login sinon)
 *   2. Vérifie le rôle `producteur` (redirige sur /onboarding/role sinon)
 *   3. Charge le snapshot courant
 *   4. Si le profil n'existe pas encore (pas passé par /onboarding/producteur)
 *      → redirige vers le wizard
 *   5. Passe le snapshot au client component
 */
export default async function ProducerProfilePage() {
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
  if (!producer) {
    redirect("/onboarding/producteur")
  }

  return (
    <ProfileClient
      initial={{
        id: producer.id,
        display_name: producer.display_name,
        public_description: producer.public_description,
        profile_photo_url: producer.profile_photo_url,
        farm_photos: producer.farm_photos ?? [],
        labels: producer.labels ?? [],
        pickup_public_zone: producer.pickup_public_zone,
        pickup_address: producer.pickup_address,
        pickup_days: producer.pickup_days ?? [],
        pickup_hours_start: producer.pickup_hours_start,
        pickup_hours_end: producer.pickup_hours_end,
        paused: producer.paused,
        paused_at: producer.paused_at,
        siret_status: producer.siret_status,
        stripe_status: producer.stripe_status,
        payouts_enabled: producer.payouts_enabled,
      }}
    />
  )
}
