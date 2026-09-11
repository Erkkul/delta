# Tâches techniques internes — KAN-31 Notification & confirmation match

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> (aucune — ticket Jira supprimé, projet KAN vidé le 2026-09-11)

## Tâches

- [ ] Vérifier au moment de l'implémentation si `missions` / `mission_buyers` / `notifications` existent déjà (prérequis ex-KAN-41/42/43) ; sinon les créer ici en migration dédiée
- [ ] Câbler `apps/web/app/api/v1/inngest/route.ts` + sync app Inngest si pas déjà fait par un autre chantier (cf. `tech/setup.md` § Inngest)
- [ ] Helper pur `computeMissionConfirmationDeadline(reservedAt, policy)` dans `packages/core`
- [ ] Seeds/fixtures `mission_buyers` en statut `pending` pour les tests

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
