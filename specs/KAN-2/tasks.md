# Tâches techniques internes — KAN-2 Création de compte

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
(aucune)

## Tâches

- [x] Migration DB : enum `user_role` + table `users` (id ref auth.users, email, role, created_at, updated_at, metadata) — `supabase/migrations/20260512090000_create_users.sql`
- [x] Policy RLS sur `users` : SELECT/UPDATE limités à `auth.uid() = id`, INSERT/DELETE bloqués côté client — inline dans la migration + miroir documentaire `supabase/policies/users.sql`
- [x] Trigger Postgres `on_auth_user_created` pour insérer atomiquement la ligne `users` à la création Auth (fallback `'acheteur'` quand `raw_user_meta_data.role` est absent — cas OAuth Google)
- [x] Schémas Zod dans `packages/contracts/src/auth.ts` : `Role`, `SignupInput`, `SignupOutput`, `LoginInput` anticipé pour KAN-3
- [x] Repo `usersRepo` dans `packages/db/src/users/` : `create`, `findById`, `findByEmail`, `updateRole`
- [x] Configuration Supabase Auth : provider Google activé (cf. `tech/setup.md` 2026-05-12). Apple Sign In **différé** (Apple Developer pas encore enrôlé).
- [x] Composant partagé `SignupForm` côté web (`packages/ui-web/src/signup-form.tsx`). Déclinaison `ui-mobile` **différée** (apps/mobile pas encore scaffoldé).
- [ ] Seeds dev : 3 users (un par rôle) pour tests locaux — reporté à une session ultérieure (nécessite que `apps/mobile` soit en place pour tester end-to-end)
- [ ] Test helper : `createTestUser(role)` dans `packages/db/src/test-utils.ts` — reporté (les tests d'intégration Supabase tournent sur branche preview Supabase en CI, cf. ARCHITECTURE.md §10)

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
