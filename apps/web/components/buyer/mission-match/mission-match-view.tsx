"use client"

import { type MissionMatchDetail } from "@delta/contracts/mission-match"
import { useEffect, useState } from "react"

import { formatPriceEur } from "@/lib/catalogue/format"

/**
 * Vue KAN-31 — écran AC-07 (notification & confirmation de match).
 * Fidèle à `design/maquettes/acheteur/ac-07-notification-match.html` (lue
 * intégralement avant écriture, cf. specs/KAN-31/).
 *
 * Déviation assumée par rapport à la maquette, documentée dans
 * `specs/KAN-31/notes.md` : le bouton "Confirmer et payer" n'appelle QUE
 * l'acceptation du match (`POST .../confirm`) — aucun paiement Stripe n'est
 * déclenché ici (hors scope KAN-31, cf. specs/KAN-31/proposal.md §
 * Hypothèses). Le libellé du bouton reste néanmoins celui de la maquette
 * pour ne pas trancher seul sur la microcopy.
 */
export function MissionMatchView({
  initialDetail,
}: {
  initialDetail: MissionMatchDetail
}) {
  const [detail, setDetail] = useState(initialDetail)
  const [pending, setPending] = useState<"confirm" | "decline" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (detail.status !== "pending") return
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [detail.status])

  async function respond(action: "confirm" | "decline") {
    setPending(action)
    setError(null)
    try {
      const res = await fetch(`/api/v1/buyer/mission-matches/${detail.id}/${action}`, {
        method: "POST",
      })
      const body = (await res.json()) as MissionMatchDetail & { error?: string }
      if (!res.ok) {
        setError(body.error ?? "Une erreur est survenue.")
        return
      }
      setDetail(body)
    } catch {
      setError("Erreur réseau, réessayez.")
    } finally {
      setPending(null)
    }
  }

  const deadlineMs = new Date(detail.confirmationDeadline).getTime()
  const remainingMs = Math.max(0, deadlineMs - now)
  const remainingH = Math.floor(remainingMs / 3_600_000)
  const remainingMin = Math.floor((remainingMs % 3_600_000) / 60_000)

  const departLabel = new Date(detail.trip.departDate).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <main className="mx-auto w-full max-w-[920px] px-4 pb-28 pt-5 md:grid md:grid-cols-[1.4fr_1fr] md:gap-7 md:px-8 md:pb-8">
      <div>
        {detail.status === "pending" && (
          <div className="mb-5 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-700 to-green-800 px-4 py-3 text-center font-body text-[13px] font-medium text-white">
            Réservé pour vous —{" "}
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 font-display text-sm font-bold">
              {remainingH} h {remainingMin} min
            </span>{" "}
            <strong>restantes</strong>
          </div>
        )}
        {detail.status === "accepted" && (
          <StatusBanner tone="success">
            Match confirmé — vous recevrez bientôt le lien de paiement.
          </StatusBanner>
        )}
        {detail.status === "declined" && (
          <StatusBanner tone="neutral">Vous avez refusé cette mission.</StatusBanner>
        )}
        {detail.status === "expired" && (
          <StatusBanner tone="neutral">
            Le délai de confirmation est dépassé — cette mission n&apos;est plus
            disponible.
          </StatusBanner>
        )}

        {/* Hero */}
        <div className="relative mb-5 overflow-hidden rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-earth-50 p-5 text-center">
          <p className="mb-2 font-body text-[11px] font-bold uppercase tracking-[0.1em] text-green-700">
            🚜 Match trouvé
          </p>
          <h1 className="font-display text-[22px] font-bold leading-snug text-green-900 md:text-[26px]">
            <strong className="text-earth-800">{detail.rameneur.displayName}</strong> peut
            vous ramener votre {detail.product.name.toLowerCase()}{" "}
            <strong className="text-earth-800">{departLabel}</strong>
          </h1>
          <p className="mt-1.5 font-body text-[13px] text-cream-700">
            Trajet {detail.trip.originLabel} → {detail.trip.destinationLabel}.
            {detail.status === "pending" &&
              " Confirmez avant l'expiration du délai pour valider la mission."}
          </p>
        </div>

        {/* Produit */}
        <div className="mb-3.5 rounded-2xl border border-cream-200 bg-white p-[18px]">
          <p className="mb-2 font-body text-[10px] font-bold uppercase tracking-[0.08em] text-cream-500">
            Le produit
          </p>
          <div className="flex items-center gap-3.5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#F5C842] to-[#D4901A] text-3xl">
              🍯
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[17px] font-bold leading-tight text-cream-950">
                {detail.product.name}
              </p>
              <p className="font-body text-[13px] text-cream-600">
                {detail.producer.displayName}
                {detail.producer.zone ? ` · ${detail.producer.zone}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-lg font-bold text-earth-800">
                {formatPriceEur(detail.totalCents)}
              </p>
              <p className="mt-0.5 font-body text-[11px] text-cream-500">
                {detail.quantity} × {formatPriceEur(detail.unitPriceCents)}
              </p>
            </div>
          </div>
        </div>

        {/* Acteurs */}
        <div className="mb-3.5 grid grid-cols-2 gap-2.5 md:grid-cols-1">
          <ActorCard label="Producteur" name={detail.producer.displayName} tone="producer" />
          <ActorCard label="Rameneur" name={detail.rameneur.displayName} tone="rameneur" />
        </div>

        {/* Timeline */}
        <div className="rounded-2xl border border-cream-200 bg-white p-[18px]">
          <p className="mb-2 font-body text-[10px] font-bold uppercase tracking-[0.08em] text-cream-500">
            Déroulé prévu
          </p>
          <ol className="relative border-l-2 border-green-200 pl-6">
            <TimelineItem
              when={`${departLabel} · matin`}
              what={`${detail.rameneur.displayName} récupère votre produit chez ${detail.producer.displayName}`}
              where={detail.trip.originLabel}
            />
            <TimelineItem
              when={`${departLabel} · fin de journée`}
              what={`${detail.rameneur.displayName} vous livre près de chez vous`}
              where={`${detail.trip.destinationLabel} — point de RDV à confirmer dans le chat`}
            />
            <TimelineItem
              when="À la remise"
              what="Vous présentez votre QR — c'est livré"
              where="Le paiement est libéré au producteur et au rameneur"
              last
            />
          </ol>
        </div>
      </div>

      <div className="mt-3.5 md:mt-0">
        {/* Breakdown */}
        <div className="mb-3.5 rounded-2xl border border-cream-200 bg-white p-[18px]">
          <div className="pt-1">
            <Row label={`${detail.product.name}`} value={formatPriceEur(detail.totalCents)} />
            <Row
              label="Producteur (85 %)"
              value={formatPriceEur(detail.pricing.producerShareCents)}
              detail
            />
            <Row
              label="Rameneur (10 %)"
              value={formatPriceEur(detail.pricing.rameneurShareCents)}
              detail
            />
            <Row
              label="Delta (5 %)"
              value={formatPriceEur(detail.pricing.platformShareCents)}
              detail
            />
            <div className="my-1.5 h-px bg-cream-200" />
            <div className="flex justify-between pt-3 font-display text-lg font-bold text-green-900">
              <span>Total à régler</span>
              <span className="text-earth-800">{formatPriceEur(detail.totalCents)}</span>
            </div>
          </div>
          <div className="mt-3.5 flex gap-2.5 rounded-xl border border-dashed border-earth-200 bg-earth-50 p-3 font-body text-xs leading-relaxed text-earth-800">
            <span>
              Votre paiement est <strong>retenu en escrow</strong>. Le producteur et le
              rameneur ne sont payés qu&apos;<strong>une fois la livraison confirmée</strong>.
              Si la mission échoue, vous êtes remboursé·e.
            </span>
          </div>
        </div>

        {error && (
          <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 font-body text-[13px] text-[#C75B5B]">
            {error}
          </p>
        )}

        {detail.status === "pending" && (
          <div className="fixed inset-x-0 bottom-0 z-10 border-t border-cream-200 bg-white p-3.5 md:static md:border-none md:bg-transparent md:p-0">
            <div className="mx-auto flex max-w-[920px] flex-col gap-2">
              <button
                type="button"
                disabled={pending !== null}
                onClick={() => void respond("confirm")}
                className="flex h-[54px] w-full items-center justify-center gap-2.5 rounded-pill bg-green-600 font-body text-base font-semibold text-white shadow-active transition disabled:opacity-60"
              >
                {pending === "confirm"
                  ? "Confirmation…"
                  : `Confirmer et payer ${formatPriceEur(detail.totalCents)}`}
              </button>
              <button
                type="button"
                disabled={pending !== null}
                onClick={() => void respond("decline")}
                className="h-8 font-body text-[13px] font-medium text-cream-600 underline underline-offset-2 hover:text-[#C75B5B] disabled:opacity-60"
              >
                {pending === "decline" ? "Refus en cours…" : "Refuser cette mission"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function Row({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail?: boolean
}) {
  return (
    <div
      className={
        detail
          ? "flex justify-between py-1 pl-3.5 font-body text-xs text-cream-600"
          : "flex justify-between py-2 font-body text-[13px] text-cream-950"
      }
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function ActorCard({
  label,
  name,
  tone,
}: {
  label: string
  name: string
  tone: "producer" | "rameneur"
}) {
  const initial = name.trim()[0]?.toUpperCase() ?? "?"
  return (
    <div className="flex flex-col gap-1 rounded-[14px] border border-cream-200 bg-white p-3.5">
      <p className="mb-1.5 font-body text-[10px] font-bold uppercase tracking-[0.08em] text-cream-500">
        {label}
      </p>
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full font-display text-base font-bold text-white ${
            tone === "producer"
              ? "bg-gradient-to-br from-earth-400 to-earth-800"
              : "bg-gradient-to-br from-green-500 to-green-700"
          }`}
        >
          {initial}
        </div>
        <p className="truncate font-body text-[13px] font-semibold text-cream-950">{name}</p>
      </div>
    </div>
  )
}

function TimelineItem({
  when,
  what,
  where,
  last,
}: {
  when: string
  what: string
  where: string
  last?: boolean
}) {
  return (
    <li className={`relative ${last ? "" : "pb-[18px]"}`}>
      <span className="absolute -left-[27px] top-1 h-3.5 w-3.5 rounded-full border-[3px] border-white bg-green-500 shadow-[0_0_0_1px_#C0E4C7]" />
      <p className="mb-0.5 font-body text-[11px] font-bold uppercase tracking-[0.06em] text-green-700">
        {when}
      </p>
      <p className="font-body text-sm font-medium text-cream-950">{what}</p>
      <p className="mt-0.5 font-body text-xs text-cream-600">{where}</p>
    </li>
  )
}

function StatusBanner({
  tone,
  children,
}: {
  tone: "success" | "neutral"
  children: React.ReactNode
}) {
  return (
    <div
      className={`mb-5 rounded-xl px-4 py-3 text-center font-body text-[13px] font-medium ${
        tone === "success"
          ? "bg-green-100 text-green-800"
          : "bg-cream-100 text-cream-700"
      }`}
    >
      {children}
    </div>
  )
}
