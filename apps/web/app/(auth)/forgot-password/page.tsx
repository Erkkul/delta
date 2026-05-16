import { AuthHeroPanel, AuthSplitLayout } from "@delta/ui-web"
import Link from "next/link"

import { ForgotPasswordClient } from "./forgot-password-client"

// Même image que les autres écrans auth (`*-01-authentication.html`) —
// cohérent avec la décision 2026-05-16 (notes.md) de réutilisation
// visuelle AU-02/AU-04 puisque le bundle Figma ne contient pas d'écran
// dédié récupération.
const HERO_IMAGE_SRC =
  "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1400&q=80"

export const metadata = {
  title: "Mot de passe oublié — Delta",
  description:
    "Recevez un code à 6 chiffres par email pour réinitialiser votre mot de passe Delta.",
}

type SearchParams = Promise<{ email?: string }>

export default async function ForgotPasswordPage(props: {
  searchParams: SearchParams
}) {
  const params = await props.searchParams
  const email = (params.email ?? "").trim()

  return (
    <AuthSplitLayout
      hero={
        <AuthHeroPanel
          imageSrc={HERO_IMAGE_SRC}
          eyebrow="Récupération de compte"
          title={
            <>
              On vous renvoie
              <br />
              la clé en 6 chiffres.
            </>
          }
          subtitle="Saisissez votre adresse — si un compte existe, vous recevrez un code valable 1 heure."
        />
      }
    >
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-cream-950 desktop:text-4xl">
          Mot de passe oublié&nbsp;?
        </h1>
        <p className="font-body text-md leading-relaxed text-cream-700">
          Pas de panique. Indiquez l&apos;email associé à votre compte, on vous
          envoie un code pour le réinitialiser.
        </p>
      </header>
      <ForgotPasswordClient defaultEmail={email} />
      <p className="text-center font-body text-sm text-cream-600">
        Vous vous souvenez ?{" "}
        <Link
          href="/login"
          className="text-green-700 underline decoration-cream-300 underline-offset-2 hover:text-green-800"
        >
          Retour à la connexion
        </Link>
        .
      </p>
    </AuthSplitLayout>
  )
}
