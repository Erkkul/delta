# Tâches techniques internes — KAN-27 Historique commandes

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés,
> seeds, configuration — tout ce qui n'a pas vocation à être tracké comme
> livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> - KAN-85 — Accéder à l'historique des commandes livrées
> - KAN-86 — Télécharger la facture PDF d'une commande (couvert fonctionnellement par KAN-36)

## Tâches

- [x] Vérifier la réutilisabilité des primitives empty state / cards posées en
      KAN-18/19 (`<KpiCard />`, `<EmptyState />`, `<SectionCard />`) → réutilisées
      telles quelles depuis `apps/web/components/dashboard/` ; les composants
      historique acheteur vivent dans `apps/web/components/buyer/history/`.
- [x] Factoriser le gating session + rôle acheteur si la duplication avec
      `/acheteur/profil` devient gênante → laissé inline comme KAN-25 (duplication
      minime, pas de helper `requireBuyer()` au MVP).
- [x] Poser les composants `<HistoryStats />`, `<HistoryFilters />`,
      `<HistoryList />` en empty state, structure prête à recevoir des données
      (typage `OrderHistoryRow` à introduire au câblage des tables).
- [x] Documenter dans le code (commentaire en tête de page) les sources futures
      à câbler (missions / mission_buyers / paiements / KAN-36) — même convention
      que `/acheteur/profil`.

> Note tests : `apps/web` n'embarque pas Vitest (Playwright uniquement) ; la
> couverture suit le précédent KAN-19 — E2E de gating dans
> `apps/web/e2e/buyer-history.spec.ts`, pas de tests unitaires RTL.

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
