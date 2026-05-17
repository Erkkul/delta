# Tâches techniques internes — KAN-16 Onboarding Stripe Connect

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> - KAN-62 — Connecter son compte bancaire via Stripe Connect (KYC léger + IBAN)

## Tâches

- [ ] **Setup Inngest** (`tech/setup.md` § Inngest, *À faire*) : créer compte, app `delta`, récupérer `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY`, scaffold `packages/jobs/` (manifest pnpm, exports, tsconfig), poser `apps/web/app/api/v1/inngest/route.ts`, mettre à jour `tech/setup.md`
- [x] **Setup API Sirene INSEE** (`tech/setup.md` § APIs externes, *Fait le 2026-05-16*) : app `delta-dev` mode Simple créée, souscription plan Public validée, clé d'API récupérée, `INSEE_SIRENE_API_KEY` ajoutée dans Vercel + `.env.local.example`
- [ ] **Setup Stripe CLI local** : `stripe login`, `stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe`, ajouter le `whsec_` local-only dans `.env.local` (3e secret webhook, dev only)
- [ ] Créer `packages/jobs/src/inngest/client.ts` (instance Inngest) + `packages/jobs/src/producer/verify-siret.ts` (handler `producer.siret.requested`)
- [ ] Créer le client Stripe partagé dans `packages/core/src/payment/stripe-client.ts` (instance `Stripe` + helper `verifyWebhookSignature(rawBody, header, secrets[])` qui essaie chaque secret platform + Connect)
- [ ] Créer le client Sirene dans `packages/core/src/producer/insee-client.ts` : simple `fetch(endpoint, { headers: { 'X-INSEE-Api-Key-Integration': env.INSEE_SIRENE_API_KEY } })` + mapping réponse → `{ verified, reason? }` (comparaison fuzzy entre `legal_name` saisi et `denominationUniteLegale` du payload)
- [ ] Migration `supabase/migrations/YYYYMMDDHHMMSS_create_producers_and_stripe_webhook_events.sql` : tables + index + trigger `set_updated_at` + enums via CHECK
- [ ] Policies `supabase/policies/producers.sql` : RLS user-owned (select / update / insert par `auth.uid()`)
- [ ] Policies `supabase/policies/products.sql` : si fichier inexistant, créer en posant la contrainte `producers.siret_status = verified ET payouts_enabled = true` dans la policy `select` publique. Commentaire SQL pointant KAN-16
- [ ] Vérifier la garde rôle dans le handler `siret` (`users.metadata.roles.includes('producer')`) et la sélection AU-06 si pas encore active
- [ ] Ajouter dans `apps/web/.env.local.example` : `STRIPE_WEBHOOK_SECRET_LOCAL`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` (sans valeurs). `INSEE_SIRENE_API_KEY` déjà ajoutée (commit `[setup] API Sirene INSEE provisionnée`)
- [ ] Mettre à jour `ARCHITECTURE.md` §18 : entrée « Premier consommateur Inngest = onboarding producteur (KAN-16) » + « Premier handler webhook Stripe (account.updated) »
- [ ] Mettre à jour `ARCHITECTURE.md` §8.2 si la logique multi-secrets (platform + Connect) doit être documentée explicitement (le squelette actuel mentionne « vérification signature » sans détailler)
- [ ] Mettre à jour `tech/setup.md` § Stripe Connect Express : marquer *Câblage code* progressé (handler webhook actif, client Stripe partagé)
- [ ] Mettre à jour `produit/jira_mapping.md` ligne PR-02 (déjà en place — ajouter le lien `[Cadrage tech](specs/KAN-16/)`)

## Notes d'implémentation

- **Endpoint webhook unique pour 2 destinations Stripe** : conformément à `tech/setup.md`, les deux destinations Stripe (platform + Connect) pointent sur la même URL `/api/v1/webhooks/stripe` mais signent avec deux secrets distincts. Le handler essaie `STRIPE_WEBHOOK_SECRET_PLATFORM` puis `STRIPE_WEBHOOK_SECRET_CONNECT` ; le premier qui valide gagne. Si aucun ne valide → 400.
- **Décision Inngest dans ce ticket** : on pourrait alternativement faire la vérification SIRET en synchrone côté handler (un appel HTTP pendant la requête), mais ça (a) bloque la réponse 30 s côté Vercel (timeout serverless), (b) n'offre pas de retry. Inngest est l'investissement attendu pour tout ce qui suit (matching, notifications, timers mission). Provisionnement assumé ici.
- **Décision « pas de table `producer_events` »** : pas besoin d'audit trail pour l'onboarding au MVP — la row `producers` reflète l'état courant. Si nécessaire post-MVP (litiges, conformité), introduire une table immutable séparée.

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
