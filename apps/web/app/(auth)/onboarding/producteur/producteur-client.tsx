"use client"

import {
  SIRET_DECLARATION_ERROR_CODES,
  STRIPE_ONBOARDING_LINK_ERROR_CODES,
  type SiretDeclarationErrorCode,
  type SiretStatus,
  type StripeAccountStatus,
  type StripeOnboardingLinkErrorCode,
} from "@delta/contracts/producer"
import {
  OnboardingWizardShell,
  SiretForm,
  type SiretFormResult,
  type SiretFormValues,
  StripeOnboardingCard,
  type StripeOnboardingCardResult,
  type WizardStep,
} from "@delta/ui-web"
import { useState } from "react"

export type ProducerOnboardingState = {
  siret_status: SiretStatus
  stripe_status: StripeAccountStatus
  payouts_enabled: boolean
  siret_rejection_reason: string | null
}

type WizardPhase = "siret" | "stripe" | "done"

export function ProducerOnboardingClient({
  initialState,
}: {
  initialState: ProducerOnboardingState
}) {
  const [phase, setPhase] = useState<WizardPhase>(() => initialPhase(initialState))

  const steps = buildSteps(phase, initialState)

  return (
    <OnboardingWizardShell
      heading="Bienvenue sur Delta"
      subheading="3 étapes pour activer votre ferme. Vous pourrez créer vos produits dès l'étape 2 — ils deviendront visibles dès la validation SIRET."
      steps={steps}
      roleLabel="Espace producteur"
    >
      {phase === "siret" ? (
        <SiretForm
          onSubmit={submitSiret}
          onContinue={() => setPhase("stripe")}
        />
      ) : null}
      {phase === "stripe" ? (
        <StripeOnboardingCard onRequestLink={requestStripeLink} />
      ) : null}
      {phase === "done" ? <DonePanel /> : null}
    </OnboardingWizardShell>
  )
}

function initialPhase(state: ProducerOnboardingState): WizardPhase {
  if (state.payouts_enabled) return "done"
  if (state.siret_status === "not_submitted") return "siret"
  return "stripe"
}

function buildSteps(
  phase: WizardPhase,
  state: ProducerOnboardingState,
): WizardStep[] {
  return [
    {
      id: "profil",
      title: "Profil de la ferme",
      meta: "Bientôt — KAN-17",
      status: "pending",
    },
    {
      id: "siret",
      title: "Vérification SIRET",
      meta:
        state.siret_status === "verified"
          ? "Validé"
          : state.siret_status === "pending"
            ? "Vérification en cours"
            : state.siret_status === "rejected"
              ? "À corriger"
              : "Vérification asynchrone",
      status:
        state.siret_status === "verified"
          ? "done"
          : phase === "siret"
            ? "current"
            : "pending",
    },
    {
      id: "stripe",
      title: "Compte Stripe Connect",
      meta: state.payouts_enabled ? "Actif" : "KYC + IBAN pour être payé",
      status:
        state.payouts_enabled || phase === "done"
          ? "done"
          : phase === "stripe"
            ? "current"
            : "pending",
    },
  ]
}

async function submitSiret(values: SiretFormValues): Promise<SiretFormResult> {
  const response = await fetch("/api/v1/producer/onboarding/siret", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(values),
  })
  if (response.ok) return { ok: true }
  const payload = (await response.json().catch(() => null)) as {
    code?: SiretDeclarationErrorCode
    error?: string
  } | null
  return {
    ok: false,
    code: payload?.code ?? SIRET_DECLARATION_ERROR_CODES.Unknown,
    message: payload?.error,
  }
}

async function requestStripeLink(): Promise<StripeOnboardingCardResult> {
  const response = await fetch("/api/v1/producer/onboarding/stripe-link", {
    method: "POST",
  })
  if (response.ok) {
    const data = (await response.json()) as { url: string }
    return { ok: true, url: data.url }
  }
  const payload = (await response.json().catch(() => null)) as {
    code?: StripeOnboardingLinkErrorCode
    error?: string
  } | null
  return {
    ok: false,
    code: payload?.code ?? STRIPE_ONBOARDING_LINK_ERROR_CODES.Unknown,
    message: payload?.error,
  }
}

function DonePanel() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-bold text-green-900">
        Votre ferme est activée !
      </h1>
      <p className="text-sm leading-relaxed text-cream-700">
        Votre SIRET est vérifié, votre compte Stripe est actif. Vous pouvez
        maintenant créer votre catalogue et commencer à recevoir des missions.
      </p>
      <a
        href="/welcome"
        className="inline-flex w-fit items-center justify-center rounded-pill bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700"
      >
        Aller à mon espace
      </a>
    </div>
  )
}
