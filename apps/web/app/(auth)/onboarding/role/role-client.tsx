"use client"

import { type Role } from "@delta/contracts/auth"
import { auth as coreAuth } from "@delta/core"
import { RoleSelector } from "@delta/ui-web"
import { useRouter } from "next/navigation"

export function RoleClient() {
  const router = useRouter()

  async function handleSubmit(roles: Role[]) {
    const res = await fetch("/api/v1/me/roles", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ roles }),
    })
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as
        | { error?: string }
        | null
      throw new Error(
        payload?.error ?? "Enregistrement impossible, réessayez.",
      )
    }
    const payload = (await res.json()) as { roles: Role[] }
    router.push(coreAuth.nextOnboardingPath(payload.roles))
  }

  return <RoleSelector onSubmit={handleSubmit} />
}
