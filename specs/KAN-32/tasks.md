# Tâches techniques internes — KAN-32 Pénalités acheteur

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> Ticket Jira supprimé (suivi en pause depuis le 2026-09-11, cf. `produit/jira_mapping.md`) — pas de subtasks à rappeler.

## Tâches

- [x] Trancher Option A vs Option B du modèle de données (design.md) avant d'écrire la migration — Option A retenue, cf. notes.md
- [ ] Faire valider les seuils D7 (1er/2e/3e refus, fenêtre d'un mois) et la durée de suspension — non finalisés, câblés en hypothèse de travail (cf. notes.md). **Reste à faire par le produit, pas par cette implémentation.**
- [x] Migration : colonne `suspended_until` sur `users` (Option A) + policy RLS lecture self / écriture SECURITY DEFINER — `20261005120000_buyer_penalty.sql`
- [x] Fonction SQL SECURITY DEFINER appliquant la pénalité (comptage + écriture + notification) dans la même transaction que le refus — `decline_mission_match`
- [x] Déterminer si un nouveau `type` de notification suffit au trigger existant, ou si un canal distinct est requis — réutilise l'outbox `notifications` existante, 2 nouveaux `type` (`buyer_penalty_warning`, `buyer_penalty_suspended`), canal `in_app`
- [x] Remonter au produit les deux points UI non maquettés avant d'improviser un layout — documenté dans notes.md, aucune UI improvisée

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
