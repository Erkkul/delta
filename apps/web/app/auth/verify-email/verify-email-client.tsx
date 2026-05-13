"use client"

import { OtpForm } from "@delta/ui-web"
import { useRouter } from "next/navigation"

import { getBrowserSupabase } from "@/lib/supabase/client"

type Props = {
  email: string
}

export function VerifyEmailClient({ email }: Props) {
  const router = useRouter()
  const supabase = getBrowserSupabase()

  async function handleSubmit(otp: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    })
    if (error || !data.session) {
      throw new Error(
        error?.message ?? "Code invalide ou expiré, demandez-en un nouveau.",
      )
    }
    router.push("/onboarding/role")
  }

  async function handleResend() {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    })
    if (error) {
      throw new Error(error.message)
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
