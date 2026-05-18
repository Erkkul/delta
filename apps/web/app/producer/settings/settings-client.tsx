"use client"

import {
  type ProducerSiretStatus,
  type ProducerStripeStatus,
} from "@delta/db/types"
import { useState } from "react"

/**
 * Section paramètres producteur (KAN-17 — PR-09).
 *
 * Une seule fonctionnalité active au MVP : le toggle « Boutique en pause »
 * qui appelle `POST /api/v1/producer/pause`. Les autres sections sont des
 * placeholders ouverts.
 */
export function SettingsClient({
  initialPaused,
  siretStatus,
  stripeStatus,
  email,
}: {
  initialPaused: boolean
  siretStatus: ProducerSiretStatus
  stripeStatus: ProducerStripeStatus
  email: string
}) {
  const [paused, setPaused] = useState(initialPaused)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function togglePause(next: boolean) {
    setError(null)
    setBusy(true)
    try {
      const response = await fetch("/api/v1/producer/pause", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paused: next }),
      })
      if (!response.ok) {
        const data = (await response
          .json()
          .catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? "Échec de la bascule.")
      }
      const body = (await response.json()) as { paused: boolean }
      setPaused(body.paused)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="px-6 py-8 desktop:px-10 desktop:py-10">
      <div className="mx-auto max-w-[880px]">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-green-900">
              Paramètres compte
            </h1>
            <p className="mt-1 text-sm text-cream-600">
              Compte, paiement, vérifications et conformité.
            </p>
          </div>
          <a
            href="/producer/profile"
            className="text-sm font-medium text-green-700 hover:text-green-800"
          >
            ← Profil public
          </a>
        </header>

        {/* Compte (placeholder) */}
        <SettingsBlock title="Compte">
          <Row
            icon="✉"
            title="Email"
            sub={email}
            tag={{ label: "Vérifié", tone: "ok" }}
            actionLabel="Bientôt"
          />
          <Row
            icon="🔒"
            title="Mot de passe"
            sub="10 caractères min., 1 majuscule, 1 chiffre."
            actionLabel="Bientôt"
          />
          <RowToggle
            icon="⏸"
            title="Mettre la boutique en pause"
            sub="Vacances, maladie — vos produits ne sont plus visibles côté acheteur."
            checked={paused}
            onChange={togglePause}
            disabled={busy}
          />
          {error ? (
            <div
              role="alert"
              className="mx-4 mb-4 rounded-md border border-[#C75B5B] bg-[#FDEDEC] px-3 py-2 text-xs text-[#C0392B]"
            >
              {error}
            </div>
          ) : null}
        </SettingsBlock>

        {/* Vérifications (read-only au MVP) */}
        <SettingsBlock title="Vérifications">
          <Row
            icon="₪"
            title="Compte Stripe Connect"
            sub={stripeStatusLabel(stripeStatus)}
            tag={
              stripeStatus === "active"
                ? { label: "Actif", tone: "ok" }
                : stripeStatus === "restricted"
                  ? { label: "À compléter", tone: "pending" }
                  : { label: "À configurer", tone: "pending" }
            }
            actionLabel="Bientôt"
          />
          <Row
            icon="🗂"
            title="SIRET"
            sub={siretStatusLabel(siretStatus)}
            tag={
              siretStatus === "verified"
                ? { label: "Vérifié", tone: "ok" }
                : siretStatus === "pending"
                  ? { label: "En vérification", tone: "pending" }
                  : { label: "À soumettre", tone: "pending" }
            }
            actionLabel="Bientôt"
          />
        </SettingsBlock>

        {/* Multi-rôle (placeholder, KAN-25/37) */}
        <div className="mb-6 rounded-lg bg-gradient-to-br from-earth-500 to-earth-800 p-5 text-white">
          <div className="text-[10px] font-bold uppercase tracking-wider text-earth-200">
            Multi-rôle
          </div>
          <div className="mt-1 font-display text-base font-bold leading-tight">
            Devenir aussi rameneur ou acheteur
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-white/85">
            Bientôt — vous pourrez activer ces rôles depuis le même compte
            (KAN-25 acheteur, KAN-37 rameneur).
          </p>
        </div>

        {/* RGPD (placeholder) */}
        <SettingsBlock title="Données & RGPD">
          <Row
            icon="↓"
            title="Exporter mes données"
            sub="Profil, produits, ventes, conversations (JSON + CSV)."
            actionLabel="Bientôt"
          />
          <Row
            icon="📄"
            title="CGU · CGV · Mentions légales"
            sub="Version acquittée à l'inscription."
            actionLabel="Bientôt"
          />
        </SettingsBlock>
      </div>
    </div>
  )
}

function SettingsBlock({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-6">
      <div className="mb-2 pl-1 text-[11px] font-bold uppercase tracking-wider text-cream-500">
        {title}
      </div>
      <div className="overflow-hidden rounded-lg border border-cream-200 bg-white">
        {children}
      </div>
    </section>
  )
}

type Tone = "ok" | "pending"

function Row({
  icon,
  title,
  sub,
  tag,
  actionLabel,
}: {
  icon: string
  title: string
  sub: string
  tag?: { label: string; tone: Tone }
  actionLabel?: string
}) {
  return (
    <div className="flex items-center gap-3.5 border-b border-cream-100 px-4 py-3.5 last:border-b-0">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-green-50 text-green-700">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm font-semibold text-cream-950">
          {title}
          {tag ? (
            <span
              className={`rounded-pill px-2 py-[2px] text-[10px] font-bold uppercase tracking-wide ${
                tag.tone === "ok"
                  ? "bg-green-100 text-green-700"
                  : "bg-earth-100 text-earth-800"
              }`}
            >
              {tag.label}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 text-xs text-cream-600">{sub}</div>
      </div>
      {actionLabel ? (
        <span className="rounded-md px-2.5 py-1.5 text-xs font-medium text-cream-500">
          {actionLabel}
        </span>
      ) : null}
    </div>
  )
}

function RowToggle({
  icon,
  title,
  sub,
  checked,
  onChange,
  disabled,
}: {
  icon: string
  title: string
  sub: string
  checked: boolean
  onChange: (next: boolean) => void | Promise<void>
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-3.5 border-b border-cream-100 px-4 py-3.5 last:border-b-0">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-green-50 text-green-700">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-cream-950">{title}</div>
        <div className="mt-0.5 text-xs text-cream-600">{sub}</div>
      </div>
      <label className="relative inline-block h-6 w-[42px] shrink-0">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => {
            void onChange(e.target.checked)
          }}
          className="peer h-0 w-0 opacity-0"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 cursor-pointer rounded-full bg-cream-300 transition-colors peer-checked:bg-green-600 peer-disabled:opacity-50"
        />
        <span
          aria-hidden="true"
          className="absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-transform peer-checked:translate-x-[18px]"
        />
      </label>
    </div>
  )
}

function siretStatusLabel(status: ProducerSiretStatus): string {
  switch (status) {
    case "verified":
      return "Vérifié par INSEE."
    case "pending":
      return "Vérification en cours (≤ 48 h)."
    case "rejected":
      return "À corriger — voir le wizard."
    case "not_submitted":
      return "À renseigner depuis le wizard d'onboarding."
  }
}

function stripeStatusLabel(status: ProducerStripeStatus): string {
  switch (status) {
    case "active":
      return "KYC validé, virements activés."
    case "restricted":
      return "Documents complémentaires demandés par Stripe."
    case "pending":
      return "Validation en cours côté Stripe."
    case "disabled":
      return "Compte désactivé — contactez le support."
    case "not_created":
      return "À configurer depuis le wizard d'onboarding."
  }
}
