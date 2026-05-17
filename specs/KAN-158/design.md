# Conception technique — KAN-158 Polish UX onboarding producteur — état Stripe restricted

## Vue d'ensemble

Trois changements coordonnés, sans nouvelle migration ni nouvel endpoint :

1. **Core** : externalisation de la table de mapping i18n des requirements Stripe dans `packages/core/src/producer/stripe-requirements-i18n.ts`. Helper `translateRequirements(keys: string[])` qui retourne `Array<{ key, label_fr, fallback: boolean }>`. Refacto du use case `requestStripeOnboardingLink` pour dispatcher internement entre Account Link `account_onboarding` (si compte Stripe absent) ou `account_update` (si compte présent mais `payouts_enabled = false`). Signature publique inchangée côté endpoint pour éviter de toucher la couche HTTP.

2. **UI** : nouveau composant `StripeAccountStatusCard` qui prend en input `{ status, payouts_enabled, requirements }` et rend visuellement adapté :
   - `not_created` → card initiale « Configurer Stripe Connect » (existing `StripeOnboardingCard` réutilisé)
   - `pending` (en cours d'onboarding initial, requirements vides) → état d'attente neutre
   - `restricted` (details_submitted=true, requirements non vides) → card « Stripe vérifie votre compte » avec listing requirements traduits + CTA violet « Compléter mes informations »
   - `restricted` (details_submitted=true, requirements vides) → message d'attente « Stripe valide votre compte sous 24h »
   - `active` → DonePanel (déjà existant)
   - `disabled` → bandeau rouge « Compte désactivé » + CTA contact support (lien `mailto:` au MVP)

3. **Page** : `ProducerOnboardingClient` simplifié — la logique `phase: WizardPhase` est remplacée par un dispatch direct sur l'état producer. Pas de state local de phase quand on est sur l'étape Stripe.

## Packages touchés

- [ ] `packages/contracts` — pas de nouveau schema Zod (le payload de l'endpoint reste identique)
- [x] `packages/core` — `stripe-requirements-i18n.ts` (table + helper) + refacto `request-stripe-link.ts` (dispatch onboarding/update)
- [ ] `packages/db` — pas de changement (la table `producers` couvre déjà tous les besoins)
- [x] `apps/web` — extension `apps/web/lib/stripe/client.ts` : `getStripeConnectAdapter` étendu avec une méthode `createAccountUpdateLink(accountId)`. Refacto `producteur-client.tsx`. Pas de nouvel endpoint.
- [ ] `apps/mobile` — différé
- [ ] `packages/jobs` — pas de changement
- [ ] `supabase/migrations` — aucune migration
- [ ] `supabase/policies` — aucun changement
- [x] `packages/ui-web` — nouveau `StripeAccountStatusCard` (cohabite avec `StripeOnboardingCard` existant ou le subsume — à arbitrer à l'implémentation)

## Modèle de données

Aucun changement. Les colonnes `stripe_status`, `payouts_enabled`, `charges_enabled`, `requirements_currently_due` (KAN-16) couvrent déjà tous les besoins.

## API / Endpoints

`POST /api/v1/producer/onboarding/stripe-link` (existant) devient **polymorphe** selon l'état :

| État producer | Comportement |
|---|---|
| `stripe_account_id IS NULL` | Crée le compte + Account Link `account_onboarding` (= KAN-16 inchangé) |
| `stripe_account_id IS NOT NULL` ET `payouts_enabled = false` | Account Link `account_update` sur le compte existant, `collection_options.fields = 'currently_due'` |
| `payouts_enabled = true` | 409 `StripeAccountAlreadyEnabledError` (= KAN-16 inchangé) |

Output `{ url, expires_at }` inchangé. Codes HTTP inchangés. Rate-limit inchangé (10 / 15 min côté `producer:stripe-link:<userId>` — déjà permissif pour le re-clic après expiration Account Link).

## Impact state machine / events

Aucun impact mission. Pas de nouveau event Inngest. Pas de nouveau handler webhook Stripe. Le webhook `account.updated` continue à pousser les updates dans la même row (cf. KAN-16) — c'est cette synchronisation qui fait passer la card de `restricted` → `active` une fois Stripe validé.

## Dépendances

Référence : ARCHITECTURE.md §2. État du provisionnement : `tech/setup.md`.

- **Stripe Connect Express** — voir `tech/setup.md` § Stripe Connect Express. Statut *Partiel* mais le câblage code requis (Account Links) est déjà fait par KAN-16. Pas de nouveau provisionnement.
- **Supabase Auth + DB** — *Fait*. Pas de changement.
- Aucune nouvelle dépendance externe.

## État UI

Référence : DESIGN.md ; maquette `design/maquettes/producteur/pr-02-onboarding-stripe.html`.

- **Card "Stripe vérifie votre compte" — état `restricted` avec requirements** : header (icône Stripe violet + titre « Stripe vérifie votre compte » + sous-titre « Quelques informations à compléter »), bandeau orange clair listant à puces les requirements traduits (ex : « Pièce d'identité du représentant », « Adresse personnelle », « IBAN »), CTA violet « Compléter mes informations » → ouvre Account Link `account_update`, mention « Redirection sécurisée vers Stripe »
- **Card "En attente Stripe" — `restricted` avec requirements vides** : header rassurant gris-vert (« Validation en cours »), message « Stripe finalise la vérification — généralement sous 24h », pas de CTA principal, lien « Aller à mon espace »
- **Card "Compte désactivé" — `stripe_status = disabled`** : bandeau rouge, message « Votre compte Stripe a été désactivé. Contactez le support pour comprendre et résoudre. », bouton secondaire `mailto:support@delta.fr` (au MVP, à remplacer par un vrai canal post-Resend)
- **États génériques** : loading sur CTA, erreurs réseau (toast neutre), erreur Stripe upstream (toast + retry CTA)
- **Responsive** : reprend la grid existante du wizard (mobile pleine largeur, desktop confiné au panneau de droite à 640px max-width)

**Conflit maquette ↔ besoin** : la maquette Figma `pr-02-onboarding-stripe.html` ne couvre que l'état initial (KAN-16). Trois nouvelles cards à concevoir « à la main » sur la base de l'existant. À acter dans `specs/KAN-158/notes.md` si Figma doit être mis à jour côté design system.

## Risques techniques

- **Drift entre table i18n et requirements Stripe** : Stripe peut ajouter de nouveaux noms de requirements (rare mais possible — typiquement quand ils ajoutent un pays). Fallback déjà prévu : afficher le nom anglais brut + log warn côté serveur, pour qu'on l'ajoute au fil de l'eau dans la table. Pas de crash.
- **Account Link `account_update` — paramètre `collection_options`** : Stripe v2024 demande explicitement `collection_options.fields = 'currently_due'` pour limiter l'écran hosted aux champs en attente (sans ça, l'utilisateur peut revoir tout l'onboarding). À tester en isolé.
- **Race avec le webhook** : si `account.updated` arrive entre le SELECT initial du Server Component et le rendu, l'utilisateur peut voir un état slightly outdated. Acceptable au MVP (l'utilisateur refresh) — à upgrader si on introduit Realtime plus tard.
- **Tests E2E** : difficile de simuler `restricted` en Playwright sans seed DB. Plan : tests unitaires sur le mapping i18n + tests d'intégration core avec adapter mockée dans plusieurs états + tests Playwright sur le mode `restricted` via seed DB (script SQL en `apps/web/e2e/fixtures/`).
- **Couverture i18n initiale** : couvrir au moins les ~15 keys déjà observées en test pré-KAN-158 : `individual.address.city`, `individual.address.line1`, `individual.address.postal_code`, `individual.dob.day/month/year`, `individual.first_name`, `individual.last_name`, `individual.id_number`, `individual.verification.document`, `external_account`, `tos_acceptance.date`, `tos_acceptance.ip`, `business_type`, `business_profile.url`. Évolutif.

## Tests envisagés

Référence : ARCHITECTURE.md §10.

- Unitaire `packages/core/src/producer/stripe-requirements-i18n.test.ts` : mapping de ~15 keys connus + fallback sur requirement inconnu (retourne le nom brut, ne crash pas, log expected)
- Unitaire `packages/core/src/producer/request-stripe-link.test.ts` (existing, étendu) : nouvelles branches « update link quand compte existe ». Mocks Stripe via l'adapter.
- Unitaire `packages/ui-web/src/stripe-account-status-card.test.tsx` (optionnel — typiquement on saute les tests RTL au MVP, mais utile ici pour valider les 4 états)
- Intégration : test SQL seed + Playwright sur un compte en `restricted` artificiel → vérifie que la nouvelle card s'affiche, que le clic CTA appelle bien l'endpoint, que la redirect URL est de type `account_update`
- Test manuel en preview Vercel : reprendre le compte créé pendant le smoke test KAN-16 (en `restricted`) et valider le nouveau flow visuellement
