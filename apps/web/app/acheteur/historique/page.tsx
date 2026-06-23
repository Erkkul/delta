import { usersRepo } from "@delta/db/users"
import { redirect } from "next/navigation"

import { HistoryFilters } from "@/components/buyer/history/history-filters"
import { HistoryList } from "@/components/buyer/history/history-list"
import { HistoryStats } from "@/components/buyer/history/history-stats"
import { getServerSupabase } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Historique — Delta",
}

/**
 * Historique des commandes acheteur (KAN-27 — AC-09).
 *
 * Page entièrement composée d'empty states au MVP : aucune des tables
 * qui l'alimentent n'existe encore (`missions`, `mission_buyers`,
 * paiements, `trips`). Le shell, les stats et les filtres se câbleront
 * incrémentalement quand KAN-10 / KAN-11 / KAN-33-34 et KAN-36
 * arriveront.
 *
 * Page autonome au MVP, comme `/acheteur/profil` (KAN-25) : l'espace
 * acheteur complet (layout, nav globale, accueil AC-03) relève de
 * KAN-28. Server Component qui vérifie session + rôle `acheteur`.
 */
export default async function BuyerHistoryPage() {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const userRow = await usersRepo.findById(supabase, user.id)
  if (!userRow?.roles?.includes("acheteur")) {
    redirect("/onboarding/role")
  }

  return (
    <main className="min-h-screen bg-cream-50 px-6 py-10">
      <div className="mx-auto w-full max-w-[1000px]">
        <header className="mb-6 flex flex-col gap-1">
          <h1 className="font-display text-3xl font-bold tracking-tight text-green-900">
            Historique
          </h1>
          <p className="font-body text-sm text-cream-600">
            Toutes vos commandes livrées · factures téléchargeables.
          </p>
        </header>

        <HistoryStats />
        <HistoryFilters />
        <HistoryList />
      </div>
    </main>
  )
}
