# Tâches techniques internes — KAN-27 Historique commandes

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés,
> seeds, configuration — tout ce qui n'a pas vocation à être tracké comme
> livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> - KAN-85 — Accéder à l'historique des commandes livrées
> - KAN-86 — Télécharger la facture PDF d'une commande (couvert fonctionnellement par KAN-36)

## Tâches

- [ ] Vérifier la réutilisabilité des primitives empty state / cards posées en
      KAN-18/19 (`<KpiCard />`, `<EmptyState />`, `<SectionCard />`) ; si trop
      couplées au producteur, créer des équivalents locaux dans
      `apps/web/components/buyer/history/`.
- [ ] Factoriser le gating session + rôle acheteur si la duplication avec
      `/acheteur/profil` devient gênante (helper `requireBuyer()` côté web) —
      sinon laisser inline comme KAN-25.
- [ ] Poser les composants `<HistoryStats />`, `<HistoryFilters />`,
      `<HistoryList />` avec props prêtes à recevoir des données (typage de
      `OrderHistoryRow` esquissé mais non câblé tant que les tables manquent).
- [ ] Documenter dans le code (commentaire en tête de page) les sources futures
      à câbler (missions / mission_buyers / paiements / KAN-36) — même convention
      que `/acheteur/profil`.

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
