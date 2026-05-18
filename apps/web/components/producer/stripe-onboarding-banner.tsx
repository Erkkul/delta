import { type ProducerStripeStatus } from "@delta/db/types"
import Link from "next/link"

/**
 * Bandeau Stripe Connect en tête du dashboard producteur (KAN-18).
 *
 * Visible si `stripe_status` n'est pas `active`. Microcopy adapté à
 * chaque état :
 *   - `not_created` → CTA configurer
 *   - `pending`     → KYC en cours
 *   - `restricted`  → documents complémentaires à fournir
 *   - `disabled`    → contact support
 *
 * Rendu null si `active`.
 */
export function StripeOnboardingBanner({
  status,
}: {
  status: ProducerStripeStatus
}) {
  if (status === "active") return null

  const config = (() => {
    switch (status) {
      case "not_created":
        return {
          icon: "💳",
          title: "Compte Stripe à configurer.",
          body: "Activez votre compte Stripe Connect pour pouvoir recevoir les paiements.",
          cta: { label: "Configurer →", href: "/onboarding/producteur" },
        }
      case "pending":
        return {
          icon: "⏳",
          title: "Compte Stripe en validation.",
          body: "Stripe vérifie votre identité. Vous serez notifié dès la validation.",
          cta: null,
        }
      case "restricted":
        return {
          icon: "📋",
          title: "Compte Stripe — documents requis.",
          body: "Stripe demande des informations complémentaires pour activer votre compte.",
          cta: { label: "Compléter →", href: "/onboarding/producteur" },
        }
      case "disabled":
        return {
          icon: "⛔",
          title: "Compte Stripe désactivé.",
          body: "Votre compte Stripe est désactivé. Contactez le support pour rétablir les paiements.",
          cta: { label: "Contacter →", href: "mailto:support@delta.fr" },
        }
    }
  })()

  const isCritical = status === "disabled"
  const wrapperClass = isCritical
    ? "mb-5 flex items-center gap-3 rounded-md border border-[#C75B5B] bg-[#FDEDEC] px-4 py-3 text-sm text-[#7A1F1F]"
    : "mb-5 flex items-center gap-3 rounded-md border border-earth-200 bg-earth-50 px-4 py-3 text-sm text-cream-700"
  const strongClass = isCritical ? "text-[#7A1F1F]" : "text-earth-800"
  const linkClass = isCritical
    ? "shrink-0 text-xs font-semibold text-[#7A1F1F] underline"
    : "shrink-0 text-xs font-semibold text-earth-800 underline"

  return (
    <div role="status" className={wrapperClass}>
      <span aria-hidden="true" className="text-lg">
        {config.icon}
      </span>
      <div className="flex-1">
        <strong className={strongClass}>{config.title}</strong> {config.body}
      </div>
      {config.cta ? (
        config.cta.href.startsWith("/") ? (
          <Link href={config.cta.href} className={linkClass}>
            {config.cta.label}
          </Link>
        ) : (
          <a href={config.cta.href} className={linkClass}>
            {config.cta.label}
          </a>
        )
      ) : null}
    </div>
  )
}
