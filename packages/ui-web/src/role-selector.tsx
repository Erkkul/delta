"use client"

import { type Role, ROLES } from "@delta/contracts/auth"
import { type ReactElement, useState } from "react"

/**
 * RoleSelector AU-06 — multi-select 1..3 rôles.
 *
 * Layouts (cf. maquettes 01-authentication.html par persona) :
 * - Mobile : titre centré + cards stackées verticalement + CTA pleine
 *   largeur. Bandeau info en bas.
 * - Desktop : titre centré + grille 3 colonnes de cards (≈280px de haut,
 *   icône + checkbox en haut, titre + tagline au milieu, pills en bas)
 *   + bandeau info centré + CTA centré.
 *
 * Le badge « Email vérifié » est rendu par la page parent dans la top bar
 * desktop — ce composant ne le porte plus.
 */
export type RoleSelectorProps = {
  onSubmit: (roles: Role[]) => Promise<void>
  defaultRoles?: Role[]
}

type RoleCopy = {
  title: string
  short: string
  long: string
  bullets: ReadonlyArray<string>
  icon: () => ReactElement
}

const ROLE_COPY: Record<Role, RoleCopy> = {
  rameneur: {
    title: "Rameneur",
    short: "Je fais des trajets",
    long: "J'ai un véhicule et je peux ramener des produits sur mes trajets habituels. Je gagne quelques euros au passage.",
    bullets: ["KYC requis", "10% par mission"],
    icon: () => <CarIcon />,
  },
  producteur: {
    title: "Producteur",
    short: "Je produis et je vends",
    long: "Agriculteur, artisan ou petit transformateur. Je veux vendre mes produits sans intermédiaire et sans logistique lourde.",
    bullets: ["SIRET requis", "85% du prix"],
    icon: () => <BasketIcon />,
  },
  acheteur: {
    title: "Acheteur",
    short: "J'aime les bons produits",
    long: "Je veux accéder à des produits locaux de qualité, sans aller au marché ni à la ferme. Le rameneur me les apporte.",
    bullets: ["Sans abonnement", "Wishlist privée"],
    icon: () => <HeartIcon />,
  },
}

export function RoleSelector(props: RoleSelectorProps) {
  const { onSubmit, defaultRoles = [] } = props
  const [roles, setRoles] = useState<Role[]>(defaultRoles)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(role: Role) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    )
  }

  async function handleSubmit() {
    if (roles.length === 0) return
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit(roles)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Enregistrement impossible, réessayez.",
      )
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 text-left desktop:items-center desktop:text-center">
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-cream-950 desktop:text-5xl">
          Comment souhaitez-vous utiliser Delta ?
        </h1>
        <p className="max-w-xl font-body text-md leading-relaxed text-cream-700">
          Choisissez un ou plusieurs rôles — vous pourrez les modifier plus
          tard.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 desktop:grid-cols-3 desktop:gap-5">
        {ROLES.map((role) => {
          const copy = ROLE_COPY[role]
          const selected = roles.includes(role)
          return (
            <button
              key={role}
              type="button"
              onClick={() => toggle(role)}
              aria-pressed={selected}
              className={[
                "flex flex-col gap-4 rounded-lg border-2 bg-white p-5 text-left transition focus:outline-none focus:shadow-focus desktop:min-h-[280px] desktop:p-6",
                selected
                  ? "border-green-600 shadow-active"
                  : "border-cream-200 hover:border-cream-400 hover:shadow-subtle",
              ].join(" ")}
            >
              <div className="flex items-start justify-between">
                <span
                  className={[
                    "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg desktop:h-14 desktop:w-14",
                    selected
                      ? "bg-green-600 text-cream-50"
                      : "bg-green-50 text-green-700",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {copy.icon()}
                </span>
                <span
                  className={[
                    "flex h-6 w-6 items-center justify-center rounded-pill border-2",
                    selected
                      ? "border-green-600 bg-green-600 text-cream-50"
                      : "border-cream-300 bg-white",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {selected ? <CheckIcon /> : null}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="font-display text-xl font-bold text-cream-950">
                  {copy.title}
                </span>
                <span className="font-body text-sm font-medium text-cream-700">
                  {copy.short}
                </span>
                <span className="font-body text-sm leading-relaxed text-cream-600">
                  {copy.long}
                </span>
              </div>

              <div className="mt-auto flex flex-wrap gap-2">
                {copy.bullets.map((b) => (
                  <span
                    key={b}
                    className={[
                      "rounded-pill px-3 py-1 font-body text-xs font-semibold",
                      selected
                        ? "bg-white/80 text-green-900"
                        : "bg-cream-100 text-cream-700",
                    ].join(" ")}
                  >
                    {b}
                  </span>
                ))}
              </div>
            </button>
          )
        })}
      </div>

      <div className="mx-auto flex w-full max-w-2xl items-start gap-2 rounded-md border border-cream-200 bg-white p-4 font-body text-sm leading-relaxed text-cream-700">
        <InfoIcon />
        <span>
          Vous pouvez cumuler les rôles. Par exemple, un producteur peut aussi
          être acheteur ou rameneur.
        </span>
      </div>

      {error ? (
        <div
          role="alert"
          className="mx-auto w-full max-w-2xl rounded-md border border-[#F5C6C0] bg-[#FDEDEC] px-4 py-3 font-body text-sm text-[#C0392B]"
        >
          {error}
        </div>
      ) : null}

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => {
            void handleSubmit()
          }}
          disabled={roles.length === 0 || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-pill bg-green-700 px-9 py-3.5 font-body text-base font-semibold text-cream-50 transition hover:bg-green-800 focus:outline-none focus:shadow-focus disabled:bg-cream-300 disabled:text-cream-500 desktop:w-auto"
        >
          {submitting
            ? "Enregistrement…"
            : `Continuer${roles.length > 1 ? ` · ${String(roles.length)} rôles` : ""}`}
        </button>
      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function CarIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2" />
      <circle cx="6.5" cy="16.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
    </svg>
  )
}

function BasketIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11h18l-2 9a2 2 0 0 1-2 1.6H7a2 2 0 0 1-2-1.6L3 11z" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2, color: "#A8A29E" }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}
