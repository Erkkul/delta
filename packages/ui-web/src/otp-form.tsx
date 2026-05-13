"use client"

import { useEffect, useRef, useState, type KeyboardEvent } from "react"

/**
 * OtpForm AU-04 — saisie d'un code OTP 6 chiffres. Auto-focus à
 * l'arrivée sur l'écran ; chaque case déclenche le focus de la suivante
 * dès qu'un chiffre est saisi. Backspace revient à la case précédente
 * si la case courante est vide. Paste d'un code complet supporté.
 */
export type OtpFormProps = {
  email: string
  onSubmit: (otp: string) => Promise<void>
  onResend: () => Promise<void>
  onEditEmail?: () => void
}

const LENGTH = 6

export function OtpForm(props: OtpFormProps) {
  const { email, onSubmit, onResend, onEditEmail } = props
  const [digits, setDigits] = useState<string[]>(() =>
    Array<string>(LENGTH).fill(""),
  )
  const [submitting, setSubmitting] = useState(false)
  const [resentAt, setResentAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    inputsRef.current[0]?.focus()
  }, [])

  const otp = digits.join("")
  const isComplete = otp.length === LENGTH && /^\d{6}$/.test(otp)

  function setDigit(index: number, value: string) {
    const cleaned = value.replace(/\D/g, "")
    setDigits((prev) => {
      const next = [...prev]
      next[index] = cleaned.slice(-1) || ""
      return next
    })
    if (cleaned && index < LENGTH - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "")
    if (!pasted) return
    e.preventDefault()
    const chars = pasted.slice(0, LENGTH).split("")
    setDigits((prev) => {
      const next = [...prev]
      for (let i = 0; i < LENGTH; i += 1) {
        next[i] = chars[i] ?? ""
      }
      return next
    })
    const lastFilled = Math.min(chars.length, LENGTH) - 1
    inputsRef.current[lastFilled]?.focus()
  }

  function handleKeyDown(
    e: KeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
    if (e.key === "ArrowRight" && index < LENGTH - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  async function handleSubmit() {
    if (!isComplete) return
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit(otp)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Code invalide, réessayez.",
      )
      setSubmitting(false)
    }
  }

  async function handleResend() {
    setError(null)
    try {
      await onResend()
      setResentAt(Date.now())
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Renvoi indisponible, réessayez.",
      )
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-green-50 text-green-700">
        <MailIcon />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-cream-950">
          Vérifiez votre email
        </h1>
        <p className="font-body text-md leading-relaxed text-cream-700">
          Nous avons envoyé un code à 6 chiffres à
          <br />
          <b className="text-cream-950">{email}</b>
        </p>
      </div>

      <div className="flex gap-2" role="group" aria-label="Code de vérification 6 chiffres">
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
            autoComplete="one-time-code"
            maxLength={1}
            disabled={submitting}
            aria-label={`Chiffre ${String(i + 1)} sur 6`}
            className="h-14 w-12 rounded-md border border-cream-300 bg-cream-50 text-center font-body text-xl font-semibold text-cream-950 focus:border-green-600 focus:outline-none focus:shadow-focus tablet:h-16 tablet:w-14 tablet:text-2xl"
          />
        ))}
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-[#F5C6C0] bg-[#FDEDEC] px-4 py-3 font-body text-sm text-[#C0392B]"
        >
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          void handleSubmit()
        }}
        disabled={!isComplete || submitting}
        className="flex w-full items-center justify-center rounded-pill bg-green-600 px-6 py-3.5 font-body text-base font-semibold text-cream-50 transition hover:bg-green-700 focus:outline-none focus:shadow-focus disabled:bg-cream-300 disabled:text-cream-500"
      >
        {submitting ? "Vérification…" : "Vérifier"}
      </button>

      <div className="flex flex-col items-center gap-2 font-body text-sm text-cream-600">
        <div>
          Pas reçu ?{" "}
          <button
            type="button"
            onClick={() => {
              void handleResend()
            }}
            className="font-semibold text-green-700 underline decoration-cream-300 underline-offset-2 hover:text-green-800"
          >
            Renvoyer le code
          </button>
        </div>
        {resentAt ? (
          <div
            className="font-body text-xs font-semibold text-green-700"
            aria-live="polite"
          >
            Nouveau code envoyé.
          </div>
        ) : null}
      </div>

      {onEditEmail ? (
        <div className="font-body text-xs text-cream-500">
          Mauvaise adresse ?{" "}
          <button
            type="button"
            onClick={onEditEmail}
            className="font-semibold text-cream-700 underline decoration-cream-300 underline-offset-2 hover:text-cream-950"
          >
            Modifier l'email
          </button>
        </div>
      ) : null}
    </div>
  )
}

function MailIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  )
}
