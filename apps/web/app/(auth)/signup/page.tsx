import { SignupClient } from "./signup-client"

export const metadata = {
  title: "Créer un compte — Delta",
  description:
    "Inscription Delta — un seul compte pour producteur, rameneur ou acheteur.",
}

type SearchParams = Promise<{ error?: string }>

export default async function SignupPage(props: { searchParams: SearchParams }) {
  const params = await props.searchParams
  return (
    <section className="flex flex-col gap-7">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-cream-950">
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
