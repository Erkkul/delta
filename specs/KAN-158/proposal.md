# Cadrage — KAN-158 Polish UX onboarding producteur — état Stripe restricted

## Liens

- Jira : https://erkulaws.atlassian.net/browse/KAN-158
- Epic : KAN-4 Profil Producteur
- Parent fonctionnel : KAN-16 (Onboarding Stripe Connect) — livré sur `main` (PR #10), cadrage `specs/KAN-16/`
- Maquette : `design/maquettes/producteur/pr-02-onboarding-stripe.html` *(pas de variante dédiée à l'état restricted dans le bundle Figma — à concevoir au fil de l'implémentation en cohérence avec l'existant ; à acter dans `notes.md` si conflit ou export Figma nécessaire)*
- PRD : §10.2 PR-02 Onboarding Stripe Connect
- ARCHITECTURE : §3 (monorepo), §8 (Stripe Connect — Account Links), §10 (tests), §14 (playbook)

## Pourquoi (côté tech)

Le smoke test de KAN-16 (2026-05-17, prod) a révélé une friction UX : quand Stripe Connect Express reste en `restricted` (KYC incomplet, ex. document d'identité du représentant manquant), notre wizard re-propose l'étape « Configurer Stripe Connect » alors que tout est déjà fait côté flow Delta. L'utilisateur ne comprend pas où il en est, ne sait pas quoi compléter, et risque d'abandonner. Cette feature ferme ce gap en différenciant les états Stripe métier (`pending` / `restricted` / `disabled` / `active`) et en proposant la bonne action selon le cas, plutôt qu'une seule card statique « Configurer Stripe Connect ».

## Périmètre technique

**In scope :**

- Nouveau composant `StripeAccountStatusCard` (gère 4 états : initial / vérification-en-cours / restricted / disabled) dans `packages/ui-web/`
- Table de mapping français des `requirements_currently_due` Stripe dans `packages/core/src/producer/stripe-requirements-i18n.ts` (couverture des ~15 keys observées en test + fallback gracieux pour les inconnues)
- Refactor de l'endpoint `POST /api/v1/producer/onboarding/stripe-link` pour générer un Account Link de type `account_update` (au lieu d'`account_onboarding`) quand `producers.stripe_account_id IS NOT NULL` — endpoint inchangé côté URL, comportement polymorphe selon l'état
- Mise à jour de `ProducerOnboardingClient` (`producteur-client.tsx`) pour brancher la nouvelle card selon le tuple (`stripe_status`, `payouts_enabled`, `requirements_currently_due`)
- Différenciation visuelle : banner / couleur par statut (info bleue pour `pending`, orange pour `restricted` action-requise, gris pour attente passive, rouge pour `disabled`)

**Out of scope (cette US) :**

- Realtime / polling pour rafraîchir l'état sans reload — différé tant qu'on n'a pas Sentry pour mesurer la friction réelle, et tant qu'on n'a pas besoin de ce pattern ailleurs
- Email / push de notif quand `payouts_enabled` passe à true — couplé à KAN-54 (push) / KAN-55 (in-app)
- Mobile (`apps/mobile` non scaffolded)
- Onboarding rameneur (KAN-37) — utilisera ces briques (i18n + card) mais flow distinct

## Hypothèses

- Les noms de requirements Stripe (`individual.address.city`, `business_profile.url`, etc.) sont stables côté API. Si Stripe en introduit de nouveaux non couverts par la table i18n, fallback gracieux : afficher le nom anglais brut sans crasher, et logger un warn côté serveur pour qu'on ajoute le mapping FR au fil de l'eau
- Account Link `account_update` accepte les mêmes `return_url` / `refresh_url` que `account_onboarding` (vérifié côté doc Stripe : https://docs.stripe.com/api/account_links/create)
- L'utilisateur peut re-cliquer plusieurs fois sur le CTA « Compléter mes informations » sans bug — chaque appel régénère un Account Link frais (les liens expirent en ≤ 5 min comme l'onboarding initial)
- La maquette Figma sera enrichie *a posteriori* si nécessaire, pas un blocker pour cette US (on conçoit visuellement à la main en restant strict sur DESIGN.md)
