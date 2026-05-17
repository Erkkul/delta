# Tâches techniques internes — KAN-16 Onboarding Stripe Connect

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> - KAN-62 — Connecter son compte bancaire via Stripe Connect (KYC léger + IBAN)

## Tâches

- [x] **Setup Inngest — compte + clés** (`tech/setup.md` § Inngest, *Partiel le 2026-05-16*) : compte créé, env Production initialisé, `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` (Sensitive) ajoutées dans Vercel + `.env.local.example`
- [x] **Setup Inngest — scaffold + endpoint** : `packages/jobs/` scaffolé avec `inngest-client.ts` (client typé via `EventSchemas`) + builder `buildDeltaFunctions` ; endpoint `apps/web/app/api/v1/inngest/route.ts` posé avec `serve` (`inngest/next`)
- [ ] **Sync app Inngest cloud** : après le premier deploy Vercel, aller sur app.inngest.com → Apps → Sync new app → URL `https://delta-web-gamma.vercel.app/api/v1/inngest` (Inngest découvrira la fonction `verify-siret-producer`)
- [x] **Setup API Sirene INSEE** (`tech/setup.md` § APIs externes, *Fait le 2026-05-16*) : app `delta-dev` mode Simple créée, souscription plan Public validée, clé d'API récupérée, `INSEE_SIRENE_API_KEY` ajoutée dans Vercel + `.env.local.example`
- [ ] **Setup Stripe CLI local** : `stripe login`, `stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe`, ajouter le `whsec_` local-only dans `.env.local` (3e secret webhook, dev only). Action à faire au moment de tester localement.
- [x] Créer `packages/jobs/src/inngest-client.ts` (instance Inngest) + `packages/jobs/src/producer/verify-siret-function.ts` (handler `producer.siret.requested`)
- [x] Créer le client Stripe partagé dans `apps/web/lib/stripe/client.ts` (instance `Stripe` + helper `constructStripeEvent` qui essaie chaque secret platform + Connect). **Déviation cadrage** : le client vit dans `apps/web/lib` plutôt que `packages/core/src/payment` pour respecter §4.1 (core sans I/O).
- [x] Créer le client Sirene dans `packages/jobs/src/integrations/insee.ts` : simple `fetch(endpoint, { headers: { 'X-INSEE-Api-Key-Integration': env.INSEE_SIRENE_API_KEY } })` + mapping réponse → `{ verified, reason? }` (extraction `denominationUniteLegale` + gestion `[ND]` Sirene). **Déviation cadrage** : le client vit dans `packages/jobs/src/integrations` plutôt que `packages/core/src/producer` pour respecter §4.1.
- [x] Migration `supabase/migrations/20260517100000_create_producers_and_stripe_webhook_events.sql` : tables + enums + RLS forcée + trigger `set_updated_at` + CHECK SIRET/NAF
- [x] Policies `supabase/policies/producers.sql` : RLS user-owned (select / insert / update par `auth.uid()`)
- [x] Policies `supabase/policies/products.sql` : placeholder documentaire avec la contrainte `producers.siret_status = verified ET payouts_enabled = true` en commentaire — sera intégrée à KAN-20 quand la table `products` sera créée
- [x] Garde rôle dans le handler `siret` : utilise `users.roles` (array `public.user_role[]`) et vérifie `roles.includes('producteur')` via `hasProducerRole(userId)`. La sélection AU-06 (`/onboarding/role`) est déjà active (KAN-2).
- [x] Ajouter dans `apps/web/.env.local.example` : `INSEE_SIRENE_API_KEY` + `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` (commits `[setup] *`). `STRIPE_WEBHOOK_SECRET_LOCAL` reste à ajouter à `.env.local` au moment du test local Stripe CLI (pas dans le `.example` pour ne pas créer de confusion — c'est un secret local-only par dev).
- [x] Mettre à jour `ARCHITECTURE.md` §18 : entrée **1.17** (premier consommateur Inngest) + entrée **1.18** (premier handler webhook Stripe)
- [x] Mettre à jour `ARCHITECTURE.md` §8.2 : la logique multi-secrets (platform + Connect) est documentée explicitement dans l'entrée 1.18 du journal (§8.2 elle-même est complétée par référence à cette entrée — pas de modification inline pour ne pas dupliquer).
- [x] Mettre à jour `tech/setup.md` § Stripe Connect Express : handler webhook actif (client Stripe partagé en `apps/web/lib/stripe/client.ts`)
- [x] Mettre à jour `produit/jira_mapping.md` ligne PR-02 (lien `[Cadrage tech](specs/KAN-16/)` ajouté à l'ouverture du cadrage)

## Tâches restantes (post-implémentation)

- [ ] **E2E Playwright** : parcours signup producteur → AU-06 (rôle) → `/onboarding/producteur` étape 2 SIRET → étape 3 Stripe (mock redirect Stripe) → retour. À écrire dans `apps/web/e2e/onboarding-producteur.spec.ts` une fois le flow validé en preview Vercel.
- [ ] **Intégration Stripe CLI local** : valider le webhook handler en local avec `stripe trigger account.updated` une fois la CLI configurée.
- [ ] **Sync app Inngest** côté dashboard après le premier deploy Vercel.

## Notes d'implémentation

- **Endpoint webhook unique pour 2 destinations Stripe** : conformément à `tech/setup.md`, les deux destinations Stripe (platform + Connect) pointent sur la même URL `/api/v1/webhooks/stripe` mais signent avec deux secrets distincts. Le handler essaie `STRIPE_WEBHOOK_SECRET_PLATFORM` puis `STRIPE_WEBHOOK_SECRET_CONNECT` ; le premier qui valide gagne. Si aucun ne valide → 400.
- **Décision Inngest dans ce ticket** : on pourrait alternativement faire la vérification SIRET en synchrone côté handler (un appel HTTP pendant la requête), mais ça (a) bloque la réponse 30 s côté Vercel (timeout serverless), (b) n'offre pas de retry. Inngest est l'investissement attendu pour tout ce qui suit (matching, notifications, timers mission). Provisionnement assumé ici.
- **Décision « pas de table `producer_events` »** : pas besoin d'audit trail pour l'onboarding au MVP — la row `producers` reflète l'état courant. Si nécessaire post-MVP (litiges, conformité), introduire une table immutable séparée.
- **Déviation cadrage : emplacement des clients externes** : le design.md initial plaçait le client Sirene et le client Stripe dans `packages/core/src/{producer,payment}/`. À l'implémentation, ils ont été déplacés respectivement dans `packages/jobs/src/integrations/insee.ts` et `apps/web/lib/stripe/client.ts` pour respecter ARCHITECTURE.md §4.1 (pas d'I/O dans core). Les adapter types (`InseeAdapter`, `StripeConnectAdapter`) restent dans core.
- **Déviation cadrage : URL FR (`/onboarding/producteur`)** : le design.md utilisait `/onboarding/producer` (EN). Alignement sur le `public.user_role` enum value `producteur` (FR) pour cohérence avec `nextOnboardingPath()` (KAN-2) et la convention CLAUDE.md « tout en français ».
- **Realtime différé** : la page `/onboarding/producteur/stripe/return` n'utilise pas Supabase Realtime au MVP. Affichage neutre + lien manuel pour repasser au wizard, qui rendra l'état à jour si le webhook est arrivé entre-temps. À enrichir post-MVP si l'UX se révèle insuffisante.

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
