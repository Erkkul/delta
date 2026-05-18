# Tâches techniques internes — KAN-19 Historique ventes

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> - KAN-68 — Consulter l'historique des ventes et virements Stripe

## Tâches

- [x] Créer `apps/web/app/producer/sales/page.tsx` (server component sous le layout `/producer`, retourne l'enveloppe)
- [x] Créer `apps/web/components/producer/sales/sales-kpis.tsx` (réutilise `<KpiCard state="coming" />`, 4 cards)
- [x] Créer `apps/web/components/producer/sales/sales-tabs.tsx` (4 onglets neutres, `aria-disabled`, compteur `(0)`)
- [x] Créer `apps/web/components/producer/sales/sales-filters.tsx` (3 chips `aria-disabled`)
- [x] Créer `apps/web/components/producer/sales/sales-table.tsx` (rend `<EmptyState />`, microcopy validée)
- [x] Créer `apps/web/components/producer/sales/stripe-payouts-section.tsx` (header Stripe + `<EmptyState />`, sans IBAN au MVP)
- [x] Mettre à jour `apps/web/lib/navigation/producer-nav.ts` : item « Ventes & virements » devient `href="/producer/sales"` (retirer `disabled`)
- [x] Vérifier que `/producer/sales` est bien protégée par le gating session + rôle du `producer/layout.tsx`
- [ ] ~~Tests Vitest pour les 5 composants~~ — infra Vitest absente d'`apps/web` (cohérent avec KAN-18 qui a fait le même choix). Gating couvert par Playwright.
- [x] Ajouter test Playwright `apps/web/e2e/producer-sales.spec.ts` (gating session)
- [x] Mettre à jour `produit/jira_mapping.md` (fait en `/propose` — déjà sur `main`)

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
