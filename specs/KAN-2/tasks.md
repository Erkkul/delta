# Tâches techniques internes — KAN-2 Création de compte

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
(aucune)

## Tâches

### Phase 1 — Premier passage (commit `3c4c2ff` → `75bd279`)

- [x] Migration DB : enum `user_role` + table `users` — `supabase/migrations/20260512090000_create_users.sql`
- [x] Policies RLS sur `users` (inline migration + miroir `supabase/policies/users.sql`)
- [x] Trigger Postgres `on_auth_user_created` (atomicité Auth ↔ métier)
- [x] Schémas Zod premiers (`Role`, `SignupInput` v1 single-role, `LoginInput` anticipé KAN-3)
- [x] Repo `usersRepo` (`create`, `findById`, `findByEmail`, `updateRole`)
- [x] Configuration Supabase Auth : Google activé, email/password OK
- [x] Composant `SignupForm` v1 (mono-écran, single-rôle)
- [x] Scaffold packages workspace `contracts` / `core` / `db` / `ui-web`
- [x] CI verte (lint + typecheck + 36 tests Vitest)

### Phase 2 — Réalignement maquette (décisions produit 2026-05-13)

- [x] Migration DB additive : `users.role user_role` → `users.roles user_role[] NOT NULL DEFAULT '{}'`. Trigger : ne plus pré-affecter de rôle (vide). Repercussions sur policy UPDATE (autoriser self-update de `roles` ; toujours interdire self-update de `email`/`id`).
- [x] Schémas Zod refondus : `SignupInput` (email + password + termsVersion + privacyVersion, **plus de role, plus de checkboxes**). Nouveau `RoleSelectionInput { roles: Role[] (1..3 distinct) }`. Nouveau `OtpVerificationInput { email, otp 6 digits }`.
- [x] Repo `usersRepo` : `updateRoles(client, id, roles[])` à la place de `updateRole`.
- [x] Use case core `applyRoleSelection` (validation 1..3 distincts) + tests.
- [x] **Composant `Splash`** (AU-01) — photo background, hero, 2 CTAs, mention CGU implicite.
- [x] **Page `/welcome`** — Server Component qui monte `Splash`.
- [x] **Composant `SignupForm` v2** — email + password + bouton Google **en premier**, séparateur, hint password (10 caractères + maj/min/digit), bandeau « Vos données restent en France ». Plus de checkboxes consents. Plus de radios rôle.
- [x] **Page `/signup` v2** — Server Component shell + `SignupForm` v2. Soumet vers `/api/v1/auth/signup` (sans role).
- [x] **Composant `OtpForm`** (AU-04) — 6 cases auto-focus, validation côté client (digits only), CTA « Vérifier ».
- [x] **Page `/auth/verify-email`** — Client Component qui consomme `supabase.auth.verifyOtp({ type: 'email' })` + `supabase.auth.resend`.
- [x] **Composant `RoleSelector` + `RoleCard`** (AU-06) — 3 cards multi-select, badge « Email vérifié », info-block multi-rôle.
- [x] **Page `/onboarding/role`** — Client Component qui PATCH `/api/v1/me/roles` puis redirige selon priorité (rameneur > producteur > acheteur).
- [x] Route handler `/api/v1/auth/signup` v2 — sans role, ajoute `consents` au `raw_user_meta_data` pour le trigger.
- [x] Route handler `/api/v1/me/roles` (PATCH) — applique `applyRoleSelection`.
- [x] Callback OAuth `/auth/callback` v2 — pose `metadata.consents` si absent (Google ne passe pas par /signup), redirige vers `/onboarding/role` si `users.roles` est vide.
- [x] Page `apps/web/app/page.tsx` (landing actuelle) : ajouter un lien vers `/welcome` pour l'entrée du flow auth (sans toucher à son contenu actuel).
- [x] Tests Vitest : refondus pour le nouveau périmètre (multi-rôle, OTP, splash) — 57 tests verts.
- [x] Mise à jour des .md transverses (CLAUDE.md, ARCHITECTURE.md §18 entrée 1.13, jira_mapping si nécessaire).

### Phase 2bis — Stub onboardings (PR #3)

- [x] Page `apps/web/app/(auth)/onboarding/[role]/page.tsx` — stub dynamique pour `acheteur`/`rameneur`/`producteur` afin de fermer la boucle KAN-2 (sinon 404 après `nextOnboardingPath`). Pointe vers les tickets qui porteront le vrai écran : KAN-25 (AC-02), KAN-37 (RM-02), KAN-16 (PR-02).

### Phase 4 — Refonte responsive desktop (2026-05-14)

- [x] Nouveaux composants `AuthSplitLayout` + `AuthHeroPanel` dans `packages/ui-web/src/auth-split-layout.tsx`.
- [x] `Splash` : layout desktop split 1/1 (photo + carte producteur flottante à gauche, panneau vert avec hero + 2 CTAs + trust strip à droite). Mobile inchangé.
- [x] `/signup` : passage en `AuthSplitLayout` 5fr/7fr avec hero panel « Rejoignez 1 247 voisins gourmands » + badges « Données en France » / « Sans abonnement ».
- [x] `/auth/verify-email` : passage en `AuthSplitLayout` 5fr/7fr avec hero panel « Une étape pour vous protéger ».
- [x] `/onboarding/role` : top bar avec badge « Email vérifié » + email, `RoleSelector` en grille 3 colonnes desktop avec pills bullets par card.
- [x] `/onboarding/[role]` (stub) : passage en `AuthSplitLayout` avec image dédiée par rôle.
- [x] `(auth)/layout.tsx` : réduit à un pass-through (chrome géré par chaque page).
- [x] ARCHITECTURE.md §18 entrée 1.14 + CLAUDE.md convention de nommage de branche.

### Phase 3 — Reportées (sessions ultérieures)

- [ ] Seeds dev : 3 users (un par rôle) pour tests locaux — conditionné à `apps/mobile`.
- [ ] Test helper : `createTestUser(role)` dans `packages/db/src/test-utils.ts` — conditionné à la branche preview Supabase CI (cf. ARCHITECTURE.md §10).
- [ ] Apple Sign In — conditionné à l'enrôlement Apple Developer.

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
