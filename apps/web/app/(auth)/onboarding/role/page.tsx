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

  return (
    <main
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse at 30% 0%, #E4F4E7 0%, #FAF7F2 60%)",
      }}
    >
      <div className="border-b border-cream-200 bg-cream-50/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5 tablet:px-8 desktop:px-12">
          <a
            href="/welcome"
            className="font-display text-xl font-semibold text-cream-950"
          >
            Delta
          </a>
          <div className="flex items-center gap-3 font-body text-sm text-cream-600">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-green-50 px-3 py-1 font-body text-xs font-bold uppercase tracking-[0.04em] text-green-800">
              <CheckBadgeIcon />
              Email vérifié
            </span>
            <span className="hidden tablet:inline">{user.email}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-12 tablet:px-8 desktop:px-12 desktop:py-16">
        <RoleClient />
      </div>
    </main>
  )
}

function CheckBadgeIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
