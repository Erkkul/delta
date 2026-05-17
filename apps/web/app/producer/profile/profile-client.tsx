"use client"

import { type ProducerProfileSnapshot } from "@delta/contracts/producer"

import { ProducerProfileForm } from "@/components/producer/producer-profile-form"

/**
 * Layout principal de la page `/producer/profile` (KAN-17 — PR-08).
 *
 * MVP : pas de sidebar gauche (la sidebar producteur globale arrivera avec
 * KAN-18 — Tableau de bord producteur). La page se compose simplement d'un
 * header + du formulaire en mode `edit` (split édition + preview à droite).
 */
export function ProfileClient({
  initial,
}: {
  initial: ProducerProfileSnapshot
}) {
  return (
    <main className="min-h-screen bg-cream-50 px-6 py-8 desktop:px-10 desktop:py-10">
      <div className="mx-auto max-w-[1280px]">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-green-900">
              Profil public
            </h1>
            <p className="mt-1 text-sm text-cream-600">
              Ce que les acheteurs voient quand ils découvrent votre ferme.
            </p>
          </div>
          <a
            href="/producer/settings"
            className="text-sm font-medium text-green-700 hover:text-green-800"
          >
            Paramètres →
          </a>
        </header>
        <ProducerProfileForm initial={initial} mode="edit" />
      </div>
    </main>
  )
}
