# Conception technique — KAN-157 Récupération de mot de passe

## Vue d'ensemble

Trois écrans, deux endpoints. `POST /api/v1/auth/forgot-password` reçoit un email, applique un rate-limit Upstash (3/h/email), appelle `auth.resetPasswordForEmail()` côté Supabase, et retourne **systématiquement** 204 (anti-énumération strict — même pattern que KAN-3). L'email contient un code OTP 6 chiffres (`type: 'recovery'`). L'utilisateur saisit l'OTP + nouveau mot de passe sur l'écran AU-FP3 → `POST /api/v1/auth/reset-password` vérifie l'OTP via `auth.verifyOtp({ type: 'recovery' })`, ouvre une session temporaire de recovery, puis appelle `auth.updateUser({ password })`. Toutes les autres sessions sont invalidées par la config Supabase `secure password change ON` (déjà active).

## Packages touchés

Cocher les packages impactés. Référence : ARCHITECTURE.md §14.2.

- [x] `packages/contracts` — schémas Zod (`ForgotPasswordInput`, `ResetPasswordInput`), partage de `passwordPolicy` avec `SignupInput`
- [x] `packages/core` — use cases `requestPasswordReset(email)` et `resetPasswordWithOtp({ email, token, newPassword })`, erreurs typées (`InvalidRecoveryTokenError`, réutilise `RateLimitedError` + `WeakPasswordError`)
- [ ] `packages/db` — pas de nouveau repo (Supabase Auth gère tout, `users.metadata` non touchée)
- [x] `apps/web` — pages `/forgot-password`, `/forgot-password/sent`, `/reset-password` + route handlers `/api/v1/auth/forgot-password`, `/api/v1/auth/reset-password`
- [ ] `apps/mobile` — différé (apps/mobile non scaffolded)
- [ ] `packages/jobs` — non applicable
- [ ] `supabase/migrations` — aucune migration (Supabase Auth gère le token recovery)
- [ ] `supabase/policies` — pas de nouvelle policy
- [x] `packages/ui-web` — nouveau `ForgotPasswordForm` + composite `ResetPasswordForm` (réutilise `OtpForm` existant + `PasswordField` extrait de `SignupForm`)

## Modèle de données

Référence : ARCHITECTURE.md §5.

Aucune nouvelle table, aucune nouvelle colonne. Le token de recovery est géré par Supabase Auth (`auth.flow_state`, table interne Supabase).

## API / Endpoints

Référence : ARCHITECTURE.md §3.

- `POST /api/v1/auth/forgot-password`
  - Input : `{ email }` (Zod : `ForgotPasswordInput`)
  - Output : `204 No Content` (jamais d'info sur l'existence du compte)
  - Codes : 204 / 400 (email mal formé) / 429 (rate-limit dépassé, header `Retry-After`)
  - Comportement : appelle `auth.resetPasswordForEmail(email)`. Toute erreur Supabase (email inconnu, rate-limit Supabase) est avalée → 204. Seul un email mal formé renvoie 400.
- `POST /api/v1/auth/reset-password`
  - Input : `{ email, token, newPassword }` (Zod : `ResetPasswordInput`)
  - Output : `{ userId }` (200) — la session de recovery courte est posée par Supabase, le client est invité à appeler `/login` ensuite
  - Codes : 200 / 400 (validation, mdp faible) / 401 (OTP invalide ou expiré — message générique) / 429 (rate-limit)
  - Comportement : `auth.verifyOtp({ email, token, type: 'recovery' })` puis `auth.updateUser({ password })`. Anti-énumération identique à KAN-3 (mauvais OTP et email inconnu → même `InvalidRecoveryTokenError`).

Rate-limits Upstash dédiés (clés distinctes de `/login`) :
- `forgot-password:<email>` — 3 / heure (fenêtre longue car émet un email réel)
- `reset-password:<email>` — 5 / 15 min (symétrique avec `/login`)

## Impact state machine / events

Référence : ARCHITECTURE.md §6 et §8.

Aucun. Pas d'impact mission, pas d'event Stripe.

## Dépendances

Référence : ARCHITECTURE.md §2. État du provisionnement : `tech/setup.md`.

- Supabase Auth (recovery flow + sender email par défaut) — voir `tech/setup.md` § Supabase (Auth email/password) et § Supabase Auth — activation providers
- Upstash Redis (rate-limit `/forgot-password` et `/reset-password`) — voir `tech/setup.md` § Upstash Redis
- Resend — **non requis pour le MVP** (sender Supabase par défaut suffit). À brancher au pré-lancement quand le domaine custom sera choisi (`tech/setup.md` § Resend, § Domaine + DNS — encore *À faire*).
- Aucun job Inngest.

## État UI

Référence : DESIGN.md ; maquettes auth `*-01-authentication.html`.

- **AU-FP1 `/forgot-password`** : input email + CTA « Recevoir un code » + lien retour `/login`. Réutilise `AuthSplitLayout` + `AuthHeroPanel` (KAN-2). Mobile + desktop.
- **AU-FP2 `/forgot-password/sent`** : message neutre « Si un compte existe pour <email>, un code à 6 chiffres a été envoyé. Vérifiez votre boîte. » + CTA « Saisir le code » → `/reset-password?email=<email>` + lien « Renvoyer le code » (qui renvoie sur `/forgot-password` avec email pré-rempli, rate-limit serveur protège).
- **AU-FP3 `/reset-password`** : composite — bloc `OtpForm` (réutilisé d'AU-04) + bloc nouveau mot de passe (réutilise `passwordPolicy` hint + strength meter de `SignupForm`). CTA « Réinitialiser le mot de passe ». Sur succès, redirection vers `/login` avec un toast neutre.
- États : loading, erreur (`Identifiants invalides` ou `Code expiré` génériques), erreur rate-limit (`Trop de tentatives, réessayez plus tard`).
- Lien « Mot de passe oublié ? » du `LoginForm` (KAN-3) est **activé** dans cette US (renvoyait vers `#` jusque-là).
- Responsive mobile + desktop selon DESIGN.md.

**Conflit maquette ↔ besoin** : le bundle Figma ne fournit pas d'écran AU-FP dédié — décision documentée dans `notes.md` (réutilisation visuelle d'AU-02/AU-04 sans ré-export Figma au MVP).

## Risques techniques

Pièges, limites, free-tier, observabilité. Références : ARCHITECTURE.md §9, §11, §13.

- **Énumération d'utilisateurs** : le piège classique de ce flow. `forgot-password` doit **toujours** retourner 204 même si l'email n'existe pas. Le temps de réponse doit être ~constant (pas de short-circuit early si email inconnu) — Supabase masque déjà ce timing, à vérifier en test d'intégration.
- **Spam d'emails** : un attaquant pourrait spammer `forgot-password` pour faire envoyer des emails non sollicités à des cibles arbitraires (harcèlement, déliverabilité). D'où le rate-limit 3/h/email. Compléter par un rate-limit IP au niveau middleware si nécessaire post-launch.
- **Email non délivré** : le sender Supabase par défaut a une déliverabilité moyenne. Acceptable pour le MVP fermé ; bascule Resend au pré-lancement (cf. `tech/setup.md`).
- **Expiration OTP** : Supabase recovery OTP expire en 1 h par défaut. Documenter dans la microcopy de l'email et de l'écran AU-FP3.
- **Réutilisation OTP** : Supabase rejette un OTP déjà consommé. Tester ce cas pour s'assurer du message générique.
- **Free-tier email** : sender Supabase gratuit a des quotas (~30/h/projet selon doc Supabase). Au pic d'utilisation (pré-lancement), risque d'amputation. Bascule Resend prévue.
- **Observabilité** : logger `traceId`, route, `latencyMs` (ARCHITECTURE.md §11). **Jamais** logger l'email en clair ni la présence/absence du compte (ARCHITECTURE.md §9.6).

## Tests envisagés

Référence : ARCHITECTURE.md §10.

- Unitaire `packages/contracts` : validation Zod `ForgotPasswordInput` et `ResetPasswordInput` (réutilise `passwordPolicy`)
- Unitaire `packages/core` : use cases `requestPasswordReset` et `resetPasswordWithOtp` (mocks Supabase Auth + store rate-limit)
- Intégration : appels Supabase Auth recovery sur projet de test (email valide / inconnu / déjà consommé / expiré → réponses attendues, toutes opaques)
- Intégration rate-limit : 4e requête `forgot-password` en moins d'1 h → 429 ; 6e tentative `reset-password` en moins de 15 min → 429
- E2E web (Playwright) : parcours complet `/forgot-password` → email reçu (lecture inbox de test) → `/reset-password` → `/login` avec nouveau mdp
- Sécurité : timing-attack — mesurer que la latence de `forgot-password` est ~constante entre email connu et email inconnu (tolérance < 50 ms)
- Sécurité : vérifier qu'aucun message ne distingue OTP invalide vs OTP expiré vs email inconnu
