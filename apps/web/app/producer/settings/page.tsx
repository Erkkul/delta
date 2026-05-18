import { producersRepo } from "@delta/db"
import { usersRepo } from "@delta/db/users"
import { redirect } from "next/navigation"

import { SettingsClient } from "./settings-client"

import { getServerSupabase } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Paramètres — Delta producteur",
}

/**
 * Page Paramètres producteur (KAN-17 — PR-09).
 *
 * MVP : seule la section « Boutique en pause » est câblée (KAN-17). Les
 * autres sections de la maquette PR-09 (changement email/mot de passe →
 * KAN-3, notifications → KAN-14, RGPD → backlog, multi-rôle → KAN-37 /
 * KAN-25) sont posées en placeholder « Bientôt » pour matérialiser la
 * future structure de page.
 */
export default async function ProducerSettingsPage() {
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
    <SettingsClient
      initialPaused={producer.paused}
      siretStatus={producer.siret_status}
      stripeStatus={producer.stripe_status}
      email={userRow.email}
    />
  )
}
