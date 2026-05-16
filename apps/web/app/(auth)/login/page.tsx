import { AuthHeroPanel, AuthSplitLayout } from "@delta/ui-web"

import { LoginClient } from "./login-client"

// Même image que /welcome et /signup, cohérent avec les maquettes
// `01-authentication.html` (couvrent signup ET login).
const HERO_IMAGE_SRC =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1400&q=80"

export const metadata = {
  title: "Se connecter — Delta",
  description: "Connectez-vous à votre compte Delta.",
}

type SearchParams = Promise<{ error?: string }>

export default async function LoginPage(props: { searchParams: SearchParams }) {
  const params = await props.searchParams
  return (
    <AuthSplitLayout
      hero={
        <AuthHeroPanel
          imageSrc={HERO_IMAGE_SRC}
          eyebrow="Bon retour parmi nous"
          title={
            <>
              Retrouvez vos
              <br />
              voisins gourmands.
            </>
          }
          subtitle="Vos commandes, vos missions, vos producteurs préférés — tout est là où vous l'avez laissé."
          badges={[
            { icon: <LockIcon />, label: "Connexion sécurisée" },
            { icon: <CheckIcon />, label: "Sans engagement" },
          ]}
        />
      }
    >
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-cream-950 desktop:text-4xl">
          Se connecter
        </h1>
        <p className="font-body text-md leading-relaxed text-cream-700">
          Saisissez vos identifiants pour accéder à votre espace Delta.
        </p>
      </header>
      <LoginClient initialError={mapLoginError(params.error)} />
    </AuthSplitLayout>
  )
}

function mapLoginError(code: string | undefined): string | null {
  switch (code) {
    case "oauth_exchange_failed":
      return "La connexion Google a échoué, réessayez ou utilisez votre email."
    case "missing_code":
      return "Lien de retour OAuth invalide, recommencez la connexion."
    default:
      return null
  }
}

function LockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
