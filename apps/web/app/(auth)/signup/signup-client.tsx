"use client"

import { type Role, type SignupInput } from "@delta/contracts/auth"
import { auth as coreAuth } from "@delta/core"
import { SignupForm } from "@delta/ui-web"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { getBrowserSupabase } from "@/lib/supabase/client"

const CURRENT_TERMS_VERSION = coreAuth.CURRENT_TERMS_VERSION
const CURRENT_PRIVACY_VERSION = coreAuth.CURRENT_PRIVACY_VERSION

type Props = {
  defaultRole?: Role
  initialError: string | null
}

export function SignupClient({ defaultRole, initialError }: Props) {
  const router = useRouter()
  const [topError, setTopError] = useState<string | null>(initialError)

  async function handleEmailSignup(input: SignupInput) {
    setTopError(null)
    const res = await fetch("/api/v1/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    })
    if (res.status === 201) {
      router.push(coreAuth.onboardingPathForRole(input.role))
      return
    }
    const payload = (await res.json().catch(() => null)) as
      | { error?: string; code?: string }
      | null
    if (res.status === 409) {
      throw new Error(
        payload?.error ??
          "Un compte existe déjà avec cet email — essayez de vous connecter.",
      )
    }
    throw new Error(
      payload?.error ?? "Création de compte impossible, réessayez plus tard.",
    )
  }

  async function handleGoogleSignup(role: Role) {
    const supabase = getBrowserSupabase()
    const origin =
      typeof window !== "undefined" ? window.location.origin : ""
    const redirectTo = `${origin}/auth/callback?role=${encodeURIComponent(
      role,
    )}`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    })
    if (error) {
      throw new Error(error.message)
    }
  }

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-cream-200 bg-white p-6 shadow-card tablet:p-8">
      {topError ? (
        <div
          role="alert"
          className="rounded-md border border-[#F5C6C0] bg-[#FDEDEC] px-4 py-3 font-body text-sm text-[#C0392B]"
        >
          {topError}
        </div>
      ) : null}
      <SignupForm
        defaultRole={defaultRole}
        termsVersion={CURRENT_TERMS_VERSION}
        privacyVersion={CURRENT_PRIVACY_VERSION}
        signupWithEmail={handleEmailSignup}
        signupWithGoogle={handleGoogleSignup}
      />
    </div>
  )
}
