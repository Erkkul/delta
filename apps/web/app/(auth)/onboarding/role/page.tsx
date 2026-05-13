import { redirect } from "next/navigation"

import { RoleClient } from "./role-client"

import { getServerSupabase } from "@/lib/supabase/server"

// Page dépendante de la session utilisateur → pas de pré-rendu statique
// (sinon Next exécute `getServerSupabase()` au build, où les env vars
// Supabase ne sont pas disponibles côté CI GitHub Actions).
export const dynamic = "force-dynamic"

export const metadata = {
  title: "Choix de rôle — Delta",
  description: "Choisissez un ou plusieurs rôles pour démarrer sur Delta.",
}

export default async function OnboardingRolePage() {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/signup")
  }

  return <RoleClient />
}
