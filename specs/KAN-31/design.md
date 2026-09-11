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
