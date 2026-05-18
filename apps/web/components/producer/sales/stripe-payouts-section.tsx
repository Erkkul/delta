/**
 * Section « Virements Stripe Connect » de la page historique producteur
 * (KAN-19 — PR-07).
 *
 * Au MVP : empty state pur. Aucun payout Stripe à afficher tant qu'aucune
 * mission n'a été livrée (les events `payout.paid` du webhook Connect
 * sont reçus dès KAN-16 mais ne portent pas encore de montants). L'IBAN
 * du producteur n'est pas affiché : il est détenu par Stripe (on a juste
 * `producers.stripe_account_id`), à récupérer via Stripe API quand cette
 * section sera câblée.
 */
import { EmptyState } from "@/components/dashboard/empty-state"

export function StripePayoutsSection() {
  return (
    <section
      className="rounded-lg border border-cream-200 bg-white p-5"
      data-testid="stripe-payouts-section"
    >
      <header className="mb-4 flex items-center gap-3">
        <div
          aria-hidden="true"
          className="grid h-9 w-9 place-items-center rounded-md bg-[#635BFF] text-base font-extrabold leading-none text-white"
        >
          S
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-green-900">
            Virements Stripe Connect
          </h2>
          <p className="mt-0.5 text-xs text-cream-600">
            Vos versements apparaîtront ici dès votre première livraison.
          </p>
        </div>
      </header>
      <EmptyState
        icon="🏦"
        text="Aucun virement pour l'instant. Stripe vous versera automatiquement la part producteur après chaque livraison."
      />
    </section>
  )
}
