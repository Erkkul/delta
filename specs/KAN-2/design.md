# Conception technique — KAN-2 Création de compte

## Vue d'ensemble

L'inscription s'appuie sur **Supabase Auth** côté serveur (email/password + OAuth Google + OAuth Apple). À la création réussie côté Auth, un trigger Postgres insère une ligne dans `users` avec le rôle choisi. Les policies RLS sont activées dès la migration. L'UI est partagée entre web (Next.js) et mobile (Expo) via composants `ui-web` / `ui-mobile` consommant les mêmes contrats Zod.

## Packages touchés

Cocher les packages impactés. Référence : ARCHITECTURE.md §14.2.

- [x] `packages/contracts` — schémas Zod (`SignupInput`, enum `Role`)
- [x] `packages/core` — règle de mapping rôle → flux d'onboarding suivant
- [x] `packages/db` — repo `usersRepo.create`, `usersRepo.findById`
- [x] `apps/web` — UI signup + route handler `/api/v1/auth/signup`
- [x] `apps/mobile` — UI signup mobile (Expo)
- [ ] `packages/jobs` — non applicable au MVP
- [x] `supabase/migrations` — table `users` + enum `user_role`
- [x] `supabase/policies` — RLS sur `users`
- [x] `packages/ui-web` / `packages/ui-mobile` — composant `SignupForm` partagé en logique

## Modèle de données

Entités, champs, contraintes, RLS. Référence : ARCHITECTURE.md §5.

Table `users` :

- `id` (uuid, PK, FK vers `auth.users.id` Supabase)
- `email` (text, unique, not null)
- `role` (enum `user_role` : `acheteur` | `rameneur` | `producteur`, not null)
- `created_at`, `updated_at` (timestamptz, défaut `now()`)
- `metadata` (jsonb, défaut `{}`)

Contrainte : `id = auth.users.id` (cohérence Supabase Auth ↔ table métier).

RLS sur `users` :

- SELECT : `auth.uid() = id`
- UPDATE : idem
- INSERT : autorisé uniquement via trigger ou fonction sécurisée (jamais directement par client) — empêche les comptes orphelins

## API / Endpoints

Routes, contrats Zod, codes d'erreur. Référence : ARCHITECTURE.md §3.

- `POST /api/v1/auth/signup` (email/password)
  - Input : `{ email, password, role }` (Zod : `SignupInput`)
  - Output : `{ userId, role }`
  - Codes : 201 / 400 (validation) / 409 (email déjà pris)
- OAuth Google + Apple : pas de route custom, SDK Supabase Auth côté client. Callback handler serveur pour finaliser l'insertion `users` au premier login OAuth.

## Impact state machine / events

Transitions mission, événements `mission_events`, webhooks Stripe. Référence : ARCHITECTURE.md §6 et §8.

Aucun. Le user sera consommateur ou émetteur de missions ultérieurement, mais ce flow ne touche pas aux events mission.

## Dépendances

Services externes, jobs internes. Référence : ARCHITECTURE.md §2. État du provisionnement : `tech/setup.md`.

- Supabase (Postgres + Auth) — voir `tech/setup.md` § Backend / Données et § Auth / Identité
- Google Cloud Console (OAuth Google côté Supabase Auth) — voir `tech/setup.md` § Auth / Identité
- Apple Developer (Sign in with Apple côté Supabase Auth) — voir `tech/setup.md` § Auth / Identité
- Aucun job Inngest au MVP

## État UI

Composants, transitions, breakpoints, mobile + desktop obligatoires. Référence : DESIGN.md.

- `SignupForm` : email + password + sélecteur de rôle (3 boutons radio)
- Boutons sociaux : « Continuer avec Google », « Continuer avec Apple »
- États : loading, erreur (email déjà pris, password trop faible, OAuth refusé), success → redirection vers onboarding du rôle choisi
- Responsive mobile + desktop selon DESIGN.md

## Risques techniques

Pièges, limites, free-tier, observabilité. Références : ARCHITECTURE.md §9, §11, §13.

- **Sync `auth.users` ↔ `users` métier** : risque de désynchro si l'insertion métier échoue après création Auth. Trigger Postgres `on_auth_user_created` pour atomicité, ou compensation applicative avec retry idempotent.
- **OAuth callback mobile** : Apple Sign In a des contraintes spécifiques (deep link, identité privée). Tester tôt sur device réel.
- **Free-tier Supabase Auth** : 50 000 MAU au plan gratuit, large pour le MVP.
- **RGPD** : email = donnée personnelle. Table `users` à inscrire au registre des traitements. Politique de suppression à prévoir (hors scope cette US).

## Tests envisagés

Référence : ARCHITECTURE.md §10.

- Unitaire `packages/core` : validation Zod, mapping rôle → onboarding suivant
- Intégration `packages/db` : insertion `users` + RLS (Supabase local)
- E2E web (Playwright) : parcours complet email/password, redirection onboarding par rôle
- E2E mobile (Maestro) : parcours email/password sur device réel ; OAuth quand stable
