import { buyerProfilesRepo } from "@delta/db"
import { usersRepo } from "@delta/db/users"
import { redirect } from "next/navigation"

import { BuyerOnboardingClient } from "./acheteur-client"

import { getServerSupabase } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Onboarding acheteur — Delta",
}

/**
 * Page d'entrée de l'onboarding acheteur (KAN-25, écran AC-02 étape 1).
 * Server Component qui :
 *   1. Vérifie la session (redirige sur /login sinon)
 *   2. Vérifie le rôle `acheteur` (redirige sur /onboarding/role sinon)
 *   3. Charge la zone courante éventuelle pour pré-remplir le formulaire
 *   4. Passe au client component qui pilote l'état + la navigation
 */
export default async function BuyerOnboardingPage() {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const userRow = await usersRepo.findById(supabase, user.id)
  if (!userRow?.roles?.includes("acheteur")) {
    redirect("/onboarding/role")
  }

  const profile = await buyerProfilesRepo.findByUserId(supabase, user.id)

  return (
    <BuyerOnboardingClient
      initial={
        profile
          ? {
              display_name: profile.display_name,
              address_label: profile.address_label,
              city: profile.city,
              postcode: profile.postcode,
              has_location: false,
            }
          : null
      }
    />
  )
}
