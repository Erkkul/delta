# Conception technique — KAN-18 Tableau de bord producteur

## Vue d'ensemble

KAN-18 livre l'enveloppe applicative de l'espace producteur web : un layout Next factorisé (`apps/web/app/producer/layout.tsx`) qui charge une seule fois la session + la row `producers` du caller, gère le gating par rôle (redirect vers l'espace correspondant si l'utilisateur n'est pas producteur), et un dashboard (`/producer/page.tsx`) composé de sections câblées sur ce qui existe (`siret_status`, `stripe_status`, `paused`, `display_name`, `first_name`) et de sections en **empty state** pour tout ce qui dépend de tables non livrées. Aucun nouveau endpoint, aucune migration DB. L'enjeu architectural : poser le **pattern sidebar + layout authentifié multi-pages** réutilisé ensuite par AC-* et RM-*, sans coupler le code à un rôle particulier.

## Packages touchés

- [ ] `packages/contracts` — aucun schéma Zod nouveau
- [ ] `packages/core` — aucun use case nouveau
- [ ] `packages/db` — possible ajout d'un helper `getProducerDashboardContext(userId)` qui regroupe `users.findById` + `producers.findByUserId` en une seule lecture si on observe une duplication ; sinon, on appelle les deux repos existants côte à côte avec React `cache()`
- [x] `apps/web` — layout `producer/layout.tsx`, page `producer/page.tsx`, composants sidebar / topbar / banners / dashboard, refactor profile/settings, helper navigation
- [ ] `apps/mobile` — hors scope
- [ ] `packages/jobs` — aucun
- [ ] `supabase/migrations` — aucune
- [ ] `supabase/policies` — aucune
- [ ] `packages/ui-web` — composants restent dans `apps/web/components/` au MVP — pas de réutilisation cross-app prévue immédiatement, migration vers `packages/ui-web/` quand AC-* en aura besoin (cf. décision KAN-17 sur la même logique)

## Modèle de données

Aucune extension. Tables lues (toutes existantes) :

- `users` — `first_name`, `roles`, `id`
- `producers` — `display_name`, `siret_status`, `siret_status_reason` (si rejected), `stripe_status`, `paused`, `created_at`

Les sections « empty state » seront câblées plus tard sur :
- `products` (KAN-20) → KPI « Produits actifs », section « Stock à surveiller »
- `missions` + `mission_buyers` (KAN-10) → KPIs « Commandes en cours », sections « Prochaines récupérations » et « Ventes en cours »
- `mission_events` filtrés (KAN-11) → section « Activité récente »
- Trace des transferts Stripe (à introduire avec la première mission `delivered`) → KPI « Revenus du mois » et section « Prochain virement Stripe »
- `reviews` (KAN-53) → KPI « Note moyenne »

Référence : ARCHITECTURE.md §5.3.

## API / Endpoints

Aucun nouveau endpoint. Le layout est server-side et lit via les repos `packages/db/users` et `packages/db/producers` directement. Pas de route handler.

Si à terme on veut un endpoint dashboard agrégé (`GET /api/v1/producer/dashboard`) pour le mobile ou pour des refresh client, il sera introduit par le ticket qui câblera la première section dynamique — pas par KAN-18.

## Impact state machine / events

Aucun. Pas de transition mission, pas d'event Inngest émis, pas de webhook Stripe consommé. Read-only.

## Dépendances

Services externes :

- Aucun. Le dashboard ne dépend que de Supabase Postgres (Supabase Auth pour la session, Supabase DB pour la lecture). Statut : `tech/setup.md` § Supabase (ligne 14) — Partiel, dev OK.

Internes :

- `packages/db/users` (KAN-2) — `findById`
- `packages/db/producers` (KAN-16 + KAN-17) — `findByUserId`
- Layout existant `apps/web/app/(auth)/onboarding/producteur` reste indépendant ; le layout `/producer/*` ne s'applique qu'aux pages post-onboarding (vérifier le route group à l'implémentation)
- Tokens et composants partagés `DESIGN.md` (couleurs greens / cream / earth, breakpoints `desktop:` 880 px)
- Icônes : `lucide-react` (déjà dépendance du repo, à confirmer à l'implémentation) plutôt que SVG copiés depuis la maquette

## État UI

Référence : `DESIGN.md` (tokens, breakpoints), maquette `design/maquettes/producteur/pr-03-dashboard.html`.

- **Layout `producer/layout.tsx`** : `<div class="app">` avec `<aside class="sb">` (240 px, sticky, masquée < 880 px) + `<main>` (max-width 1100 px, padding 26/32). Top sticky bar (`mobile-bar`) avec burger + logo visible < 880 px uniquement. Toutes les pages `/producer/*` sont mises dans ce shell.
- **`<AppSidebar role items user activePath />`** : composant générique réutilisable. Reçoit la liste des liens depuis la page parent (au MVP, hardcodée pour le rôle producteur dans le layout via un helper `apps/web/lib/navigation/producer-nav.ts`). Items : `{ href, label, icon, badge?, disabled? }`. État actif basé sur `usePathname()`. Section headers visuels (« Activité » / « Catalogue » / « Finances » / « Profil ») conformes maquette. Items `disabled` : pas de `href`, `aria-disabled="true"`, opacité réduite, tooltip neutre « Disponible bientôt », focusable au clavier mais non-actionable.
- **`<MobileTopbar />`** : visible < 880 px, ouvre un drawer modal contenant la sidebar.
- **`<SiretBanner status reason? />`** : 4 variantes (`pending`, `verified` → null, `rejected`, `not_submitted`), styles distincts (orange / rouge / vert), CTA contextuel.
- **`<StripeOnboardingBanner status />`** : visible si `stripe_status != 'active'`.
- **`<PausedBanner />`** : visible si `producers.paused = true`.
- **`<KpiCard label icon value? meta? state? />`** : 2 modes — `value` (réel) ou `state="coming"` (placeholder « — » + meta « Disponible bientôt »). Au MVP toutes les cards sont en `state="coming"`.
- **`<SectionCard title actionHref? actionLabel? children>`** : container blanc avec header + lien droit + slot enfants.
- **`<EmptyState icon text />`** : utilisé dans chaque section sans données. Microcopy neutre orienté utilisateur, jamais de référence à un ticket interne.
- **Greeting header** : `<h1>Bonjour {first_name ?? ''}</h1>` + sous-titre statique. CTA « Nouveau produit » : `<button aria-disabled>` avec style atténué et tooltip « Disponible bientôt ».
- **Responsive** : desktop ≥ 880 px (sidebar visible, grid KPI 4 colonnes, two-col 1.6/1), mobile < 880 px (sidebar drawer, grid KPI 2 colonnes, two-col mono-colonne). Conformément à la règle « responsive obligatoire » CLAUDE.md.
- **Refactor pages existantes** : `/producer/profile` et `/producer/settings` perdent leur `<main>` autonome (déjà visible dans `profile-client.tsx:14-40`) et leur padding global au profit du layout parent. Le `<header>` interne (titre de la page) est conservé en haut du contenu de chaque page.

## Risques techniques

- **Tentation de mocker la donnée** : la maquette montre des chiffres réalistes (« 348 € », « 7 commandes », « Mission #M-3829 »). Risque que l'implémentation injecte des fixtures pour « rendre joli » la démo. Règle : aucune fixture en prod, **uniquement empty states** tant qu'aucune table n'alimente la section. Les fixtures vivent dans Storybook / tests, pas dans le bundle.
- **Sidebar fragile à la dette** : 4 liens sur 7 pointent vers des routes inexistantes (Récupérations, Mes produits, Ajouter un produit, Ventes & virements). Le composant doit gérer proprement `disabled` (pas de `href`, `aria-disabled`, opacité 50 %) sans casser la navigation accessible. Tester au clavier (Tab focusable mais non-actionable).
- **Couplage layout ↔ rôle** : si on hardcode « producteur » dans `producer/layout.tsx`, on devra dupliquer pour AC et RM. La voie choisie via `<AppSidebar role items />` évite ce piège — le layout fournit les items, le composant ne sait pas qu'il rend un espace producteur.
- **Redirect rôle → espace correspondant** : le helper `getRoleHomePath(roles)` doit gérer le multi-rôles (un compte qui inclut `producteur` reste sur `/producer`) et la précédence des rôles. Tester explicitement les 7 combinaisons (`[p]`, `[a]`, `[r]`, `[p,a]`, `[p,r]`, `[a,r]`, `[p,a,r]`).
- **Double lecture DB** : layout serveur + page enfant qui re-fetchent `producers` indépendamment. Au MVP, accepter la duplication (lecture cheap, RLS owner) ; si elle devient gênante, introduire `getProducerDashboardContext(userId)` qui regroupe les deux lectures et exposer via React `cache()` (Next 15 App Router).
- **Bundle web** : la sidebar embarque ~10 icônes. Préférer `lucide-react` (déjà dépendance) plutôt que des SVG copiés depuis la maquette. Vérifier qu'on reste sous la cible bundle pour `/producer/*` (ARCHITECTURE.md §11/§13).
- **Cas onboarding non terminé** : un producteur qui revient sur `/producer` alors qu'il n'a pas validé Stripe Connect doit pouvoir voir le dashboard mais avec le bon CTA contextualisé. Le banner SIRET ne suffit pas — il faut aussi `<StripeOnboardingBanner />` quand `stripe_status != 'active'`.
- **Cas `paused = true`** : la maquette ne traite pas le cas « boutique en pause ». Ajouter `<PausedBanner />` en haut du dashboard cohérent avec `/producer/settings`.

## Tests envisagés

Référence : ARCHITECTURE.md §10.

- **Unit `packages/core`** : aucun (pas de logique métier nouvelle).
- **Unit `apps/web`** (Vitest + React Testing Library) :
  - `<AppSidebar />` : affiche les bons items pour `role="producteur"`, l'item actif est highlight, les items `disabled` ne sont pas cliquables et exposent `aria-disabled="true"`.
  - `<SiretBanner />` : rend la bonne variante pour chacun des 4 statuts.
  - `<StripeOnboardingBanner />` : rendu conditionnel correct.
  - `<PausedBanner />` : rendu conditionnel correct.
  - `<KpiCard />` : empty state rend `« — »` sans valeur ; valeur réelle rendue quand fournie.
  - `<EmptyState />` : rendu nominal.
  - Helper `getRoleHomePath` : couvre les 7 combinaisons de rôles + cas vide (`/welcome`).
- **Intégration DB** : non nécessaire (pas de nouvelle migration, pas de RLS nouvelle).
- **E2E web Playwright** (`apps/web/e2e/producer-dashboard.spec.ts`) :
  - Producteur connecté navigue `/producer` → voit le banner SIRET conforme à son statut + les sections empty state.
  - Sidebar : clic sur « Profil public » → navigue vers `/producer/profile` ; les liens disabled ne naviguent pas.
  - Responsive : viewport mobile (< 880 px), sidebar masquée, burger ouvre le drawer.
  - Acheteur connecté tente d'accéder à `/producer` → redirect vers `/acheteur` (qui produira un 404 au MVP, acceptable — le test asserte juste la cible du redirect).
  - Non-connecté tente d'accéder à `/producer` → redirect vers `/welcome`.
- **Accessibilité** : axe-core check sur `/producer` (cible : 0 violation critique).
