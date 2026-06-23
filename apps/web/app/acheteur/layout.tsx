import { navigation } from "@delta/core"
import { buyerProfilesRepo } from "@delta/db"
import { usersRepo } from "@delta/db/users"
import { redirect } from "next/navigation"

import {
  BuyerBottomNav,
  BuyerHeader,
} from "@/components/buyer/shell/buyer-chrome"
import { getServerSupabase } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * Layout commun à toutes les pages `/acheteur/*` (KAN-28 — shell acheteur).
 *
 * Pose le shell différé par KAN-25 (profil) et KAN-27 (historique) : il
 * rétro-wrappe ces pages autonomes. Gating centralisé ici :
 *   1. Session présente → sinon redirect `/login`
 *   2. Rôle `acheteur` dans `users.roles` → sinon redirect vers l'espace
 *      correspondant via `getRoleHomePath`
 *
 * Header desktop + bottom-nav mobile (fidèle aux maquettes ac-03/ac-04).
 */
export default async function BuyerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const userRow = await usersRepo.findById(supabase, user.id)
  const roles = userRow?.roles ?? []
  if (!roles.includes("acheteur")) {
    redirect(navigation.getRoleHomePath(roles))
  }

  const profile = await buyerProfilesRepo.findByUserId(supabase, user.id)
  const displayName = profile?.display_name ?? userRow?.email ?? ""
  const initial = (displayName.trim()[0] ?? "M").toUpperCase()

  return (
    <div className="min-h-screen bg-cream-50 pb-20 md:pb-0">
      <BuyerHeader initial={initial} />
      {children}
      <BuyerBottomNav />
    </div>
  )
}
