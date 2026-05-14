import { Role } from "@delta/contracts/auth"
import { AuthHeroPanel, AuthSplitLayout } from "@delta/ui-web"
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

// Photo hero par rôle, reprise de la maquette (auth-screens-desktop.jsx
// `photoBg_d`, `photoFarm_d`, `photoOrchard_d`).
const ROLE_HERO_IMAGE: Record<Role, string> = {
  acheteur:
    "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1400&q=80",
  rameneur:
    "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=1400&q=80",
  producteur:
    "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1400&q=80",
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
  const heroImage = ROLE_HERO_IMAGE[parsed.data]

  return (
    <AuthSplitLayout
      hero={
        <AuthHeroPanel
          imageSrc={heroImage}
          eyebrow={`Inscription ${label.toLowerCase()}`}
          title={
            <>
              Bientôt prêt à vous
              <br />
              accompagner.
            </>
          }
          subtitle={`L'onboarding ${label.toLowerCase()} arrive dans le ticket ${ticket}. Votre compte et votre rôle sont déjà enregistrés.`}
        />
      }
    >
      <header className="flex flex-col gap-2">
        <p className="font-body text-xs font-bold uppercase tracking-[0.04em] text-cream-600">
          Rôle {label.toLowerCase()}
        </p>
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-cream-950 desktop:text-4xl">
          Onboarding {label} — bientôt
        </h1>
        <p className="font-body text-md leading-relaxed text-cream-700">
          Votre compte est créé et votre rôle enregistré. La suite de
          l&apos;onboarding {label.toLowerCase()} arrive dans le ticket{" "}
          {ticket}.
        </p>
      </header>
      <div className="flex flex-col gap-3 rounded-lg bg-cream-100 p-5">
        <p className="font-body text-sm text-cream-800">
          En attendant, vous pouvez revenir à l&apos;accueil ou choisir un autre
          rôle.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/welcome"
            className="inline-flex items-center justify-center rounded-pill bg-green-700 px-5 py-2.5 font-body text-sm font-semibold text-cream-50 hover:bg-green-800"
          >
            Retour à l&apos;accueil
          </Link>
          <Link
            href="/onboarding/role"
            className="inline-flex items-center justify-center rounded-pill border border-cream-300 px-5 py-2.5 font-body text-sm font-semibold text-cream-900 hover:bg-cream-200"
          >
            Modifier mes rôles
          </Link>
        </div>
      </div>
    </AuthSplitLayout>
  )
}
