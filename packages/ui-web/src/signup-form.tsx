"use client"

import {
  SignupInput,
  type SignupInput as SignupInputType,
} from "@delta/contracts/auth"
import { useState, type FormEvent } from "react"

import { PasswordField } from "./password-field"

/**
 * SignupForm AU-02 (révisé 2026-05-13) — email + password + Google
 * uniquement. Pas de rôle (déféré à AU-06 Choix rôle) ni de checkboxes
 * (consents implicites). Bouton Google placé en premier, suivi du
 * séparateur « ou avec votre email », puis champs.
 *
 * La mention CGU/confidentialité est rendue par le caller (page),
 * pas par le form, pour cohérence DESIGN.md / décision 2026-05-13.
 */
export type SignupFormProps = {
  termsVersion: string
  privacyVersion: string
  signupWithEmail: (input: SignupInputType) => Promise<void>
  signupWithGoogle: () => Promise<void>
}

export function SignupForm(props: SignupFormProps) {
  const { termsVersion, privacyVersion, signupWithEmail, signupWithGoogle } =
    props

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState<null | "email" | "google">(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<string, string>>
  >({})

  async function handleEmailSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    setFieldErrors({})

    const parsed = SignupInput.safeParse({
      email,
      password,
      termsVersion,
      privacyVersion,
    })
    if (!parsed.success) {
      const errs: Partial<Record<string, string>> = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path[0]
        if (typeof path === "string" && !(path in errs)) {
          errs[path] = issue.message
        }
      }
      setFieldErrors(errs)
      setFormError("Merci de corriger les champs en erreur.")
      return
    }

    setSubmitting("email")
    try {
      await signupWithEmail(parsed.data)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Erreur inconnue, réessayez.",
      )
    } finally {
      setSubmitting(null)
    }
  }

  async function handleGoogleClick() {
    setFormError(null)
    setSubmitting("google")
    try {
      await signupWithGoogle()
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Connexion Google indisponible.",
      )
      setSubmitting(null)
    }
  }

  const isBusy = submitting !== null

  return (
    <form
      onSubmit={(e) => {
        void handleEmailSubmit(e)
      }}
      className="flex w-full flex-col gap-5"
      noValidate
    >
      <button
        type="button"
        onClick={() => {
          void handleGoogleClick()
        }}
        disabled={isBusy}
        className="flex items-center justify-center gap-3 rounded-lg border border-cream-300 bg-white px-6 py-3 font-body text-base font-semibold text-cream-950 transition hover:border-cream-400 hover:shadow-subtle focus:outline-none focus:shadow-focus disabled:opacity-60"
        aria-label="Continuer avec Google"
      >
        <GoogleMark />
        {submitting === "google" ? "Redirection…" : "Continuer avec Google"}
      </button>

      <div className="flex items-center gap-3" role="separator">
        <div className="flex-1 border-t border-cream-200" />
        <span className="font-body text-xs uppercase tracking-[0.04em] text-cream-600">
          ou avec votre email
        </span>
        <div className="flex-1 border-t border-cream-200" />
      </div>

      <fieldset className="flex flex-col gap-4" disabled={isBusy}>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email"
            className="font-body text-xs font-medium uppercase tracking-[0.04em] text-cream-700"
          >
            Adresse email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            className="rounded-md border border-cream-300 bg-cream-50 px-3.5 py-3 font-body text-base text-cream-950 placeholder:text-cream-500 focus:border-green-600 focus:outline-none focus:shadow-focus"
            placeholder="vous@exemple.com"
          />
          {fieldErrors.email ? (
            <p id="email-error" className="font-body text-xs text-[#C0392B]">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <PasswordField
          id="password"
          label="Mot de passe"
          value={password}
          onChange={setPassword}
          userInputs={[email]}
          error={fieldErrors.password}
        />
      </fieldset>

      {formError ? (
        <div
          role="alert"
          className="rounded-md border border-[#F5C6C0] bg-[#FDEDEC] px-4 py-3 font-body text-sm text-[#C0392B]"
        >
          {formError}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isBusy}
        className="flex items-center justify-center rounded-pill bg-green-600 px-6 py-3.5 font-body text-base font-semibold text-cream-50 transition hover:bg-green-700 focus:outline-none focus:shadow-focus disabled:bg-cream-300 disabled:text-cream-500"
      >
        {submitting === "email" ? "Création en cours…" : "Créer mon compte"}
      </button>

      <div className="flex items-start gap-3 rounded-md border border-green-200 bg-green-50 p-3.5">
        <ShieldIcon />
        <p className="font-body text-xs leading-relaxed text-green-900">
          Vos données restent en France. Aucune revente. Suppression sur simple demande.
        </p>
      </div>
    </form>
  )
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.56 2.68-3.86 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.92v2.32A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.98 10.72A5.4 5.4 0 0 1 3.7 9c0-.6.1-1.18.28-1.72V4.96H.92A9 9 0 0 0 0 9c0 1.46.34 2.84.92 4.04l3.06-2.32z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.36l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .92 4.96l3.06 2.32C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#276634"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0, marginTop: 1 }}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}
