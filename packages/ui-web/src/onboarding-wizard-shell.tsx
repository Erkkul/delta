import type { ReactNode } from "react"

/**
 * OnboardingWizardShell — coquille split desktop / horizontal mobile pour
 * les wizards d'onboarding par rôle (KAN-16 producteur, futurs KAN-25
 * acheteur, KAN-37 rameneur). Source : maquette
 * `design/maquettes/producteur/pr-02-onboarding-stripe.html`.
 *
 * Desktop (≥ 920px logique maquette — on s'aligne sur le breakpoint
 * `desktop` 1280px du design system Delta, ajusté à 1024px via `tablet`
 * pour le rapport visuel équivalent à la maquette).
 *
 * Mobile : la timeline devient une barre horizontale scrollable au-dessus
 * du formulaire, plein largeur.
 */

export type WizardStep = {
  id: string
  title: string
  meta?: string
  status: "done" | "current" | "pending"
}

export type OnboardingWizardShellProps = {
  /** Bandeau démo en haut (optionnel — pour les maquettes navigables). */
  topNav?: ReactNode
  /** Titre du timeline panel (ex : "Bienvenue, Marie"). */
  heading: ReactNode
  /** Sous-titre du timeline panel (court paragraphe). */
  subheading?: ReactNode
  /** Liste ordonnée des étapes (3 au MVP producteur). */
  steps: ReadonlyArray<WizardStep>
  /** Rôle affiché sous le logo (ex : "Espace producteur"). */
  roleLabel?: string
  /** Contenu de l'étape courante. */
  children: ReactNode
}

export function OnboardingWizardShell({
  topNav,
  heading,
  subheading,
  steps,
  roleLabel = "Espace producteur",
  children,
}: OnboardingWizardShellProps) {
  return (
    <div className="min-h-screen bg-cream-50">
      {topNav}
      <div className="mx-auto grid min-h-screen max-w-[1100px] tablet:grid-cols-[320px_1fr]">
        <aside className="bg-green-800 px-6 py-7 text-white tablet:sticky tablet:top-0 tablet:self-start">
          <div className="mb-8 flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-lg">
              <span aria-hidden="true">🐜</span>
            </div>
            <div>
              <div className="font-display text-xl font-bold">Delta</div>
              <div className="text-[10px] uppercase tracking-wider text-green-200">
                {roleLabel}
              </div>
            </div>
          </div>

          <h1 className="font-display text-2xl font-bold leading-tight tracking-tight">
            {heading}
          </h1>
          {subheading ? (
            <p className="mt-2 hidden text-sm leading-relaxed text-white/70 tablet:block">
              {subheading}
            </p>
          ) : null}

          <ol className="mt-6 flex gap-1.5 overflow-x-auto tablet:mt-8 tablet:flex-col tablet:overflow-visible">
            {steps.map((step) => (
              <li key={step.id} className="shrink-0 tablet:shrink">
                <StepRow {...step} />
              </li>
            ))}
          </ol>
        </aside>

        <section className="px-6 py-8 tablet:px-8 tablet:py-10 desktop:px-12 desktop:py-12">
          <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
            {children}
          </div>
        </section>
      </div>
    </div>
  )
}

function StepRow({ status, title, meta }: WizardStep) {
  const ringClass =
    status === "done"
      ? "bg-green-500 text-white"
      : status === "current"
        ? "bg-white text-green-800"
        : "border border-white/20 bg-white/10 text-white/60"

  const containerClass =
    status === "current"
      ? "rounded-xl border border-white/15 bg-white/10 px-4 py-3"
      : "rounded-xl px-4 py-3"

  return (
    <div
      className={`flex items-center gap-3 transition-colors ${containerClass} ${status === "pending" ? "text-white/40" : status === "done" ? "text-white/70" : "text-white"}`}
    >
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold ${ringClass}`}
        aria-hidden="true"
      >
        {status === "done" ? "✓" : ""}
      </span>
      <div>
        <div className="text-sm font-semibold leading-tight">{title}</div>
        {meta ? (
          <div className="mt-0.5 hidden text-[11px] text-white/55 tablet:block">
            {meta}
          </div>
        ) : null}
      </div>
    </div>
  )
}
