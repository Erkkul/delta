"use client"

import {
  useEffect,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react"

/**
 * Composant primitif : 6 cases pour saisir un code OTP à 6 chiffres
 * (auto-focus à l'arrivée, navigation clavier, paste). Volontairement
 * contrôlé — c'est au parent de gérer la state, la soumission et l'erreur.
 *
 * Utilisé par :
 *   - `OtpForm` (AU-04 verify email — KAN-2)
 *   - `ResetPasswordForm` (AU-FP3 nouveau mot de passe — KAN-157)
 *
 * UX (décision 2026-05-13) :
 *   - Case 1 reçoit le focus à l'arrivée (sauf si `autoFocus={false}`).
 *   - Saisie d'un chiffre → focus suivant.
 *   - Paste d'un code complet (6 chiffres) → remplit toutes les cases.
 *   - Backspace + arrows pour navigation clavier.
 */
const LENGTH = 6

export type OtpDigitsProps = {
  value: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
  invalid?: boolean
  autoFocus?: boolean
  testIdPrefix?: string
}

export function OtpDigits(props: OtpDigitsProps) {
  const {
    value,
    onChange,
    disabled = false,
    invalid = false,
    autoFocus = true,
    testIdPrefix = "otp-digit",
  } = props
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (autoFocus) {
      inputsRef.current[0]?.focus()
    }
  }, [autoFocus])

  function setDigit(index: number, raw: string) {
    const cleaned = raw.replace(/\D/g, "")
    const last = cleaned.slice(-1)
    const next = [...value]
    next[index] = last || ""
    onChange(next)
    if (last && index < LENGTH - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "")
    if (!pasted) return
    e.preventDefault()
    const chars = pasted.slice(0, LENGTH).split("")
    const next = [...value]
    for (let i = 0; i < LENGTH; i += 1) {
      next[i] = chars[i] ?? ""
    }
    onChange(next)
    const lastFilled = Math.min(chars.length, LENGTH) - 1
    inputsRef.current[lastFilled]?.focus()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
    if (e.key === "ArrowRight" && index < LENGTH - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  // Garantit la bonne longueur du tableau quel que soit l'état parent.
  const digits = Array<string>(LENGTH)
    .fill("")
    .map((_, i) => value[i] ?? "")

  return (
    <div
      className="flex gap-2"
      role="group"
      aria-label="Code à 6 chiffres"
    >
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el
          }}
          value={d}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={i === 0 ? handlePaste : undefined}
          inputMode="numeric"
          pattern="\d*"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          aria-invalid={invalid}
          aria-label={`Chiffre ${String(i + 1)} sur 6`}
          data-testid={`${testIdPrefix}-${String(i)}`}
          className="h-14 w-12 rounded-md border border-cream-300 bg-cream-50 text-center font-body text-xl font-semibold text-cream-950 focus:border-green-600 focus:outline-none focus:shadow-focus tablet:h-16 tablet:w-14 tablet:text-2xl"
        />
      ))}
    </div>
  )
}

export const OTP_LENGTH = LENGTH
