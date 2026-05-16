"use client"

import { type ForgotPasswordInput } from "@delta/contracts/auth"
import { ForgotPasswordForm } from "@delta/ui-web"
import { useRouter } from "next/navigation"

type Props = {
  defaultEmail?: string
}

/**
 * Wrapper page → ForgotPasswordForm (KAN-157 AU-FP1).
 *
 * Anti-énumération côté UI : 204 ET 200 redirigent tous deux vers
 * `/forgot-password/sent`. Seules les 4xx hors 204 sont remontées au
 * formulaire (validation 400, rate-limit 429).
 */
export function ForgotPasswordClient({ defaultEmail }: Props) {
  const router = useRouter()

  async function handleRequestReset(input: ForgotPasswordInput) {
    const res = await fetch("/api/v1/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    })

    if (res.status === 204) {
      router.push(
        `/forgot-password/sent?email=${encodeURIComponent(input.email)}`,
      )
      return
    }

    const payload = (await res.json().catch(() => null)) as
      | { error?: string; code?: string; retryAfterSeconds?: number }
      | null

    if (res.status === 429) {
      const minutes = Math.max(
        1,
        Math.ceil((payload?.retryAfterSeconds ?? 60) / 60),
      )
      throw new Error(
        `Trop de tentatives. Réessayez dans ${String(minutes)} minute${
          minutes > 1 ? "s" : ""
        }.`,
      )
    }
    if (res.status === 400) {
      throw new Error(payload?.error ?? "Adresse email invalide.")
    }
    throw new Error(
      payload?.error ?? "Envoi impossible, réessayez plus tard.",
    )
  }

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-cream-200 bg-white p-6 shadow-card tablet:p-8">
      <ForgotPasswordForm
        defaultEmail={defaultEmail}
        requestReset={handleRequestReset}
      />
    </div>
  )
}
