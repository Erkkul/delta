"use client"

import { type LoginInput, type Role } from "@delta/contracts/auth"
import { auth as coreAuth } from "@delta/core"
import { LoginForm } from "@delta/ui-web"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { getBrowserSupabase } from "@/lib/supabase/client"

type Props = {
  initialError: string | null
  initialNotice?: string | null
}

export function LoginClient({ initialError, initialNotice = null }: Props) {
  const router = useRouter()
  const [topError, setTopError] = useState<string | null>(initialError)
  const [topNotice, setTopNotice] = useState<string | null>(initialNotice)

  async function handleEmailLogin(input: LoginInput) {
    setTopError(null)
    setTopNotice(null)
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    })

    if (res.status === 200) {
      const payload = (await res.json()) as { userId: string; roles: Role[] }
      // Redirection : si l'utilisateur n'a pas encore choisi de rôle
      // (Google OAuth interrompu en cours d'onboarding, par exemple),
      // on l'envoie sur AU-06 ; sinon vers l'onboarding du rôle
      // prioritaire ou l'espace si tout est fait.
      const dest =
        payload.roles.length === 0
          ? "/onboarding/role"
          : coreAuth.nextOnboardingPath(payload.roles)
      router.push(dest)
      return
    }

    // Erreurs : on relit le payload pour la microcopy 429, mais on
    // garde un message générique sur 401 (anti-énumération côté UI).
    const payload = (await res.json().catch(() => null)) as
      | {
          error?: string
          code?: string
          retryAfterSeconds?: number
        }
      | null
    if (res.status === 429) {
      const minutes = Math.max(
        1,
        Math.ceil((payload?.retryAfterSeconds ?? 60) / 60),
      )
      throw new Error(
        `Trop de tentatives. Réessayez dans ${String(minutes)} minute${minutes > 1 ? "s" : ""}.`,
      )
    }
    if (res.status === 401) {
      throw new Error("Identifiants invalides.")
    }
    if (res.status === 400) {
      throw new Error(payload?.error ?? "Formulaire invalide.")
    }
    throw new Error(
      payload?.error ?? "Connexion impossible, réessayez plus tard.",
    )
  }

  async function handleGoogleLogin() {
    const supabase = getBrowserSupabase()
    const origin =
      typeof window !== "undefined" ? window.location.origin : ""
    const redirectTo = `${origin}/auth/callback`
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
      {topNotice ? (
        <div
          role="status"
          data-testid="login-notice"
          className="rounded-md border border-green-200 bg-green-50 px-4 py-3 font-body text-sm text-green-900"
        >
          {topNotice}
        </div>
      ) : null}
      {topError ? (
        <div
          role="alert"
          className="rounded-md border border-[#F5C6C0] bg-[#FDEDEC] px-4 py-3 font-body text-sm text-[#C0392B]"
        >
          {topError}
        </div>
      ) : null}
      <LoginForm
        loginWithEmail={handleEmailLogin}
        loginWithGoogle={handleGoogleLogin}
      />
    </div>
  )
}
