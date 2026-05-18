import { producersRepo } from "@delta/db"
import { usersRepo } from "@delta/db/users"
import { redirect } from "next/navigation"

import { EmptyState } from "@/components/dashboard/empty-state"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { SectionCard } from "@/components/dashboard/section-card"
import { PausedBanner } from "@/components/producer/paused-banner"
import { SiretBanner } from "@/components/producer/siret-banner"
import { StripeOnboardingBanner } from "@/components/producer/stripe-onboarding-banner"
import { getServerSupabase } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Tableau de bord — Delta producteur",
}

/**
 * Page racine de l'espace producteur (KAN-18 — PR-03).
 *
 * Au MVP, l'écran est volontairement composé d'empty states : la plupart
 * des sources de données qu'il consomme (missions, products, payouts,
 * reviews) sont livrées par des tickets ultérieurs (KAN-20, KAN-10/11,
 * KAN-53). Chaque section se câblera ticket par ticket sur ses vraies
 * données. Le banner SIRET (et les bannières Stripe / pause) sont les
 * seules sections déjà câblées sur la donnée existante (KAN-16 / KAN-17).
 */
export default async function ProducerDashboardPage() {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // Les redirects auth sont déjà gérés par `layout.tsx`. Ici on relit
  // simplement la row producteur pour afficher les bannières.
  if (!user) redirect("/welcome")

  const userRow = await usersRepo.findById(supabase, user.id)
  const producer = await producersRepo.findByUserId(supabase, user.id)
  if (!producer) redirect("/onboarding/producteur")

  const greeting = pickGreeting(producer.display_name, userRow?.email)

  return (
    <div className="px-6 py-8 desktop:px-10 desktop:py-10">
      <div className="mx-auto max-w-[1100px]">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-green-900">
              {greeting}
            </h1>
            <p className="mt-1 text-sm text-cream-600">
              Bienvenue sur votre espace producteur.
            </p>
          </div>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Disponible bientôt"
            className="cursor-not-allowed rounded-pill bg-cream-200 px-4 py-2 text-sm font-semibold text-cream-500"
          >
            + Nouveau produit
          </button>
        </header>

        <SiretBanner
          status={producer.siret_status}
          rejectionReason={producer.siret_rejection_reason}
        />
        <StripeOnboardingBanner status={producer.stripe_status} />
        {producer.paused ? <PausedBanner /> : null}

        <div className="mb-6 grid grid-cols-2 gap-3 tablet:grid-cols-4">
          <KpiCard label="Revenus du mois" state="coming" />
          <KpiCard label="Commandes en cours" state="coming" />
          <KpiCard label="Produits actifs" state="coming" />
          <KpiCard label="Note moyenne" state="coming" />
        </div>

        <div className="grid grid-cols-1 gap-5 desktop:grid-cols-[1.6fr_1fr]">
          <div>
            <SectionCard title="Prochaines récupérations">
              <EmptyState
                icon="🚐"
                text="Aucune récupération à venir. Vos prochaines missions s'afficheront ici dès qu'un rameneur réserve un trajet."
              />
            </SectionCard>
            <SectionCard title="Ventes en cours">
              <EmptyState
                icon="💶"
                text="Aucune vente en cours. Le détail des paiements escrow s'affichera ici."
              />
            </SectionCard>
          </div>
          <div>
            <SectionCard title="Stock à surveiller">
              <EmptyState
                icon="📦"
                text="Aucun produit en alerte. Les ruptures et stocks faibles s'afficheront ici."
              />
            </SectionCard>
            <SectionCard title="Prochain virement Stripe">
              <EmptyState
                icon="🏦"
                text="Premier virement programmé après votre première livraison."
              />
            </SectionCard>
            <SectionCard title="Activité récente">
              <EmptyState
                icon="✨"
                text="Pas encore d'activité. Avis, wishlists et réservations apparaîtront ici."
              />
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Greeting du dashboard. La table `users` ne contient pas (encore) de
 * `first_name` — on utilise le nom commercial du producteur s'il a déjà
 * été renseigné, sinon la première partie de l'email, sinon un simple
 * « Bonjour ». Cette logique pourra être remplacée par `users.first_name`
 * dès que la colonne sera ajoutée.
 */
function pickGreeting(
  displayName: string | null,
  email: string | undefined,
): string {
  if (displayName && displayName.trim().length > 0) {
    return `Bonjour ${displayName.trim()}`
  }
  if (email && email.includes("@")) {
    const handle = email.split("@")[0]
    if (handle && handle.length > 0) return `Bonjour ${handle}`
  }
  return "Bonjour"
}
