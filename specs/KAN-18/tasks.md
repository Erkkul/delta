# Tâches techniques internes — KAN-18 Tableau de bord producteur

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> - (aucune au moment du cadrage — KAN-18 n'a pas de subtasks Jira créées)

## Tâches

- [x] Helper `packages/core/src/navigation/get-role-home-path.ts` :
  - input `roles: readonly Role[]`
  - output `/producer | /acheteur | /rameneur | /welcome`
  - 9 tests Vitest sur les 7 combinaisons de rôles + cas vide + insensibilité à l'ordre
  - exporté via `@delta/core/navigation`
- [x] Helper `apps/web/lib/navigation/producer-nav.ts` :
  - type `SidebarItem` + `SidebarSection` + `AppSidebarConfig`
  - constante `PRODUCER_SIDEBAR` : items canoniques conformes maquette PR-03
- [x] Layout `apps/web/app/producer/layout.tsx` (server component) :
  - vérification session (redirect `/welcome` sinon)
  - vérification rôle `producteur` (redirect via `getRoleHomePath` sinon)
  - lecture `users.findById` + `producers.findByUserId`
  - redirect `/onboarding/producteur` si row `producers` absente
  - rendu `<AppSidebar />` + `<MobileTopbar />` + `{children}`
- [x] Composant générique `apps/web/components/app/app-sidebar.tsx` :
  - props `{ config, user, variant? }`, sections, items, badge, disabled
  - `usePathname()` pour highlight item actif
  - `<Link>` (next/link) pour toutes les cibles internes
- [x] Composant `apps/web/components/app/sidebar-icons.tsx` : 7 SVG stroke `currentColor` (pas d'ajout de lib d'icônes — liste figée et minuscule, plus simple)
- [x] Composant `apps/web/components/app/mobile-topbar.tsx` + drawer (modale state local + overlay, ferme sur Escape ou clic overlay)
- [x] Composant `apps/web/components/producer/siret-banner.tsx` (4 variantes)
- [x] Composant `apps/web/components/producer/stripe-onboarding-banner.tsx` (5 variantes : 4 états + `active` qui rend null)
- [x] Composant `apps/web/components/producer/paused-banner.tsx`
- [x] Composants dashboard `apps/web/components/dashboard/` :
  - `kpi-card.tsx` (modes `value` / `coming`)
  - `section-card.tsx`
  - `empty-state.tsx`
- [x] Page `apps/web/app/producer/page.tsx` :
  - greeting header + CTA « Nouveau produit » disabled (tooltip neutre)
  - banners (SIRET + Stripe + paused) conditionnels
  - grid 4 KPIs (tous empty)
  - sections two-col (pickups + sales / stock + payout + activity) toutes empty
- [x] Refactor `apps/web/app/producer/profile/profile-client.tsx` : suppression du `<main>` autonome, retrait du commentaire obsolète
- [x] Refactor `apps/web/app/producer/settings/settings-client.tsx` : suppression du `<main>` autonome
- [x] Vérification : `/onboarding/producteur` est sous `(auth)` et n'hérite **pas** du layout `/producer/*` (les route groups Next isolent les deux arbres — confirmé)
- [x] Test E2E Playwright `apps/web/e2e/producer-dashboard.spec.ts` (3 scénarios : visiteur non-authentifié redirigé de `/producer`, `/producer/profile`, `/producer/settings` vers `/welcome`)
- [ ] Tests Vitest React Testing Library sur les composants — **différé** : `apps/web` n'a pas de setup Vitest (les tests unitaires vivent dans `packages/core` et `packages/contracts`). Le helper pur `getRoleHomePath` est testé côté core ; les composants restent vérifiés via E2E. Setup Vitest dans apps/web hors scope KAN-18.
- [ ] E2E scénarios « logged-in » (producteur dashboard, sidebar nav, redirect acheteur → `/acheteur`) — **différé** : nécessitent un harnais de fixtures producteur complet (cookies session + mocks PostgREST sur `public.users` / `public.producers`). À câbler dans un ticket polish dédié.
- [ ] Vérification accessibilité (axe-core) sur `/producer` — **différé** : axe-core n'est pas branché à Playwright dans le repo. Convention à introduire dans un ticket transverse.
- [x] Mise à jour `produit/jira_mapping.md` (cellule PR-03) : déjà fait au commit de cadrage
- [x] Le commentaire ticket Jira en tête de `design/maquettes/producteur/pr-03-dashboard.html` cite déjà KAN-18 + KAN-56 — pas de modification nécessaire à l'implémentation

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.

## Décisions techniques structurantes introduites

Entrée 1.21 ajoutée au journal §18 d'`ARCHITECTURE.md` (2026-05-18) couvrant :

- **Pattern layout authentifié multi-pages** : `apps/web/app/producer/layout.tsx`, premier exemple côté repo. Convention : un layout par espace de rôle (`/producer/*`, `/acheteur/*`, `/rameneur/*`), avec un composant `<AppSidebar />` générique paramétré.
- **Helper `getRoleHomePath(roles)`** dans `@delta/core/navigation` : source unique pour le routing par rôle (gating layout + post-login + post-onboarding). Précédence `producteur > acheteur > rameneur > /welcome`.
- **Convention « empty states explicites plutôt que fixtures »** pour les écrans dépendant de tables non encore livrées. Microcopy strictement orienté utilisateur, jamais de référence à un ticket interne en UI.
- **Convention `next/link` pour les cibles internes** (lint Next `@next/next/no-html-link-for-pages` strict, certains chemins comme `/onboarding/producteur` déclenchent le rule là où d'autres ne le font pas).

## Déviation notée vs spec

- **`users.first_name` n'existe pas en DB** (la spec présumait sa présence). Le greeting utilise `producers.display_name` (nom de la ferme) si renseigné, fallback handle email, fallback final `"Bonjour"`. À reprendre dès qu'une colonne `users.first_name` est ajoutée.
