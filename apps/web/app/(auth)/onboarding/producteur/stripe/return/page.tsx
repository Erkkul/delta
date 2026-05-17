import Link from "next/link"
import { redirect } from "next/navigation"

import { getServerSupabase } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Retour Stripe — Delta",
}

/**
 * Page de retour Stripe après onboarding hosted (KAN-16). Affichage neutre
 * — la vérité du statut Stripe arrive via le webhook `account.updated`
 * sur le endpoint Connect (cf. apps/web/app/api/v1/webhooks/stripe/route.ts).
 *
 * Au MVP : on n'attend pas activement (pas de Realtime client). On affiche
 * un message de confirmation et un CTA pour revenir au wizard, qui rendra
 * l'état à jour si le webhook est arrivé entre-temps.
 */
export default async function StripeReturnPage() {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return (
    <main className="grid min-h-screen place-items-center bg-cream-50 px-6">
      <div className="flex w-full max-w-md flex-col items-center gap-5 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-green-100 text-3xl">
          ✓
        </div>
        <h1 className="font-display text-3xl font-bold text-green-900">
          Configuration Stripe enregistrée
        </h1>
        <p className="text-sm leading-relaxed text-cream-700">
          Stripe vérifie maintenant vos informations (KYC light + IBAN). En
          général, c&apos;est terminé en quelques minutes — vous recevrez une
          notification dès que votre compte sera actif.
        </p>
        <Link
          href="/onboarding/producteur"
          className="rounded-pill bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700"
        >
          Retour à mon onboarding
        </Link>
      </div>
    </main>
  )
}
