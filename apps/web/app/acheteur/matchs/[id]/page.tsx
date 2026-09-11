import { notFound, redirect } from "next/navigation"

import { MissionMatchView } from "@/components/buyer/mission-match/mission-match-view"
import { loadMissionMatchDetail } from "@/lib/mission-match/load"
import { getServerSupabase } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Confirmation de mission — Delta",
}

/**
 * AC-07 — Notification de match → confirmation (KAN-31). Gating session +
 * rôle acheteur assuré par `acheteur/layout.tsx`.
 *
 * Sans lien Jira actif (projet KAN supprimé le 2026-09-11) — cf.
 * specs/KAN-31/.
 */
export default async function MissionMatchPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const detail = await loadMissionMatchDetail(supabase, id, user.id)
  if (!detail) notFound()

  return <MissionMatchView initialDetail={detail} />
}
