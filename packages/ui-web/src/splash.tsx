import type { ReactNode } from "react"

/**
 * Splash AU-01 — écran d'entrée du flow auth sur `/welcome` (décision
 * 2026-05-13).
 *
 * Responsive — deux layouts distincts (cf. maquettes 01-authentication.html par persona) :
 * - Mobile (< desktop bp 1280px) : photo plein écran en background, overlay
 *   sombre, hero text + CTAs ancrés en bas.
 * - Desktop (≥ 1280px) : split 1/1. Gauche = photo + carte producteur flottante.
 *   Droite = panneau vert sombre avec eyebrow + titre Lora large + sous-titre
 *   + 2 CTAs côte à côte + trust strip.
 *
 * Server-renderable (pas de "use client"). Image : URL Unsplash temporaire
 * reprise de la maquette. À remplacer par un asset local (`apps/web/public/
 * welcome-hero.jpg`) avant prod — voir TODO dans `apps/web/app/welcome/page.tsx`.
 */
export type SplashProducerCard = {
  emoji: string
  name: string
  location: string
  quote: string
}

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
  /** Carte producteur flottante sur le panneau gauche desktop. */
  producerCard?: SplashProducerCard
  /** Strip de chiffres clés affichée sous les CTAs desktop. */
  trustStripItems?: ReadonlyArray<ReactNode>
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
    subtitle = "Des produits locaux livrés par des voisins qui font déjà la route. Producteurs, rameneurs et acheteurs — un seul Delta.",
    trustNote,
    legalNote = (
      <>
        En continuant, vous acceptez nos <u>CGU</u> et notre{" "}
        <u>politique de confidentialité</u>.
      </>
    ),
    producerCard,
    trustStripItems,
  } = props

  return (
    <>
      <SplashMobile
        imageSrc={imageSrc}
        signupHref={signupHref}
        loginHref={loginHref}
        signupLabel={signupLabel}
        loginLabel={loginLabel}
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        trustNote={trustNote}
        legalNote={legalNote}
      />
      <SplashDesktop
        imageSrc={imageSrc}
        signupHref={signupHref}
        loginHref={loginHref}
        signupLabel={signupLabel}
        loginLabel={loginLabel}
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        legalNote={legalNote}
        producerCard={producerCard}
        trustStripItems={trustStripItems}
      />
    </>
  )
}

type MobileProps = Required<
  Pick<
    SplashProps,
    | "imageSrc"
    | "signupHref"
    | "loginHref"
    | "signupLabel"
    | "loginLabel"
    | "eyebrow"
  >
> & {
  title: ReactNode
  subtitle: ReactNode
  trustNote?: ReactNode
  legalNote: ReactNode
}

function SplashMobile(props: MobileProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-green-950 desktop:hidden">
      <img
        src={props.imageSrc}
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
          {props.eyebrow}
        </span>
        <h1 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight text-white tablet:text-5xl">
          {props.title}
        </h1>
        <p className="mt-3 max-w-md font-body text-md leading-relaxed text-white/75">
          {props.subtitle}
        </p>
        {props.trustNote ? (
          <div className="mt-5 font-body text-xs text-white/55">
            {props.trustNote}
          </div>
        ) : null}
      </section>

      <section className="relative z-10 flex flex-col gap-3 px-6 pb-10 pt-6 tablet:px-10 tablet:pb-14">
        <a
          href={props.signupHref}
          className="flex items-center justify-center rounded-lg bg-cream-50 px-6 py-3.5 font-body text-base font-bold text-green-900 transition hover:bg-white"
        >
          {props.signupLabel}
        </a>
        <a
          href={props.loginHref}
          className="flex items-center justify-center rounded-lg border border-white/25 bg-transparent px-6 py-3 font-body text-base font-semibold text-white/95 transition hover:bg-white/5"
        >
          {props.loginLabel}
        </a>
        <p className="mt-2 text-center font-body text-xs text-white/55">
          {props.legalNote}
        </p>
      </section>
    </div>
  )
}

type DesktopProps = Required<
  Pick<
    SplashProps,
    | "imageSrc"
    | "signupHref"
    | "loginHref"
    | "signupLabel"
    | "loginLabel"
    | "eyebrow"
  >
> & {
  title: ReactNode
  subtitle: ReactNode
  legalNote: ReactNode
  producerCard?: SplashProducerCard
  trustStripItems?: ReadonlyArray<ReactNode>
}

function SplashDesktop(props: DesktopProps) {
  return (
    <div className="relative hidden min-h-screen grid-cols-2 bg-green-950 desktop:grid">
      <div className="relative overflow-hidden">
        <img
          src={props.imageSrc}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{ filter: "saturate(0.95) brightness(0.7)" }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(12,31,15,0.3) 0%, rgba(12,31,15,0.7) 100%)",
          }}
        />

        <div className="relative z-10 flex h-full flex-col p-12">
          <span className="font-display text-3xl font-semibold text-cream-50">
            Delta
          </span>
          <div className="flex-1" />
          {props.producerCard ? (
            <article className="max-w-sm rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-pill text-2xl"
                  style={{
                    background: "linear-gradient(135deg, #EDCFB4, #CC8E62)",
                  }}
                  aria-hidden="true"
                >
                  {props.producerCard.emoji}
                </span>
                <div className="flex flex-col">
                  <span className="font-display text-base font-bold text-white">
                    {props.producerCard.name}
                  </span>
                  <span className="font-body text-xs text-white/65">
                    {props.producerCard.location}
                  </span>
                </div>
              </div>
              <p className="mt-3 font-body text-sm italic leading-relaxed text-white/75">
                « {props.producerCard.quote} »
              </p>
            </article>
          ) : null}
        </div>
      </div>

      <div className="relative flex flex-col justify-center overflow-hidden bg-green-950 px-20 py-16">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, rgba(53,127,67,0.12) 0%, transparent 60%)",
          }}
        />
        <div className="relative z-10 flex max-w-xl flex-col">
          <span className="inline-flex w-fit items-center gap-2 rounded-pill border border-white/15 bg-white/10 px-3 py-1.5 font-body text-xs font-semibold uppercase tracking-[0.04em] text-white/85 backdrop-blur">
            <span className="block h-1.5 w-1.5 rounded-pill bg-green-400" />
            {props.eyebrow}
          </span>
          <h1 className="mt-6 font-display text-6xl font-semibold leading-[1.02] tracking-tight text-white">
            {props.title}
          </h1>
          <p className="mt-5 max-w-lg font-body text-lg leading-relaxed text-white/70">
            {props.subtitle}
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href={props.signupHref}
              className="flex items-center justify-center rounded-lg bg-cream-50 px-7 py-3.5 font-body text-base font-bold text-green-900 transition hover:bg-white"
            >
              {props.signupLabel}
            </a>
            <a
              href={props.loginHref}
              className="flex items-center justify-center rounded-lg border border-white/25 bg-transparent px-7 py-3.5 font-body text-base font-semibold text-white transition hover:bg-white/5"
            >
              {props.loginLabel}
            </a>
          </div>

          {props.trustStripItems && props.trustStripItems.length > 0 ? (
            <ul className="mt-8 flex flex-wrap gap-x-7 gap-y-2 font-body text-sm text-white/55">
              {props.trustStripItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          ) : null}

          <p className="mt-10 font-body text-xs text-white/50">
            {props.legalNote}
          </p>
        </div>
      </div>
    </div>
  )
}
