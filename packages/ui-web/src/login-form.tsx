"use client"

import { LoginInput, type LoginInput as LoginInputType } from "@delta/contracts/auth"
import { useState, type FormEvent } from "react"

/**
 * LoginForm — écran de connexion (KAN-3).
 *
 * Layout calqué sur `SignupForm` (KAN-2, même mockup
 * `01-authentication.html` par persona) : bouton Google placé en
 * premier, séparateur « ou avec votre email », champs email + password,
 * lien « Mot de passe oublié ? » (inactif au MVP, KAN-157 prévu),
 * bouton submit, bouton Apple disabled (décision produit 2026-05-13
 * — Apple Developer non provisionné). Microcopy adaptée :
 *   - submit : « Se connecter »
 *   - erreurs : message générique unique (anti-énumération)
 *
 * États gérés :
 *   - submitting : `null | "email" | "google"`
 *   - formError : message texte unique (couvre 401 et 429)
 *   - fieldErrors : seulement pour validation client (email mal formé,
 *     password vide). 401/429 n'écrivent jamais dans fieldErrors.
 */
export type LoginFormProps = {
  loginWithEmail: (input: LoginInputType) => Promise<void>
  loginWithGoogle: () => Promise<void>
  signupHref?: string
  forgotPasswordHref?: string
}

export function LoginForm(props: LoginFormProps) {
  const {
    loginWithEmail,
    loginWithGoogle,
    signupHref = "/signup",
    forgotPasswordHref = "/forgot-password",
  } = props

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

    const parsed = LoginInput.safeParse({ email, password })
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
      await loginWithEmail(parsed.data)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Identifiants invalides.",
      )
    } finally {
      setSubmitting(null)
    }
  }

  async function handleGoogleClick() {
    setFormError(null)
    setSubmitting("google")
    try {
      await loginWithGoogle()
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

      <button
        type="button"
        disabled
        title="Bientôt disponible"
        aria-disabled="true"
        className="flex items-center justify-center gap-3 rounded-lg border border-cream-300 bg-white px-6 py-3 font-body text-base font-semibold text-cream-500 opacity-60"
      >
        <AppleMark />
        Continuer avec Apple
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

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label
              htmlFor="password"
              className="font-body text-xs font-medium uppercase tracking-[0.04em] text-cream-700"
            >
              Mot de passe
            </label>
            <a
              href={forgotPasswordHref}
              className="font-body text-xs text-green-700 underline decoration-cream-300 underline-offset-2 hover:text-green-800"
            >
              Mot de passe oublié&nbsp;?
            </a>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={
              fieldErrors.password ? "password-error" : undefined
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
          ) : null}
        </div>
      </fieldset>

      {formError ? (
        <div
          role="alert"
          data-testid="login-error"
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
        {submitting === "email" ? "Connexion…" : "Se connecter"}
      </button>

      <p className="text-center font-body text-sm text-cream-600">
        Pas encore de compte&nbsp;?{" "}
        <a
          href={signupHref}
          className="text-green-700 underline decoration-cream-300 underline-offset-2 hover:text-green-800"
        >
          Créer un compte
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

function AppleMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M12.94 9.5c-.02-1.85 1.51-2.74 1.58-2.79-.86-1.27-2.21-1.44-2.69-1.46-1.14-.12-2.23.68-2.81.68-.58 0-1.48-.66-2.43-.64-1.25.02-2.4.73-3.04 1.85-1.3 2.25-.33 5.58.93 7.41.62.89 1.36 1.89 2.32 1.86.93-.04 1.28-.6 2.41-.6 1.12 0 1.44.6 2.42.58 1-.02 1.63-.91 2.24-1.81.71-1.04 1-2.05 1.02-2.1-.02-.01-1.95-.75-1.97-2.98zM11.1 4.07c.51-.62.86-1.48.76-2.34-.74.03-1.63.49-2.16 1.11-.47.55-.89 1.43-.78 2.27.82.06 1.67-.42 2.18-1.04z" />
    </svg>
  )
}
