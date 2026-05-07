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
- **Statut** : À faire
- **Dashboard** : https://supabase.com/dashboard
- **Plan** : Free (puis Pro à partir de ~50k MAU)
- **Env vars produites** : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Notes** : créer projet + activer PostGIS + pgcrypto. RLS-on par défaut. Voir ARCHITECTURE.md §5.

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
