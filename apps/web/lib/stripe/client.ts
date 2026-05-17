import { type StripeConnectAdapter } from "@delta/core/producer"
import Stripe from "stripe"

import { stripeEnv } from "../env"

/**
 * Instance Stripe SDK partagée pour les route handlers (KAN-16).
 * Lazy : on n'instancie pas tant qu'aucune route ne le demande, pour
 * éviter de planter au boot en l'absence de `STRIPE_SECRET_KEY` (utile
 * en E2E ou en dev sans Stripe configuré).
 *
 * API version pinnée à `2020-08-27` côté webhook destinations (cf.
 * tech/setup.md § Stripe Connect Express). On garde la version par
 * défaut du SDK côté client API ; les payloads webhook restent typés
 * par la version `2020-08-27` côté Stripe.
 */
let cached: Stripe | null = null

export function getStripeClient(): Stripe {
  if (cached) return cached
  const env = stripeEnv()
  cached = new Stripe(env.STRIPE_SECRET_KEY, {
    typescript: true,
  })
  return cached
}

/**
 * Crée un compte Stripe Connect Express + un Account Link en partant
 * du contrat de `StripeConnectAdapter` du core. Implémentation HTTP
 * pure ; toute erreur Stripe SDK propage telle quelle vers le use case
 * core qui la convertira en `StripeUpstreamError`.
 */
export function getStripeConnectAdapter(): StripeConnectAdapter {
  return {
    async createConnectAccount({ email }) {
      const stripe = getStripeClient()
      const account = await stripe.accounts.create({
        type: "express",
        country: "FR",
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        // Le profil business sera complété par le producteur via le flow
        // hosted Stripe (Account Link). On déclare juste le minimum.
      })
      return { accountId: account.id }
    },

    async createAccountLink({ accountId, refreshUrl, returnUrl }) {
      const stripe = getStripeClient()
      const link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_onboarding",
      })
      // Stripe expose `expires_at` en secondes Unix ; on retourne une
      // ISO date pour rester cohérent avec le contrat StripeOnboardingLinkOutput.
      const expiresAt = new Date(link.expires_at * 1000).toISOString()
      return { url: link.url, expiresAt }
    },

    async createAccountUpdateLink({ accountId, refreshUrl, returnUrl }) {
      const stripe = getStripeClient()
      // `type: 'account_update'` ouvre la page hosted ciblée sur les
      // requirements en attente plutôt que l'onboarding complet.
      // `collection_options.fields = 'currently_due'` est exigé par
      // l'API Stripe v2024 pour limiter la collecte aux champs présents
      // dans `requirements.currently_due` du compte (cf. KAN-158
      // proposal, doc https://docs.stripe.com/api/account_links/create).
      const link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_update",
        collection_options: { fields: "currently_due" },
      })
      const expiresAt = new Date(link.expires_at * 1000).toISOString()
      return { url: link.url, expiresAt }
    },
  }
}

/**
 * Vérifie la signature d'un webhook Stripe en essayant successivement
 * les deux secrets (platform + Connect). Pattern imposé par la nouvelle
 * UX Stripe Workbench qui sépare obligatoirement les destinations
 * platform et Connect en deux endpoints distincts, chacun avec son
 * propre `whsec_` (cf. tech/setup.md § Stripe Connect Express).
 *
 * Retourne l'`Event` Stripe typé si l'un des secrets valide la
 * signature. Throw une erreur (avec un message agrégé) sinon.
 */
export function constructStripeEvent(
  rawBody: string,
  signatureHeader: string,
): Stripe.Event {
  const stripe = getStripeClient()
  const env = stripeEnv()
  const secrets = [
    env.STRIPE_WEBHOOK_SECRET_PLATFORM,
    env.STRIPE_WEBHOOK_SECRET_CONNECT,
  ]
  const errors: string[] = []
  for (const secret of secrets) {
    try {
      return stripe.webhooks.constructEvent(rawBody, signatureHeader, secret)
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err))
    }
  }
  throw new Error(
    `Signature Stripe invalide pour les deux secrets. ${errors.join(" | ")}`,
  )
}
