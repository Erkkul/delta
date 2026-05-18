import { producersRepo } from "@delta/db"
import { usersRepo } from "@delta/db/users"
import { redirect } from "next/navigation"

import { SalesFilters } from "@/components/producer/sales/sales-filters"
import { SalesKpis } from "@/components/producer/sales/sales-kpis"
import { SalesTable } from "@/components/producer/sales/sales-table"
import { SalesTabs } from "@/components/producer/sales/sales-tabs"
import { StripePayoutsSection } from "@/components/producer/sales/stripe-payouts-section"
import { getServerSupabase } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Ventes & virements — Delta producteur",
}

/**
 * Historique des ventes et virements producteur (KAN-19 — PR-07).
 *
 * Page entièrement composée d'empty states au MVP : aucune des tables
 * qui l'alimentent n'existe encore (`missions`, `mission_buyers`,
 * `mission_events`, payouts Stripe non encore reçus). Le shell, les
 * sections et la navigation se câbleront incrémentalement quand
 * KAN-10 / KAN-11 / KAN-33-34 et KAN-36 arriveront.
 *
 * Le gating session + rôle est déjà géré par `producer/layout.tsx`
 * (KAN-18) — ici on relit simplement la row producteur pour mettre en
 * place les redirections d'onboarding manquant.
 */
export default async function ProducerSalesPage() {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/welcome")

  const userRow = await usersRepo.findById(supabase, user.id)
  if (!userRow?.roles?.includes("producteur")) redirect("/welcome")

  const producer = await producersRepo.findByUserId(supabase, user.id)
  if (!producer) redirect("/onboarding/producteur")

  return (
    <div className="px-6 py-8 desktop:px-10 desktop:py-10">
      <div className="mx-auto max-w-[1100px]">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-green-900">
              Historique &amp; virements
            </h1>
            <p className="mt-1 text-sm text-cream-600">
              Toutes vos ventes et les versements Stripe Connect.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Disponible bientôt"
              className="flex cursor-not-allowed items-center gap-1.5 rounded-pill border border-cream-300 bg-white px-3.5 py-2 text-sm font-medium text-cream-500"
            >
              <svg
                viewBox="0 0 24 24"
                width={14}
                height={14}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Disponible bientôt"
              className="flex cursor-not-allowed items-center gap-1.5 rounded-pill border border-cream-300 bg-white px-3.5 py-2 text-sm font-medium text-cream-500"
            >
              <svg
                viewBox="0 0 24 24"
                width={14}
                height={14}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Sélection période
            </button>
          </div>
        </header>

        <SalesKpis />
        <SalesTabs />
        <SalesFilters />
        <div className="mb-6">
          <SalesTable />
        </div>
        <StripePayoutsSection />
      </div>
    </div>
  )
}
