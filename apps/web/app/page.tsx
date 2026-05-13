import Link from "next/link"

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <p className="font-body text-sm uppercase tracking-[0.04em] text-cream-600">
        Delta
      </p>
      <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-cream-950">
        Producteurs locaux, rameneurs, acheteurs urbains.
      </h1>
      <p className="mt-6 font-body text-md leading-relaxed text-cream-700">
        Plateforme qui met en relation producteurs locaux, acheteurs urbains et
        rameneurs — particuliers en déplacement — pour acheminer des produits
        locaux via des trajets déjà existants.
      </p>
      <p className="mt-10 font-body text-sm text-cream-500">
        Plateforme en construction. Lancement progressif courant 2026.
      </p>
      <div className="mt-8 flex flex-col gap-3 tablet:flex-row">
        <Link
          href="/welcome"
          className="inline-flex items-center justify-center rounded-pill bg-green-600 px-6 py-3 font-body text-base font-semibold text-cream-50 transition hover:bg-green-700"
        >
          Découvrir Delta
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-pill border border-cream-300 bg-white px-6 py-3 font-body text-base font-semibold text-cream-950 transition hover:border-cream-400"
        >
          J&apos;ai déjà un compte
        </Link>
      </div>
    </main>
  )
}
