"use client"

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react"

/**
 * OtpForm AU-04 — saisie d'un code OTP 6 chiffres.
 *
 * Comportement (décision 2026-05-13) :
 *   - 6 cases auto-focus à l'arrivée (case 1) ; focus suivant à la saisie.
 *   - Paste d'un code complet (6 chiffres collés depuis le mail).
 *   - Backspace + arrows pour navigation clavier.
 *   - Auto-submit dès que les 6 chiffres sont entrés (pas besoin de cliquer
 *     "Vérifier", mais le bouton reste visible pour fallback / a11y).
 *   - "Renvoyer le code" : désactivé 60 s après chaque envoi, compte à
 *     rebours affiché. Compte à rebours initial à 60 s à l'arrivée
 *     (Supabase a déjà envoyé un code lors du signup).
 *   - Erreurs typées via `OtpError` (code invalide / expiré / rate limit /
 *     inconnu) pour rendu adapté côté UI.
 */
export type OtpErrorKind = "invalid" | "expired" | "rate_limit" | "unknown"

/**
 * Erreur OTP typée. Sous-classe d'`Error` pour pouvoir être thrown
 * directement par le caller sans déclencher la règle ESLint
 * `@typescript-eslint/only-throw-error`.
 */
export class OtpError extends Error {
  readonly kind: OtpErrorKind
  constructor(kind: OtpErrorKind, message: string) {
    super(message)
    this.kind = kind
    this.name = "OtpError"
  }
}

export type OtpFormProps = {
  email: string
  onSubmit: (otp: string) => Promise<void>
  onResend: () => Promise<void>
  onEditEmail?: () => void
  /** Délai en secondes entre deux envois (resend). Défaut 60 s. */
  resendCooldownSeconds?: number
}

const LENGTH = 6
const ERROR_COPY: Record<OtpErrorKind, string> = {
  invalid: "Code incorrect. Vérifiez les chiffres saisis.",
  expired: "Code expiré. Demandez-en un nouveau via « Renvoyer le code ».",
  rate_limit:
    "Trop de tentatives. Patientez quelques minutes avant de réessayer.",
  unknown: "Vérification impossible, réessayez.",
}

export function OtpForm(props: OtpFormProps) {
  const {
    email,
    onSubmit,
    onResend,
    onEditEmail,
    resendCooldownSeconds = 60,
  } = props
  const [digits, setDigits] = useState<string[]>(() =>
    Array<string>(LENGTH).fill(""),
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<OtpError | null>(null)
  const [resendInfo, setResendInfo] = useState<
    "idle" | "sent" | "sending"
  >("idle")
  const [cooldown, setCooldown] = useState(resendCooldownSeconds)
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])
  const submittedRef = useRef(false)

  useEffect(() => {
    inputsRef.current[0]?.focus()
  }, [])

  // Décrémente le compte à rebours du resend.
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1))
    }, 1000)
    return () => {
      clearInterval(id)
    }
  }, [cooldown])

  const otp = digits.join("")
  const isComplete = otp.length === LENGTH && /^\d{6}$/.test(otp)

  function setDigit(index: number, value: string) {
    const cleaned = value.replace(/\D/g, "")
    const last = cleaned.slice(-1)
    setDigits((prev) => {
      const next = [...prev]
      next[index] = last || ""
      return next
    })
    if (last && index < LENGTH - 1) {
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

  const handleSubmit = useCallback(async () => {
    if (!isComplete || submittedRef.current || submitting) return
    submittedRef.current = true
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit(otp)
      // Succès : la redirection est gérée par le caller.
    } catch (err) {
      submittedRef.current = false
      setError(toOtpError(err))
      setSubmitting(false)
    }
  }, [isComplete, submitting, onSubmit, otp])

  async function handleResend() {
    if (cooldown > 0 || resendInfo === "sending") return
    setError(null)
    setResendInfo("sending")
    try {
      await onResend()
      setResendInfo("sent")
      setCooldown(resendCooldownSeconds)
      // Repositionne le focus sur la première case.
      setDigits(Array<string>(LENGTH).fill(""))
      submittedRef.current = false
      inputsRef.current[0]?.focus()
    } catch (err) {
      setResendInfo("idle")
      setError(toOtpError(err))
    }
  }

  // Auto-submit dès que les 6 chiffres sont saisis et qu'on n'a pas déjà
  // soumis ce code particulier. Si l'utilisateur change l'un des chiffres
  // après une erreur, on réautorise la soumission auto pour le nouveau code.
  useEffect(() => {
    if (!isComplete) {
      submittedRef.current = false
      return
    }
    if (submittedRef.current || submitting) return
    void handleSubmit()
  }, [otp, isComplete, submitting, handleSubmit])

  const resendDisabled = cooldown > 0 || resendInfo === "sending"
  const resendLabel =
    resendInfo === "sending"
      ? "Envoi…"
      : cooldown > 0
        ? `Renvoyer dans ${String(cooldown)} s`
        : "Renvoyer le code"

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
        <p className="font-body text-xs text-cream-500">
          Code valable 10 minutes.
        </p>
      </div>

      <div
        className="flex gap-2"
        role="group"
        aria-label="Code de vérification 6 chiffres"
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
            disabled={submitting}
            aria-invalid={Boolean(error)}
            aria-label={`Chiffre ${String(i + 1)} sur 6`}
            data-testid={`otp-digit-${String(i)}`}
            className="h-14 w-12 rounded-md border border-cream-300 bg-cream-50 text-center font-body text-xl font-semibold text-cream-950 focus:border-green-600 focus:outline-none focus:shadow-focus tablet:h-16 tablet:w-14 tablet:text-2xl"
          />
        ))}
      </div>

      {error ? (
        <div
          role="alert"
          data-testid="otp-error"
          data-error-kind={error.kind}
          className="rounded-md border border-[#F5C6C0] bg-[#FDEDEC] px-4 py-3 font-body text-sm text-[#C0392B]"
        >
          {error.message}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          void handleSubmit()
        }}
        disabled={!isComplete || submitting}
        data-testid="otp-submit"
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
            disabled={resendDisabled}
            aria-live="polite"
            data-testid="otp-resend"
            className="font-semibold text-green-700 underline decoration-cream-300 underline-offset-2 hover:text-green-800 disabled:text-cream-500 disabled:no-underline"
          >
            {resendLabel}
          </button>
        </div>
        {resendInfo === "sent" && cooldown === resendCooldownSeconds ? (
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
            Modifier l&apos;email
          </button>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Convertit une erreur arbitraire en `OtpError` typé. Le caller (page web)
 * peut throw un `OtpError` directement pour un message custom, sinon on
 * essaie d'inférer le kind depuis le message.
 */
function toOtpError(err: unknown): OtpError {
  if (err instanceof OtpError) return err
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    if (msg.includes("expired") || msg.includes("expir")) {
      return new OtpError("expired", ERROR_COPY.expired)
    }
    if (
      msg.includes("rate") ||
      msg.includes("too many") ||
      msg.includes("429")
    ) {
      return new OtpError("rate_limit", ERROR_COPY.rate_limit)
    }
    if (
      msg.includes("invalid") ||
      msg.includes("incorrect") ||
      msg.includes("token")
    ) {
      return new OtpError("invalid", ERROR_COPY.invalid)
    }
  }
  return new OtpError("unknown", ERROR_COPY.unknown)
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
