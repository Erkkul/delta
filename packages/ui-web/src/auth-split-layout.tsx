import type { ReactNode } from "react"

/**
 * AuthSplitLayout — coquille responsive pour les écrans d'authentification
 * (signup, verify-email, login, mot de passe oublié, onboarding par rôle).
 *
 * Mobile (< desktop bp 1280px) : une seule colonne. Le panneau hero est
 * caché, seul le formulaire s'affiche avec un header minimal logo.
 *
 * Desktop (≥ 1280px) : split image-gauche / form-droite. Le ratio par
 * défaut est `5fr 7fr` (panneau étroit, formulaire large). Passer
 * `narrow` pour basculer en `1fr 1fr` (utile sur Splash).
 *
 * Source : maquettes 01-authentication.html par persona (auth-screens-desktop.jsx,
 * `DesktopAuthSplit`).
 */
export type AuthSplitLayoutProps = {
  hero: ReactNode
  children: ReactNode
  footer?: ReactNode
  narrow?: boolean
  logoHref?: string
}

export function AuthSplitLayout({
  hero,
  children,
  footer,
  narrow = false,
  logoHref = "/welcome",
}: AuthSplitLayoutProps) {
  const desktopCols = narrow
    ? "desktop:grid-cols-2"
    : "desktop:[grid-template-columns:5fr_7fr]"

  return (
    <main className="min-h-screen bg-cream-50">
      <div className={`grid min-h-screen ${desktopCols}`}>
        <aside className="relative hidden desktop:block">{hero}</aside>
        <section className="flex min-h-screen flex-col">
          <header className="px-5 py-6 tablet:px-8 desktop:hidden">
            <a
              href={logoHref}
              className="font-display text-xl font-semibold text-cream-950"
            >
              Delta
            </a>
          </header>
          <div className="flex flex-1 items-center justify-center px-5 py-8 tablet:px-8 desktop:px-16 desktop:py-16">
            <div className="flex w-full max-w-md flex-col gap-7">
              {children}
              {footer ? <div>{footer}</div> : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

/**
 * AuthHeroPanel — panneau gauche du split desktop : photo plein cadre
 * avec overlay sombre, logo Delta en haut, et bloc texte (eyebrow + titre
 * Lora + sous-titre + badges optionnels) ancré en bas. Une `children` slot
 * permet d'insérer un contenu flottant (ex : carte producteur sur Splash).
 *
 * Source : maquettes 01-authentication.html par persona (auth-screens-desktop.jsx,
 * `DesktopHeroPanel`).
 */
export type AuthHeroBadge = {
  icon: ReactNode
  label: string
}

export type AuthHeroPanelProps = {
  imageSrc: string
  eyebrow?: ReactNode
  title?: ReactNode
  subtitle?: ReactNode
  badges?: ReadonlyArray<AuthHeroBadge>
  children?: ReactNode
  logoHref?: string
}

export function AuthHeroPanel({
  imageSrc,
  eyebrow,
  title,
  subtitle,
  badges,
  children,
  logoHref = "/welcome",
}: AuthHeroPanelProps) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-green-950 text-white">
      <img
        src={imageSrc}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ filter: "saturate(0.95) brightness(0.55)" }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(12,31,15,0.4) 0%, rgba(12,31,15,0.85) 100%)",
        }}
      />

      <div className="relative z-10 flex h-full flex-col px-12 py-10">
        <a
          href={logoHref}
          className="font-display text-2xl font-semibold text-cream-50"
        >
          Delta
        </a>

        <div className="flex-1" />

        <div className="flex flex-col gap-4">
          {eyebrow ? (
            <span className="inline-flex w-fit items-center gap-2 rounded-pill border border-white/20 bg-white/10 px-3 py-1.5 font-body text-xs font-semibold uppercase tracking-[0.04em] text-white/90 backdrop-blur">
              <span className="block h-1.5 w-1.5 rounded-pill bg-green-300" />
              {eyebrow}
            </span>
          ) : null}
          {title ? (
            <h2 className="max-w-xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white">
              {title}
            </h2>
          ) : null}
          {subtitle ? (
            <p className="max-w-md font-body text-md leading-relaxed text-white/75">
              {subtitle}
            </p>
          ) : null}
          {badges && badges.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2 font-body text-sm text-white/65">
              {badges.map((b, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-green-300">{b.icon}</span>
                  <span>{b.label}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  )
}
