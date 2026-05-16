"use client"

import { PASSWORD_MIN, passwordHint } from "@delta/contracts/auth"

import { PasswordStrength } from "./password-strength"

/**
 * Champ de saisie de mot de passe (label + input + strength meter +
 * hint policy). Partagé entre :
 *   - `SignupForm` (AU-02 création de compte — KAN-2)
 *   - `ResetPasswordForm` (AU-FP3 nouveau mot de passe — KAN-157)
 *
 * Volontairement contrôlé — c'est au parent (form) de gérer la state,
 * la validation et la soumission. La politique de force est définie côté
 * `@delta/contracts/auth` (Password Zod schema + passwordHint) et
 * appliquée serveur. Cet input est purement présentationnel.
 *
 * Décision 2026-05-13 : politique 10 caractères / maj / min / digit.
 */
export type PasswordFieldProps = {
  id: string
  label: string
  value: string
  onChange: (next: string) => void
  /** `new-password` par défaut, à utiliser tel quel pour signup ET reset. */
  autoComplete?: string
  /** Inputs additionnels pour zxcvbn (typiquement l'email). */
  userInputs?: string[]
  /** Erreur affichée sous l'input (priorité sur le hint policy). */
  error?: string
  /** Hint personnalisé. Par défaut : `passwordHint` partagé. */
  hint?: string
  disabled?: boolean
}

export function PasswordField(props: PasswordFieldProps) {
  const {
    id,
    label,
    value,
    onChange,
    autoComplete = "new-password",
    userInputs = [],
    error,
    hint = passwordHint,
    disabled = false,
  } = props
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-body text-xs font-medium uppercase tracking-[0.04em] text-cream-700"
      >
        {label}
      </label>
      <input
        id={id}
        type="password"
        autoComplete={autoComplete}
        required
        minLength={PASSWORD_MIN}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
        }}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : hintId}
        className="rounded-md border border-cream-300 bg-cream-50 px-3.5 py-3 font-body text-base text-cream-950 placeholder:text-cream-500 focus:border-green-600 focus:outline-none focus:shadow-focus"
      />
      <PasswordStrength value={value} userInputs={userInputs} />
      {error ? (
        <p id={errorId} className="font-body text-xs text-[#C0392B]">
          {error}
        </p>
      ) : (
        <p id={hintId} className="font-body text-xs text-cream-600">
          {hint}
        </p>
      )}
    </div>
  )
}
