# ARCHITECTURE — Delta

> Source de vérité technique du projet. Ce fichier guide les choix d'implémentation, complète `CLAUDE.md` (contexte produit consolidé) et `PRD.md` (règles métier détaillées). Toute évolution architecturale structurante est consignée dans le journal §18.

**Version** : 1.0 — 2026-05-06
**Statut** : Adopté
**Audience** : développeurs (humains et agentiques), product owner, futurs onboardés

---

## 1. Principes architecturaux

Sept principes qui tranchent quand deux options techniques s'opposent. Ils complètent les principes produit du PRD §2.3 (P1 à P8).

| # | Principe | Plutôt que |
|---|----------|-----------|
| A1 | **Free-tier first** — Aucune dépense récurrente avant pré-lancement, quitte à accepter quelques frictions de dev | Premium pour confort |
| A2 | **Domain first, framework second** — La logique métier vit dans `packages/core`, indépendante de Next.js, Supabase ou Stripe. Les adapters HTTP/DB/jobs sont fins | Logique mêlée aux route handlers |
| A3 | **Zod = contrat unique** — Tout schéma input/output est défini une fois dans `packages/contracts`, partagé FE/BE/jobs | Types dupliqués, dérive FE/BE |
| A4 | **RLS on par défaut** — Toutes les tables user-data ont une policy active dès leur création. Service role réservé aux jobs et webhooks | Authz uniquement au niveau handler |
| A5 | **État explicite, transitions auditées** — Toute transition de mission est une fonction pure typée + une ligne immutable dans `mission_events` | If/else éparpillés, état non auditable |
| A6 | **Idempotence partout** — Webhooks Stripe, jobs Inngest, notifs ont une clé d'idempotence. Rejouer un event ne casse rien | Conséquences imprévisibles si retry |
| A7 | **Migrations versionnées, pas de modif directe** — Toute évolution DB passe par une migration commitée. Aucun `ALTER TABLE` via dashboard Supabase | DB qui dérive entre envs |

---

## 2. Stack technique

### 2.1 Vue d'ensemble

| Couche | Choix | Note |
|---|---|---|
| Monorepo | Turborepo + pnpm workspaces | Builds incrémentaux, code partagé |
| Langage | TypeScript 5.5+, mode `strict` | End-to-end |
| Web | Next.js 15 App Router + Tailwind + shadcn/ui | RSC + Server Actions autorisés |
| Mobile | Expo SDK 53 + Expo Router + NativeWind 4 | OTA possible plus tard |
| API | Next.js Route Handlers (Vercel serverless) | Logique en `packages/core`, handlers fins |
| Validation | Zod (`packages/contracts`) | Aux frontières uniquement |
| Base de données | Supabase Postgres 15 + PostGIS + pgcrypto | Index GIST sur géo |
| Auth | Supabase Auth + Google + Apple | Décision produit 2026-05-03 |
| Sécurité données | RLS systématique, clé publishable côté client | Clés secrètes (`sb_secret_...`) isolées par service backend |
| Cache & rate-limit | Upstash Redis | Rate-limit auth + endpoints sensibles |
| Jobs asynchrones | Inngest | Matching, notifs, timers, expirations |
| Realtime | Supabase Realtime | Chat mission + statut live |
| Recherche | Postgres Full-Text Search | Catalogue acheteur, MVP suffisant |
| Paiement | Stripe Connect Express + escrow + webhooks signés | Décision produit 2026-05-01 |
| Géo / itinéraires | Google Routes API → LineString PostGIS | Buffer 10 km par défaut |
| Adresses | API Adresse Gouv.fr (autocomplétion FE direct) | Décision produit 2026-05-01 |
| Storage | Supabase Storage | Photos produits, KYC docs |
| Email | Resend + templates React Email | Transactionnel uniquement MVP |
| Push mobile | Expo Push | Aucun secret côté client |
| State machine | Discriminated union TS + audit trail (option B) | Pas de XState au MVP |
| Tests unit | Vitest (cible `packages/core`) | Coverage minimum machine à états + matching |
| Tests E2E web | Playwright | Parcours critiques uniquement |
| Tests E2E mobile | Maestro | Parcours rameneur prioritaire |
| Logs | pino (JSON structuré) | Niveaux : `info`, `warn`, `error` |
| Erreurs | Sentry (web + mobile + jobs) | Source map upload en CI |
| Analytics | Vercel Analytics | Events critiques uniquement (MVP free-tier) |
| Hosting web | Vercel Hobby (dev) → Pro (au lancement public) | Voir §13 |
| Hosting mobile | EAS Build + EAS Submit (Apple/Google une fois publié) | |
| CI/CD | GitHub Actions | Lint, typecheck, tests, preview Vercel |
| i18n | next-intl scaffoldé, `fr-FR` seul actif | Préparation v2 |

### 2.2 Versions cibles

| Outil | Version | Pin |
|---|---|---|
| Node | 20 LTS | `engines` dans tous les `package.json` |
| pnpm | 9.x | `packageManager` à la racine |
| Turborepo | 2.x | |
| Next.js | 15.x | App Router uniquement |
| Expo SDK | 53 | |
| TypeScript | 5.5+ | `strict: true`, `noUncheckedIndexedAccess: true` |
| Postgres | 15 | géré par Supabase |

---

## 3. Structure du monorepo

```
delta/
├── apps/
│   ├── web/                    Next.js 15 — site public, espace acheteur, espace producteur
│   └── mobile/                 Expo — appli rameneur prioritaire, accès acheteur/producteur
├── packages/
│   ├── core/                   Domain pur : entités, use cases, state machine mission, matching
│   ├── contracts/              Zod schemas, types API, énums
│   ├── db/                     Client Supabase typé, repos, query helpers
│   ├── design-tokens/          Couleurs, typo, espacements (web + mobile)
│   ├── ui-web/                 Composants shadcn customisés
│   ├── ui-mobile/              Composants RN + NativeWind
│   ├── api-client/             Wrapper fetch typé pour mobile
│   ├── jobs/                   Définitions Inngest (handlers fins → core)
│   └── config/                 ESLint, TS, Prettier, Vitest partagés
├── supabase/
│   ├── migrations/             Migrations SQL versionnées (YYYYMMDDHHMMSS_xxx.sql)
│   ├── seeds/                  Données de seed pour dev local
│   └── policies/               Policies RLS isolées par table (recommandé)
├── ARCHITECTURE.md             Ce fichier
├── CLAUDE.md                   Contexte produit consolidé
├── DESIGN.md                   Design system
├── PRD.md                      Spec produit
├── README.md                   Index du dépôt
└── ...
```

### 3.1 Responsabilité de chaque package

| Package | Contient | Ne contient PAS |
|---|---|---|
| `core` | Entités, use cases, state machines, règles métier, fonctions pures | I/O, HTTP, appels Supabase directs |
| `contracts` | Zod schemas API, types DTO, énums partagés | Logique métier |
| `db` | Client Supabase typé, fonctions repo (`findMissionById`, etc.), query helpers PostGIS | Logique métier, validation |
| `design-tokens` | JSON/TS de couleurs, typo, espacements, breakpoints | Composants |
| `ui-web` | shadcn customisé, composants web spécifiques | Logique métier, fetch |
| `ui-mobile` | RN components, NativeWind | Logique métier, fetch |
| `api-client` | Fetch wrapper, types réponses, gestion erreurs HTTP | Logique métier |
| `jobs` | Définitions Inngest, handlers (qui appellent `core`) | Logique métier |
| `config` | ESLint, TS, Prettier, Vitest configs | Code applicatif |

### 3.2 Règle d'import

Les apps importent des packages. Les packages **n'importent jamais** d'apps. Au sein des packages :

```
core       → contracts (uniquement)
db         → contracts + types Supabase générés
ui-*       → design-tokens
api-client → contracts
jobs       → core, db, contracts
```

Toute violation est un signal d'alarme : la logique fuit vers un adapter.

---

## 4. Conventions de code

### 4.1 Séparation domain / adapter — règle absolue

Les route handlers, jobs, et composants UI ne contiennent QUE de la plomberie. La logique vit dans `packages/core`. Un handler typique fait 15-30 lignes.

Bon :
```ts
// apps/web/app/api/v1/missions/[id]/reserve/route.ts
export async function POST(req: Request, ctx: { params: { id: string } }) {
  const user = await requireUser(req)
  const input = ReserveMissionInput.parse(await req.json())
  const result = await core.mission.reserve({
    user,
    missionId: ctx.params.id,
    ...input,
  })
  return Response.json(result)
}
```

Mauvais (logique dans le handler) :
```ts
// 80 lignes mêlant validation, requêtes Supabase et règles métier — refusé en review
```

### 4.2 Validation aux frontières uniquement

Toute donnée qui entre dans le système (HTTP body, env var, webhook payload, message Inngest) est validée par un schéma Zod **défini dans `packages/contracts`**. À l'intérieur du domaine, on travaille avec des types déjà parsés. On ne re-valide pas en cascade.

### 4.3 Erreurs typées

Les erreurs métier sont des classes dans `packages/core/src/errors.ts` avec un discriminator `code` (string littéral). Les adapters HTTP les mappent en codes 4xx.

```ts
// packages/core/src/errors.ts
export class MissionAlreadyReservedError extends Error {
  code = 'MISSION_ALREADY_RESERVED' as const
}
```

### 4.4 Naming

| Élément | Convention | Exemple |
|---|---|---|
| Tables / colonnes DB | `snake_case` | `missions`, `created_at` |
| Code TypeScript | `camelCase` / `PascalCase` | `reserveMission`, `MissionStatus` |
| Routes API | `kebab-case`, versionnées | `/api/v1/missions/:id/reserve` |
| Branches Git | `feat/kan-xx-description-courte` | `feat/kan-42-reserver-mission` |
| Migrations | `YYYYMMDDHHMMSS_description.sql` | `20260507083000_create_missions.sql` |

### 4.5 Lint, format, types

ESLint (config dans `packages/config/eslint`), Prettier, `pnpm typecheck` à chaque PR. Pas de merge si rouge. Tests Vitest verts requis.

### 4.6 Commits

Format : phrase courte en français, forme « Verbe + objet » (cohérent avec `CLAUDE.md`). Pas de `feat:`, `chore:`, etc.

```
Création de la machine à états mission
Ajout du matching incrémental sur ajout wishlist
Mise à jour des policies RLS sur producteurs
```

---

## 5. Modélisation base de données

### 5.1 Conventions communes

Toute table user-data contient :

| Colonne | Type | Note |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | |
| `created_at` | `timestamptz not null default now()` | |
| `updated_at` | `timestamptz not null default now()` | trigger d'auto-update |
| `deleted_at` | `timestamptz null` | soft delete (sauf tables d'événements et lookup) |

Les tables d'événements (`mission_events`, `stripe_webhook_events`) sont **immutables** : pas d'`updated_at`, pas de soft delete, pas d'`UPDATE`/`DELETE`.

### 5.2 RLS systématique

Toutes les tables user-data ont la RLS activée à la création. Au minimum :
- Une policy `select` filtrant par `auth.uid()`
- Des policies `insert/update/delete` filtrées par rôle et possession
- Pas de policy permissive `using (true)` sauf justification documentée

Les clés secrètes Supabase (`sb_secret_...`, rôle Postgres `service_role`) bypassent la RLS — utilisées uniquement dans `packages/jobs` et `apps/web/app/api/stripe/webhook/route.ts`. Une clé secrète distincte par service backend (jobs Inngest, webhook Stripe), révocable indépendamment via le dashboard Supabase. Cf. discussion supabase/supabase #29260 et entrée 1.3 du journal §18.

### 5.3 Schéma cible (vue haute, MVP)

| Table | Rôle |
|---|---|
| `users` | Compte unique multi-rôles (cf. décision produit 2026-05-03) |
| `profiles` | Données complémentaires utilisateur (nom, photo, téléphone) |
| `vehicles` | Profil véhicule rameneur (capacité qualitative : sac/coffre/break) |
| `producers` | Profil producteur, SIRET, statut vérification |
| `products` | Catalogue producteur (statut, stock, prix net, photos) |
| `product_photos` | 1 à 4 photos par produit, ordre, couverture |
| `wishlists` | Items en wishlist acheteur (privée, par produit spécifique) |
| `trips` | Trajet déclaré rameneur (origine, destination, dates, capacité, LineString) |
| `opportunities` | Vue matérialisée des matchs trip × producer × wishlists |
| `missions` | Mission réservée (FK trip, FK producer, statut, totaux) |
| `mission_buyers` | N acheteurs par mission, avec statut paiement individuel |
| `mission_events` | Audit trail immutable de toutes les transitions |
| `messages` | Chat de mission (rameneur ↔ acheteurs), Realtime |
| `stripe_webhook_events` | Idempotence des webhooks Stripe |
| `notifications` | Outbox notifs (push + email) avec idempotency_key |
| `pending_deletions` | RGPD : utilisateurs en délai de purge |

### 5.4 Index critiques

| Table | Index | Justification |
|---|---|---|
| `trips` | `GIST (route_geom)` | Recherche spatiale buffer LineString |
| `producers` | `GIST (location)` | ST_DWithin sur trajet |
| `products` | `(producer_id, status)` partial `WHERE deleted_at IS NULL` | Catalogue producteur |
| `products` | FTS sur `name + description` | Recherche acheteur |
| `wishlists` | `(buyer_id, product_id)` unique | Pas de doublon |
| `missions` | `(trip_id, status)` | Liste rameneur |
| `mission_events` | `(mission_id, created_at desc)` | Timeline mission |
| `stripe_webhook_events` | `(event_id)` unique | Idempotence |

### 5.5 Migrations

Un changement DB = un fichier SQL dans `supabase/migrations/` + un commit dédié. Naming `YYYYMMDDHHMMSS_description.sql`. Aucune édition via dashboard Supabase. CI joue les migrations sur la base de preview à chaque PR.

---

## 6. Machine à états mission

### 6.1 États (cf. PRD §11.4)

```
draft → reserved → awaiting_buyers → confirmed → picked_up → delivered → closed
                                  ↘ cancelled_no_buyer
                                            ↘ cancelled_no_stock
                                                       ↘ cancelled_rameneur_dropout
```

### 6.2 Implémentation (option B validée le 2026-05-06)

Discriminated union TS + fonction `transition()` pure dans `packages/core/src/mission/state-machine.ts`. Aucune dépendance externe (pas de XState).

```ts
type MissionState =
  | { status: 'draft'; tripId: string; producerId: string }
  | { status: 'reserved'; reservedAt: Date; reservedBy: string }
  | { status: 'awaiting_buyers'; deadline: Date }
  | { status: 'confirmed'; buyers: BuyerSnapshot[]; pickupQrId: string }
  | { status: 'picked_up'; pickedUpAt: Date }
  | { status: 'delivered'; deliveredAt: Date; payoutCapturedAt: Date }
  | { status: 'closed' }
  | { status: 'cancelled_no_buyer' | 'cancelled_no_stock' | 'cancelled_rameneur_dropout'; cancelledAt: Date }

export function transition(state: MissionState, event: MissionEvent): MissionState
```

### 6.3 Persistance

Chaque transition :
1. Calcule le nouvel état avec `transition()`
2. Met à jour la ligne `missions` (statut + champs dérivés)
3. **Insère une ligne immutable dans `mission_events`** (event type, payload, before, after, actor_id, timestamp)
4. Émet un event Inngest si downstream nécessaire (notif, timer, capture Stripe)

Les étapes 2-4 se font dans une **transaction unique** côté DB pour éviter l'incohérence.

### 6.4 Tests obligatoires

`packages/core/src/mission/state-machine.test.ts` couvre :
- Toutes les transitions valides (succès)
- Toutes les transitions invalides (erreur typée)
- Cas limites du PRD §11.5

Coverage cible : 100 % des branches de `transition()`.

---

## 7. Pipeline de matching

### 7.1 Triggers Inngest

| Event | Effet |
|---|---|
| `trip.created` | Recompute opportunités du trajet |
| `trip.updated` | Recompute opportunités du trajet |
| `trip.deleted` | Suppression des opportunités liées |
| `wishlist.added` | Recompute opportunités de tous les trajets compatibles |
| `wishlist.removed` | Mise à jour incrémentale |
| `product.updated` | Recompute opportunités où ce produit apparaît (statut, stock, prix) |
| `mission.cancelled` | Libération des wishlists, recompute des trajets affectés |

### 7.2 Algorithme (vue haute)

Stocké dans `packages/core/src/matching/`. Pour un trajet donné :

1. Récupérer le LineString du trajet (Google Routes → `route_geom`)
2. Trouver les producteurs `ST_DWithin(location, route_geom, 10000)` côté origine
3. Pour chaque producteur, trouver les wishlists actives dont l'acheteur est `ST_DWithin(buyer_address, route_geom, 10000)` côté destination
4. Filtrer par compatibilité capacité véhicule, statut produit `actif`, stock > 0
5. Insérer / mettre à jour la table `opportunities`

Buffer 10 km est paramétrable par config. Réglage fin (urbain vs rural) post-MVP.

### 7.3 Stockage : table matérialisée `opportunities`

Décision validée le 2026-05-06. Schéma indicatif :

```sql
opportunities (
  id uuid pk,
  trip_id uuid fk,
  producer_id uuid fk,
  buyers jsonb,           -- snapshot wishlists matchées au moment du calcul
  total_estimated_cents int,
  computed_at timestamptz,
  expires_at timestamptz,
  status enum('available', 'reserved', 'expired')
)
```

Les opportunités ont une **durée de vie courte** (24-48 h après `computed_at`). Le job de purge tourne quotidiennement.

### 7.4 Garde-fous

- **Idempotence** : un même event Inngest rejoué ne crée pas de doublons (clé `(trip_id, producer_id)` unique sur opportunités available)
- **Latence cible** : recompute d'un trajet < 2 s (sinon investiguer)
- **Cohérence** : la lecture acheteur (catalogue filtré) interroge `opportunities` avec un join, jamais le calcul à la volée

---

## 8. Paiement Stripe Connect

### 8.1 Modèle (cf. PRD §11.2 et décision produit 2026-05-01)

- **Stripe Connect Express** (validé 2026-05-06) — Stripe gère l'onboarding KYC du producteur via flux hosted
- **Escrow plateforme** : l'acheteur paie la plateforme intégralement à `confirmed`. Capture différée à `delivered`
- **Split** : 85 % producteur / 10 % rameneur / 5 % plateforme via `transfer_data` ou `transfers` séparés

### 8.2 Webhook handler

Une seule route : `apps/web/app/api/stripe/webhook/route.ts`.

```
1. Vérification signature (Stripe-Signature header)
2. Lecture event.id
3. Insertion dans stripe_webhook_events avec ON CONFLICT DO NOTHING
   → si conflict, l'event a déjà été traité, on ignore
4. Dispatch via switch sur event.type
5. Appel core.payment.handleEvent(event)
6. Réponse 200 (Stripe arrête de retry)
```

Clé secrète Supabase dédiée à cette route. Tous les autres handlers utilisent la clé publishable + JWT user.

### 8.3 Events critiques à traiter

| Event Stripe | Action côté Delta |
|---|---|
| `payment_intent.succeeded` | Marquer `mission_buyers.payment_status = paid`, transition mission si tous payés |
| `payment_intent.payment_failed` | Notifier acheteur, retry possible 24 h |
| `charge.captured` | (post `delivered`) déclencher transferts producteur + rameneur |
| `transfer.created/failed` | Tracer dans `mission_events` |
| `account.updated` | Mettre à jour statut KYC producteur |
| `charge.dispute.created` | Bloquer mission, alerter ops |

### 8.4 Tests

`packages/core/src/payment/` testé avec **Stripe test clocks** pour simuler le passage du temps (timer 24 h, échéances). Vitest + fixtures officielles Stripe.

---

## 9. Sécurité & conformité

### 9.1 Authentification

- Supabase Auth avec providers : email/password, Google, Apple (décision produit 2026-05-03)
- JWT court (1 h) + refresh long (30 j)
- Côté web : cookies httpOnly via `@supabase/ssr`
- Côté mobile : SecureStore (Expo)

### 9.2 Autorisation

Trois couches :
1. **RLS Postgres** — defense in depth, garde-fou ultime
2. **Domain authz** — `packages/core` vérifie les invariants métier (« seul le rameneur de la mission peut générer le QR pickup »)
3. **Adapter HTTP** — vérifie la présence et la validité du JWT, rien d'autre

### 9.3 Données sensibles non exposées (cf. décisions produit)

- Adresse exacte acheteur **jamais exposée** au rameneur avant accord chat (décision D3, 2026-05-01) — seul le code postal/quartier est partagé
- SIRET producteur exposé seulement après vérification (décision 2026-05-03)
- Prix net producteur visible producteur seulement, pas acheteur (décision 2026-05-01)

### 9.4 Rate-limit (Upstash Redis)

| Endpoint | Limite |
|---|---|
| `/api/v1/auth/*` | 10 req / min / IP |
| `/api/v1/missions/*/reserve` | 3 req / min / user (anti-double-clic) |
| `/api/stripe/webhook` | pas de limite, signature suffit |
| Default API | 60 req / min / user |

### 9.5 Secrets

- Vercel env vars (web, jobs)
- EAS secrets (mobile build-time)
- Aucun secret commité dans le repo. Pre-commit hook `gitleaks` recommandé

### 9.6 RGPD (à approfondir post-MVP — décision repoussée 2026-05-06)

Bases en place dès le MVP :
- Soft delete (`deleted_at`) sur user-data
- Job de purge dans `packages/jobs/rgpd.purge` (à activer pré-prod)
- Endpoint `/api/v1/me/data-export` (à activer pré-prod)
- Logs ne contiennent pas de données personnelles (interdiction d'`info`-log un email ou un nom)

Politique de rétention détaillée à trancher avant pré-lancement public.

---

## 10. Tests

### 10.1 Pyramide

```
   ┌──────────────┐
   │  E2E mobile  │  Maestro — parcours rameneur critiques (déclarer trajet, réserver, scanner QR)
   ├──────────────┤
   │  E2E web     │  Playwright — parcours acheteur + producteur critiques
   ├──────────────┤
   │  Intégration │  Vitest sur packages/jobs avec Supabase test branch
   ├──────────────┤
   │   Unit       │  Vitest sur packages/core (machine à états, matching, payment)
   └──────────────┘
```

### 10.2 Cibles de coverage

| Cible | Coverage minimum |
|---|---|
| `core/mission/state-machine` | 100 % branches |
| `core/matching` | 90 % branches |
| `core/payment` | 90 % branches |
| Reste de `core` | 70 % |
| Adapters HTTP, jobs, UI | non requis (couvert par e2e) |

### 10.3 Fixtures et data builders

Pas de mocks à la main dans les tests. Builders typés dans `packages/core/test/builders.ts` :

```ts
const mission = aMission().withStatus('confirmed').withBuyers(2).build()
```

### 10.4 Tests Stripe

Stripe test clocks + cartes de test officielles pour simuler les flux escrow → capture → split. Aucun mock du SDK Stripe : on tape la sandbox.

---

## 11. Observabilité

### 11.1 Logs

- Format : JSON structuré via `pino`
- Niveaux : `info` (étapes métier), `warn` (anomalies récupérables), `error` (échec)
- Champs systématiques : `traceId`, `userId` (si auth), `route`, `latencyMs`
- **Interdit** : logger un email, un nom, un téléphone, un numéro de carte

### 11.2 Erreurs

Sentry sur :
- `apps/web` (intégration Next.js)
- `apps/mobile` (intégration Expo)
- `packages/jobs` (intégration Inngest)

Source maps uploadées en CI. Release tag = SHA Git.

### 11.3 Métriques clés (à instrumenter dès la première feature concernée)

| Métrique | Source | Alerte |
|---|---|---|
| Latence recompute matching | Inngest | > 5 s sur p95 |
| Taux d'échec webhook Stripe | Sentry + table | > 1 % sur 1 h |
| Latence ST_DWithin trajet | Logs | > 500 ms p95 |
| Taux de mission `cancelled_*` | Dashboard SQL | > 20 % sur 7 j |

### 11.4 Dashboards

- Inngest dashboard : jobs, retries, échecs
- Vercel : déploiements, web vitals
- Supabase : métriques DB, queries lentes
- Sentry : erreurs

Pas de Grafana / Datadog au MVP.

---

## 12. CI/CD

### 12.1 Pipeline GitHub Actions

À chaque PR :
1. `pnpm install --frozen-lockfile`
2. `pnpm lint` (ESLint)
3. `pnpm typecheck` (`tsc --noEmit`)
4. `pnpm test` (Vitest)
5. `pnpm build` (Turbo, cache distant si configuré)
6. Migrations DB jouées sur branche Supabase preview
7. Preview deploy Vercel automatique (lien dans la PR)

E2E (Playwright + Maestro) : sur `main` post-merge ou tag `[e2e]` dans le titre PR.

### 12.2 Branches & merge

- `main` = production-ready (déployé sur Vercel prod quand activé)
- Feature branches `feat/kan-xx-xxx`
- Squash merge obligatoire, message squash = titre PR
- Pas de merge si CI rouge

### 12.3 Déploiements

| Environnement | Web | Mobile | DB |
|---|---|---|---|
| **Local** | `pnpm dev` (Next + Inngest dev server) | Expo Go ou EAS dev build | Supabase local CLI ou branche dev |
| **Preview** | Vercel preview par PR | EAS dev build interne | Supabase branche preview |
| **Production** | Vercel prod (manuel ou auto sur `main`) | EAS Build → TestFlight / Play Internal | Supabase prod |

---

## 13. Stratégie free-tier

### 13.1 Principe (A1)

Aucune dépense récurrente avant pré-lancement. Tous les services choisis ont un free tier exploitable pendant la phase de dev. On bascule payant **événement par événement**, pas en bloc.

### 13.2 Free tier par service

| Service | Free tier | OK pour dev | Trigger d'upgrade |
|---|---|---|---|
| Supabase | 500 MB DB, 1 GB storage, 50k MAU auth, 5 GB egress | ✅ | Pré-lancement public — Pro 25 $/mois (déverrouille HIBP leaked password protection, time-box sessions, inactivity timeout, PITR, suppression de la pause auto après 7 j d'inactivité) |
| Vercel Hobby | 100 GB bandwidth, preview deploys | ⚠️ usage non-commercial selon TOS | Au lancement public — Pro 20 $/mois |
| Inngest | 50k step-runs/mois, 1 concurrent | ✅ très large | Quand le matching tournera en continu |
| Upstash Redis | 10k commandes/jour, 256 MB | ✅ | Trafic réel |
| Stripe + Connect Express | 100 % gratuit en test mode | ✅ | Activation mode live (commission 1,4 % + 0,25 € + 0,25 % Connect) |
| Google Routes API | 200 $/mois de crédit (~40k requêtes) | ✅ | Au-delà de ~1k trajets/jour |
| Resend | 100 mails/jour, 3 000/mois | ✅ | Volume de notifs |
| Expo / EAS | 30 builds/mois | ⚠️ tight si itérations fréquentes | Plan Production 19 $/mois |
| Sentry Developer | 5k erreurs/mois | ✅ | Plusieurs envs ou prod |
| GitHub Actions | 2 000 min/mois (repo privé) | ✅ | Jamais probablement |
| API Adresse Gouv.fr | Gratuit illimité (usage raisonnable) | ✅ | Jamais |
| Vercel Analytics | 2 500 events/mois | ⚠️ tight | Très vite en prod |
| Apple Developer Program | Non gratuit (99 $/an) | Pas requis dev | Avant publication App Store |
| Google Play | Non gratuit (25 $ one-shot) | Pas requis dev | Avant publication Play Store |

### 13.3 Workarounds dev pour rester gratuit

- **Supabase pause après 7 j** : GitHub Actions cron qui ping la DB tous les 6 jours (`SELECT 1`)
- **Webhook Stripe local** : Stripe CLI `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- **Mobile push test** : Expo Push gratuit, TestFlight/Play Internal max 100 testeurs gratuits
- **Domain custom** : pas requis pendant dev (utiliser sous-domaine `vercel.app`)
- **Doppler / secrets manager** : pas requis, Vercel env vars + EAS secrets suffisent

### 13.4 Coût attendu au lancement public

Estimation conservatrice : Supabase Pro 25 $ + Vercel Pro 20 $ + EAS Production 19 $ + Apple 8 $/mois équivalent + reste free = **~75 €/mois fixe**, plus commissions Stripe variables sur transactions.

---

## 14. Comment ajouter une feature — playbook Claude Code

Checklist à dérouler **avant chaque feature**. Cohérente avec les workflows obligatoires de `CLAUDE.md`.

### 14.1 Avant de coder

- [ ] Lire le ticket Jira KAN-XX (skill `issue-fetcher`)
- [ ] Vérifier `produit/decisions/decisions_produit.md` — la feature contredit-elle une décision ?
- [ ] Vérifier les garde-fous de `CLAUDE.md` § « Garde-fous produit » :
  - Compatible « rameneur initiateur » ?
  - Dans le scope MVP ?
  - Implication paiement / chaîne du froid / multi-producteurs ?
- [ ] Repérer l'écran(s) impactés dans le sitemap (`PRD.md` §10) et la maquette HTML existante
- [ ] Identifier les tables DB touchées et anticiper les policies RLS

### 14.2 Pendant l'implémentation

Choisir l'emplacement de chaque morceau de code selon ce tableau :

| Type de code | Emplacement |
|---|---|
| Schéma Zod input/output API | `packages/contracts/src/<domain>.ts` |
| Règle métier, fonction pure, state machine | `packages/core/src/<domain>/` |
| Requête DB ou helper PostGIS | `packages/db/src/<table>/` |
| Migration DB | `supabase/migrations/YYYYMMDDHHMMSS_<desc>.sql` |
| Policy RLS | `supabase/policies/<table>.sql` |
| Route handler HTTP | `apps/web/app/api/v1/<resource>/route.ts` (15-30 lignes max) |
| Job asynchrone | `packages/jobs/src/<job>.ts` (handler fin → core) |
| Composant UI web | `apps/web/components/` ou `packages/ui-web/` |
| Composant UI mobile | `apps/mobile/components/` ou `packages/ui-mobile/` |
| Tests unitaires logique | `packages/core/src/<domain>/<file>.test.ts` |
| Tests E2E web critique | `apps/web/e2e/` (Playwright) |
| Tests E2E mobile critique | `apps/mobile/e2e/` (Maestro) |

### 14.3 Avant de demander review / merge

- [ ] `pnpm lint && pnpm typecheck && pnpm test` verts en local
- [ ] Migration jouée et reversible si besoin
- [ ] RLS active sur toute nouvelle table
- [ ] Si nouveau Zod schema → exporté depuis `packages/contracts/src/index.ts`
- [ ] Si nouvelle transition de mission → ajoutée à la state machine ET à `mission_events`
- [ ] Si nouvel event Inngest → idempotent (clé documentée)
- [ ] Si nouveau webhook Stripe traité → ajouté à `stripe_webhook_events`
- [ ] Mise à jour de `produit/jira_mapping.md` (règle obligatoire `CLAUDE.md`)
- [ ] Si la feature crée un écran neuf → mise à jour PRD §10 + maquette HTML

### 14.4 Si la feature implique une décision technique structurante

Ajouter une entrée au journal §18 de ce fichier dans le même commit. Format :

```
| X.Y | YYYY-MM-DD | <résumé concis> |
```

---

## 15. Hors scope architecture MVP

Pour mémoire, à ne pas réintroduire sans justification explicite :

- **Microservices** — un monolithe Next.js + jobs Inngest suffit largement à 10k users
- **GraphQL** — REST + Zod couvre 100 % des besoins MVP
- **tRPC** — verrouille à un client JS, déconseillé (cf. discussion architecture 2026-05-06)
- **NestJS** — pas avant que l'équipe dépasse 5 devs (cf. discussion 2026-05-06)
- **Algolia / Meilisearch** — Postgres FTS suffit
- **Kubernetes / Docker en prod** — Vercel + Supabase suffisent
- **Wallet interne** — décision produit, hors scope MVP
- **Multi-producteurs par mission** — décision produit, hors scope MVP
- **Carte temps réel des trajets** — décision produit, hors scope MVP
- **Application desktop native** — non envisagé
- **Internationalisation activée** — `fr-FR` seul, mais next-intl scaffoldé

---

## 16. Trajectoire de scale

Les vraies portes de sortie identifiées le 2026-05-06 :

| Composant | Successeur possible | Effort migration |
|---|---|---|
| Vercel | AWS via SST/OpenNext | Modéré (~2 semaines) |
| Supabase Postgres | Neon, RDS, Aurora | Faible (`pg_dump`/`pg_restore` + DSN) |
| Supabase Auth | Cognito, Auth0, Clerk | Modéré (export users + cutover) |
| Supabase Storage | S3 | Faible (mêmes URLs signées) |
| Inngest | AWS EventBridge + Lambda, ou Temporal | Élevé (réécriture handlers) |
| Next Route Handlers | NestJS sur Fly.io / ECS | Modéré si discipline `core` respectée |
| Resend | SES, Postmark | Très faible |

Le seul vrai engagement structurant est **Postgres**. Tout le reste est swappable sans toucher la logique métier (à condition que A2 soit respecté).

---

## 17. Décisions techniques en suspens

| Sujet | Statut | Échéance |
|---|---|---|
| Politique de rétention RGPD précise | À trancher | Avant pré-lancement |
| Statut juridique rameneur (URSSAF) | À trancher (mention `decisions_produit.md`) | Avant pré-lancement |
| Stratégie backup / DR détaillée | À trancher (PITR Supabase Pro à confirmer) | Avant pré-lancement |
| Buffer géo variable urbain/rural | À régler | Post-MVP |
| Seuil minimum acheteurs / montant pour confirmer mission | À trancher | Avant développement mission flow |
| Politique de pénalités rameneur / acheteur | À trancher | Avant développement notation |

---

## 18. Journal des décisions techniques

| Version | Date | Résumé |
|---|---|---|
| 1.0 | 2026-05-06 | Création. Stack adoptée : monorepo Turborepo + pnpm, TS end-to-end, Next.js 15 (App Router) + Tailwind + shadcn pour le web, Expo + NativeWind pour le mobile, Next Route Handlers pour l'API (extractibles via discipline `packages/core`), Supabase Postgres + PostGIS + RLS-on-par-défaut, Supabase Auth (Google + Apple), Inngest pour les jobs, Stripe Connect Express en escrow avec split 85/10/5, Resend pour mail, Expo Push, Maestro pour E2E mobile, Playwright pour E2E web, Vitest pour l'unit, free-tier first. Décisions structurantes : option B (discriminated union TS) pour la state machine mission, table matérialisée `opportunities` pour le matching, RLS systématique, séparation stricte domain/adapter (A2). |
| 1.1 | 2026-05-06 | Adoption d'une convention de cadrage technique inspirée d'OpenSpec. Nouveau dossier `specs/KAN-XXX/` (trois fichiers : `proposal.md`, `design.md`, `tasks.md`) intercalé entre Jira et le code. Skill `.claude/skills/propose-spec/` + slash command `/propose KAN-XXX` pour générer le cadrage à partir du ticket. Option A retenue : Jira reste maître des tâches livrables (subtasks). `tasks.md` ne contient que des tâches techniques internes (setup, refacto, migrations, helpers). Sources de vérité disjointes : fond des specs dans le repo, Jira ne stocke que des liens. CLAUDE.md mis à jour (nouvelle section "Cadrage technique d'une feature Jira"). |
| 1.2 | 2026-05-08 | Scaffold initial du monorepo. Suppression du dossier obsolète `code/`. Création à la racine de `package.json` (workspaces pnpm 9, engines Node 20), `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `turbo.json` (pipeline build/lint/typecheck/test/dev/clean). `.gitignore` étendu (Turborepo, Next, Expo, Supabase, Sentry, coverage). CLAUDE.md complété d'une règle « Synchronisation transverse des fichiers Markdown » imposant la propagation des modifs structurantes à tous les `.md` concernés dans le même commit. |
| 1.3 | 2026-05-08 | Adoption du nouveau système de clés API Supabase (`sb_publishable_...` / `sb_secret_...`) remplaçant les clés JWT legacy `anon` / `service_role`. Variables d'environnement renommées : `SUPABASE_PUBLISHABLE_KEY` (côté client, exposable) et `SUPABASE_SECRET_KEY` (côté serveur, bypass RLS). Plusieurs clés secrètes possibles : une par service backend (jobs Inngest, webhook Stripe), révocables indépendamment via dashboard Supabase. Avantages : interdiction matérielle d'usage côté browser (HTTP 401), audit log par clé, rotation zéro-downtime. Sections impactées : §2.1 ligne sécurité, §5.2 RLS, §8.2 webhook Stripe, §13.2 trigger d'upgrade Supabase Pro (HIBP, time-box sessions, inactivity timeout confirmés Pro-only lors du provisionnement). Source : discussion supabase/supabase #29260 (depuis nov. 2025, les nouveaux projets n'ont plus accès aux clés legacy). Provisionnement : projet `delta-dev` créé le 2026-05-08 en région `eu-west-3` avec PostGIS 3.3.7 + pgcrypto activés ; trace dans `tech/setup.md`. |
| 1.4 | 2026-05-10 | Workflow de migrations Supabase opérationnel. Supabase CLI installée (Homebrew), `supabase init` exécuté à la racine du repo, projet `delta-dev` lié via `supabase link --project-ref knyfrnxkqyyirnsyijfk`. Squelette créé : `supabase/` avec `config.toml`, `migrations/`, `seeds/`, `policies/`. Première migration `20260510120000_init.sql` poussée via `supabase db push` (présence confirmée dans `supabase_migrations.schema_migrations`) : vérification idempotente des extensions PostGIS + pgcrypto, installation du helper `public.set_updated_at()` à attacher en BEFORE UPDATE sur toutes les futures tables user-data (cf. §5.1). Convention de nommage `YYYYMMDDHHMMSS_description.sql` (§5.5) confirmée comme prévalant sur la mention `001_init.sql` historiquement utilisée dans `tech/setup.md` (alignement de la checklist effectué). Sections impactées : aucune section normative modifiée — événement de provisionnement pur. README.md mis à jour pour refléter la nouvelle entrée `supabase/` à la racine et corriger l'arborescence stale (suppression de la mention `code/`, déplacement de `apps/` + `packages/` à la racine pour s'aligner sur le scaffold 1.2). |
| 1.5 | 2026-05-10 | Tooling Claude ↔ Supabase. Pack **Agent Skills Supabase** (`supabase/agent-skills`) installé en project-scope dans `.claude/skills/` — deux skills : `supabase` (client libs, auth, RLS, migrations, extensions) et `supabase-postgres-best-practices` (8 catégories de réf, security/RLS et schema design en Critical/High). Aucune divergence détectée avec §5.1 (lowercase snake_case), §5.2 + A4 (RLS-on, force RLS), §5.5 (naming `YYYYMMDDHHMMSS_*.sql`). Hiérarchie en cas de conflit inchangée : sections normatives d'`ARCHITECTURE.md` priment sur les recommandations du skill. **MCP Supabase** branché en mode **read-only** sur `delta-dev` (`npx @supabase/mcp-server-supabase --read-only --project-ref=knyfrnxkqyyirnsyijfk`) via fichier `.mcp.json` à la racine du repo. Décision read-only motivée par A7 (migrations versionnées, pas de modif directe) plutôt que A1 : le verrou ferme par construction `apply_migration` via MCP et force tout changement DB à passer par un fichier commité dans `supabase/migrations/`. CLI Supabase reste l'outil RW canonique ; escalade RW ad-hoc possible via second profil temporaire si justifié. Personal Access Token Supabase exposé via `SUPABASE_ACCESS_TOKEN` dans le shell utilisateur (jamais dans le repo). **Décision conventionnelle associée** : `.claude/skills/`, `.claude/commands/`, `.claude/prompts/` et `.mcp.json` sont désormais versionnés (correction de l'incohérence portée depuis l'entrée 1.1 — `propose-spec` était référencé dans `ARCHITECTURE.md` mais ignoré par `.gitignore`). `.gitignore` ajusté : `.claude/settings.local.json` et `.claude/worktrees/` restent locaux. CLAUDE.md complété d'une règle « Configuration Claude versionnée » dans la section Conventions. README.md mis à jour pour refléter l'arborescence (.claude/ + .mcp.json visibles à la racine). Trace tooling dans `tech/setup.md`. |
| 1.6 | 2026-05-11 | Scaffold initial de `apps/web` (Next.js 15 App Router + React 19 + Tailwind CSS). TypeScript strict via `@delta/config/tsconfig/react.json` (`noEmit: true` ajouté car Next compile lui-même), ESLint via `@delta/config/eslint/next`. Polices `next/font/google` (DM Sans pour le body, Lora pour le display) câblées en CSS variables (`--font-body`, `--font-display`). Tokens DESIGN.md inlinés dans `tailwind.config.ts` (palette `green` / `earth` / `cream`, radii, shadows, breakpoints `mobile`/`tablet`/`desktop`). Note technique : ces tokens seront extraits dans `packages/design-tokens` (§3 du présent doc) quand `apps/mobile` arrivera, pour partage avec NativeWind. `app/page.tsx` minimal pour valider le pipeline (landing avec règles DESIGN.md §299 respectées : fond `cream-50`, texte `cream-950`, aucun blanc/noir pur). `app/globals.css` : Tailwind directives + reset minimal. Aucune section normative modifiée — événement de scaffold pur. README.md mis à jour (entrée `apps/` n'est plus marquée « à venir »). Aucun composant shadcn/ui installé à ce stade (init reportée au premier composant à créer pour éviter les `components/ui/` vides). |
| 1.7 | 2026-05-11 | Vercel + GitHub Actions provisionnés. Projet Vercel `delta-web-gamma` créé en plan Hobby, lié au repo `Erkkul/delta`, Root Directory = `apps/web`, Framework auto-détecté Next.js, premier deploy réussi sur `https://delta-web-gamma.vercel.app` (slug auto-généré, renommage différé au domaine custom). **Décision : intégration GitHub native Vercel** pour preview deploy (par PR) et prod deploy (sur push `main`) via webhook, **pas de deploy orchestré depuis GitHub Actions**. Motivation : moins de credentials à gérer (pas de `VERCEL_TOKEN` / `ORG_ID` / `PROJECT_ID` côté GitHub), moins de surface d'attaque, moins de duplication. Trade-off accepté : on ne peut pas gater le deploy sur la CI Actions verte — Vercel a son propre build qui sert de gate de facto. Workflows GitHub Actions posés : (a) `.github/workflows/ci.yml` — `pnpm install --frozen-lockfile` + `pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm build` sur push `main` et PR, Node 20, pnpm détecté via `packageManager`, concurrency group par branche, cache pnpm activé (b) `.github/workflows/supabase-keepalive.yml` — cron `14 3 */3 * *` (tous les 3 jours à 03:14 UTC, marge confortable vs. limite 7 j de pause Free-tier §13.3), curl `/rest/v1/` avec `SUPABASE_PUBLISHABLE_KEY` (en secret repo), accepte 200/404 comme succès, `workflow_dispatch` activé pour déclenchement manuel. Sections impactées : aucune section normative — §12.1 (pipeline CI) restait correcte ; précision apportée que les étapes 6 (migrations DB sur branche Supabase preview) et 7 (preview deploy) ne sont pas dans le workflow Actions (étape 6 reportée post-MVP, étape 7 gérée nativement par Vercel). Trace dans `tech/setup.md` (sections Vercel + GitHub Actions). |
| 1.8 | 2026-05-11 | Correctif ESLint flat config. `packages/config/eslint/base.js` enrichi d'un bloc `ignores` global couvrant les dossiers générés (`.next`, `.turbo`, `dist`, `build`, `coverage`, `node_modules`) et **les fichiers de config** (`**/*.config.{js,mjs,ts,cjs}`, `**/eslint.config.{js,mjs,ts}`, `**/next-env.d.ts`). Motif : typescript-eslint v8 utilise `projectService: true` qui tente de typer chaque fichier via tsconfig — il échoue avec `Parsing error: ... was not found by the project service` sur les `.mjs` de config (next, postcss, tailwind, eslint) volontairement absents de `tsconfig.json`. L'ignore est plus propre que d'élargir `include` ou d'activer `allowDefaultProject` (les fichiers de config sont de l'outillage, pas du code applicatif). Override historique `**/*.config.{js,mjs,ts}` (qui désactivait `no-floating-promises`) réduit aux seuls tests `**/*.test.{ts,tsx}` puisque les configs sont désormais entièrement ignorées. Découvert via run CI rouge du commit 1.7 sur l'étape `pnpm lint`. |
| 1.9 | 2026-05-11 | Correctif keepalive Supabase. Le workflow `.github/workflows/supabase-keepalive.yml` ciblait initialement `/rest/v1/` avec la publishable key (`SUPABASE_PUBLISHABLE_KEY` en secret GitHub). Échec au premier run manuel : `HTTP 401 — Only secret API keys can be used for this endpoint`. Le comportement est documenté par Supabase pour la nouvelle gen de clés (`sb_publishable_*` / `sb_secret_*`, entrée 1.3 du présent journal) : la publishable est destinée au client et est refusée sur certains endpoints serveur, dont la racine PostgREST. **Bascule sur `/auth/v1/health`** : endpoint GoTrue public, pas de clé requise, retourne `200 {"version":"...","name":"GoTrue"}`. Objectif anti-pause Free-tier toujours atteint car toute activité sur un service Supabase (Auth, REST, Storage, Realtime) réinitialise le compteur d'inactivité. Conséquence : le secret `SUPABASE_PUBLISHABLE_KEY` n'est plus requis côté GitHub pour ce workflow. Reclassé en « secret différé » dans `tech/setup.md` pour quand un workflow Actions aura besoin de requêter PostgREST (monitoring santé prod, tests d'intégration). Si un round-trip Postgres garanti devient nécessaire, basculer sur une `SUPABASE_SECRET_KEY` dédiée (clé secret distincte par service backend, principe 1.3). |
