# Cadrage — KAN-2 Création de compte

## Liens

- Jira : https://erkulaws.atlassian.net/browse/KAN-2
- Epic : KAN-1 Authentication
- Maquette :
  - `design/maquettes/producteur/pr-01-authentication.html`
  - `design/maquettes/acheteur/ac-01-authentication.html`
  - `design/maquettes/rameneur/rm-01-authentication.html`
- PRD : §10.5 (TR-01 Auth & gestion compte) ; §10.2 PR-01, §10.3 AC-01, §10.4 RM-01 (entrées par parcours)
- ARCHITECTURE : §2 (Supabase Auth + Google/Apple), §5 (DB users + RLS), §9 (Sécurité & conformité), §10 (Tests), §14 (playbook)

## Pourquoi (côté tech)

KAN-2 ouvre l'entonnoir : sans création de compte, aucun parcours (producteur, acheteur, rameneur) ne démarre. La feature pose les fondations DB (table `users`), les policies RLS de base, et l'intégration Supabase Auth + providers sociaux (Google, Apple).

## Périmètre technique

Le flow de création de compte couvre **4 écrans** (cohérent avec la maquette `*-01-authentication.html`) :

| ID | Écran | Route | Cadrage |
|----|-------|-------|---------|
| AU-01 | Splash | `/welcome` | Hero + CTAs « Créer un compte » / « J'ai déjà un compte » |
| AU-02 | Signup | `/signup` | Email + password + Google. **Pas de rôle ici.** |
| AU-04 | Verify email | `/auth/verify-email` | OTP 6 chiffres |
| AU-06 | Choix rôle | `/onboarding/role` | Multi-select rameneur / producteur / acheteur |

**In scope :**

- Splash screen `/welcome` (AU-01)
- Création de compte par email + mot de passe via Supabase Auth (AU-02)
- Social login Google (Apple différé — Apple Developer pas encore enrôlé, cf. `tech/setup.md`)
- Vérification email obligatoire par OTP 6 chiffres (AU-04) — décision 2026-05-13
- Sélection multi-rôle post-vérif email (AU-06) — décision 2026-05-13
- Persistance d'un user dans la table `users` avec `roles user_role[]` (vide à la création, peuplé au passage AU-06)
- Consents CGU/RGPD implicites tracés en DB (`users.metadata.consents`) — décision 2026-05-13
- Policies RLS de base sur `users` (un user ne lit/modifie que sa ligne)
- Validation côté serveur des inputs (Zod via `packages/contracts`)

**Out of scope (cette US) :**

- Apple Sign In (différé — Apple Developer Program pas enrôlé)
- Connexion (KAN-3)
- Reset / récupération mot de passe (KAN-157)
- Onboarding spécifique par rôle (KAN-25 acheteur, KAN-37 rameneur, KAN-16 producteur — écrans AU-07/08/09 du flow)
- Vérification SIRET producteur (asynchrone, post-création — KAN-17 / KAN-16)
- Profil utilisateur étendu (nom, photo, etc.)
- Suppression compte RGPD (ticket dédié)

## Hypothèses

- Supabase Auth gère l'OAuth Google sans intégration tierce additionnelle
- L'utilisateur peut cumuler 1 à 3 rôles au signup et les modifier ultérieurement via son profil (décision 2026-05-13 multi-rôle)
- Producteur peut s'inscrire sans SIRET valide ; SIRET vérifié de façon asynchrone (décision 2026-05-03)
- Vérification email obligatoire au MVP (décision 2026-05-13). Provider mail = sender Supabase par défaut tant que Resend + domaine custom ne sont pas en place
