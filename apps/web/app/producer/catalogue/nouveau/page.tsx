import { producersRepo } from "@delta/db"
import Link from "next/link"
import { redirect } from "next/navigation"

import { NouveauProductClient } from "./nouveau-client"

import { getServerSupabase } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Nouveau produit — Delta producteur",
}

/**
 * Page de création d'un nouveau produit (KAN-20 — PR-05, mode `new`).
 *
 * Le layout parent garantit qu'on a une session producteur + une row
 * `producers` existante.
 */
export default async function NouveauProductPage() {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/welcome")

  const producer = await producersRepo.findByUserId(supabase, user.id)
  if (!producer) {
    redirect("/onboarding/producteur")
  }

  return (
    <div className="px-6 py-8 desktop:px-10 desktop:py-10">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-3 flex items-center gap-2 text-sm text-cream-500">
          <Link
            href="/producer/catalogue"
            className="text-cream-600 transition-colors hover:text-green-700"
          >
            Catalogue
          </Link>
          <svg
            width={12}
            height={12}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="text-cream-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span className="font-medium text-cream-800">Nouveau produit</span>
        </div>

        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.10em] text-cream-500">
          PR-05 · Espace producteur
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-green-900">
          Nouveau produit
        </h1>
        <p className="mt-1 text-sm text-cream-600">
          Renseignez les informations principales — vous pourrez compléter
          les photos et l&apos;alerte stock plus tard.
        </p>

        <div className="mt-6">
          <NouveauProductClient
            producerName={producer.display_name ?? "Mon catalogue"}
            producerCity={producer.pickup_public_zone}
          />
        </div>
      </div>
    </div>
  )
}
