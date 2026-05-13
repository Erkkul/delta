import type { ReactNode } from "react"

/**
 * Splash AU-01 — écran d'entrée du flow auth sur `/welcome` (décision
 * 2026-05-13). Server-renderable (pas de "use client"). Photo terroir
 * en background avec overlay sombre, eyebrow + H1 Lora + sub, trust
 * strip et deux CTAs.
 *
 * Image : URL Unsplash temporaire reprise de la maquette. À remplacer
 * par un asset local (`apps/web/public/welcome-hero.jpg`) avant prod —
 * voir TODO dans `apps/web/app/welcome/page.tsx`.
 */
export type SplashProps = {
  imageSrc: string
  signupHref: string
  loginHref: string
  signupLabel?: string
  loginLabel?: string
  eyebrow?: string
  title?: ReactNode
  subtitle?: ReactNode
  trustNote?: ReactNode
  legalNote?: ReactNode
}

export function Splash(props: SplashProps) {
  const {
    imageSrc,
    signupHref,
    loginHref,
    signupLabel = "Créer un compte gratuit",
    loginLabel = "J'ai déjà un compte",
    eyebrow = "Le terroir, livré par un voisin",
    title = (
      <>
        Du producteur local
        <br />à votre porte.
      </>
    ),
    subtitle = "Des produits locaux livrés par des voisins qui font déjà la route.",
    trustNote,
    legalNote = (
      <>
        En continuant, vous acceptez nos <u>CGU</u> et notre{" "}
        <u>politique de confidentialité</u>.
      </>
    ),
  } = props

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-green-950">
      <img
        src={imageSrc}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ filter: "saturate(0.95) brightness(0.65)" }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(12,31,15,0.45) 0%, rgba(12,31,15,0.6) 50%, rgba(12,31,15,0.92) 100%)",
        }}
      />

      <header className="relative z-10 px-6 pt-12 tablet:px-10">
        <span className="font-display text-2xl font-semibold text-cream-50">
          Delta
        </span>
      </header>

      <div className="flex-1" />

      <section className="relative z-10 px-6 pt-6 tablet:px-10">
        <span className="inline-flex items-center gap-2 rounded-pill border border-white/20 bg-white/10 px-3 py-1.5 font-body text-xs font-semibold uppercase tracking-[0.04em] text-white/90 backdrop-blur">
          <span className="block h-1.5 w-1.5 rounded-pill bg-green-300" />
          {eyebrow}
        </span>
        <h1 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight text-white tablet:text-5xl">
          {title}
        </h1>
        <p className="mt-3 max-w-md font-body text-md leading-relaxed text-white/75">
          {subtitle}
        </p>
        {trustNote ? (
          <div className="mt-5 font-body text-xs text-white/55">{trustNote}</div>
        ) : null}
      </section>

      <section className="relative z-10 flex flex-col gap-3 px-6 pb-10 pt-6 tablet:px-10 tablet:pb-14">
        <a
          href={signupHref}
          className="flex items-center justify-center rounded-lg bg-cream-50 px-6 py-3.5 font-body text-base font-bold text-green-900 transition hover:bg-white"
        >
          {signupLabel}
        </a>
        <a
          href={loginHref}
          className="flex items-center justify-center rounded-lg border border-white/25 bg-transparent px-6 py-3 font-body text-base font-semibold text-white/95 transition hover:bg-white/5"
        >
          {loginLabel}
        </a>
        <p className="mt-2 text-center font-body text-xs text-white/55">
          {legalNote}
        </p>
      </section>
    </div>
  )
}
