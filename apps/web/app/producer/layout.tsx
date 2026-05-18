import { navigation } from "@delta/core"
import { producersRepo } from "@delta/db"
import { usersRepo } from "@delta/db/users"
import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/app/app-sidebar"
import { MobileTopbar } from "@/components/app/mobile-topbar"
import { PRODUCER_SIDEBAR } from "@/lib/navigation/producer-nav"
import { getServerSupabase } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * Layout commun à toutes les pages `/producer/*` (KAN-18).
 *
 * Vérifications successives :
 *   1. Session présente → sinon redirect `/welcome`
 *   2. Rôle `producteur` dans `users.roles` → sinon redirect vers
 *      l'espace correspondant via `getRoleHomePath` (au MVP, les
 *      routes acheteur / rameneur n'existent pas — un 404 Next est
 *      acceptable et symboliquement correct, le pattern est posé)
 *   3. Row `producers` existante → sinon redirect `/onboarding/producteur`
 *
 * La row `users` et la row `producers` sont chargées une seule fois ici
 * et déjà disponibles via React `cache()` pour les pages enfants qui
 * appellent les mêmes repos (cf. note dans design.md §Risques).
 */
export default async function ProducerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/welcome")

  const userRow = await usersRepo.findById(supabase, user.id)
  const roles = userRow?.roles ?? []
  if (!roles.includes("producteur")) {
    redirect(navigation.getRoleHomePath(roles))
  }

  const producer = await producersRepo.findByUserId(supabase, user.id)
  if (!producer) {
    redirect("/onboarding/producteur")
  }

  const sidebarUser = {
    email: userRow?.email ?? user.email ?? "",
    displayName: producer.display_name,
    statusLabel: pickSidebarStatusLabel(producer),
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <MobileTopbar config={PRODUCER_SIDEBAR} user={sidebarUser} />
      <div className="flex">
        <AppSidebar config={PRODUCER_SIDEBAR} user={sidebarUser} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}

function pickSidebarStatusLabel(producer: {
  siret_status: "not_submitted" | "pending" | "verified" | "rejected"
  paused: boolean
}): string {
  if (producer.paused) return "Boutique en pause"
  switch (producer.siret_status) {
    case "verified":
      return "SIRET vérifié"
    case "pending":
      return "SIRET en vérification"
    case "rejected":
      return "SIRET à corriger"
    case "not_submitted":
      return "Onboarding à finaliser"
  }
}
