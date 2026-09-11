# Tâches techniques internes — KAN-31 Notification & confirmation match

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> (aucune — ticket Jira supprimé, projet KAN vidé le 2026-09-11)

## Tâches

- [x] `missions` / `mission_buyers` / `notifications` n'existaient pas — créées ici, ainsi que `trips` (socle minimal), migration `20260911120000_create_missions.sql` (décision validée en chat le 2026-09-11 : KAN-31 pose le socle DB lui-même plutôt que d'attendre les tickets amont supprimés)
- [x] Endpoint `apps/web/app/api/v1/inngest/route.ts` : déjà câblé (KAN-16) — la mention "reste : endpoint + sync" de `tech/setup.md` § Inngest était stale, corrigée dans ce commit. Sync app dashboard Inngest : opération manuelle hors repo, non vérifiable depuis l'implémentation
- [x] Helper pur `computeMissionConfirmationDeadline(reservedAt, policy)` dans `packages/core/src/mission-match/`
- [x] Helper pur `computeMissionPricingBreakdown(totalCents)` (répartition 85/10/5 pour l'affichage AC-07 — pas le split Stripe réel, hors scope)
- [ ] Seeds/fixtures `mission_buyers` en statut `pending` pour les tests E2E — pas encore de flow créant des missions (réservation rameneur non livrée), donc pas de seed écrit ; à faire quand un premier flow bout-en-bout existera
- [x] Vue `mission_match_details` (`security_invoker = off`, même pattern que `catalogue_products` KAN-28) pour contourner la RLS self-only de `producers` sans l'élargir
- [x] Fonction RPC `confirm_mission_match` (SECURITY DEFINER) pour l'atomicité transition + décrément stock (ARCHITECTURE.md §6.3)
- [x] Job Inngest cron `expire-pending-mission-matches` (packages/jobs) — sweep toutes les 15 min, auto-suffisant (pas de producer d'event requis)

## Non fait (périmètre volontairement laissé de côté)

- Transition automatique `missions.status` (`awaiting_buyers → confirmed` / `cancelled_no_buyer`) : dépend du seuil de confirmation, décision produit non tranchée (`produit/decisions/decisions_produit.md` § Bloquantes pour développement). Seule la transition individuelle `mission_buyers.status` est câblée.
- Paiement Stripe (ex-KAN-33/34) : le bouton "Confirmer et payer" n'appelle que l'acceptation du match — cf. `specs/KAN-31/notes.md`.
- App mobile (Expo) : web only, cf. `design.md` § Packages touchés.
- Canaux email/push des notifications (Resend, Expo Push toujours "À faire") : seul le canal `in_app` (table `notifications`) est écrit.

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
