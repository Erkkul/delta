import Link from "next/link"

import { VerifyEmailClient } from "./verify-email-client"

export const metadata = {
  title: "Vérifiez votre email — Delta",
  description: "Saisissez le code à 6 chiffres reçu par email pour activer votre compte.",
}

type SearchParams = Promise<{ email?: string }>

export default async function VerifyEmailPage(props: {
  searchParams: SearchParams
}) {
  const params = await props.searchParams
  const email = (params.email ?? "").trim().toLowerCase()

  if (!email) {
    return (
      <main className="min-h-screen bg-cream-50">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-6 tablet:px-8">
          <header className="flex items-center justify-between">
            <Link
              href="/welcome"
              className="font-display text-xl font-semibold text-cream-950"
            >
              Delta
            </Link>
          </header>
          <div className="flex flex-1 items-center justify-center py-8">
            <div className="w-full max-w-xl text-center">
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
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-cream-50">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-6 tablet:px-8">
        <header className="flex items-center justify-between">
          <Link
            href="/welcome"
            className="font-display text-xl font-semibold text-cream-950"
          >
            Delta
          </Link>
        </header>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-md">
            <VerifyEmailClient email={email} />
          </div>
        </div>
      </div>
    </main>
  )
}
