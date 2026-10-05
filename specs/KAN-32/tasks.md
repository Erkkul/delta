# Tâches techniques internes — KAN-32 Pénalités acheteur

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> Ticket Jira supprimé (suivi en pause depuis le 2026-09-11, cf. `produit/jira_mapping.md`) — pas de subtasks à rappeler.

## Tâches

- [ ] Trancher Option A vs Option B du modèle de données (design.md) avant d'écrire la migration
- [ ] Faire valider les seuils D7 (1er/2e/3e refus, fenêtre d'un mois) et la durée de suspension — non finalisés
- [ ] Migration : colonne `suspended_until` sur `users` (Option A) + policy RLS lecture self / écriture SECURITY DEFINER
- [ ] Fonction SQL SECURITY DEFINER appliquant la pénalité (comptage + écriture + notification) dans la même transaction que le refus
- [ ] Déterminer si un nouveau `type` de notification suffit au trigger existant, ou si un canal distinct est requis
- [ ] Remonter au produit les deux points UI non maquettés avant d'improviser un layout

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
