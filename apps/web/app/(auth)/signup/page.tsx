import { AuthHeroPanel, AuthSplitLayout } from "@delta/ui-web"

import { SignupClient } from "./signup-client"

// Image partagée avec /welcome (cf. design/maquettes/*/01-authentication.html
// → auth-screens-desktop.jsx `photoBg_d`). À remplacer par un asset local
// avant prod — voir TODO dans `apps/web/app/welcome/page.tsx`.
const HERO_IMAGE_SRC =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1400&q=80"

export const metadata = {
  title: "Créer un compte — Delta",
  description:
    "Inscription Delta — un seul compte pour producteur, rameneur ou acheteur.",
}

type SearchParams = Promise<{ error?: string }>

export default async function SignupPage(props: { searchParams: SearchParams }) {
  const params = await props.searchParams
  return (
    <AuthSplitLayout
      hero={
        <AuthHeroPanel
          imageSrc={HERO_IMAGE_SRC}
          eyebrow="Bienvenue sur Delta"
          title={
            <>
              Rejoignez 1 247
              <br />
              voisins gourmands.
            </>
          }
          subtitle="Producteurs locaux, rameneurs sur leur trajet, et acheteurs locaux — un seul compte pour tout."
          badges={[
            { icon: <ShieldIcon />, label: "Données en France" },
            { icon: <CheckIcon />, label: "Sans abonnement" },
          ]}
        />
      }
    >
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-cream-950 desktop:text-4xl">
          Créer un compte
        </h1>
        <p className="font-body text-md leading-relaxed text-cream-700">
          Producteur, rameneur ou acheteur — un seul compte pour tout. Vous
          choisirez vos rôles juste après.
        </p>
      </header>
      <SignupClient initialError={mapSignupError(params.error)} />
      <p className="text-center font-body text-xs text-cream-600">
        En continuant, vous acceptez nos{" "}
        <a
          href="/legal/cgu"
          className="text-green-700 underline decoration-cream-300 underline-offset-2 hover:text-green-800"
        >
          CGU
        </a>{" "}
        et notre{" "}
        <a
          href="/legal/confidentialite"
          className="text-green-700 underline decoration-cream-300 underline-offset-2 hover:text-green-800"
        >
          politique de confidentialité
        </a>
        .
      </p>
      <p className="text-center font-body text-sm text-cream-600">
        Vous avez déjà un compte ?{" "}
        <a
          href="/login"
          className="text-green-700 underline decoration-cream-300 underline-offset-2 hover:text-green-800"
        >
          Connectez-vous
        </a>
        .
      </p>
    </AuthSplitLayout>
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

function ShieldIcon() {
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
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
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
