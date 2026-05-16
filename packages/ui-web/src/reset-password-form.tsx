"use client"

import {
  ResetPasswordInput,
  type ResetPasswordInput as ResetPasswordInputType,
} from "@delta/contracts/auth"
import { useState, type FormEvent } from "react"

import { OTP_LENGTH, OtpDigits } from "./otp-digits"
import { PasswordField } from "./password-field"

/**
 * ResetPasswordForm AU-FP3 (KAN-157). Composite OTP + nouveau mot de passe.
 *
 * Réutilise les briques partagées :
 *   - `OtpDigits` (extrait d'`OtpForm` AU-04) — 6 cases avec auto-focus,
 *     paste, navigation clavier.
 *   - `PasswordField` (extrait de `SignupForm`) — strength meter + hint
 *     policy 10/maj/min/digit synchronisé avec `@delta/contracts/auth`.
 *
 * Pas d'auto-submit ici (le password n'est jamais "complet"), c'est le
 * bouton qui déclenche.
 *
 * Erreurs serveur attendues :
 *   - 400 (validation) → propagée tel quel
 *   - 401 (token invalide ou expiré) → message générique anti-énumération
 *   - 429 (rate-limit) → message dédié avec délai
 */
export type ResetPasswordFormProps = {
  email: string
  resetPassword: (input: ResetPasswordInputType) => Promise<void>
}

export function ResetPasswordForm(props: ResetPasswordFormProps) {
  const { email, resetPassword } = props

  const [digits, setDigits] = useState<string[]>(() =>
    Array<string>(OTP_LENGTH).fill(""),
  )
  const [newPassword, setNewPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<string, string>>
  >({})

  const otp = digits.join("")
  const isOtpComplete = otp.length === OTP_LENGTH && /^\d{6}$/.test(otp)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    setFieldErrors({})

    const parsed = ResetPasswordInput.safeParse({
      email,
      token: otp,
      newPassword,
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

    setSubmitting(true)
    try {
      await resetPassword(parsed.data)
      // Succès : redirection gérée par le caller. On garde `submitting=true`
      // pour éviter un flash actif avant unmount.
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Réinitialisation impossible, réessayez plus tard.",
      )
      setSubmitting(false)
    }
  }

  const canSubmit = isOtpComplete && newPassword.length > 0 && !submitting

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e)
      }}
      className="flex w-full flex-col gap-6"
      noValidate
    >
      <div className="flex flex-col gap-3">
        <p className="font-body text-sm text-cream-700">
          Saisissez le code à 6 chiffres envoyé à{" "}
          <b className="text-cream-950">{email}</b>.
        </p>
        <OtpDigits
          value={digits}
          onChange={setDigits}
          disabled={submitting}
          invalid={Boolean(fieldErrors.token)}
          testIdPrefix="reset-otp-digit"
        />
        {fieldErrors.token ? (
          <p className="font-body text-xs text-[#C0392B]">
            {fieldErrors.token}
          </p>
        ) : (
          <p className="font-body text-xs text-cream-500">
            Code valable 1 heure.
          </p>
        )}
      </div>

      <fieldset className="flex flex-col gap-4" disabled={submitting}>
        <PasswordField
          id="new-password"
          label="Nouveau mot de passe"
          value={newPassword}
          onChange={setNewPassword}
          userInputs={[email]}
          error={fieldErrors.newPassword}
        />
      </fieldset>

      {formError ? (
        <div
          role="alert"
          data-testid="reset-password-error"
          className="rounded-md border border-[#F5C6C0] bg-[#FDEDEC] px-4 py-3 font-body text-sm text-[#C0392B]"
        >
          {formError}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        data-testid="reset-password-submit"
        className="flex items-center justify-center rounded-pill bg-green-600 px-6 py-3.5 font-body text-base font-semibold text-cream-50 transition hover:bg-green-700 focus:outline-none focus:shadow-focus disabled:bg-cream-300 disabled:text-cream-500"
      >
        {submitting ? "Réinitialisation…" : "Réinitialiser le mot de passe"}
      </button>
    </form>
  )
}
