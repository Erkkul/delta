# Conception technique — KAN-2 Création de compte

## Vue d'ensemble

Flow auth en 4 écrans (cf. maquette `*-01-authentication.html`) :

```
/welcome  ──►  /signup  ──►  /auth/verify-email  ──►  /onboarding/role  ──►  …onboarding par rôle (hors KAN-2)
  AU-01         AU-02              AU-04                    AU-06
```

- **AU-01 Splash** (`/welcome`) — Server Component statique, hero terroir + CTAs.
- **AU-02 Signup** (`/signup`) — Client Component : email + password + bouton Google. Trigger `Supabase Auth` côté client (`signUp` ou `signInWithOAuth`), avec `options.data` portant les `consents` (versions courantes des CGU et politique de confidentialité, timestamp ISO).
- **AU-04 Verify email** (`/auth/verify-email`) — Client Component : OTP 6 chiffres, vérifié via `supabase.auth.verifyOtp({ type: 'email' })`. Renvoi de code via `supabase.auth.resend`.
- **AU-06 Choix rôle** (`/onboarding/role`) — Client Component : sélection multi `roles[]`. PATCH `/api/v1/me/roles` qui met à jour `users.roles` côté serveur.

À la création réussie côté Auth (email/password OU OAuth callback), un trigger Postgres `on_auth_user_created` insère une ligne dans `users` avec `roles = '{}'`. Les consents (lus depuis `raw_user_meta_data->>'consents'`) sont copiés dans `metadata.consents` par le trigger. RLS forcée dès la migration. UI partagée web (Next.js) ; le mobile (Expo) consommera plus tard les mêmes contrats Zod.

## Packages touchés

Cocher les packages impactés. Référence : ARCHITECTURE.md §14.2.

- [x] `packages/contracts` — schémas Zod (`Role`, `SignupInput`, `RoleSelectionInput`, `OtpVerificationInput`, `LoginInput` anticipé KAN-3)
- [x] `packages/core` — règle de mapping rôles → flux d'onboarding suivant, builder de consents, validation multi-rôle
- [x] `packages/db` — repo `usersRepo.{findById, findByEmail, updateRoles}`. Pas de `create` direct côté client : géré par trigger ou client admin.
- [x] `apps/web` — 4 pages (`/welcome`, `/signup`, `/auth/verify-email`, `/onboarding/role`) + route handlers (`/api/v1/auth/signup`, `/api/v1/me/roles`) + callback OAuth
- [ ] `apps/mobile` — différé (apps/mobile pas encore scaffoldé)
- [ ] `packages/jobs` — non applicable
- [x] `supabase/migrations` — table `users` + enum `user_role` + trigger
- [x] `supabase/policies` — RLS sur `users` (SELECT/UPDATE limités à `auth.uid() = id` ; UPDATE de `roles` autorisé pour self ; modif de `email` interdite — verrouillée par Supabase Auth)
- [x] `packages/ui-web` — composants partagés (`Splash`, `SignupForm`, `OtpForm`, `RoleSelector`, `RoleCard`)

## Modèle de données

Référence : ARCHITECTURE.md §5.

Table `users` :

- `id` (uuid, PK, FK vers `auth.users.id` Supabase)
- `email` (text, unique lower-case, not null)
- `roles` (`user_role[]`, not null, default `'{}'`) — **multi-rôle** depuis la décision 2026-05-13 (auparavant `role user_role` scalaire)
- `created_at`, `updated_at` (timestamptz, défaut `now()`)
- `deleted_at` (timestamptz, null) — soft delete RGPD
- `metadata` (jsonb, défaut `'{}'`) — contient au minimum `consents = { termsVersion, privacyVersion, acceptedAt }`

Contrainte : `id = auth.users.id` (cohérence Supabase Auth ↔ table métier).

RLS sur `users` (forcée) :

- SELECT : `auth.uid() = id`
- UPDATE : `auth.uid() = id`. Le user peut modifier ses `roles` et son `metadata`. `id` et `email` sont verrouillés (escalade prévenue par WITH CHECK + ownership Supabase Auth sur l'email).
- INSERT : refusé côté client (trigger `handle_new_auth_user` SECURITY DEFINER ou client admin uniquement)
- DELETE : refusé côté client (soft delete via job RGPD dédié)

## API / Endpoints

Référence : ARCHITECTURE.md §3.

| Endpoint | Input (Zod) | Output | Codes |
|---|---|---|---|
| `POST /api/v1/auth/signup` | `SignupInput { email, password, termsVersion, privacyVersion }` | `{ userId }` | 201 / 400 / 409 |
| `POST /api/v1/auth/verify-email` | `OtpVerificationInput { email, otp }` | `{ userId }` | 200 / 400 / 401 |
| `PATCH /api/v1/me/roles` | `RoleSelectionInput { roles: Role[] }` | `{ userId, roles }` | 200 / 400 / 401 |

OAuth Google : pas de route custom, SDK Supabase Auth côté client. Callback handler serveur (`/auth/callback`) finalise les consents pour les users OAuth (qui ne passent pas par `/api/v1/auth/signup`) et redirige vers `/onboarding/role` si `users.roles` est vide.

## Impact state machine / events

Référence : ARCHITECTURE.md §6 et §8.

Aucun.

## Dépendances

Services externes, jobs internes. Référence : ARCHITECTURE.md §2. État du provisionnement : `tech/setup.md`.

- Supabase (Postgres + Auth + envoi mail OTP via sender par défaut) — voir `tech/setup.md` § Backend / Données et § Auth / Identité
- Google Cloud Console (OAuth Google côté Supabase Auth) — voir `tech/setup.md` § Auth / Identité
- Apple Developer — **différé** (Apple Sign In hors périmètre cette US)
- Aucun job Inngest au MVP

## État UI

Composants, transitions, breakpoints, mobile + desktop obligatoires. Référence : DESIGN.md.

- **AU-01 Splash** : photo terroir background + dégradé sombre, logo, eyebrow + H1 Lora + sub, trust strip (avis + producteurs/villes), 2 CTAs, mention « En continuant, vous acceptez nos CGU et politique de confidentialité ».
- **AU-02 Signup** : H1 Lora « Créer un compte », sous-titre « Producteur, rameneur ou acheteur — un seul compte pour tout », bouton Google en premier, séparateur « ou avec votre email », champs Email + Mot de passe (avec `PasswordStrength`), bandeau vert « Vos données restent en France ».
- **AU-04 Verify email** : icône mail dans badge cream-50, H1 « Vérifiez votre email », OTP 6 cases, lien « Renvoyer le code » + lien « Modifier l'email ».
- **AU-06 Choix rôle** : badge « Email vérifié », H1 « Comment souhaitez-vous utiliser Delta ? », sous-titre « Choisissez un ou plusieurs rôles — vous pourrez les modifier plus tard », 3 `RoleCard` empilées (toggleables), info-block « Vous pouvez cumuler les rôles… ».
- États transverses : loading, erreur (email pris, OTP invalide, OAuth refusé), success → écran suivant.
- Responsive mobile + desktop selon DESIGN.md.

## Risques techniques

Pièges, limites, free-tier, observabilité. Références : ARCHITECTURE.md §9, §11, §13.

- **Sync `auth.users` ↔ `users` métier** : trigger Postgres `on_auth_user_created` SECURITY DEFINER pour atomicité. Idempotent (`ON CONFLICT DO NOTHING`).
- **Multi-rôle escalade producteur** : un user peut s'auto-attribuer le rôle `producteur` côté `/onboarding/role`. Risque accepté car la vérification SIRET est asynchrone et bloque la visibilité publique des produits jusqu'à validation (décision 2026-05-03). Aucun gain à empêcher la sélection au signup.
- **Verify email obligatoire** : si Supabase rate-limite l'envoi (free-tier), le user est bloqué. Mitigation : on garde le sender Supabase par défaut tant que Resend n'est pas branché ; reswtoner l'option d'élargir si volume.
- **OAuth callback** : Google ne passe pas par `/api/v1/auth/signup`, donc les consents doivent être posés au callback. Race possible si l'utilisateur ferme la fenêtre avant que le callback ait fini. Acceptable : la prochaine action serveur le complétera (idempotence par check `metadata.consents IS NULL`).
- **Free-tier Supabase Auth** : 50 000 MAU au plan gratuit, large pour le MVP.
- **RGPD** : email = donnée personnelle. Table `users` à inscrire au registre des traitements. Politique de suppression à prévoir (hors scope cette US).

## Tests envisagés

Référence : ARCHITECTURE.md §10.

- Unitaire `packages/contracts` : validation Zod (`SignupInput`, `RoleSelectionInput`, `OtpVerificationInput`)
- Unitaire `packages/core` : builder consents, mapping rôles → onboarding (avec multi-rôle : priorité rameneur > producteur > acheteur), validation multi-rôle (1 à 3 distincts)
- Intégration `packages/db` : insertion `users` via trigger + RLS update self (Supabase local)
- E2E web (Playwright) : parcours complet email/password → OTP → role select → redirection onboarding
- E2E web (Playwright) : parcours OAuth Google avec compte test (mock OAuth si possible)
