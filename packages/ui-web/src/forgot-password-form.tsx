"use client"

import {
  ForgotPasswordInput,
  type ForgotPasswordInput as ForgotPasswordInputType,
} from "@delta/contracts/auth"
import { useState, type FormEvent } from "react"

/**
 * ForgotPasswordForm AU-FP1 (KAN-157). Saisie d'un email pour déclencher
 * l'envoi d'un code OTP de récupération.
 *
 * Anti-énumération côté serveur : la réponse est toujours 204. Le caller
 * (page) redirige vers `/forgot-password/sent?email=...` quel que soit le
 * résultat. Seules les erreurs de validation locale (email mal formé) et
 * le rate-limit (429) sont remontés à l'utilisateur.
 */
export type ForgotPasswordFormProps = {
  defaultEmail?: string
  requestReset: (input: ForgotPasswordInputType) => Promise<void>
}

export function ForgotPasswordForm(props: ForgotPasswordFormProps) {
  const { defaultEmail = "", requestReset } = props

  const [email, setEmail] = useState(defaultEmail)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    setEmailError(null)

    const parsed = ForgotPasswordInput.safeParse({ email })
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      setEmailError(issue?.message ?? "Adresse email invalide.")
      setFormError("Merci de corriger l'adresse saisie.")
      return
    }

    setSubmitting(true)
    try {
      await requestReset(parsed.data)
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Envoi impossible, réessayez plus tard.",
      )
      setSubmitting(false)
    }
    // En cas de succès, on laisse le caller naviguer (la state submitting
    // reste `true` jusqu'au unmount) — pas de toggle pour éviter un
    // flash de bouton actif avant la redirection.
  }

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e)
      }}
      className="flex w-full flex-col gap-5"
      noValidate
    >
      <fieldset className="flex flex-col gap-4" disabled={submitting}>
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
            onChange={(e) => {
              setEmail(e.target.value)
            }}
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? "email-error" : undefined}
            className="rounded-md border border-cream-300 bg-cream-50 px-3.5 py-3 font-body text-base text-cream-950 placeholder:text-cream-500 focus:border-green-600 focus:outline-none focus:shadow-focus"
            placeholder="vous@exemple.com"
          />
          {emailError ? (
            <p id="email-error" className="font-body text-xs text-[#C0392B]">
              {emailError}
            </p>
          ) : (
            <p className="font-body text-xs text-cream-600">
              Saisissez l&apos;email associé à votre compte. Si un compte
              existe, un code à 6 chiffres vous sera envoyé.
            </p>
          )}
        </div>
      </fieldset>

      {formError ? (
        <div
          role="alert"
          data-testid="forgot-password-error"
          className="rounded-md border border-[#F5C6C0] bg-[#FDEDEC] px-4 py-3 font-body text-sm text-[#C0392B]"
        >
          {formError}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="flex items-center justify-center rounded-pill bg-green-600 px-6 py-3.5 font-body text-base font-semibold text-cream-50 transition hover:bg-green-700 focus:outline-none focus:shadow-focus disabled:bg-cream-300 disabled:text-cream-500"
      >
        {submitting ? "Envoi…" : "Recevoir un code"}
      </button>
    </form>
  )
}
