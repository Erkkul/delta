# Cadrage — KAN-157 Récupération de mot de passe

## Liens

- Jira : https://erkulaws.atlassian.net/browse/KAN-157
- Epic : KAN-1 Authentication
- Maquette :
  - `design/maquettes/producteur/pr-01-authentication.html` *(écrans reset à compléter — voir notes.md)*
  - `design/maquettes/acheteur/ac-01-authentication.html`
  - `design/maquettes/rameneur/rm-01-authentication.html`
- PRD : §10.5 (TR-01 Auth & gestion compte) ; §10.2 PR-01, §10.3 AC-01, §10.4 RM-01 (entrées par parcours)
- ARCHITECTURE : §2 (Supabase Auth), §3 (Route Handlers), §9.1/9.4 (sécurité auth + rate-limit), §10 (tests), §14 (playbook)

## Pourquoi (côté tech)

Troisième et dernière feature du parcours auth (KAN-2 signup, KAN-3 connexion, KAN-157 récupération). Permet à un user qui a oublié son mot de passe de regagner l'accès à son compte sans assistance manuelle. Réutilise les briques déjà livrées : `OtpForm`, helper `rateLimit` Upstash, erreurs typées (`InvalidCredentialsError`, `RateLimitedError`), patron d'endpoint anti-énumération.

## Périmètre technique

**In scope :**

- Écran AU-FP1 « Mot de passe oublié ? » — saisie email (accessible depuis le `LoginForm` KAN-3, lien actuellement inactif)
- Écran AU-FP2 « Vérifiez votre email » — confirmation neutre (anti-énumération), même UX qu'AU-04 (réutilisation `OtpForm`)
- Écran AU-FP3 « Nouveau mot de passe » — saisie OTP 6 chiffres + nouveau mdp + confirmation + strength hint
- Endpoint `POST /api/v1/auth/forgot-password` (rate-limité, toujours 204)
- Endpoint `POST /api/v1/auth/reset-password` (verify OTP + updateUser password)
- Politique de mot de passe identique à KAN-2 (10 car + maj/min/digit), via `passwordPolicy` partagée
- Invalidation des autres sessions après reset (config Supabase `secure password change ON`, déjà en place)
- Rate-limit dédié : 3 demandes / heure / email côté `forgot-password`, 5 essais OTP / 15 min côté `reset-password`

**Out of scope (cette US) :**

- Mobile (`apps/mobile` non scaffolded — différé global)
- Magic link / deep link (on retient l'OTP 6 chiffres pour cohérence avec AU-04 et éviter la complexité deep-link mobile)
- Branding email custom via Resend (Resend reste *À faire* dans `tech/setup.md` § Communication — sender Supabase par défaut suffit au MVP)
- Reset de mdp depuis utilisateur connecté (« changer mon mot de passe ») — flow différent, à cadrer dans un futur ticket profil/paramètres si besoin
- 2FA / re-authentification post-MVP

## Hypothèses

- Le flow OTP de recovery Supabase (`type: 'recovery'`) est équivalent au flow OTP signup déjà en place — mêmes endpoints GoTrue
- Le sender Supabase par défaut `noreply@mail.app.supabase.io` est acceptable au MVP (deliverability acceptable hors prod publique ; bascule Resend au pré-lancement)
- L'utilisateur reçoit un seul email contenant le code 6 chiffres (pas de double-flow magic link + OTP)
- Pas besoin d'événement métier dédié — l'audit Supabase Auth (`auth.audit_log_entries`) suffit
- Les écrans manquants dans la maquette Figma seront comblés par réutilisation visuelle d'AU-02/AU-04 (cf. `notes.md`)
