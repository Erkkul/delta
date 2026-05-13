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

- [ ] Migration DB additive : `users.role user_role` → `users.roles user_role[] NOT NULL DEFAULT '{}'`. Trigger : ne plus pré-affecter de rôle (vide). Repercussions sur policy UPDATE (autoriser self-update de `roles` ; toujours interdire self-update de `email`/`id`).
- [ ] Schémas Zod refondus : `SignupInput` (email + password + termsVersion + privacyVersion, **plus de role, plus de checkboxes**). Nouveau `RoleSelectionInput { roles: Role[] (1..3 distinct) }`. Nouveau `OtpVerificationInput { email, otp 6 digits }`.
- [ ] Repo `usersRepo` : `updateRoles(client, id, roles[])` à la place de `updateRole`.
- [ ] Use case core `applyRoleSelection` (validation 1..3 distincts) + tests.
- [ ] **Composant `Splash`** (AU-01) — photo background, hero, 2 CTAs, mention CGU implicite.
- [ ] **Page `/welcome`** — Server Component qui monte `Splash`.
- [ ] **Composant `SignupForm` v2** — email + password + bouton Google **en premier**, séparateur, hint password (10 caractères + maj/min/digit), bandeau « Vos données restent en France ». Plus de checkboxes consents. Plus de radios rôle.
- [ ] **Page `/signup` v2** — Server Component shell + `SignupForm` v2. Soumet vers `/api/v1/auth/signup` (sans role).
- [ ] **Composant `OtpForm`** (AU-04) — 6 cases auto-focus, validation côté client (digits only), CTA « Vérifier ».
- [ ] **Page `/auth/verify-email`** — Client Component qui consomme `supabase.auth.verifyOtp({ type: 'email' })` + `supabase.auth.resend`.
- [ ] **Composant `RoleSelector` + `RoleCard`** (AU-06) — 3 cards multi-select, badge « Email vérifié », info-block multi-rôle.
- [ ] **Page `/onboarding/role`** — Client Component qui PATCH `/api/v1/me/roles` puis redirige selon priorité (rameneur > producteur > acheteur).
- [ ] Route handler `/api/v1/auth/signup` v2 — sans role, ajoute `consents` au `raw_user_meta_data` pour le trigger.
- [ ] Route handler `/api/v1/me/roles` (PATCH) — applique `applyRoleSelection`.
- [ ] Callback OAuth `/auth/callback` v2 — pose `metadata.consents` si absent (Google ne passe pas par /signup), redirige vers `/onboarding/role` si `users.roles` est vide.
- [ ] Page `apps/web/app/page.tsx` (landing actuelle) : ajouter un lien vers `/welcome` pour l'entrée du flow auth (sans toucher à son contenu actuel).
- [ ] Tests Vitest : refondus pour le nouveau périmètre (multi-rôle, OTP, splash).
- [ ] Mise à jour des .md transverses (CLAUDE.md, ARCHITECTURE.md §18 entrée 1.13, jira_mapping si nécessaire).

### Phase 3 — Reportées (sessions ultérieures)

- [ ] Seeds dev : 3 users (un par rôle) pour tests locaux — conditionné à `apps/mobile`.
- [ ] Test helper : `createTestUser(role)` dans `packages/db/src/test-utils.ts` — conditionné à la branche preview Supabase CI (cf. ARCHITECTURE.md §10).
- [ ] Apple Sign In — conditionné à l'enrôlement Apple Developer.

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
