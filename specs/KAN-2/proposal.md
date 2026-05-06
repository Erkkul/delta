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

**In scope :**

- Création de compte par email + mot de passe (Supabase Auth)
- Social login Google + Apple (décision MVP CLAUDE.md)
- Choix du rôle initial à l'inscription (acheteur, rameneur, producteur) — cohérent avec le modèle multi-rôles progressif
- Persistance d'un user dans la table `users` avec rôle initial et metadata
- Policies RLS de base sur `users` (un user ne lit/modifie que sa ligne)
- Validation côté serveur des inputs (Zod via `packages/contracts`)

**Out of scope (cette US) :**

- Connexion (KAN-3)
- Reset / récupération mot de passe (US séparée)
- Onboarding spécifique par rôle (KAN-25 acheteur, KAN-37 rameneur, KAN-16 producteur)
- Vérification SIRET producteur (asynchrone, post-création — KAN-17 / KAN-16)
- Multi-rôles évolutif (escalade de rôle ultérieurement)
- Profil utilisateur étendu (nom, photo, etc.)

## Hypothèses

- Supabase Auth gère l'OAuth Google/Apple sans intégration tierce additionnelle
- Le rôle initial est immutable au signup (changement de rôle = autre flow)
- Producteur peut s'inscrire sans SIRET valide ; SIRET vérifié de façon asynchrone (décision CLAUDE.md)
- Pas de double opt-in mail au MVP (sauf contrainte légale identifiée)
