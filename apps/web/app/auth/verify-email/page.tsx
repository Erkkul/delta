import { AuthHeroPanel, AuthSplitLayout } from "@delta/ui-web"
import Link from "next/link"

import { VerifyEmailClient } from "./verify-email-client"

// Image reprise de la maquette (auth-screens-desktop.jsx `photoFarm_d`).
const HERO_IMAGE_SRC =
  "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1400&q=80"

export const metadata = {
  title: "Vérifiez votre email — Delta",
  description:
    "Saisissez le code à 6 chiffres reçu par email pour activer votre compte.",
}

type SearchParams = Promise<{ email?: string }>

export default async function VerifyEmailPage(props: {
  searchParams: SearchParams
}) {
  const params = await props.searchParams
  const email = (params.email ?? "").trim().toLowerCase()

  const hero = (
    <AuthHeroPanel
      imageSrc={HERO_IMAGE_SRC}
      eyebrow="Étape 1 sur 3"
      title={
        <>
          Une étape
          <br />
          pour vous protéger.
        </>
      }
      subtitle="On vous a envoyé un code à 6 chiffres pour confirmer que c'est bien votre adresse."
    />
  )

  if (!email) {
    return (
      <AuthSplitLayout hero={hero}>
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold text-cream-950">
            Lien expiré.
          </h1>
          <p className="mt-3 font-body text-md text-cream-700">
            Reprenez depuis l&apos;inscription.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-flex items-center justify-center rounded-pill bg-green-600 px-6 py-3.5 font-body text-base font-semibold text-cream-50 hover:bg-green-700"
          >
            Aller à l&apos;inscription
          </Link>
        </div>
      </AuthSplitLayout>
    )
  }

  return (
    <AuthSplitLayout hero={hero}>
      <VerifyEmailClient email={email} />
    </AuthSplitLayout>
  )
}
