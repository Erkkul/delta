"use client"

import { OtpError, OtpForm } from "@delta/ui-web"
import { useRouter } from "next/navigation"

import { getBrowserSupabase } from "@/lib/supabase/client"

type Props = {
  email: string
}

/**
 * Wrapper page → OtpForm. Décision 2026-05-13 :
 *   - On appelle explicitement `supabase.auth.verifyOtp({ type: 'signup' })`,
 *     pas de parsing du hash URL `#access_token=...`. Le flow magic link
 *     est désactivé côté dashboard, on accepte uniquement l'OTP 6 chiffres.
 *   - Resend via `supabase.auth.resend({ type: 'signup' })`.
 *   - Codes d'erreur Supabase (gotrue) mappés vers `OtpError.kind` :
 *       otp_expired                       → expired
 *       token_expired                     → expired
 *       invalid_credentials / otp_invalid → invalid
 *       over_email_send_rate_limit
 *       / over_request_rate_limit         → rate_limit
 *       autres                            → unknown
 */
export function VerifyEmailClient({ email }: Props) {
  const router = useRouter()
  const supabase = getBrowserSupabase()

  async function handleSubmit(otp: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "signup",
    })
    if (error || !data.session) {
      throw mapSupabaseAuthError(error?.code, error?.message)
    }
    // Cible : écran AU-06 Choix rôle (multi-select 1..3). C'est ensuite
    // `nextOnboardingPath(roles)` (core) qui décidera de la suite.
    router.push("/onboarding/role")
  }

  async function handleResend() {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    })
    if (error) {
      throw mapSupabaseAuthError(error.code, error.message)
    }
  }

  function handleEditEmail() {
    router.push("/signup")
  }

  return (
    <OtpForm
      email={email}
      onSubmit={handleSubmit}
      onResend={handleResend}
      onEditEmail={handleEditEmail}
    />
  )
}

function mapSupabaseAuthError(
  code: string | undefined,
  message: string | undefined,
): OtpError {
  const c = code ?? ""
  if (c === "otp_expired" || c === "token_expired") {
    return new OtpError("expired", "Code expiré. Demandez-en un nouveau.")
  }
  if (
    c === "over_email_send_rate_limit" ||
    c === "over_request_rate_limit" ||
    c === "too_many_requests"
  ) {
    return new OtpError(
      "rate_limit",
      "Trop de tentatives. Patientez quelques minutes.",
    )
  }
  if (
    c === "otp_invalid" ||
    c === "invalid_credentials" ||
    c === "otp_disabled"
  ) {
    return new OtpError(
      "invalid",
      "Code incorrect. Vérifiez les chiffres saisis.",
    )
  }
  return new OtpError(
    "unknown",
    message ?? "Vérification impossible, réessayez.",
  )
}
