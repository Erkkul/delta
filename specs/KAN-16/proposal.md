# Cadrage — KAN-16 Onboarding Stripe Connect

## Liens

- Jira : https://erkulaws.atlassian.net/browse/KAN-16
- Epic : KAN-4 Profil Producteur
- Maquette : `design/maquettes/producteur/pr-02-onboarding-stripe.html` *(couvre les 3 étapes du wizard ; étape 1 « Profil ferme » est portée par KAN-17, hors scope ici)*
- PRD : §10.2 PR-02 Onboarding Stripe Connect
- ARCHITECTURE : §3 (monorepo), §5 (DB — table `producers`, statuts SIRET/Stripe), §8 (Stripe Connect Express, Account Links, webhook `account.updated`), §9.3 (SIRET non exposé tant que non vérifié), §10 (tests), §14 (playbook)

## Pourquoi (côté tech)

Premier contact post-auth pour un user qui sélectionne le rôle « producteur » à l'écran AU-06. Délivre les deux pré-requis pour qu'un producteur puisse vendre sur Delta : (a) **vérification SIRET** (gating de la visibilité catalogue côté acheteur, asynchrone) et (b) **compte Stripe Connect Express** (KYC light + IBAN, condition pour recevoir les 85 % de chaque mission). KAN-16 livre la coquille du wizard, l'écran SIRET et l'écran/redirection Stripe Connect, plus le webhook `account.updated` qui consomme le statut KYC retourné par Stripe. C'est aussi le **premier consommateur Inngest** et le **premier handler webhook Stripe** du repo — il pose le squelette réutilisé ensuite par les cycles paiement (KAN-33/34) et le matching (KAN-42).

## Périmètre technique

**In scope :**

- Page wizard `/onboarding/producer` (orchestration des 3 étapes, persistance progression côté `producers`)
- Écran « Vérification SIRET » (étape 2) : saisie SIRET 14 chiffres + raison sociale + forme juridique + NAF, persisté avec `siret_status = pending`
- Vérification SIRET asynchrone via API Sirene INSEE — job Inngest qui passe le statut à `verified` ou `rejected` (cohérence dénomination)
- Écran « Stripe Connect » (étape 3) : création compte Stripe Connect Express + génération Account Link (hosted onboarding) + redirection
- Endpoint `POST /api/v1/producer/onboarding/siret`
- Endpoint `POST /api/v1/producer/onboarding/stripe-link` (idempotent)
- Pages de retour Stripe : `/onboarding/producer/stripe/return` et `/.../stripe/refresh`
- Webhook `account.updated` (endpoint Connect déjà câblé côté Stripe — `tech/setup.md`) → mise à jour `producers.stripe_status / payouts_enabled / charges_enabled / requirements`
- Persistance des deux statuts (`siret_status`, `stripe_status`) sur `producers` avec RLS user-owned
- Gating produit : un produit `published` reste invisible côté catalogue acheteur tant que `siret_status != 'verified'` OU `payouts_enabled = false` (cf. décision produit 2026-05-03), exprimé par RLS sur `products`
- Atterrissage PR-03 (Dashboard) une fois les deux activations OK

**Out of scope (cette US) :**

- Étape 1 du wizard « Profil de la ferme » → KAN-17
- Modification SIRET ou re-onboarding Stripe post-validation → ticket profil/paramètres ultérieur
- Mobile (`apps/mobile` non scaffolded — différé global)
- Onboarding rameneur Stripe Connect / Stripe Identity → KAN-37
- Branding hosted pages Stripe → optionnel, post-logo (cf. `tech/setup.md`)
- Capture / transferts (libération 85/10/5) → KAN-33 / KAN-34
- Notifications email producteur sur statut KYC → KAN-54 / KAN-55 ; au MVP la page reflète l'état via Realtime sur `producers`

## Hypothèses

- L'API publique Sirene INSEE (`https://api.insee.fr/entreprises/sirene/V3`) reste utilisable au MVP avec un compte gratuit (token bearer + 30 req/min). À ajouter à `tech/setup.md` § Externe.
- Stripe Connect Express en mode test est suffisant tant que le live mode n'est pas activé (cf. `tech/setup.md` § Stripe Connect Express, *À faire* live mode au pré-lancement).
- Le webhook Connect (`account.updated`) est déjà reçu sur `/api/v1/webhooks/stripe` côté Stripe (configuré le 2026-05-14) — reste à câbler côté code.
- La table `producers` n'existe pas encore en DB — la migration est portée par cette US.
- Le gating « catalogue invisible tant que SIRET non vérifié » est exprimé en RLS sur `products` (defense in depth) plutôt que filtrage applicatif.
- L'email de notif validation SIRET n'est pas implémenté ici — `/onboarding/producer` reflète l'état en temps réel via Realtime sur la row `producers`.
