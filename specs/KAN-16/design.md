# Conception technique — KAN-16 Onboarding Stripe Connect

## Vue d'ensemble

Wizard 3 étapes hébergé sous `/onboarding/producer` (étape pilotée par `?step=` ou state local). Chaque étape persiste côté `producers` (row créée à l'entrée du wizard).

Étape 2 « SIRET » : `POST /api/v1/producer/onboarding/siret` enregistre la déclaration et émet un event Inngest `producer.siret.requested` qui appelle l'API Sirene INSEE en arrière-plan, retournant `verified` ou `rejected`.

Étape 3 « Stripe » : `POST /api/v1/producer/onboarding/stripe-link` crée le compte Stripe Connect Express si absent (idempotent : si `producers.stripe_account_id` existe déjà, on réutilise), génère un Account Link `account_onboarding` et retourne l'URL au client qui redirige.

Au retour, l'écran `/stripe/return` n'affiche qu'un état d'attente — la vérité du statut KYC arrive via le webhook `account.updated` sur le endpoint Connect, qui met à jour `producers.stripe_status / payouts_enabled / charges_enabled / requirements_currently_due`. La page souscrit à la row `producers` via Supabase Realtime pour refléter `pending → active` sans rafraîchissement. Quand SIRET = `verified` ET `payouts_enabled = true` → redirection vers `/producer/dashboard` (PR-03).

## Packages touchés

- [x] `packages/contracts` — `SiretDeclarationInput`, énums `SiretStatus`, `StripeAccountStatus`
- [x] `packages/core` — use cases `submitSiretDeclaration`, `requestStripeOnboardingLink`, `applyStripeAccountUpdate(event)`, `verifySiretWithInsee(siret, legalName)` (handler appelé par Inngest), erreurs typées (`InvalidSiretError`, `SiretAlreadyVerifiedError`, `StripeAccountAlreadyEnabledError`)
- [x] `packages/db` — repo `producers` : `getByUserId`, `upsertSiretDeclaration`, `updateSiretStatus`, `setStripeAccount`, `applyStripeAccountUpdate`
- [x] `apps/web` — pages `/onboarding/producer`, `/onboarding/producer/stripe/return`, `/onboarding/producer/stripe/refresh` + handlers `/api/v1/producer/onboarding/siret`, `/api/v1/producer/onboarding/stripe-link` + extension `/api/v1/webhooks/stripe` (dispatch `account.updated`)
- [ ] `apps/mobile` — différé
- [x] `packages/jobs` — premier job Inngest du repo : `producer.siret.requested` → `verifySiretWithInsee`. Scaffolde le package `packages/jobs` (n'existe pas encore — cf. `tech/setup.md` § Inngest *À faire*)
- [x] `supabase/migrations` — table `producers` (cf. modèle ci-dessous) + table `stripe_webhook_events` (idempotence webhook, ARCHITECTURE.md §5.3)
- [x] `supabase/policies` — `producers.sql` (RLS user-owned), `products.sql` (gating catalogue conditionné `siret_status = verified` ET `payouts_enabled = true`)
- [x] `packages/ui-web` — `OnboardingWizardShell` (timeline + breakpoint mobile), `SiretForm`, `StripeOnboardingCard`

## Modèle de données

Référence : ARCHITECTURE.md §5.

**Migration `YYYYMMDDHHMMSS_create_producers_and_stripe_webhook_events.sql` :**

Table `producers` (user-data, RLS on, soft delete) :

| Colonne | Type | Note |
|---|---|---|
| `id` | `uuid pk default gen_random_uuid()` | |
| `user_id` | `uuid not null unique references auth.users(id) on delete cascade` | 1 producer par user |
| `siret` | `text null` (CHECK longueur 14, chiffres) | nullable tant que pas saisi |
| `legal_name` | `text null` | raison sociale telle que déclarée |
| `legal_form` | `text null` | EARL / SCEA / SARL / Auto-entrepreneur / SAS / GAEC |
| `naf_code` | `text null` | ex `01.13Z` |
| `siret_status` | `text not null default 'not_submitted'` | CHECK : `not_submitted` / `pending` / `verified` / `rejected` |
| `siret_verified_at` | `timestamptz null` | |
| `siret_rejection_reason` | `text null` | message INSEE si `rejected` |
| `stripe_account_id` | `text null unique` | `acct_...` |
| `stripe_status` | `text not null default 'not_created'` | CHECK : `not_created` / `pending` / `active` / `restricted` / `disabled` |
| `payouts_enabled` | `boolean not null default false` | miroir `account.updated` |
| `charges_enabled` | `boolean not null default false` | miroir `account.updated` |
| `requirements_currently_due` | `text[] not null default '{}'` | miroir `account.updated.requirements.currently_due` |
| `created_at` / `updated_at` / `deleted_at` | conventions §5.1 | |

Index : `idx_producers_user_id` (couvert par unique), `idx_producers_stripe_account_id` (lookup webhook).

Table `stripe_webhook_events` (immutable, pas de RLS — `service_role` only) :

| Colonne | Type |
|---|---|
| `event_id` | `text primary key` |
| `event_type` | `text not null` |
| `payload` | `jsonb not null` |
| `received_at` | `timestamptz not null default now()` |
| `processed_at` | `timestamptz null` |
| `error` | `text null` |

Trigger `set_updated_at` BEFORE UPDATE sur `producers` (helper §5.1 déjà installé).

**RLS `supabase/policies/producers.sql`** : `select` / `insert` / `update` filtrés par `auth.uid() = user_id` ; pas de `delete` (soft delete via `deleted_at` côté core) ; bypass `service_role` pour le job Inngest et le webhook handler.

**RLS `supabase/policies/products.sql`** : la policy `select` publique inclut `EXISTS (SELECT 1 FROM producers p WHERE p.user_id = products.producer_user_id AND p.siret_status = 'verified' AND p.payouts_enabled = true AND p.deleted_at IS NULL)`. Le producteur voit toujours ses propres produits indépendamment.

## API / Endpoints

Référence : ARCHITECTURE.md §3.

- `POST /api/v1/producer/onboarding/siret`
  - Auth : JWT user (cookies httpOnly via `@supabase/ssr`)
  - Input : `SiretDeclarationInput` `{ siret, legal_name, legal_form, naf_code }` (Zod)
  - Output : `{ siret_status: 'pending' }` (202)
  - Codes : 202 / 400 / 401 / 403 (rôle ≠ producteur) / 409 (`siret_status = verified` déjà — bloque modification au MVP) / 429
  - Comportement : upsert row `producers` pour `auth.uid()`, statut `pending`, émet event Inngest `producer.siret.requested` avec `producer_id`
- `POST /api/v1/producer/onboarding/stripe-link`
  - Auth : JWT user
  - Input : aucun (déduit du JWT)
  - Output : `{ url, expires_at }` (200) — Account Link Stripe à suivre côté client
  - Codes : 200 / 401 / 403 / 409 (`payouts_enabled = true` — pas besoin de relancer) / 429 / 502 (Stripe en amont)
  - Comportement : si `producers.stripe_account_id` est null, `stripe.accounts.create({ type: 'express', country: 'FR', ... })` puis persistance ; appelle ensuite `stripe.accountLinks.create({ account, return_url, refresh_url, type: 'account_onboarding' })`
- `POST /api/v1/webhooks/stripe` (extension de l'endpoint déjà câblé côté Stripe pour platform + Connect)
  - Vérification signature avec `STRIPE_WEBHOOK_SECRET_PLATFORM` puis `STRIPE_WEBHOOK_SECRET_CONNECT` (cf. `tech/setup.md`) — premier secret qui valide gagne, sinon 400
  - Insertion idempotente dans `stripe_webhook_events` (`ON CONFLICT (event_id) DO NOTHING`)
  - Dispatch sur `event.type === 'account.updated'` → `applyStripeAccountUpdate(event)` (lookup row par `stripe_account_id`, sync 4 colonnes)

Rate-limits Upstash dédiés (réutilise `packages/core/rate-limit` — KAN-3) :
- `siret-declaration:<userId>` — 5 / heure
- `stripe-link:<userId>` — 10 / 15 min (Account Link expire vite, l'utilisateur peut légitimement re-cliquer)
- Webhook Stripe : pas de limite, signature suffit (ARCHITECTURE.md §9.4)

## Impact state machine / events

Référence : ARCHITECTURE.md §6 et §8.

- **Aucun impact mission** : pas de transition `mission_*`, pas d'event `mission_events`. KAN-16 prépare les conditions pour qu'un producteur soit en bout de mission, ne touche pas le cycle.
- **Premier event Inngest du repo** : `producer.siret.requested` (idempotence par `producer_id` + retry exponentiel Inngest natif). Pas de besoin de `producer_events` au MVP — la row `producers` reflète l'état courant ; à introduire post-MVP en table immutable séparée si conformité/litiges l'exigent.
- **Premier handler webhook Stripe du repo** : `account.updated`. Pose le pattern réutilisé pour `payment_intent.succeeded`, `charge.captured`, `transfer.created/failed` (KAN-33, KAN-34). Cf. ARCHITECTURE.md §8.2.

## Dépendances

Référence : ARCHITECTURE.md §2. État du provisionnement : `tech/setup.md`.

- **Stripe Connect Express** — voir `tech/setup.md` § Stripe Connect Express. Statut *Partiel* : compte plateforme + profil Connect + 2 webhook destinations OK en test mode. Reste à provisionner côté code : Stripe CLI local (`stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe`) qui produit un 3e `whsec_` local-only à coller dans `.env.local`.
- **API Sirene INSEE** — voir `tech/setup.md` § APIs externes / API Sirene INSEE. Statut *Fait* (2026-05-16). Plan public gratuit, ≤ 30 req/min, clé sans expiration posée dans le header `X-INSEE-Api-Key-Integration` de chaque requête (pas d'OAuth, pas de `/token`, pas de cache de bearer). Env var unique : `INSEE_SIRENE_API_KEY`. Endpoint `https://api.insee.fr/api-sirene/3.11/siret/<siret>`.
- **Inngest** — voir `tech/setup.md` § Inngest. Statut *À faire*. Provisionnement requis : compte Inngest + app `delta` + endpoint `/api/v1/inngest` + env `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` + scaffold `packages/jobs/`. **Cette US devient le premier consommateur d'Inngest du repo** — décision à acter au journal §18 d'ARCHITECTURE.md.
- **Supabase Auth** — voir `tech/setup.md` § Supabase. Déjà OK (KAN-2, KAN-3). Pas de changement.
- **Supabase Realtime** — voir `tech/setup.md` § Supabase. Première utilisation Realtime du repo (souscription à la row `producers`). Activable sans provisionnement supplémentaire (Free tier).
- **Upstash Redis** — voir `tech/setup.md` § Upstash. Déjà OK (helper `rateLimit` réutilisé).

## État UI

Référence : DESIGN.md ; maquette `design/maquettes/producteur/pr-02-onboarding-stripe.html`.

- **Layout** : `OnboardingWizardShell` reproduit le split desktop (timeline 320 px à gauche, formulaire à droite) et la version mobile (timeline horizontale scrollable au-dessus du formulaire). Breakpoint `920 px` comme dans la maquette.
- **Étape 1 (KAN-17)** : non livrée ici. Le shell réserve la place et marque l'étape `done` quand la donnée existe en DB.
- **Étape 2 « Vérification SIRET »** (`SiretForm`) : SIRET (16 caractères dont espaces, masque visuel) + raison sociale + select forme juridique (EARL / SCEA / SARL / Auto-entrepreneur / SAS / GAEC) + NAF + bandeau « Vérification asynchrone ». Soumission → transition vers étape 3 sans attendre la résolution du job.
- **Étape 3 « Stripe Connect »** (`StripeOnboardingCard`) : card avec 3 features cochées + CTA principal violet « Configurer Stripe Connect » qui appelle l'endpoint Account Link puis redirige sur `result.url`. Mention « Redirection sécurisée vers Stripe » sous le CTA.
- **Page `/stripe/return`** : écran d'attente neutre « Nous synchronisons votre compte Stripe… » + spinner ; souscription Realtime à la row `producers` ; dès que `payouts_enabled = true`, redirige vers `/producer/dashboard` ; au-delà de 30 s sans update, propose CTA « J'ai terminé, accéder au dashboard ».
- **Page `/stripe/refresh`** : repop l'endpoint `stripe-link` et redirige immédiatement.
- **États** : loading (spinner sur CTA), erreurs réseau (toast neutre), erreur Sirene (étape 2 reste `pending`, bandeau jaune si `rejected` avec raison INSEE), erreur Stripe (toast + retry CTA).
- **Responsive** : desktop (≥ 920 px) split timeline + form ; mobile (< 920 px) timeline horizontale scrollable + form pleine largeur.

**Conflit maquette ↔ ticket** : la maquette mélange étape 1 (KAN-17) et étapes 2 + 3 (KAN-16). Décision : implémenter le shell complet ici avec étape 1 en placeholder lisible (« à venir ») et un guard server qui empêche l'accès aux étapes 2/3 tant que l'étape 1 n'est pas complétée — la coordination réelle se fera quand KAN-17 sera livré.

## Risques techniques

Pièges, limites, free-tier, observabilité. Références : ARCHITECTURE.md §9, §11, §13.

- **Webhook signature à vérifier sur 2 secrets distincts** : la nouvelle UX Stripe oblige à séparer platform et Connect en deux destinations distinctes, chacune avec son propre `whsec_` (cf. `tech/setup.md`). Le handler doit essayer les deux. Sinon chaque event arrive en 400.
- **Idempotence webhook** : sans `stripe_webhook_events`, un retry Stripe (si on n'a pas répondu 200 dans 30 s) doublerait des updates. `INSERT ... ON CONFLICT (event_id) DO NOTHING` puis traitement conditionné par `processed_at IS NULL`.
- **Account Link expire vite (≤ 5 min)**. L'endpoint `stripe-link` doit toujours générer un lien frais — pas de cache. Le `refresh_url` sert exactement à ça.
- **Stripe Connect Express en mode test** : impossible de simuler un payout réel, mais `account.updated` arrive bien (Stripe dashboard test → `Trigger event`, ou Stripe CLI `stripe trigger account.updated`).
- **API Sirene INSEE** : clé d'API simple en header `X-INSEE-Api-Key-Integration`, sans expiration. Pas de gestion de token. Retry exponentiel Inngest si INSEE renvoie 5xx ou timeout.
- **Sirene quota 30 req/min** : largement suffisant au MVP. Si dépassement, INSEE renvoie 429 — Inngest backoff naturel.
- **Cohérence dénomination** : la comparaison entre `legal_name` saisi par le producteur et `uniteLegale.periodesUniteLegale[0].denominationUniteLegale` du payload Sirene doit être fuzzy (Levenshtein ≤ 3 ou normalisation lowercase + suppression accents + tokens identiques) plutôt que strict equality, car les graphies divergent souvent (avec/sans forme juridique, accents, abréviations).
- **Free-tier Inngest** : limite 50 000 fonctions / mois. Un job par producteur — négligeable.
- **RLS gating produits** : la policy `select` publique sur `products` join `producers` à chaque requête catalogue. Index `producers.user_id` (déjà unique) garantit coût constant. À profiler si catalogue > 10k produits.
- **Realtime sur `producers`** : consomme un slot de réplication. Ouvrir une seule souscription par tab, cleanup au unmount.
- **Observabilité** : logger `traceId`, `route`, `latencyMs`, `producerId`. **Jamais** logger SIRET en clair ni `stripe_account_id` en clair (ARCHITECTURE.md §9.6).
- **Reset / re-onboarding** : volontairement bloqué après `siret_status = verified` (return 409). Si faute de frappe, passe par le support. Acceptable au MVP.

## Tests envisagés

Référence : ARCHITECTURE.md §10.

- Unitaire `packages/contracts` : `SiretDeclarationInput` (longueur 14, digits, forme juridique whitelist, NAF format) — coverage 100 %
- Unitaire `packages/core` :
  - `submitSiretDeclaration` : transitions de statut, idempotence, blocage si `verified`
  - `applyStripeAccountUpdate` : mappe correctement `payouts_enabled`, `charges_enabled`, `requirements.currently_due`
  - `verifySiretWithInsee` : mock client INSEE (succès, rejet par dénomination, INSEE down)
- Intégration `packages/jobs` : job `producer.siret.requested` → vrai appel Sirene sur SIRET de test → vérifie persistance
- Intégration webhook Stripe : POST avec payload signé `account.updated` → vérifie row `producers` mise à jour + insertion `stripe_webhook_events` + non-doublon sur retry
- Intégration RLS : autre user ne peut pas lire/écrire la row d'un producteur ; produit `published` d'un producteur `siret_status != verified` non visible côté catalogue acheteur
- E2E web (Playwright) : signup producteur → AU-06 → `/onboarding/producer` étape 2 SIRET → étape 3 Stripe → click « Configurer Stripe Connect » → mock redirect Stripe (pas de hosted réel en CI) → return URL → dashboard
- Stripe test clocks : non requis ici (sync d'état pure). À introduire à KAN-33.
- Sécurité : signature webhook (rejet payload non signé, signature platform vs Connect)
