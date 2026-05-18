# Tâches techniques internes — KAN-18 Tableau de bord producteur

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> - (aucune au moment du cadrage — KAN-18 n'a pas de subtasks Jira créées)

## Tâches

- [ ] Helper `apps/web/lib/navigation/get-role-home-path.ts` :
  - input `roles: UserRole[]`
  - output `/producer | /acheteur | /rameneur | /welcome`
  - tests Vitest sur les 7 combinaisons de rôles + cas vide
- [ ] Helper `apps/web/lib/navigation/producer-nav.ts` :
  - liste canonique des items sidebar producteur
  - source unique pour le layout et les tests (`{ href, label, icon, disabled? }`)
- [ ] Layout `apps/web/app/producer/layout.tsx` (server component) :
  - vérification session (redirect `/welcome` sinon)
  - vérification rôle `producteur` (redirect via `getRoleHomePath` sinon)
  - lecture `users.findById` + `producers.findByUserId` (avec React `cache()` pour limiter les doubles lectures)
  - redirect `/onboarding/producteur` si row `producers` absente
  - rendu `<AppSidebar />` + `<MobileTopbar />` + `{children}`
  - exposition du contexte `<ProducerContext.Provider>` (client) pour les pages enfants
- [ ] Composant générique `apps/web/components/app/app-sidebar.tsx` :
  - props `{ role, items, user, activePath }`
  - sections headers, items, badges, disabled state
  - icônes `lucide-react` (à confirmer en dépendance ; sinon ajouter)
- [ ] Composant `apps/web/components/app/mobile-topbar.tsx` + drawer
- [ ] Composant `apps/web/components/producer/siret-banner.tsx` (4 variantes)
- [ ] Composant `apps/web/components/producer/stripe-onboarding-banner.tsx` (encart si `stripe_status != 'active'`)
- [ ] Composant `apps/web/components/producer/paused-banner.tsx` (encart si `producers.paused = true`)
- [ ] Composants dashboard `apps/web/components/dashboard/` :
  - `kpi-card.tsx` (modes `value` / `coming`)
  - `section-card.tsx`
  - `empty-state.tsx`
- [ ] Page `apps/web/app/producer/page.tsx` :
  - greeting header + CTA « Nouveau produit » disabled (tooltip neutre)
  - banners (SIRET + Stripe + paused) conditionnels
  - grid 4 KPIs (tous empty)
  - sections two-col (pickups + sales / stock + payout + activity) toutes empty
- [ ] Refactor `apps/web/app/producer/profile/profile-client.tsx` : suppression du `<main>` autonome, branchement sur le layout parent + retrait du commentaire obsolète ligne 10
- [ ] Refactor `apps/web/app/producer/settings/settings-client.tsx` : même refacto
- [ ] Vérification : `/onboarding/producteur` est bien sous `(auth)` et n'hérite **pas** du layout `/producer/*` (sinon ajuster la structure des route groups)
- [ ] Tests Vitest `apps/web/components/**/*.test.tsx` pour les composants nouveaux (5-6 specs)
- [ ] Test E2E Playwright `apps/web/e2e/producer-dashboard.spec.ts` (5 scénarios : producteur dashboard, sidebar nav, responsive mobile, acheteur redirect, non-connecté redirect)
- [ ] Vérification accessibilité (axe-core) sur `/producer`
- [ ] Mise à jour `produit/jira_mapping.md` (cellule PR-03) : `[Cadrage tech](specs/KAN-18/)` ajouté à la colonne « Ticket(s) Jira principal(aux) »
- [ ] Le commentaire ticket Jira en tête de `design/maquettes/producteur/pr-03-dashboard.html` cite déjà KAN-18 + KAN-56 — pas de modification nécessaire à l'implémentation

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.

## Décisions techniques structurantes introduites

À ajouter au journal §18 d'`ARCHITECTURE.md` au moment de l'implémentation si confirmées :

- **Pattern layout authentifié multi-pages** : `apps/web/app/producer/layout.tsx` est le premier exemple côté repo. Convention : un layout par espace de rôle (`/producer/*`, `/acheteur/*`, `/rameneur/*`), avec un composant `<AppSidebar />` générique paramétré.
- **Helper `getRoleHomePath(roles)`** : source unique pour le routing par rôle (gating layout + post-login + post-onboarding). À étendre aux espaces acheteur et rameneur dès leurs tickets.
- **Convention « empty states explicites plutôt que fixtures »** pour les écrans qui dépendent de tables non encore livrées. Microcopy strictement orienté utilisateur, jamais de référence à un ticket interne.
