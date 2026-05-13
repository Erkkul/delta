import { redirect } from "next/navigation"

import { RoleClient } from "./role-client"

import { getServerSupabase } from "@/lib/supabase/server"

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
