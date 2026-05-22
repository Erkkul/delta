import { buyerProfilesRepo } from "@delta/db"
import { usersRepo } from "@delta/db/users"
import Link from "next/link"
import { redirect } from "next/navigation"

import { BuyerZoneForm } from "@/components/buyer/buyer-zone-form"
import { getServerSupabase } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Ma zone — Delta",
}

/**
 * Paramètres acheteur — édition de la zone d'habitation (KAN-25 / KAN-82,
 * écran AC-11 section « Adresses de livraison »).
 *
 * Page autonome au MVP : l'espace acheteur complet (layout, nav, accueil
 * AC-03) relève de KAN-28. Cf. specs/KAN-25/notes.md.
 *
 * Server Component qui vérifie session + rôle `acheteur`, charge la zone
 * courante et la passe au formulaire partagé en mode édition.
 */
export default async function BuyerZoneSettingsPage() {
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
    <main className="min-h-screen bg-cream-50 px-6 py-10">
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="font-body text-xs font-bold uppercase tracking-[0.04em] text-cream-600">
            Paramètres
          </p>
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-green-900">
            Ma zone d&apos;habitation
          </h1>
          <p className="font-body text-md leading-relaxed text-cream-700">
            Cette adresse détermine les produits que des rameneurs peuvent vous
            livrer. Vous pouvez la modifier à tout moment.
          </p>
        </header>

        <section className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
          <BuyerZoneForm
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
            mode="edit"
          />
        </section>

        <Link
          href="/welcome"
          className="font-body text-sm text-cream-600 hover:text-cream-950"
        >
          ← Retour
        </Link>
      </div>
    </main>
  )
}
