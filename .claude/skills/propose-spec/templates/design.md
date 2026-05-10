# Conception technique — {{KAN_ID}} {{TITLE}}

## Vue d'ensemble

(approche en 1-2 paragraphes — quel est le mouvement principal côté code)

## Packages touchés

Cocher les packages impactés. Référence : ARCHITECTURE.md §14.2.

- [ ] `packages/contracts` — schémas Zod (input/output API)
- [ ] `packages/core` — règles métier, use cases, state machine
- [ ] `packages/db` — repos, queries, helpers PostGIS
- [ ] `apps/web` — UI web + route handlers `app/api/v1/`
- [ ] `apps/mobile` — UI mobile (Expo)
- [ ] `packages/jobs` — jobs Inngest
- [ ] `supabase/migrations` — migration DB
- [ ] `supabase/policies` — policy RLS
- [ ] `packages/ui-web` ou `packages/ui-mobile` — composant partagé

## Modèle de données

Entités, champs, contraintes, RLS. Référence : ARCHITECTURE.md §5.

(à préciser)

## API / Endpoints

Routes, contrats Zod, codes d'erreur. Référence : ARCHITECTURE.md §3.

(à préciser)

## Impact state machine / events

Transitions mission, événements `mission_events`, webhooks Stripe. Référence : ARCHITECTURE.md §6 et §8.

(à préciser ou « aucun »)

## Dépendances

Services externes (API Adresse, Stripe, Inngest), jobs internes. Référence : ARCHITECTURE.md §2. État du provisionnement : `tech/setup.md` (pointer vers les lignes pertinentes, ne jamais dupliquer le statut).

(à préciser — pour chaque service externe, citer la section correspondante de `tech/setup.md`)

## État UI

Composants, transitions, breakpoints, mobile + desktop obligatoires. Référence : DESIGN.md.

(à préciser)

## Risques techniques

Pièges, limites, free-tier, observabilité. Références : ARCHITECTURE.md §9, §11, §13.

(à préciser)

## Tests envisagés

Unitaire core, intégration, E2E web (Playwright) ou mobile (Maestro). Référence : ARCHITECTURE.md §10.

(à préciser)
