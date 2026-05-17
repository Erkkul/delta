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
- **Statut** : Partiel — CLI + migrations OK (2026-05-10), Agent Skills + MCP read-only branchés (2026-05-10). Reste providers OAuth, cron anti-pause, bascule Pro au pré-lancement.
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
- **Fait le 2026-05-14** :
  - Cron anti-pause Free-tier opérationnel : workflow `.github/workflows/supabase-keepalive.yml` (ping tous les 3 jours) activé une fois le secret `SUPABASE_PUBLISHABLE_KEY` configuré côté repo. Voir § GitHub Actions et ARCHITECTURE.md §13.3.
- **Fait le 2026-05-10** :
  - Supabase CLI installée via Homebrew (`brew install supabase/tap/supabase`)
  - `supabase init` exécuté à la racine du repo : squelette `supabase/` créé (`config.toml`, `migrations/`, `seeds/`, `policies/`)
  - `supabase login` + `supabase link --project-ref knyfrnxkqyyirnsyijfk` OK
  - Première migration `20260510120000_init.sql` créée et poussée via `supabase db push` (workflow versionné validé bout-en-bout, cf. ARCHITECTURE.md §5.5). Contenu : vérification idempotente des extensions postgis + pgcrypto, installation du helper `public.set_updated_at()` à attacher en BEFORE UPDATE sur toutes les futures tables user-data (cf. ARCHITECTURE.md §5.1). Présence confirmée côté remote dans `supabase_migrations.schema_migrations`.
  - Convention de nommage des migrations confirmée : `YYYYMMDDHHMMSS_description.sql` (cf. ARCHITECTURE.md §5.5) prévaut sur la mention historique `001_init.sql` de cette checklist.
  - Pack **Agent Skills Supabase** installé dans `.claude/skills/` (project-scope, versionné) : `supabase` (client libs Next/Expo, auth, RLS, migrations, extensions) et `supabase-postgres-best-practices` (8 catégories de réf, dont security/RLS et schema design en Critical/High). Aucune divergence détectée avec nos conventions normatives (§5.1 lowercase snake_case, §5.2 RLS-on, §5.5 migrations versionnées). Hiérarchie en cas de conflit : ARCHITECTURE.md prime sur le skill (cf. CLAUDE.md « Hiérarchie en cas de conflit »).
  - **MCP Supabase** branché en mode **read-only** sur `delta-dev` :
    - Personal Access Token créé sur https://supabase.com/dashboard/account/tokens (nom : `delta-mcp-claude-readonly`), exposé via `SUPABASE_ACCESS_TOKEN` dans le shell (jamais dans le repo).
    - Config MCP : `npx -y @supabase/mcp-server-supabase@latest --read-only --project-ref=knyfrnxkqyyirnsyijfk`
    - Mode read-only par décision : verrou A7 (interdiction d'`apply_migration` via MCP, toute évolution DB passe par fichier dans `supabase/migrations/`). La CLI Supabase couvre tous les besoins RW légitimes. Escalade RW ad-hoc possible via second profil temporaire si justifié.
- **À faire** :
  - Brancher Apple Sign In une fois Apple Developer provisionné (Google fait le 2026-05-12, voir § Supabase Auth — activation providers)
  - Bascule Pro au pré-lancement : déverrouille HIBP leaked password protection, time-box sessions, inactivity timeout, PITR, et supprime la pause auto après 7 j
- **Notes clés API** : nouveau système Supabase (`sb_publishable_...` / `sb_secret_...`) remplaçant les clés JWT legacy `anon` / `service_role`. Cf. discussion supabase/supabase #29260 (depuis nov. 2025, les nouveaux projets n'ont plus accès aux clés legacy). La clé publishable est exposable côté client (web + mobile) ; les clés secrètes bypass RLS, restent côté serveur, et on en crée une par service backend (jobs Inngest, webhook Stripe) pour permettre la révocation indépendante.
- **Notes** : RLS-on par défaut activée à la création du projet. Voir ARCHITECTURE.md §5 (modélisation), §9 (sécurité), §13 (stratégie free-tier).

### Upstash Redis (rate-limit + cache)
- **Statut** : Fait le 2026-05-12.
- **Dashboard** : https://console.upstash.com
- **Plan** : Free (10 000 commandes/jour, 256 MB, 1 connexion). Pas de carte requise. Bascule payante quand le trafic réel s'en approchera (cf. ARCHITECTURE.md §13.2).
- **Env vars produites** : `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (interface REST plutôt que TCP natif — compatible serverless Vercel, contrairement au port 6379 qui ne passe pas en Edge).
- **Database** : `delta-dev-redis` en region `eu-west-1` (Ireland — la plus proche de Supabase Paris, pas de région Paris chez Upstash). Type *Regional*, TLS activé, *Eviction* activée (eviction des vieilles clés au lieu d'erreur quand 256 MB saturés — confort pour un rate-limit dont les clés s'expirent de toute façon).
- **Notes** : rate-limit auth + endpoints sensibles (cf. KAN-3 §Risques techniques pour la baseline `5 essais / 15 min / email` côté `/auth/login`). ARCHITECTURE.md §2.

## Auth / Identité

### Google Cloud Console (OAuth + Routes API)
- **Statut** : Partiel — OAuth Google fait le 2026-05-12 (consommé par Supabase Auth). Reste activation Routes API quand on attaquera la déclaration de trajet rameneur (KAN-41).
- **Dashboard** : https://console.cloud.google.com
- **Plan** : pay-as-you-go (Routes API ; quota gratuit limité). OAuth seul = gratuit, pas de carte requise.
- **Env vars produites** :
  - Supabase Auth : `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` (collés dans Supabase Auth Dashboard, jamais dans le repo)
  - Routes API : `GOOGLE_ROUTES_API_KEY` (à provisionner plus tard)
- **Project ID** : `delta-dev-496120`
- **Fait le 2026-05-12** :
  - Projet `delta-dev` créé via Google Auth Platform (nouvelle UX 2024-2025 qui regroupe l'écran de consentement et la gestion des clients dans une vue unifiée)
  - Audience configurée en **Externe** (mode *Test*) avec `Erkkul` comme test user. Passage en *In production* différé au pré-lancement (instantané pour nos scopes non-sensibles `openid` / `email` / `profile`)
  - Scopes activés via *Accès aux données* : `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`
  - Client OAuth Web créé via *Clients* : nom `Delta — Supabase Auth (dev)`, type *Application Web*, origines JS autorisées `http://localhost:3000` + `https://delta-web-gamma.vercel.app`, **redirect URI unique** `https://knyfrnxkqyyirnsyijfk.supabase.co/auth/v1/callback` (callback Supabase Auth standard dérivé du project ref)
  - Client ID + Client Secret stockés hors repo (1Password), collés directement dans Supabase Auth Dashboard
- **À faire** :
  - Activer **Routes API** quand on attaquera KAN-41 (déclaration de trajet) — nécessitera l'ajout d'un mode de paiement côté GCP (200 $/mois de crédit gratuit, suffisant pour le dev)
  - Repasser le projet en *In production* sur la page **Audience** au pré-lancement (instantané : scopes non-sensibles)
- **Notes** : nouvelle UX Google Cloud (« Google Auth Platform ») diffère de la doc legacy *OAuth consent screen*. Si la doc Supabase ou Stack Overflow référence l'ancienne UX, traduire mentalement : *OAuth consent screen* → *Branding/Audience/Accès aux données*, *Credentials* → *Clients*.

### Apple Developer (Sign in with Apple + App Store)
- **Statut** : À faire
- **Dashboard** : https://developer.apple.com
- **Plan** : enrôlement 99 €/an (obligatoire App Store + Sign in with Apple)
- **Env vars produites** : `APPLE_TEAM_ID`, `APPLE_SERVICE_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` (à coller dans Supabase Auth)
- **Notes** : gotchas mobile (deep link, identité privée). Tester tôt sur device réel.

### Supabase Auth — activation providers
- **Statut** : Partiel — email/password (2026-05-08) et Google OAuth (2026-05-12) actifs. Reste Apple Sign In.
- **Dashboard** : Supabase project → Authentication → Sign In / Providers
- **Fait le 2026-05-12** (Google) :
  - Toggle *Enable Sign in with Google* activé
  - Client ID + Client Secret (générés côté GCP, cf. § Google Cloud Console) collés dans la carte du provider
  - Callback URL Supabase vérifié identique au redirect URI déclaré côté Google : `https://knyfrnxkqyyirnsyijfk.supabase.co/auth/v1/callback`
  - **URL Configuration** élargie : Site URL inchangée (`http://localhost:3000`), Redirect URLs étendus à `https://delta-web-gamma.vercel.app/**` et `https://*.vercel.app/**` (wildcard pour autoriser toutes les previews par-PR sans whitelist manuelle ; à durcir au pré-lancement)
- **À faire** : activer Apple Sign In une fois Apple Developer provisionné (99 €/an, différé hors session web initiale).

## Paiement

### Stripe Connect Express
- **Statut** : Partiel — provisioning test mode fait le 2026-05-14 (compte plateforme, profil Connect, deux webhooks). Reste activation live mode au pré-lancement, branding hosted pages (optionnel), Stripe CLI local pour dev webhooks (au moment de KAN-16).
- **Dashboard** : https://dashboard.stripe.com
- **Plan** : pay-as-you-go (commission par transaction)
- **Compte plateforme** : `acct_1KPSvLL0nfTrCtHw` (compte Erkkul existant, repurposé Delta)
- **Env vars produites** :
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — `pk_test_...` (client web + mobile)
  - `STRIPE_SECRET_KEY` — `sk_test_...` (server-only, appels API + Account Links)
  - `STRIPE_WEBHOOK_SECRET_PLATFORM` — `whsec_...` (signature endpoint platform)
  - `STRIPE_WEBHOOK_SECRET_CONNECT` — `whsec_...` (signature endpoint Connect)
- **Fait le 2026-05-14** :
  - Compte plateforme Delta activé sur l'environnement test (compte Erkkul vierge `acct_1KPSvLL0nfTrCtHw`).
  - **Profil Connect** complété via le wizard `connect/set-up/profile` :
    - Funds flow : *Buyers will purchase from you* + *Payouts can be split between sellers* (cohérent avec escrow plateforme + split 85% producteur / 10% rameneur / 5% plateforme).
    - Industry : *E-commerce products* (modèle marketplace produits physiques d'indépendants, comparable Etsy).
    - Products/services : produits similaires entre vendeurs, paniers < $10k (aligné MVP « produits secs et agricoles non sensibles uniquement »).
    - Account creation : **Onboarding hosted by Stripe** (Account Links — KYC light hébergé par Stripe pour KAN-16).
    - Account management : **Express Dashboard** (login link via API pour producteurs/rameneurs).
    - Liability for refunds and chargebacks : *plateforme responsable* (standard Express). Couvre la responsabilité paiement uniquement, pas la responsabilité produit/qualité (statut juridique « marketplace pur » inchangé).
  - **Deux webhook destinations** créées dans Workbench (la nouvelle UX Stripe oblige à séparer les scopes platform et Connect en deux destinations distinctes — pas possible de mixer en une seule depuis la migration vers Workbench / Accounts v2) :
    - **Endpoint platform** (`Delta — plateforme (test mode)`, ID `we_1TXUSiL0nfTrCtHwONr40ncZ`) — scope *Votre compte*, version API `2020-08-27` (la dernière stable `2026-04-22.dahlia` a un catalogue d'événements amputé, à reconsidérer plus tard). 7 événements écoutés : `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `charge.dispute.created`, `transfer.created`, `transfer.reversed` (+1 bonus selon ajout fait). URL : `https://delta-web-gamma.vercel.app/api/v1/webhooks/stripe`. Note : `transfer.failed` n'existe pas comme événement webhook chez Stripe — les échecs de transfer sont synchrones côté API. L'échec asynchrone qui nous importe (l'argent n'arrive pas chez le producteur) est capté par `payout.failed` côté Connect.
    - **Endpoint Connect** (`Delta — comptes connectés (test mode)`) — scope *Comptes connectés*, version API `2020-08-27`. 4 événements : `account.updated` (essentiel pour KAN-16 — état KYC + requirements), `account.application.deauthorized`, `payout.paid`, `payout.failed`. Même URL : `https://delta-web-gamma.vercel.app/api/v1/webhooks/stripe`.
  - Les 4 clés (publishable, secret, deux whsec) ont été notées hors repo. Aucune n'est commitée — `.env.local` reste gitignored.
  - Template versionné mis à jour : `apps/web/.env.local.example` reçoit les 4 vars Stripe avec la convention `NEXT_PUBLIC_*` pour la publishable et sans préfixe pour les server-only.
  - **Décision env vars vs setup.md original** : `STRIPE_CONNECT_CLIENT_ID` listé historiquement n'est pas nécessaire (c'est pour Connect *Standard* OAuth, pas Express qui utilise Account Links). `STRIPE_WEBHOOK_SECRET` unique est remplacé par deux secrets `STRIPE_WEBHOOK_SECRET_PLATFORM` + `STRIPE_WEBHOOK_SECRET_CONNECT` car la nouvelle UX Stripe sépare obligatoirement les destinations platform/Connect en deux endpoints, chacun avec son propre signing secret. Le handler `/api/v1/webhooks/stripe` essaiera les deux à la vérification (cf. ARCHITECTURE.md §8 quand on cadrera KAN-16).
- **À faire** :
  - **Stripe CLI** local pour forwarder les webhooks vers `localhost:3000` en dev (`stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe`) — produit un 3e `whsec_` local-only, à ajouter dans `.env.local` au moment de coder KAN-16.
  - Activer le live mode (carte « Activez votre compte ») au pré-lancement : nécessitera infos légales complètes Erkkul (SIRET, RIB pro, justificatifs).
  - **Branding hosted pages** (optionnel mais souhaitable) : ajouter logo Delta + couleurs sur les pages Stripe hosted (onboarding + Express Dashboard). À faire quand le logo est arrêté.
  - **Câblage code** : implémentation du handler `/api/v1/webhooks/stripe` + idempotence (cf. ARCHITECTURE.md §8) + flow Account Links pour onboarding producteur (KAN-16) puis rameneur.
- **Notes** : Mode test uniquement à ce stade — `pk_test_...` / `sk_test_...` / endpoints sur l'environnement de test Stripe. Le passage en live mode dupliquera tout en mode prod (clés `pk_live_...` / `sk_live_...` + nouveaux endpoints webhook avec leurs propres `whsec_`). Voir ARCHITECTURE.md §8 pour le détail de l'intégration code.

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
- **Statut** : Partiel — projet créé et premier deploy OK (2026-05-11), Web Analytics activé (2026-05-14). Reste domaine custom, bascule Pro au lancement public.
- **Dashboard** : https://vercel.com/dashboard
- **Plan** : Hobby (dev) → Pro (lancement public, voir ARCHITECTURE.md §13)
- **Project slug** : `delta-web-gamma` (auto-généré par Vercel : `delta` + Root Directory `web` + suffixe collision `gamma`)
- **URL preview** : https://delta-web-gamma.vercel.app
- **Env vars produites** : configurées dans Vercel UI (miroir de `.env.local`)
- **Fait le 2026-05-14** :
  - **Vercel Web Analytics** activé sur le projet (onglet Analytics → Enable). Intégration code : package `@vercel/analytics` ajouté à `apps/web/package.json` et composant `<Analytics />` monté dans `apps/web/app/layout.tsx` (root layout). Les données remontent une fois le prochain deploy en prod.
- **Fait le 2026-05-12** :
  - 5 env vars miroir ajoutées dans **Project Settings → Environment Variables** sur les 3 scopes (Production + Preview + Development) : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (Sensitive), `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (Sensitive)
  - Template versionné côté repo : `apps/web/.env.local.example` (sans secrets, commenté). Convention de naming documentée : préfixe `NEXT_PUBLIC_*` = exposable au browser, sans préfixe = strictement serveur. Traduit le naming abstrait d'ARCHITECTURE.md §2.1 dans l'idiome Next.js. `apps/mobile` aura plus tard ses équivalents `EXPO_PUBLIC_*`.
  - `.env.local` créé en local par le dev (jamais commité, cf. `.gitignore` lignes 19-22).
- **Fait le 2026-05-11** :
  - Compte Vercel créé, GitHub App Vercel autorisée sur l'org `Erkkul`
  - Projet importé depuis `Erkkul/delta`, **Root Directory = `apps/web`**, Framework Preset auto-détecté Next.js
  - Premier build vert (pnpm 9 détecté via `packageManager` du `package.json` racine, workspaces résolus correctement)
  - Intégration GitHub native active : preview deploy automatique par PR + prod deploy automatique sur push `main` via webhook Vercel. **Pas de deploy orchestré depuis GitHub Actions** (décision technique : moins de credentials, moins de surface — cf. ARCHITECTURE.md §18 entrée 1.7). Conséquence : aucun secret Vercel (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) à provisionner côté GitHub.
- **À faire** :
  - Configurer domaine custom une fois choisi (cf. § Domaine + DNS)
  - Bascule Pro au lancement public (voir ARCHITECTURE.md §13)
- **Notes** : connecter repo GitHub. Configurer preview deploys.

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

## APIs externes

### API Adresse Gouv.fr
- **Statut** : Fait
- **URL** : https://adresse.data.gouv.fr/api-doc/adresse
- **Notes** : aucun provisionnement nécessaire (API publique, sans clé). Pas de quota documenté ; cache 24h côté serveur recommandé. Décision produit 2026-05-01.

### API Sirene INSEE (vérification SIRET)
- **Statut** : Fait le 2026-05-16
- **Portail** : https://portail-api.insee.fr
- **Plan** : Public (gratuit, ≤ 30 req/min, clé sans expiration)
- **Env vars produites** : `INSEE_SIRENE_API_KEY`
- **Application INSEE** : `delta-dev` — mode **Simple** (le mode Backend to backend ne fonctionne pas sur le plan public, cf. mode d'emploi officiel)
- **Souscription** : créée séparément après l'app (Catalogue → API Sirene → Souscrire → plan Public → app `delta-dev`). La clé d'API se récupère sur la souscription (et non sur l'app), onglet « Mes applications » → `delta-dev` → « Souscriptions ».
- **Endpoint** : `https://api.insee.fr/api-sirene/3.11/siret/<siret>` ou `/siren/<siren>`
- **Header d'auth** : `X-INSEE-Api-Key-Integration: <key>` (pas d'OAuth, pas de `/token`, pas de cache bearer — la clé est posée directement sur chaque requête)
- **Test rapide** : `curl 'https://api.insee.fr/api-sirene/3.11/siren/309634954' -H 'X-INSEE-Api-Key-Integration: <key>'` (309634954 = SIREN de l'INSEE, dataset de test officiel)
- **Notes** : la clé peut être renouvelée ou révoquée depuis le portail. Quota 30 req/min largement suffisant au MVP (un appel par déclaration SIRET producteur). Consommée par le job Inngest `producer.siret.requested` (cf. cadrage KAN-16).

## CI/CD

### GitHub Actions
- **Statut** : Fait le 2026-05-14 — workflows posés (2026-05-11), secret `SUPABASE_PUBLISHABLE_KEY` configuré côté repo (2026-05-14). Reste les secrets différés liés à d'autres briques (Expo, Sentry).
- **Dashboard secrets** : https://github.com/Erkkul/delta/settings/secrets/actions
- **Workflows actifs** :
  - `.github/workflows/ci.yml` — lint + typecheck + build sur push `main` et chaque PR. pnpm détecté via `packageManager`, Node 20, concurrency group par branche, cache pnpm via `actions/setup-node`.
  - `.github/workflows/supabase-keepalive.yml` — cron `14 3 */3 * *` (tous les 3 jours à 03:14 UTC, marge confortable avant la limite 7 j de pause Free-tier). Curl sur `/auth/v1/settings` avec headers `apikey: $SUPABASE_PUBLISHABLE_KEY` + `Authorization: Bearer $SUPABASE_PUBLISHABLE_KEY` (pattern standard du client Supabase JS). Déclenchable manuellement via `workflow_dispatch`. Historique des itérations dans ARCHITECTURE.md §18 entrées 1.7 → 1.10.
- **Secrets configurés** :
  - `SUPABASE_PUBLISHABLE_KEY` — configuré le 2026-05-14 (valeur récupérée dans Supabase Dashboard → Project Settings → API Keys → "publishable", commence par `sb_publishable_...`). Utilisée par le workflow keepalive.
- **Secrets différés (autres briques)** :
  - `SUPABASE_SECRET_KEY` — quand un workflow Actions aura besoin d'accéder à PostgREST en bypass RLS (ex : monitoring prod, tests d'intégration, jobs Inngest hébergés)
  - `EXPO_TOKEN` — quand Expo/EAS provisionné
  - `SENTRY_AUTH_TOKEN` — quand Sentry provisionné (upload source maps)
  - Pas de `VERCEL_TOKEN` / `ORG_ID` / `PROJECT_ID` — intégration GitHub native Vercel suffisante (cf. § Vercel ci-dessus).
- **Notes** : voir ARCHITECTURE.md §12 (pipeline) et §13.3 (workaround free-tier).

## Stores mobiles (post-dev MVP)

### Apple App Store Connect
- **Statut** : À faire (post-dev MVP)
- **Notes** : couplé à l'enrôlement Apple Developer. Créer app, fiche, screenshots.

### Google Play Console
- **Statut** : À faire (post-dev MVP)
- **Plan** : 25 € frais d'inscription unique
- **Notes** : créer compte développeur, app, fiche.
