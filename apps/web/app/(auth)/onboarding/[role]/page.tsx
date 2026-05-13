import { Role } from "@delta/contracts/auth"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { getServerSupabase } from "@/lib/supabase/server"

// Page dépendante de la session utilisateur → pas de pré-rendu statique
// (cf. /onboarding/role/page.tsx).
export const dynamic = "force-dynamic"

type Params = Promise<{ role: string }>

const ROLE_LABELS: Record<Role, string> = {
  acheteur: "Acheteur",
  rameneur: "Rameneur",
  producteur: "Producteur",
}

// Tickets Jira qui livreront l'onboarding réel de chaque rôle (cf.
// specs/KAN-2/design.md « Out of scope »).
const ROLE_TICKETS: Record<Role, string> = {
  acheteur: "KAN-25",
  rameneur: "KAN-37",
  producteur: "KAN-16",
}

export async function generateMetadata(props: { params: Params }) {
  const { role } = await props.params
  const parsed = Role.safeParse(role)
  if (!parsed.success) return { title: "Onboarding — Delta" }
  return { title: `Onboarding ${ROLE_LABELS[parsed.data]} — Delta` }
}

export default async function OnboardingRolePlaceholderPage(props: {
  params: Params
}) {
  const { role } = await props.params
  const parsed = Role.safeParse(role)
  if (!parsed.success) notFound()

  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/signup")

  const label = ROLE_LABELS[parsed.data]
  const ticket = ROLE_TICKETS[parsed.data]

  return (
    <section className="flex flex-col gap-7">
      <header className="flex flex-col gap-2">
        <p className="font-body text-sm uppercase tracking-[0.04em] text-cream-600">
          Rôle {label.toLowerCase()}
        </p>
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-cream-950">
          Onboarding {label} — bientôt
        </h1>
        <p className="font-body text-md leading-relaxed text-cream-700">
          Votre compte est créé et votre rôle enregistré. La suite de
          l&apos;onboarding {label.toLowerCase()} arrive dans le ticket{" "}
          {ticket}.
        </p>
      </header>
      <div className="flex flex-col gap-3 rounded-2xl bg-cream-100 px-5 py-5">
        <p className="font-body text-sm text-cream-800">
          En attendant, vous pouvez revenir à l&apos;accueil ou choisir un autre
          rôle.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/welcome"
            className="inline-flex items-center justify-center rounded-full bg-green-700 px-5 py-2.5 font-body text-sm font-semibold text-cream-50 hover:bg-green-800"
          >
            Retour à l&apos;accueil
          </Link>
          <Link
            href="/onboarding/role"
            className="inline-flex items-center justify-center rounded-full border border-cream-300 px-5 py-2.5 font-body text-sm font-semibold text-cream-900 hover:bg-cream-200"
          >
            Modifier mes rôles
          </Link>
        </div>
      </div>
    </section>
  )
}
