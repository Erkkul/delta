"use client"

import {
  LEGAL_FORMS,
  type LegalForm,
  SIRET_DECLARATION_ERROR_CODES,
  type SiretDeclarationErrorCode,
} from "@delta/contracts/producer"
import { useState, type FormEvent } from "react"

/**
 * SiretForm — étape 2 du wizard `/onboarding/producteur` (KAN-16).
 * Source : maquette `design/maquettes/producteur/pr-02-onboarding-stripe.html`.
 *
 * Champs : SIRET (14 chiffres avec masque espaces), raison sociale,
 * forme juridique (select whitelist), code NAF. Bandeau "Vérification
 * asynchrone" en tête. CTA "Valider & continuer" → POST endpoint puis
 * onContinue() pour passer à l'étape 3.
 */

export type SiretFormProps = {
  onSubmit: (input: SiretFormValues) => Promise<SiretFormResult>
  onContinue: () => void
  onBack?: () => void
}

export type SiretFormValues = {
  siret: string
  legal_name: string
  legal_form: LegalForm
  naf_code: string
}

export type SiretFormResult =
  | { ok: true }
  | { ok: false; code: SiretDeclarationErrorCode; message?: string }

export function SiretForm({ onSubmit, onContinue, onBack }: SiretFormProps) {
  const [values, setValues] = useState<SiretFormValues>({
    siret: "",
    legal_name: "",
    legal_form: "EARL",
    naf_code: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await onSubmit(values)
      if (result.ok) {
        onContinue()
      } else {
        setError(messageForCode(result.code, result.message))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e)
      }}
      className="flex flex-col gap-5"
    >
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-green-700">
          Étape 2 sur 3
        </span>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight tracking-tight text-green-900">
          Vérification SIRET
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-cream-600">
          Renseignez votre numéro de SIRET. La vérification est asynchrone —
          vous pouvez continuer à configurer votre catalogue pendant ce temps,
          mais vos produits resteront invisibles aux acheteurs jusqu'à
          validation.
        </p>
      </div>

      <div className="rounded-xl border border-earth-100 bg-earth-50 p-3.5">
        <p className="text-sm leading-relaxed text-cream-700">
          <strong className="font-bold text-earth-800">
            Vérification asynchrone
          </strong>{" "}
          — vos produits seront publiables mais cachés du catalogue tant que
          le SIRET n'est pas validé.
        </p>
      </div>

      <Field label="Numéro SIRET (14 chiffres)" htmlFor="siret">
        <input
          id="siret"
          type="text"
          inputMode="numeric"
          maxLength={17}
          required
          autoComplete="off"
          value={values.siret}
          onChange={(e) => setValues((v) => ({ ...v, siret: e.target.value }))}
          className="w-full rounded-xl border-[1.5px] border-cream-300 bg-cream-50 px-4 py-3.5 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/10"
        />
        <Help>
          Le SIRET est vérifié en cohérence avec la dénomination de votre ferme
          via la base INSEE.
        </Help>
      </Field>

      <Field label="Raison sociale (telle que déclarée)" htmlFor="legal_name">
        <input
          id="legal_name"
          type="text"
          required
          minLength={2}
          value={values.legal_name}
          onChange={(e) =>
            setValues((v) => ({ ...v, legal_name: e.target.value }))
          }
          className="w-full rounded-xl border-[1.5px] border-cream-300 bg-cream-50 px-4 py-3.5 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/10"
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2">
        <Field label="Forme juridique" htmlFor="legal_form">
          <select
            id="legal_form"
            value={values.legal_form}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                legal_form: e.target.value as LegalForm,
              }))
            }
            className="w-full rounded-xl border-[1.5px] border-cream-300 bg-cream-50 px-4 py-3.5 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/10"
          >
            {LEGAL_FORMS.map((form) => (
              <option key={form} value={form}>
                {form}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Activité principale (NAF)" htmlFor="naf_code">
          <input
            id="naf_code"
            type="text"
            required
            placeholder="01.13Z"
            value={values.naf_code}
            onChange={(e) =>
              setValues((v) => ({ ...v, naf_code: e.target.value }))
            }
            className="w-full rounded-xl border-[1.5px] border-cream-300 bg-cream-50 px-4 py-3.5 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/10"
          />
        </Field>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800"
        >
          {error}
        </div>
      ) : null}

      <div className="flex items-center gap-2.5 pt-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="px-2 py-3 text-sm font-medium text-cream-600 hover:text-cream-700"
          >
            ← Étape précédente
          </button>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="flex flex-1 items-center justify-center gap-2 rounded-pill bg-green-600 px-5 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-green-700 disabled:opacity-60"
        >
          {submitting ? "Envoi…" : "Valider & continuer →"}
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-cream-700">
        {label}
      </span>
      {children}
    </label>
  )
}

function Help({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-relaxed text-cream-600">{children}</p>
}

function messageForCode(
  code: SiretDeclarationErrorCode,
  serverMessage?: string,
): string {
  if (code === SIRET_DECLARATION_ERROR_CODES.SiretAlreadyVerified) {
    return "Votre SIRET est déjà vérifié et ne peut plus être modifié."
  }
  if (code === SIRET_DECLARATION_ERROR_CODES.RateLimited) {
    return "Trop de soumissions, réessayez dans quelques minutes."
  }
  if (code === SIRET_DECLARATION_ERROR_CODES.ValidationFailed) {
    return serverMessage ?? "Le formulaire contient des erreurs."
  }
  if (code === SIRET_DECLARATION_ERROR_CODES.RoleForbidden) {
    return "Seuls les producteurs peuvent accéder à cette étape."
  }
  return "Erreur serveur, réessayez."
}
