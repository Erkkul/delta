"use client"

import { type BuyerProfileSnapshot } from "@delta/contracts/buyer-profile"
import { OnboardingWizardShell, type WizardStep } from "@delta/ui-web"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { BuyerCategoriesForm } from "@/components/buyer/buyer-categories-form"
import { BuyerZoneForm } from "@/components/buyer/buyer-zone-form"

/**
 * Onboarding acheteur (KAN-25 + KAN-26, AC-02). Deux étapes au MVP :
 *   1. Zone d'habitation (KAN-25)
 *   2. Préférences catégories (KAN-26)
 *
 * L'étape 3 notifications de la maquette relève de KAN-14 (hors périmètre).
 *
 * Atterrissage post-onboarding : `/acheteur/profil` (page paramètres), en
 * attendant l'accueil acheteur AC-03 (KAN-28). Cf. specs/KAN-25/notes.md.
 */

const HOME_AFTER_ONBOARDING = "/acheteur/profil"

type Step = "zone" | "categories"

export function BuyerOnboardingClient({
  initial,
}: {
  initial: BuyerProfileSnapshot | null
}) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("zone")
  const [snapshot, setSnapshot] = useState<BuyerProfileSnapshot | null>(initial)

  function handleZoneSaved(updated: BuyerProfileSnapshot) {
    setSnapshot(updated)
    setStep("categories")
  }

  function handleCategoriesSaved() {
    router.push(HOME_AFTER_ONBOARDING)
  }

  const steps: WizardStep[] = [
    {
      id: "zone",
      title: "Votre zone",
      meta: "Adresse de livraison",
      status: step === "zone" ? "current" : "done",
    },
    {
      id: "categories",
      title: "Vos envies",
      meta: "Catégories d'intérêt",
      status: step === "categories" ? "current" : "pending",
    },
  ]

  const heading = step === "zone" ? "Où vivez-vous ?" : "Qu'est-ce qui vous tente ?"
  const subheading =
    step === "zone"
      ? "Nous afficherons les produits que des rameneurs peuvent ramener jusqu'à votre quartier. Vous pourrez ajouter une autre adresse plus tard."
      : "Choisissez les catégories qui vous intéressent. Cela personnalise votre accueil — vous pourrez tout voir dans le catalogue."

  return (
    <OnboardingWizardShell
      roleLabel="Espace acheteur"
      heading={heading}
      subheading={subheading}
      steps={steps}
    >
      {step === "zone" ? (
        <>
          <header className="flex flex-col gap-2">
            <p className="font-body text-xs font-bold uppercase tracking-[0.04em] text-cream-600">
              Étape 1 sur 2
            </p>
            <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-green-900">
              Où vivez-vous ?
            </h2>
            <p className="font-body text-md leading-relaxed text-cream-700">
              Indiquez votre adresse pour voir les produits livrables dans votre
              quartier.
            </p>
          </header>

          <BuyerZoneForm
            initial={snapshot}
            mode="onboarding"
            onSaved={handleZoneSaved}
          />

          <Link
            href={HOME_AFTER_ONBOARDING}
            className="font-body text-sm text-cream-600 hover:text-cream-950"
          >
            Passer pour l&apos;instant
          </Link>
        </>
      ) : (
        <>
          <header className="flex flex-col gap-2">
            <p className="font-body text-xs font-bold uppercase tracking-[0.04em] text-cream-600">
              Étape 2 sur 2
            </p>
            <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-green-900">
              Qu&apos;est-ce qui vous tente ?
            </h2>
            <p className="font-body text-md leading-relaxed text-cream-700">
              Choisissez les catégories qui vous intéressent. Cela personnalise
              votre accueil — vous pourrez tout voir dans le catalogue.
            </p>
          </header>

          <BuyerCategoriesForm
            initial={snapshot}
            mode="onboarding"
            onSaved={handleCategoriesSaved}
          />

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setStep("zone")}
              className="font-body text-sm text-cream-600 hover:text-cream-950"
            >
              ← Retour
            </button>
            <Link
              href={HOME_AFTER_ONBOARDING}
              className="font-body text-sm text-cream-600 hover:text-cream-950"
            >
              Passer pour l&apos;instant
            </Link>
          </div>
        </>
      )}
    </OnboardingWizardShell>
  )
}
