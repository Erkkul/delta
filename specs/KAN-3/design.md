# Conception technique — KAN-3 Connexion

## Vue d'ensemble

Endpoint `POST /api/v1/auth/login` qui valide l'input Zod, applique un rate-limit Upstash, puis appelle `signInWithPassword` côté Supabase Auth. La session (access + refresh tokens) est gérée par le SDK Supabase côté client. OAuth Google + Apple suivent le même pattern que KAN-2 (SDK côté client, callback handler serveur). Logout via `POST /api/v1/auth/logout` qui révoque la session côté Supabase.

## Packages touchés

Cocher les packages impactés. Référence : ARCHITECTURE.md §14.2.

- [x] `packages/contracts` — schémas Zod (`LoginInput`, `LoginOutput`)
- [x] `packages/core` — helper `rateLimit` (réutilisable au-delà de l'auth)
- [x] `packages/db` — réutilise `usersRepo.findById` (créé par KAN-2)
- [x] `apps/web` — UI login + route handlers `/api/v1/auth/login`, `/api/v1/auth/logout`
- [x] `apps/mobile` — UI login mobile (Expo)
- [ ] `packages/jobs` — non applicable
- [ ] `supabase/migrations` — pas de nouvelle migration (réutilise `users` de KAN-2)
- [ ] `supabase/policies` — pas de nouvelle policy
- [x] `packages/ui-web` / `packages/ui-mobile` — composant `LoginForm` partagé en logique

## Modèle de données

Référence : ARCHITECTURE.md §5.

Aucune nouvelle table. Réutilise `users` créée par KAN-2.

## API / Endpoints

Référence : ARCHITECTURE.md §3.

- `POST /api/v1/auth/login`
  - Input : `{ email, password }` (Zod : `LoginInput`)
  - Output : `{ userId, role }` (session gérée par Supabase Auth côté client)
  - Codes : 200 / 400 (validation) / 401 (identifiants invalides — message générique) / 429 (rate-limit dépassé)
- `POST /api/v1/auth/logout`
  - Input : aucun (token courant via header)
  - Output : 204
- OAuth Google + Apple : SDK Supabase Auth côté client, callback handler serveur si besoin de finaliser quelque chose côté `users` (sinon partagé avec KAN-2).

## Impact state machine / events

Référence : ARCHITECTURE.md §6 et §8.

Aucun. Pas d'impact sur la machine à états mission ni sur les events Stripe.

## Dépendances

Services externes, jobs internes. Référence : ARCHITECTURE.md §2. État du provisionnement : `tech/setup.md`.

- Supabase (Postgres + Auth) — voir `tech/setup.md` § Backend / Données et § Auth / Identité
- Google Cloud Console (OAuth Google côté Supabase Auth) — voir `tech/setup.md` § Auth / Identité
- Apple Developer (Sign in with Apple côté Supabase Auth) — voir `tech/setup.md` § Auth / Identité
- Upstash Redis (rate-limit `POST /auth/login`) — voir `tech/setup.md` § Backend / Données
- Aucun job Inngest

## État UI

Référence : DESIGN.md.

- `LoginForm` : email + password + boutons sociaux Google / Apple
- États : loading, erreur (`Identifiants invalides` — générique, pas de leak), erreur rate-limit (`Trop de tentatives, réessayez dans X minutes`), success → redirection vers dashboard du rôle de l'user
- Lien « Mot de passe oublié ? » présent dans la maquette mais inactif au MVP (couvert par KAN-157)
- Responsive mobile + desktop selon DESIGN.md

## Risques techniques

Pièges, limites, free-tier, observabilité. Références : ARCHITECTURE.md §9, §11, §13.

- **Brute-force** : sans rate-limit, vulnérable. Upstash obligatoire ici (5 essais / 15 min / email comme baseline, à régler).
- **Énumération d'utilisateurs** : ne pas distinguer "email inexistant" de "mauvais mot de passe" côté API. Toujours retourner `401 Identifiants invalides`.
- **Session expiration mobile** : l'app peut être en arrière-plan longtemps. Tester la stratégie de refresh tokens du SDK Supabase sur device réel.
- **Logout côté serveur** : invalidation Supabase, mais l'access token reste valide jusqu'à expiration naturelle. Acceptable au MVP.
- **OAuth callback mobile** : mêmes gotchas que KAN-2 (deep link, Apple identité privée).

## Tests envisagés

Référence : ARCHITECTURE.md §10.

- Unitaire `packages/contracts` : validation Zod `LoginInput`
- Unitaire `packages/core` : helper `rateLimit` (mock client Upstash)
- Intégration : appels Supabase Auth avec credentials valides / invalides / inexistants → réponses attendues
- Intégration rate-limit : 6e tentative en moins de 15 min → 429
- E2E web (Playwright) : parcours login email/password, redirection dashboard par rôle
- E2E mobile (Maestro) : login email/password sur device réel ; OAuth quand stable
- Sécurité : vérifier qu'aucune réponse ne distingue email inconnu vs mauvais mdp
