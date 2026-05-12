import { type Role } from "@delta/contracts/auth"

import { SignupClient } from "./signup-client"

type SearchParams = Promise<{ role?: string; error?: string }>

const VALID_ROLES: ReadonlySet<string> = new Set([
  "acheteur",
  "rameneur",
  "producteur",
])

export const metadata = {
  title: "Créer un compte — Delta",
  description:
    "Inscription Delta — choisissez votre rôle (acheteur, rameneur, producteur) pour démarrer.",
}

export default async function SignupPage(props: { searchParams: SearchParams }) {
  const params = await props.searchParams
  const defaultRole: Role | undefined =
    params.role && VALID_ROLES.has(params.role)
      ? (params.role as Role)
      : undefined

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 text-center">
        <p className="font-body text-xs font-medium uppercase tracking-[0.04em] text-cream-600">
          Inscription
        </p>
        <h1 className="font-display text-3xl font-bold leading-tight text-cream-950 tablet:text-4xl">
          Bienvenue sur Delta.
        </h1>
        <p className="font-body text-md leading-relaxed text-cream-700">
          Créez votre compte en quelques secondes. Choisissez le rôle qui vous
          ressemble — vous pourrez compléter votre profil plus tard.
        </p>
      </header>
      <SignupClient
        defaultRole={defaultRole}
        initialError={mapSignupError(params.error)}
      />
    </section>
  )
}

function mapSignupError(code: string | undefined): string | null {
  switch (code) {
    case "oauth_exchange_failed":
      return "La connexion Google a échoué, réessayez ou utilisez votre email."
    case "missing_code":
      return "Lien de retour OAuth invalide, recommencez la connexion."
    default:
      return null
  }
}
