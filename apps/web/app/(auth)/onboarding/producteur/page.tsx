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
 * Page d'entrée du wizard producteur (KAN-16). Server Component qui :
 *   1. Vérifie la session (redirige sur /signup sinon)
 *   2. Vérifie le rôle `producteur` (redirige sur /onboarding/role sinon)
 *   3. Charge l'état courant du producer (SIRET status, Stripe status)
 *      pour déterminer l'étape de départ du wizard
 *   4. Passe au client component qui pilote l'état du formulaire
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
        siret_status: producer?.siret_status ?? "not_submitted",
        stripe_status: producer?.stripe_status ?? "not_created",
        payouts_enabled: producer?.payouts_enabled ?? false,
        siret_rejection_reason: producer?.siret_rejection_reason ?? null,
      }}
    />
  )
}
