import { redirect } from "next/navigation"

import { getServerSupabase } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Reprendre Stripe — Delta",
}

/**
 * URL de refresh Stripe si l'Account Link a expiré (KAN-16). Stripe redirige
 * ici quand l'utilisateur clique sur le lien après les ≤ 5 min d'expiration.
 *
 * Comportement : on régénère un nouvel Account Link en repassant par
 * l'endpoint /stripe-link, puis on redirige vers l'URL fraîche. Si l'appel
 * échoue, on retourne au wizard où l'utilisateur peut re-cliquer.
 */
export default async function StripeRefreshPage() {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // On ne peut pas appeler l'endpoint en RSC (pas de session cookie côté
  // fetch). On redirige vers /onboarding/producteur, l'utilisateur re-clique.
  redirect("/onboarding/producteur")
}
