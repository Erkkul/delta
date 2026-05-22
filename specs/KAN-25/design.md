# Conception technique — KAN-25 Onboarding & zone

## Vue d'ensemble

On introduit un profil acheteur minimal dans une table `buyer_profiles`
(miroir du pattern `producers` de KAN-16) : une ligne par compte ayant le
rôle acheteur, créée à la première soumission de zone. Le mouvement principal
est côté `apps/web` (étape 1 du wizard AC-02 + section paramètres AC-11) +
`packages/db` (repo upsert) + une migration Supabase posant la table, son
`geography(Point)` indexé GIST et la RLS self-owned. Le composant
`address-autocomplete.tsx` (KAN-17) est promu de `producer/` vers `forms/`
pour être partagé entre producteur, acheteur et (plus tard) rameneur.

## Packages touchés

- [x] `packages/contracts` — `BuyerProfileInput` (nom, adresse label, ville, CP, lat, lng)
- [x] `packages/core` — validation/normalisation zone, règle « zone obligatoire pour matching »
- [x] `packages/db` — repo `buyerProfilesRepo.{ findByUserId, upsert }`, helper PostGIS (`ST_SetSRID(ST_MakePoint(lng,lat),4326)`)
- [x] `apps/web` — étape 1 wizard `/onboarding/acheteur` + section zone dans paramètres (AC-11) + route handler(s) `app/api/v1/me/buyer-profile`
- [ ] `apps/mobile` — différé (non scaffoldé)
- [ ] `packages/jobs` — non applicable
- [x] `supabase/migrations` — table `buyer_profiles` + index GIST
- [x] `supabase/policies` — RLS `buyer_profiles` (self-owned)
- [x] `packages/ui-web` — promotion `AddressAutocomplete` vers composant partagé (`forms/`) + éventuel `BuyerZoneForm`

## Modèle de données

Référence : ARCHITECTURE.md §5 et §7.

Table `public.buyer_profiles` :

- `user_id` (uuid, PK, FK → `public.users.id` ON DELETE CASCADE) — UNIQUE de fait (PK)
- `display_name` (text) — nom d'affichage (cf. hypothèse nom à valider)
- `address_label` (text) — label complet retourné par Adresse Gouv.fr
- `city` (text), `postcode` (text)
- `location` (`geography(Point, 4326)`, null tant que zone non saisie) — alimente le matching §7.2
- `created_at`, `updated_at` (timestamptz, défaut `now()`)
- `deleted_at` (timestamptz, null) — soft delete RGPD

Index : `GIST (location)` pour `ST_DWithin` (ARCHITECTURE §5 « Index GIST sur géo »,
§7.2). Trigger `set_updated_at` (helper `init.sql`).

RLS forcée (miroir `users`/`producers`) :
- SELECT/INSERT/UPDATE : `auth.uid() = user_id`
- DELETE : refusé côté client (soft delete via job RGPD)

## API / Endpoints

Référence : ARCHITECTURE.md §3.

| Endpoint | Input (Zod) | Output | Codes |
|---|---|---|---|
| `GET /api/v1/me/buyer-profile` | — | `{ profile \| null }` | 200 / 401 |
| `PUT /api/v1/me/buyer-profile` | `BuyerProfileInput { displayName, addressLabel, city, postcode, latitude, longitude }` | `{ profile }` | 200 / 400 / 401 |

Upsert unique (PUT) couvre KAN-81 (création onboarding) et KAN-82 (édition
paramètres). Coordonnées fournies par la suggestion Adresse Gouv.fr retenue.

## Impact state machine / events

Référence : ARCHITECTURE.md §6 et §8.

Aucun. La zone alimente le matching (§7) en lecture seule ; pas de transition mission.

## Dépendances

Référence : ARCHITECTURE.md §2. Provisionnement : `tech/setup.md`.

- API Adresse Gouv.fr — `tech/setup.md` § APIs externes › API Adresse Gouv.fr
  (statut « Fait », publique sans clé). Déjà consommée par `address-autocomplete.tsx`.
- Supabase Postgres + PostGIS — `tech/setup.md` § Backend / Données (PostGIS déjà activé, premier usage KAN-17).
- Aucun job Inngest.

## État UI

Référence : DESIGN.md + maquettes AC-02 / AC-11.

- **AC-02 étape 1** : stepper 1/3, H1 Lora « Où vivez-vous ? », sous-titre,
  carte blanche avec label « Adresse de livraison » + `AddressAutocomplete`,
  suggestions Adresse Gouv.fr, help-text confidentialité, CTA « Continuer »,
  lien « Passer ». (+ champ nom à confirmer.)
- **AC-11** : section « Adresses de livraison » — KAN-25 n'affiche/édite que la
  zone principale (création/modif). Multi-adresses hors US.
- Responsive mobile + desktop obligatoire (DESIGN.md).

## Risques techniques

Références : ARCHITECTURE.md §9, §11, §13.

- **Précision géocodage** : Adresse Gouv.fr renvoie un point ; suffisant pour le
  buffer 10 km du matching. Pas de validation d'existence stricte côté serveur.
- **Zone facultative au signup (« Passer »)** : un acheteur sans zone n'apparaît
  dans aucun matching. Acceptable ; à signaler en UI plus tard.
- **Confidentialité** : `location` est une donnée personnelle (RGPD) ; révélée au
  rameneur seulement après confirmation mission (logique métier en aval, hors US).
- **Free-tier** : pas d'appel serveur à Adresse Gouv.fr (autocomplete client) →
  pas de quota consommé côté backend.

## Tests envisagés

Référence : ARCHITECTURE.md §10.

- Unitaire `packages/contracts` : `BuyerProfileInput` (lat/lng bornés, champs requis).
- Unitaire `packages/core` : normalisation zone, règle zone obligatoire matching.
- Intégration `packages/db` : upsert `buyer_profiles` + RLS self (Supabase local), `ST_DWithin` sur point.
- E2E web (Playwright) : onboarding → saisie zone via autocomplete → persistance ; édition zone depuis paramètres.
