"use client"

import {
  STRIPE_ONBOARDING_LINK_ERROR_CODES,
  type StripeAccountStatus,
  type StripeOnboardingLinkErrorCode,
} from "@delta/contracts/producer"
import { useState } from "react"

/**
 * StripeAccountStatusCard — états post-onboarding du compte Stripe Connect
 * (KAN-158). Cohabite avec `StripeOnboardingCard` qui couvre toujours l'état
 * initial `not_created` (KAN-16) ; ce composant prend le relais dès que
 * `producers.stripe_account_id` est renseigné mais que `payouts_enabled`
 * n'est pas (encore) `true`.
 *
 * Quatre états visuels :
 *   1. `restricted` + requirements non vides → orange, action-requise
 *      (liste des champs traduits + CTA « Compléter mes informations »
 *      qui ouvre un Account Link `account_update`)
 *   2. `restricted` + requirements vides → gris, attente passive
 *      (« Stripe finalise la vérification, généralement sous 24h »)
 *   3. `pending` (onboarding initial en cours, requirements vides) →
 *      même rendu que (2) — attente passive
 *   4. `disabled` → bandeau rouge + lien support (mailto au MVP)
 *
 * Tous les autres cas (`not_created`, `active`) sont rendus par d'autres
 * composants en amont (`StripeOnboardingCard` ou `DonePanel`).
 */

export type StripeAccountStatusCardProps = {
  status: StripeAccountStatus
  /** Requirements déjà traduits et groupés par label (cf. `@delta/core/producer`). */
  requirements: ReadonlyArray<{
    label: string
    keys: string[]
    fallback: boolean
  }>
  /** Appelé par le CTA « Compléter mes informations » (état restricted). */
  onRequestLink: () => Promise<StripeAccountStatusCardResult>
  /** Email de support pour l'état `disabled`. Par défaut `support@delta.fr`. */
  supportEmail?: string
}

export type StripeAccountStatusCardResult =
  | { ok: true; url: string }
  | { ok: false; code: StripeOnboardingLinkErrorCode; message?: string }

export function StripeAccountStatusCard({
  status,
  requirements,
  onRequestLink,
  supportEmail = "support@delta.fr",
}: StripeAccountStatusCardProps) {
  if (status === "disabled") {
    return <DisabledCard supportEmail={supportEmail} />
  }
  if (status === "restricted" && requirements.length > 0) {
    return (
      <ActionRequiredCard
        requirements={requirements}
        onRequestLink={onRequestLink}
      />
    )
  }
  // `restricted` sans requirements, ou `pending` → attente passive
  return <WaitingCard />
}

// ─── State : action-requise (restricted avec requirements) ───────────────

function ActionRequiredCard({
  requirements,
  onRequestLink,
}: {
  requirements: StripeAccountStatusCardProps["requirements"]
  onRequestLink: StripeAccountStatusCardProps["onRequestLink"]
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setError(null)
    setSubmitting(true)
    try {
      const result = await onRequestLink()
      if (result.ok) {
        window.location.href = result.url
      } else {
        setError(messageForCode(result.code, result.message))
        setSubmitting(false)
      }
    } catch {
      setError("Stripe est temporairement indisponible, réessayez.")
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
          Étape 3 — à compléter
        </span>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight tracking-tight text-green-900">
          Stripe vérifie votre compte
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-cream-600">
          Quelques informations restent à fournir pour que Stripe valide
          définitivement votre compte. Le lien ci-dessous ouvre directement
          la section à compléter, vous n'aurez pas à refaire tout
          l'onboarding.
        </p>
      </div>

      <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5">
        <div className="mb-3 text-sm font-semibold text-amber-900">
          Informations manquantes
        </div>
        <ul className="mb-4 flex flex-col gap-2">
          {requirements.map((req) => (
            <li
              key={req.label}
              className="flex items-start gap-2.5 text-sm text-cream-800"
            >
              <span aria-hidden="true" className="mt-0.5 text-amber-700">
                •
              </span>
              <span>
                {req.label}
                {req.fallback ? (
                  <span className="ml-1 text-xs text-cream-500">
                    (champ technique)
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>

        {error ? (
          <div
            role="alert"
            className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800"
          >
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => {
            void handleClick()
          }}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-pill bg-[#635BFF] px-5 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#4F47CC] disabled:opacity-60"
        >
          <span className="grid h-[22px] w-[22px] place-items-center rounded text-[13px] font-extrabold text-[#635BFF] bg-white">
            S
          </span>
          {submitting ? "Redirection…" : "Compléter mes informations"}
        </button>
        <p className="mt-2.5 text-center text-xs text-cream-600">
          🔒 Redirection sécurisée vers Stripe · vous reviendrez ensuite sur
          Delta
        </p>
      </div>
    </div>
  )
}

// ─── State : attente passive (pending, ou restricted sans requirements) ──

function WaitingCard() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-cream-600">
          Étape 3 — en attente
        </span>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight tracking-tight text-green-900">
          Validation Stripe en cours
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-cream-600">
          Stripe finalise la vérification de votre compte. C'est généralement
          terminé en quelques minutes, parfois jusqu'à 24h selon le volume.
          Vous serez notifié dès que votre compte sera actif.
        </p>
      </div>

      <div className="rounded-2xl border-2 border-cream-200 bg-cream-50 p-5">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="h-10 w-10 animate-pulse rounded-full bg-green-200"
          />
          <div className="flex-1">
            <div className="font-display text-base font-bold text-green-900">
              Vérification automatique
            </div>
            <div className="text-xs text-cream-600">
              Aucune action requise de votre part pour le moment.
            </div>
          </div>
        </div>
        <a
          href="/welcome"
          className="mt-4 inline-flex items-center justify-center rounded-pill border-2 border-green-200 bg-white px-5 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-50"
        >
          Aller à mon espace en attendant
        </a>
      </div>
    </div>
  )
}

// ─── State : disabled ────────────────────────────────────────────────────

function DisabledCard({ supportEmail }: { supportEmail: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-red-700">
          Compte désactivé
        </span>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight tracking-tight text-red-900">
          Votre compte Stripe a été désactivé
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-cream-600">
          Stripe a suspendu votre compte. Pour comprendre la raison et
          envisager une régularisation, contactez notre support — nous
          pourrons vous aider à reprendre le flow.
        </p>
      </div>

      <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5">
        <p className="mb-4 text-sm leading-relaxed text-red-900">
          Aucune action self-service n'est possible. Le support Delta dispose
          des informations Stripe pour vous accompagner.
        </p>
        <a
          href={`mailto:${supportEmail}`}
          className="inline-flex w-full items-center justify-center rounded-pill bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800"
        >
          Contacter le support Delta
        </a>
      </div>
    </div>
  )
}

// ─── Mapping erreur → message FR ─────────────────────────────────────────

function messageForCode(
  code: StripeOnboardingLinkErrorCode,
  serverMessage?: string,
): string {
  if (code === STRIPE_ONBOARDING_LINK_ERROR_CODES.StripeAccountAlreadyEnabled) {
    return "Votre compte Stripe est déjà actif, aucune action requise."
  }
  if (code === STRIPE_ONBOARDING_LINK_ERROR_CODES.StripeUpstream) {
    return "Stripe est temporairement indisponible, réessayez."
  }
  if (code === STRIPE_ONBOARDING_LINK_ERROR_CODES.RateLimited) {
    return "Trop de demandes, réessayez dans quelques minutes."
  }
  if (code === STRIPE_ONBOARDING_LINK_ERROR_CODES.RoleForbidden) {
    return "Seuls les producteurs peuvent accéder à cette étape."
  }
  return serverMessage ?? "Erreur serveur, réessayez."
}
