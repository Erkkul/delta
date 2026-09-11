# Conception technique — KAN-31 Notification & confirmation match

## Vue d'ensemble

Deux mouvements : (1) émission d'une notification + démarrage d'un timer d'expiration quand un `mission_buyers` entre en attente de confirmation (déclenché en aval de la réservation rameneur, hors scope ici) ; (2) endpoints + UI acheteur pour lire le détail du match (écran AC-07) et transitionner son statut individuel (`pending → accepted | declined`), avec effets de bord sur le stock produit et sur l'état global de la mission.

## Packages touchés

- [x] `packages/contracts` — schémas Zod (input/output API)
- [x] `packages/core` — règles métier, use cases, state machine
- [x] `packages/db` — repos, queries, helpers PostGIS
- [x] `apps/web` — UI web + route handlers `app/api/v1/`
- [ ] `apps/mobile` — UI mobile (Expo) — non traité dans ce cadrage web-first, à adresser en parité MVP obligatoire (cf. CLAUDE.md responsive/mobile)
- [x] `packages/jobs` — jobs Inngest (notification + timer deadline)
- [x] `supabase/migrations` — migration DB (si `missions`/`mission_buyers`/`notifications` pas déjà posées par un prérequis au moment de l'implémentation)
- [x] `supabase/policies` — policy RLS
- [ ] `packages/ui-web` ou `packages/ui-mobile` — composant partagé

## Modèle de données

Référence ARCHITECTURE.md §5.3. Tables `missions`, `mission_buyers`, `notifications` pas encore créées en DB — à poser ici si aucun ticket prérequis ne les a créées avant.

`mission_buyers` (indicatif) :
- `id`, `mission_id` fk, `buyer_id` fk
- `status` enum(`pending`, `accepted`, `declined`, `expired`)
- `price_snapshot_cents` — prix figé au moment du match (décision D4 : prix courant producteur, pas celui de l'ajout wishlist)
- `confirmation_deadline` timestamptz
- `responded_at` timestamptz null

RLS : select/update filtrés sur `buyer_id = auth.uid()`.

## API / Endpoints

- `GET /api/v1/buyer/mission-matches/[missionBuyerId]` — détail hero/produit/acteurs/timeline/breakdown
- `POST /api/v1/buyer/mission-matches/[missionBuyerId]/confirm`
- `POST /api/v1/buyer/mission-matches/[missionBuyerId]/decline`

## Impact state machine / events

`mission_buyers.status` est un sous-état individuel, distinct du statut `missions` global (`reserved → awaiting_buyers → confirmed`, cf. §6.1). Règle de passage `awaiting_buyers → confirmed` dépendante du seuil de confirmation (non tranché — cf. Hypothèses proposal.md). Nouveaux events Inngest à documenter : `mission_buyer.confirmation_requested` (notif + timer), `mission_buyer.confirmed`, `mission_buyer.declined`, `mission_buyer.expired`.

## Dépendances

- Inngest : package scaffoldé mais endpoint `/api/v1/inngest` et sync app **pas encore câblés** (`tech/setup.md` § Inngest, "À faire") — bloquant pour le timer de deadline
- Resend : **À faire** (`tech/setup.md` § Resend) — canal email non disponible au moment du cadrage
- Expo Push : **À faire** (`tech/setup.md` § Expo) — canal push non disponible
- → notification effective probablement in-app uniquement dans un premier temps ; câblage email/push réel porté par l'épic Notifications (ex-KAN-54/55)

## État UI

Reprend fidèlement `design/maquettes/acheteur/ac-07-notification-match.html` : hero match, carte produit, grille producteur/rameneur, timeline 3 étapes, breakdown financier + note escrow, bloc Stripe, CTA sticky bottom (mobile) / statique colonne droite sticky (desktop, breakpoint 720px). Countdown recalculé côté client depuis la deadline serveur (éviter drift horloge).

## Risques techniques

- Séquencement : dépend de tables/écrans non livrés (trajet, réservation rameneur)
- Deux décisions produit non tranchées bloquent la définition exacte de la deadline et du seuil de confirmation
- Notification "silencieuse" tant que Resend/Expo Push ne sont pas provisionnés
- Multi-acheteurs par mission : gérer l'état "partiellement confirmé"

## Tests envisagés

- Unit `packages/core` : transitions `mission_buyers`, calcul de deadline, règle de seuil
- Unit `packages/contracts` : validation payloads confirm/decline
- E2E Playwright : parcours confirmer / refuser depuis AC-07

## Implémenté (2026-09-11) — écarts par rapport au cadrage ci-dessus

Décision validée en chat le 2026-09-11 : KAN-31 pose lui-même le socle DB
manquant (`trips`, `missions`, `mission_buyers`, `notifications`) plutôt
que d'attendre les tickets amont, tous supprimés de Jira. Détail complet :
migration `supabase/migrations/20260911120000_create_missions.sql`.

Écarts constatés en implémentant, par rapport aux sections ci-dessus :

- **Inngest était déjà câblé** (KAN-16) — la ligne "Dépendances" ci-dessus
  et `tech/setup.md` § Inngest étaient stales, corrigées dans ce commit.
  Le job de deadline n'est donc PAS bloqué.
- **Pas d'event `mission_buyer.confirmation_requested`** : aucun flow
  n'existe pour l'émettre (pas de réservation rameneur). Remplacé par un
  **trigger DB** `AFTER INSERT ON mission_buyers` qui écrit directement la
  notification (idempotent), indépendant de qui crée la row. Le timer
  d'expiration est un **job cron Inngest** (`*/15 * * * *`,
  `expire-pending-mission-matches`) plutôt qu'un `step.sleepUntil` par
  event — auto-suffisant, ne dépend d'aucun producer.
  `mission_buyer.confirmed` / `mission_buyer.declined` / `.expired` ne
  sont pas des events Inngest : ce sont de simples transitions DB
  synchrones (RPC `confirm_mission_match` pour l'acceptation, UPDATE
  conditionnel pour le refus, UPDATE de sweep pour l'expiration).
- **Transition `missions.status` (`awaiting_buyers → confirmed` /
  `cancelled_no_buyer`) NON implémentée** — confirmé bloquant comme prévu
  (seuil de confirmation non tranché). Seule `mission_buyers.status`
  transitionne. `missions.status` doit être écrit explicitement par le
  caller qui crée la mission (seed/test).
- **Lecture producteur (`display_name`)** : `producers` n'a qu'une policy
  RLS self-only (KAN-16) — un buyer ne peut pas la lire par simple
  jointure RLS. Résolu par une vue `mission_match_details`
  (`security_invoker = off`), même pattern que `catalogue_products`
  (KAN-28), qui sert aussi de point de lecture composé unique pour
  `findDetailForBuyer` (évite d'assembler trips/missions/products/producers
  en 4 requêtes séparées côté adapter).
- **`price_snapshot_cents` renommé `unit_price_cents`** + ajout de
  `quantity` (la maquette affiche "1 × pot 500g" — un multiplicateur était
  nécessaire pour retrouver `totalCents`).
- **Pricing breakdown (85/10/5)** calculé par un helper pur
  `computeMissionPricingBreakdown` (`packages/core`) — affichage seul
  (arrondi reproduisant l'exemple maquette 8,50€ → 7,23/0,85/0,42), le
  split Stripe réel (`transfer_data`) reste porté par le domaine paiement.
- **CTA "Confirmer et payer"** : libellé maquette conservé tel quel, mais
  n'appelle que `POST .../confirm` (pas de paiement déclenché) — conflit
  documenté dans `specs/KAN-31/notes.md` plutôt que tranché seul.
- **Notation producteur/rameneur** ("4.9 · 47 missions" sur la maquette) :
  omise (aucune donnée réelle, épic Notations non livré) — cf.
  `specs/KAN-31/notes.md`.
- **`apps/mobile`** : toujours hors scope (web only), inchangé du cadrage.
