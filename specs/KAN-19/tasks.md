# Tâches techniques internes — KAN-19 Historique ventes

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> - KAN-68 — Consulter l'historique des ventes et virements Stripe

## Tâches

- [ ] Créer `apps/web/app/producer/sales/page.tsx` (server component sous le layout `/producer`, retourne l'enveloppe)
- [ ] Créer `apps/web/components/producer/sales/SalesKpis.tsx` (réutilise `<KpiCard state="coming" />`, 4 cards dont la première en `highlight`)
- [ ] Créer `apps/web/components/producer/sales/SalesTabs.tsx` (4 onglets neutres, `aria-disabled`, compteur `(0)`)
- [ ] Créer `apps/web/components/producer/sales/SalesFilters.tsx` (3 chips `aria-disabled`)
- [ ] Créer `apps/web/components/producer/sales/SalesTable.tsx` (rend `<EmptyState />`, microcopy validée)
- [ ] Créer `apps/web/components/producer/sales/StripePayoutsSection.tsx` (header Stripe + `<EmptyState />`, sans IBAN au MVP)
- [ ] Mettre à jour `apps/web/lib/navigation/producer-nav.ts` : item « Ventes & virements » devient `href="/producer/sales"` (retirer `disabled`)
- [ ] Vérifier que `/producer/sales` est bien protégée par le gating session + rôle du `producer/layout.tsx` (pas de duplication ; ajouter un test Playwright si besoin)
- [ ] Ajouter tests Vitest pour les 5 composants ci-dessus (`apps/web/components/producer/sales/*.test.tsx`)
- [ ] Ajouter test Playwright `apps/web/e2e/producer-sales.spec.ts` (navigation, guards rôle/session, responsive)
- [ ] Mettre à jour `produit/jira_mapping.md` : cellule PR-07 du parcours Producteur + ligne KAN-19 de la table « Catalogue Jira complet — KAN-4 » avec `[Cadrage tech](specs/KAN-19/)`

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
