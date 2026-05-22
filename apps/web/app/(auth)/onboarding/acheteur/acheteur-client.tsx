"use client"

import { type BuyerProfileSnapshot } from "@delta/contracts/buyer-profile"
import { OnboardingWizardShell } from "@delta/ui-web"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { BuyerZoneForm } from "@/components/buyer/buyer-zone-form"

/**
 * Onboarding acheteur (KAN-25, AC-02 étape 1). Une seule étape au MVP : la
 * zone d'habitation. Les étapes catégories (KAN-26) et notifications (KAN-14)
 * de la maquette sont hors périmètre de cette US.
 *
 * Atterrissage post-onboarding : `/acheteur/profil` (page paramètres livrée
 * par KAN-82), en attendant l'accueil acheteur AC-03 (KAN-28). Cf.
 * specs/KAN-25/notes.md.
 */

const HOME_AFTER_ONBOARDING = "/acheteur/profil"

export function BuyerOnboardingClient({
  initial,
}: {
  initial: BuyerProfileSnapshot | null
}) {
  const router = useRouter()

  function handleSaved() {
    router.push(HOME_AFTER_ONBOARDING)
  }

  return (
    <OnboardingWizardShell
      roleLabel="Espace acheteur"
      heading="Où vivez-vous ?"
      subheading="Nous afficherons les produits que des rameneurs peuvent ramener jusqu'à votre quartier. Vous pourrez ajouter une autre adresse plus tard."
      steps={[
        {
          id: "zone",
          title: "Votre zone",
          meta: "Adresse de livraison",
          status: "current",
        },
      ]}
    >
      <header className="flex flex-col gap-2">
        <p className="font-body text-xs font-bold uppercase tracking-[0.04em] text-cream-600">
          Étape 1
        </p>
        <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-green-900">
          Où vivez-vous ?
        </h2>
        <p className="font-body text-md leading-relaxed text-cream-700">
          Indiquez votre adresse pour voir les produits livrables dans votre
          quartier.
        </p>
      </header>

      <BuyerZoneForm initial={initial} mode="onboarding" onSaved={handleSaved} />

      <Link
        href={HOME_AFTER_ONBOARDING}
        className="font-body text-sm text-cream-600 hover:text-cream-950"
      >
        Passer pour l&apos;instant
      </Link>
    </OnboardingWizardShell>
  )
}
