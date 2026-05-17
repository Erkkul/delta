"use client"

import {
  STRIPE_ONBOARDING_LINK_ERROR_CODES,
  type StripeOnboardingLinkErrorCode,
} from "@delta/contracts/producer"
import { useState } from "react"

/**
 * StripeOnboardingCard — étape 3 du wizard `/onboarding/producteur` (KAN-16).
 * Source : maquette `design/maquettes/producteur/pr-02-onboarding-stripe.html`.
 *
 * Affiche la card de présentation des bénéfices Stripe Connect (3 features
 * cochées) + CTA principal violet qui appelle l'endpoint /stripe-link puis
 * redirige le user via window.location vers l'Account Link Stripe.
 */

export type StripeOnboardingCardProps = {
  onRequestLink: () => Promise<StripeOnboardingCardResult>
}

export type StripeOnboardingCardResult =
  | { ok: true; url: string }
  | { ok: false; code: StripeOnboardingLinkErrorCode; message?: string }

export function StripeOnboardingCard({
  onRequestLink,
}: StripeOnboardingCardProps) {
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
        <span className="text-xs font-bold uppercase tracking-wider text-green-700">
          Étape 3 sur 3
        </span>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight tracking-tight text-green-900">
          Compte Stripe Connect
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-cream-600">
          Configurez votre compte bancaire pour recevoir 85 % du montant après
          chaque mission livrée. Stripe vérifie votre identité (KYC light) et
          votre IBAN, en ≤ 24 h pour la France.
        </p>
      </div>

      <div className="rounded-2xl border-2 border-cream-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#635BFF] font-display text-xl font-extrabold text-white shadow-md">
            S
          </div>
          <div>
            <div className="font-display text-lg font-bold text-green-900">
              Recevoir vos paiements via Stripe Connect
            </div>
            <div className="text-xs text-cream-600">
              Compte bancaire vérifié, sans frais cachés
            </div>
          </div>
        </div>

        <ul className="mb-4 flex flex-col gap-2.5">
          <Feature>
            <strong>85 % du montant</strong> versé après chaque mission livrée
            (capture automatique au scan QR delivery).
          </Feature>
          <Feature>
            KYC léger (pièce d'identité) + IBAN — vérification en ≤ 24 h pour
            la France.
          </Feature>
          <Feature>
            Virements automatiques sur votre IBAN à fréquence quotidienne,
            hebdo ou mensuelle (au choix).
          </Feature>
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
          {submitting ? "Redirection…" : "Configurer Stripe Connect"}
        </button>
        <p className="mt-2.5 text-center text-xs text-cream-600">
          🔒 Redirection sécurisée vers Stripe · vous reviendrez ensuite sur Delta
        </p>
      </div>
    </div>
  )
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm leading-relaxed text-cream-700">
      <span aria-hidden="true" className="mt-0.5 text-green-600">
        ✓
      </span>
      <span>{children}</span>
    </li>
  )
}

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
