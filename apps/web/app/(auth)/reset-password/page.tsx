import { AuthHeroPanel, AuthSplitLayout } from "@delta/ui-web"
import Link from "next/link"

import { ResetPasswordClient } from "./reset-password-client"

// Cf. notes.md KAN-157 : réutilisation visuelle des écrans auth existants
// (le bundle Figma ne contient pas d'écran AU-FP3 dédié).
const HERO_IMAGE_SRC =
  "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1400&q=80"

export const metadata = {
  title: "Nouveau mot de passe — Delta",
  description:
    "Saisissez le code à 6 chiffres reçu par email et choisissez votre nouveau mot de passe.",
}

type SearchParams = Promise<{ email?: string }>

export default async function ResetPasswordPage(props: {
  searchParams: SearchParams
}) {
  const params = await props.searchParams
  const email = (params.email ?? "").trim().toLowerCase()

  const hero = (
    <AuthHeroPanel
      imageSrc={HERO_IMAGE_SRC}
      eyebrow="Étape 2 sur 2"
      title={
        <>
          Choisissez un
          <br />
          nouveau mot de passe.
        </>
      }
      subtitle="Saisissez le code reçu par email puis votre nouveau mot de passe. Toutes vos sessions actives seront déconnectées."
    />
  )

  if (!email) {
    return (
      <AuthSplitLayout hero={hero}>
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold text-cream-950">
            Adresse manquante.
          </h1>
          <p className="mt-3 font-body text-md text-cream-700">
            Recommencez depuis le début de la récupération.
          </p>
          <Link
            href="/forgot-password"
            className="mt-6 inline-flex items-center justify-center rounded-pill bg-green-600 px-6 py-3.5 font-body text-base font-semibold text-cream-50 hover:bg-green-700"
          >
            Retour à la récupération
          </Link>
        </div>
      </AuthSplitLayout>
    )
  }

  return (
    <AuthSplitLayout hero={hero}>
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-cream-950 desktop:text-4xl">
          Nouveau mot de passe
        </h1>
        <p className="font-body text-md leading-relaxed text-cream-700">
          Choisissez un mot de passe que vous n&apos;avez jamais utilisé sur
          Delta. Vos autres sessions seront déconnectées.
        </p>
      </header>
      <ResetPasswordClient email={email} />
      <p className="text-center font-body text-sm text-cream-600">
        Pas reçu de code ?{" "}
        <Link
          href={`/forgot-password?email=${encodeURIComponent(email)}`}
          className="text-green-700 underline decoration-cream-300 underline-offset-2 hover:text-green-800"
        >
          En recevoir un nouveau
        </Link>
        .
      </p>
    </AuthSplitLayout>
  )
}
