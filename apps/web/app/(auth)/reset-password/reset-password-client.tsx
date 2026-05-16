"use client"

import { type ResetPasswordInput } from "@delta/contracts/auth"
import { ResetPasswordForm } from "@delta/ui-web"
import { useRouter } from "next/navigation"

type Props = {
  email: string
}

/**
 * Wrapper page → ResetPasswordForm (KAN-157 AU-FP3).
 *
 * Mappage codes serveur → erreurs UI :
 *   - 200 → redirection `/login?reset=ok`
 *   - 400 (validation) → relayé tel quel
 *   - 401 (token invalide/expiré) → message générique anti-énumération
 *   - 429 (rate-limit) → message dédié avec délai en minutes
 */
export function ResetPasswordClient({ email }: Props) {
  const router = useRouter()

  async function handleReset(input: ResetPasswordInput) {
    const res = await fetch("/api/v1/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    })

    if (res.status === 200) {
      // Session de recovery fermée côté serveur. Redirection vers /login
      // avec un flag pour afficher un toast neutre « Mot de passe mis à
      // jour. Connectez-vous avec le nouveau. ».
      router.push("/login?reset=ok")
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
    if (res.status === 401) {
      throw new Error("Code de récupération invalide ou expiré.")
    }
    if (res.status === 400) {
      throw new Error(payload?.error ?? "Formulaire invalide.")
    }
    throw new Error(
      payload?.error ?? "Réinitialisation impossible, réessayez plus tard.",
    )
  }

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-cream-200 bg-white p-6 shadow-card tablet:p-8">
      <ResetPasswordForm email={email} resetPassword={handleReset} />
    </div>
  )
}
