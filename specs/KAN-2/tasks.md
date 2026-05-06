# Tâches techniques internes — KAN-2 Création de compte

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
(aucune)

## Tâches

- [ ] Migration DB : enum `user_role` + table `users` (id ref auth.users, email, role, created_at, updated_at, metadata)
- [ ] Policy RLS sur `users` : SELECT/UPDATE limités à `auth.uid() = id`, INSERT bloqué côté client
- [ ] Trigger Postgres `on_auth_user_created` pour insérer atomiquement la ligne `users` à la création Auth
- [ ] Schémas Zod dans `packages/contracts/src/auth.ts` : `Role`, `SignupInput`, `SignupOutput`
- [ ] Repo `usersRepo` dans `packages/db/src/users/` : `create`, `findById`, `updateRole`
- [ ] Configuration Supabase Auth : activer providers Google + Apple (env vars + redirect URIs web/mobile)
- [ ] Composant partagé `SignupForm` (logique commune) avec déclinaisons `ui-web` / `ui-mobile`
- [ ] Seeds dev : 3 users (un par rôle) pour tests locaux
- [ ] Test helper : `createTestUser(role)` dans `packages/db/src/test-utils.ts`

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
