"use client"

import {
  ROLES,
  type Role,
  SignupInput,
  type SignupInput as SignupInputType,
} from "@delta/contracts/auth"
import { useState, type FormEvent } from "react"

export type SignupFormProps = {
  termsVersion: string
  privacyVersion: string
  termsUrl?: string
  privacyUrl?: string
  loginUrl?: string
  defaultRole?: Role
  signupWithEmail: (input: SignupInputType) => Promise<void>
  signupWithGoogle: (role: Role) => Promise<void>
}

const ROLE_LABELS: Record<Role, { title: string; hint: string }> = {
  acheteur: {
    title: "Acheteur",
    hint: "J'aime les produits locaux et je veux y accéder facilement.",
  },
  rameneur: {
    title: "Rameneur",
    hint: "Je fais des trajets régulièrement et je peux ramener des produits.",
  },
  producteur: {
    title: "Producteur",
    hint: "Je produis et je veux vendre via la plateforme.",
  },
}

export function SignupForm(props: SignupFormProps) {
  const {
    termsVersion,
    privacyVersion,
    termsUrl = "/legal/cgu",
    privacyUrl = "/legal/confidentialite",
    loginUrl = "/login",
    defaultRole = "acheteur",
    signupWithEmail,
    signupWithGoogle,
  } = props

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<Role>(defaultRole)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [submitting, setSubmitting] = useState<null | "email" | "google">(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>(
    {},
  )

  async function handleEmailSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    setFieldErrors({})

    const parsed = SignupInput.safeParse({
      email,
      password,
      role,
      acceptedTerms,
      acceptedPrivacy,
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
    if (!acceptedTerms || !acceptedPrivacy) {
      setFormError(
        "Merci d'accepter les CGU et la politique de confidentialité avant de continuer.",
      )
      return
    }
    setSubmitting("google")
    try {
      await signupWithGoogle(role)
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
      className="flex w-full flex-col gap-6"
      noValidate
    >
      <fieldset className="flex flex-col gap-3" disabled={isBusy}>
        <legend className="font-body text-xs font-medium uppercase tracking-[0.04em] text-cream-700">
          Je m'inscris en tant que
        </legend>
        <div className="grid gap-2 tablet:grid-cols-3">
          {ROLES.map((r) => {
            const checked = role === r
            return (
              <label
                key={r}
                className={[
                  "flex cursor-pointer flex-col gap-1 rounded-md border bg-cream-50 px-4 py-3 transition",
                  checked
                    ? "border-green-600 shadow-focus"
                    : "border-cream-300 hover:border-cream-400",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="role"
                  value={r}
                  checked={checked}
                  onChange={() => setRole(r)}
                  className="sr-only"
                />
                <span className="font-body text-base font-semibold text-cream-950">
                  {ROLE_LABELS[r].title}
                </span>
                <span className="font-body text-sm text-cream-600">
                  {ROLE_LABELS[r].hint}
                </span>
              </label>
            )
          })}
        </div>
        {fieldErrors.role ? (
          <p className="font-body text-xs text-[#C0392B]">{fieldErrors.role}</p>
        ) : null}
      </fieldset>

      <fieldset className="flex flex-col gap-4" disabled={isBusy}>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="email"
            className="font-body text-xs font-medium uppercase tracking-[0.04em] text-cream-700"
          >
            Email
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
            placeholder="prenom.nom@exemple.fr"
          />
          {fieldErrors.email ? (
            <p
              id="email-error"
              className="font-body text-xs text-[#C0392B]"
            >
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="password"
            className="font-body text-xs font-medium uppercase tracking-[0.04em] text-cream-700"
          >
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={
              fieldErrors.password ? "password-error" : "password-hint"
            }
            className="rounded-md border border-cream-300 bg-cream-50 px-3.5 py-3 font-body text-base text-cream-950 placeholder:text-cream-500 focus:border-green-600 focus:outline-none focus:shadow-focus"
          />
          {fieldErrors.password ? (
            <p
              id="password-error"
              className="font-body text-xs text-[#C0392B]"
            >
              {fieldErrors.password}
            </p>
          ) : (
            <p
              id="password-hint"
              className="font-body text-xs text-cream-600"
            >
              10 caractères minimum, au moins une majuscule, une minuscule et un chiffre.
            </p>
          )}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3" disabled={isBusy}>
        <label className="flex items-start gap-3 font-body text-sm text-cream-700">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-cream-300 text-green-600 focus:ring-green-600"
            aria-describedby={
              fieldErrors.acceptedTerms ? "terms-error" : undefined
            }
          />
          <span>
            J'accepte les{" "}
            <a
              href={termsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-green-700 underline hover:text-green-800"
            >
              conditions générales d'utilisation et de vente
            </a>
            .
          </span>
        </label>
        {fieldErrors.acceptedTerms ? (
          <p id="terms-error" className="font-body text-xs text-[#C0392B]">
            {fieldErrors.acceptedTerms}
          </p>
        ) : null}

        <label className="flex items-start gap-3 font-body text-sm text-cream-700">
          <input
            type="checkbox"
            checked={acceptedPrivacy}
            onChange={(e) => setAcceptedPrivacy(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-cream-300 text-green-600 focus:ring-green-600"
            aria-describedby={
              fieldErrors.acceptedPrivacy ? "privacy-error" : undefined
            }
          />
          <span>
            J'ai pris connaissance de la{" "}
            <a
              href={privacyUrl}
              target="_blank"
              rel="noreferrer"
              className="text-green-700 underline hover:text-green-800"
            >
              politique de confidentialité
            </a>
            {" "}et consens au traitement de mes données.
          </span>
        </label>
        {fieldErrors.acceptedPrivacy ? (
          <p
            id="privacy-error"
            className="font-body text-xs text-[#C0392B]"
          >
            {fieldErrors.acceptedPrivacy}
          </p>
        ) : null}
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

      <div className="relative my-1 flex items-center">
        <div className="flex-1 border-t border-cream-200" />
        <span className="px-3 font-body text-xs uppercase tracking-[0.04em] text-cream-600">
          ou
        </span>
        <div className="flex-1 border-t border-cream-200" />
      </div>

      <button
        type="button"
        onClick={() => {
          void handleGoogleClick()
        }}
        disabled={isBusy}
        className="flex items-center justify-center gap-3 rounded-pill border border-cream-300 bg-cream-50 px-6 py-3 font-body text-base font-medium text-cream-950 transition hover:border-cream-400 hover:shadow-subtle focus:outline-none focus:shadow-focus disabled:opacity-60"
        aria-label="Continuer avec Google"
      >
        <GoogleMark />
        {submitting === "google" ? "Redirection…" : "Continuer avec Google"}
      </button>

      <p className="text-center font-body text-sm text-cream-600">
        Vous avez déjà un compte ?{" "}
        <a
          href={loginUrl}
          className="text-green-700 underline hover:text-green-800"
        >
          Connectez-vous
        </a>
        .
      </p>
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
