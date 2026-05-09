# tech/setup.md — Provisionnement infrastructure

Checklist vivante des services externes à provisionner pour Delta. Source unique de vérité de l'**état** du provisionnement (qui est fait, qui ne l'est pas, où trouver les credentials).

> **Règles** :
> - Une ligne par service, horodatée à la date du provisionnement.
> - Statut : `À faire` / `Partiel` / `Fait`.
> - Les valeurs des secrets ne vivent **jamais** dans ce fichier — uniquement dans Vercel env, `.env.local`, Supabase secrets ou GitHub Actions secrets.
> - Mise à jour par commit dédié : `[setup] <service> provisionné` ou `[setup] <service> mis à jour`.
> - Référence depuis les cadrages techniques : `specs/KAN-XXX/design.md` § Dépendances pointe vers la(les) ligne(s) pertinente(s) ici.

## Backend / Données

### Supabase (Postgres + Auth + Storage + Realtime)
- **Statut** : Partiel — provisionnement initial fait le 2026-05-08. Reste CLI + première migration + providers OAuth + cron anti-pause.
- **Dashboard** : https://supabase.com/dashboard
- **Plan** : Free (bascule Pro au pré-lancement, voir trigger d'upgrade dans ARCHITECTURE.md §13.2)
- **Project ref** : `knyfrnxkqyyirnsyijfk` (région `eu-west-3` / Paris)
- **Env vars produites** : `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_DB_URL` (direct, port 5432), `SUPABASE_DB_URL_POOLED` (transaction pooler, port 6543)
- **Fait le 2026-05-08** :
  - Projet `delta-dev` créé en région `eu-west-3`, plan Free, branche DB par défaut `main`
  - Extensions activées dans le schéma `extensions` : PostGIS 3.3.7, pgcrypto 1.3 (vérifiées via `pg_extension`)
  - Trois options cochées à la création : Enable Data API, Automatically expose new tables, Enable automatic RLS (cf. principe A4)
  - Trois clés API récupérées (publishable + secret, nouveau système — voir « Notes clés API » ci-dessous)
  - Buckets Storage créés : `product-photos` (public, 5 MB max, MIME `image/jpeg`, `image/png`, `image/webp`) et `kyc-documents` (privé strict, 10 MB max, MIME `application/pdf`, `image/jpeg`, `image/png`). Policies RLS Storage à versionner via migrations dans `supabase/policies/storage.sql` (principe A7, pas de policy via UI).
  - Auth email/password configuré : confirm email ON, min password length 10, requirements `lower + upper + digits`, secure email change ON, secure password change ON, rotation refresh tokens ON, reuse interval 10 s
  - URL Configuration : Site URL `http://localhost:3000`, Redirect URLs `http://localhost:3000/**` (à élargir au fil des déploiements preview Vercel + prod + deep links mobile)
  - Connection strings copiées (direct + transaction pooler). Note : la connexion directe est IPv6-only — pour tout runtime IPv4-only (Vercel serverless, certains GitHub Actions runners), utiliser le transaction pooler 6543 ; en local depuis un ISP FR moderne, la directe fonctionne.
- **À faire** :
  - Installer la Supabase CLI et lier le projet : `supabase link --project-ref knyfrnxkqyyirnsyijfk`
  - Créer le squelette `supabase/` (`migrations/`, `seeds/`, `policies/`) si pas déjà présent
  - Première migration `001_init.sql` pour valider le workflow versionné (cf. ARCHITECTURE.md §5.5)
  - Cron GitHub Actions de ping toutes les 6 nuits pour éviter la pause Free 7j (cf. ARCHITECTURE.md §13.3)
  - Installer Agent Skills Supabase (`npx skills add supabase/agent-skills`) en session terminal
  - Configurer MCP Supabase pour Claude (onglet MCP de la modale Connect)
  - Brancher providers OAuth Google + Apple une fois GCP / Apple Developer provisionnés
  - Bascule Pro au pré-lancement : déverrouille HIBP leaked password protection, time-box sessions, inactivity timeout, PITR, et supprime la pause auto après 7 j
- **Notes clés API** : nouveau système Supabase (`sb_publishable_...` / `sb_secret_...`) remplaçant les clés JWT legacy `anon` / `service_role`. Cf. discussion supabase/supabase #29260 (depuis nov. 2025, les nouveaux projets n'ont plus accès aux clés legacy). La clé publishable est exposable côté client (web + mobile) ; les clés secrètes bypass RLS, restent côté serveur, et on en crée une par service backend (jobs Inngest, webhook Stripe) pour permettre la révocation indépendante.
- **Notes** : RLS-on par défaut activée à la création du projet. Voir ARCHITECTURE.md §5 (modélisation), §9 (sécurité), §13 (stratégie free-tier).

### Upstash Redis (rate-limit + cache)
- **Statut** : À faire
- **Dashboard** : https://console.upstash.com
- **Plan** : Free
- **Env vars produites** : `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **Notes** : rate-limit auth + endpoints sensibles. ARCHITECTURE.md §2.

## Auth / Identité

### Google Cloud Console (OAuth + Routes API)
- **Statut** : À faire
- **Dashboard** : https://console.cloud.google.com
- **Plan** : pay-as-you-go (Routes API ; quota gratuit limité)
- **Env vars produites** :
  - Supabase Auth : `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` (à coller dans Supabase Auth, pas dans le repo)
  - Routes API : `GOOGLE_ROUTES_API_KEY`
- **Notes** : créer projet Google Cloud, activer APIs OAuth + Routes, configurer écran de consentement, redirect URIs (Supabase callback + previews Vercel).

### Apple Developer (Sign in with Apple + App Store)
- **Statut** : À faire
- **Dashboard** : https://developer.apple.com
- **Plan** : enrôlement 99 €/an (obligatoire App Store + Sign in with Apple)
- **Env vars produites** : `APPLE_TEAM_ID`, `APPLE_SERVICE_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` (à coller dans Supabase Auth)
- **Notes** : gotchas mobile (deep link, identité privée). Tester tôt sur device réel.

### Supabase Auth — activation providers
- **Statut** : À faire (dépend de Google + Apple ci-dessus)
- **Dashboard** : Supabase project → Auth → Providers
- **Notes** : activer email/password + Google + Apple avec credentials des items précédents.

## Paiement

### Stripe Connect Express
- **Statut** : À faire
- **Dashboard** : https://dashboard.stripe.com
- **Plan** : pay-as-you-go (commission par transaction)
- **Env vars produites** : `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_CLIENT_ID`
- **Notes** : compte plateforme. Activer Connect Express. Webhook `/api/v1/webhooks/stripe`. Test mode avant prod. Voir ARCHITECTURE.md §8.

## Jobs et observabilité

### Inngest (jobs asynchrones)
- **Statut** : À faire
- **Dashboard** : https://app.inngest.com
- **Plan** : Free puis pay-as-you-go
- **Env vars produites** : `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
- **Notes** : app Inngest + endpoint `/api/v1/inngest`. Voir ARCHITECTURE.md §7.

### Sentry (erreurs web + mobile + jobs)
- **Statut** : À faire
- **Dashboard** : https://sentry.io
- **Plan** : Developer (free)
- **Env vars produites** : `SENTRY_DSN_WEB`, `SENTRY_DSN_MOBILE`, `SENTRY_DSN_JOBS`, `SENTRY_AUTH_TOKEN`
- **Notes** : 3 projets (web Next.js, mobile RN, jobs Node). Source map upload en CI.

## Hosting

### Vercel (web + Analytics)
- **Statut** : À faire
- **Dashboard** : https://vercel.com/dashboard
- **Plan** : Hobby (dev) → Pro (lancement public, voir ARCHITECTURE.md §13)
- **Env vars produites** : configurées dans Vercel UI (miroir de `.env.local`)
- **Notes** : connecter repo GitHub. Activer Vercel Analytics. Configurer preview deploys.

### Expo + EAS (mobile builds & submit)
- **Statut** : À faire
- **Dashboard** : https://expo.dev
- **Plan** : Free pour dev, Production pour publishing
- **Env vars produites** : `EXPO_TOKEN` (CI)
- **Notes** : compte Expo, projet `delta`. Configurer EAS Build (iOS + Android). EAS Submit pour App Store / Play Store quand prêt.

## Communication

### Resend (email transactionnel)
- **Statut** : À faire
- **Dashboard** : https://resend.com
- **Plan** : Free (3 000 emails/mois)
- **Env vars produites** : `RESEND_API_KEY`
- **Notes** : vérifier domaine d'envoi (DKIM + SPF). Templates React Email.

### Domaine + DNS
- **Statut** : À faire
- **Notes** : choix domaine (`delta.fr` ou autre). DNS via Vercel pour web. MX/DKIM/SPF pour Resend.

## Externe sans clé

### API Adresse Gouv.fr
- **Statut** : Fait
- **URL** : https://adresse.data.gouv.fr/api-doc/adresse
- **Notes** : aucun provisionnement nécessaire (API publique, sans clé). Pas de quota documenté ; cache 24h côté serveur recommandé. Décision produit 2026-05-01.

## CI/CD

### GitHub Actions
- **Statut** : À faire
- **Dashboard** : Settings → Secrets du repo
- **Secrets à configurer** : `VERCEL_TOKEN`, `EXPO_TOKEN`, `SENTRY_AUTH_TOKEN`, plus secrets nécessaires aux tests d'intégration
- **Notes** : voir ARCHITECTURE.md §12.

## Stores mobiles (post-dev MVP)

### Apple App Store Connect
- **Statut** : À faire (post-dev MVP)
- **Notes** : couplé à l'enrôlement Apple Developer. Créer app, fiche, screenshots.

### Google Play Console
- **Statut** : À faire (post-dev MVP)
- **Plan** : 25 € frais d'inscription unique
- **Notes** : créer compte développeur, app, fiche.
