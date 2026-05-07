# Cadrage — KAN-3 Connexion

## Liens

- Jira : https://erkulaws.atlassian.net/browse/KAN-3
- Epic : KAN-1 Authentication
- Maquette :
  - `design/maquettes/producteur/pr-01-authentication.html`
  - `design/maquettes/acheteur/ac-01-authentication.html`
  - `design/maquettes/rameneur/rm-01-authentication.html`
- PRD : §10.5 (TR-01 Auth & gestion compte) ; §10.2 PR-01, §10.3 AC-01, §10.4 RM-01 (entrées par parcours)
- ARCHITECTURE : §2 (Supabase Auth + Google/Apple), §9 (Sécurité & conformité), §10 (Tests), §14 (playbook)

## Pourquoi (côté tech)

KAN-3 est le pendant "retour" de KAN-2 : permet à un user existant d'ouvrir une session. Réutilise la table `users` créée par KAN-2 et les providers Supabase Auth déjà configurés. Ajoute le rate-limiting via Upstash pour se protéger du brute-force.

## Périmètre technique

**In scope :**

- Connexion par email + mot de passe (Supabase Auth `signInWithPassword`)
- OAuth login Google + Apple (SDK Supabase Auth côté client, idem KAN-2)
- Endpoint `/api/v1/auth/login` (rate-limité)
- Endpoint `/api/v1/auth/logout` (révocation session côté serveur)
- Rate-limiting via Upstash Redis (anti brute-force, 5 essais / 15 min par email)
- Erreurs génériques côté UI (ne pas leaker l'existence d'un user)
- Validation côté serveur (Zod via `packages/contracts`)

**Out of scope (cette US) :**

- Inscription (KAN-2)
- Mot de passe oublié / reset (KAN-157 Récupération de mot de passe)
- 2FA (post-MVP)
- Re-authentification pour actions sensibles (US séparée si besoin)
- Magic link / OTP email (post-MVP)
- Récupération de session côté client (géré par SDK Supabase, pas une feature à coder)

## Hypothèses

- Supabase Auth gère les tokens (access + refresh) sans logique custom
- La durée de session par défaut Supabase suffit au MVP (à ajuster en config si besoin)
- Pas de "Remember me" custom — comportement par défaut Supabase
- Le rate-limit s'applique par email cible (pas par IP) pour limiter le credential stuffing ; complément IP-level possible plus tard
