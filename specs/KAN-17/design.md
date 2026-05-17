# Conception technique — KAN-17 Informations profil & ferme

## Vue d'ensemble

Extension verticale de la table `producers` (créée par KAN-16) avec les champs publics (identité, photos, adresse, créneaux) et un volet exploitation (`paused`). Un seul endpoint `PATCH /api/v1/producer/profile` orchestre l'édition partielle, validé par Zod. Les uploads de photos passent par un endpoint signé qui pousse vers le bucket Storage `producer-photos`. Le formulaire est un composant unique (`<ProducerProfileForm />`) consommé à la fois par l'étape 1 du wizard `/onboarding/producer` et par la page autonome `/producer/profile`.

La sensibilité de l'adresse exacte (révélée seulement aux rameneurs en mission validée) est exprimée par une **RLS row-level + colonne masquée par une vue applicative** plutôt que par une RLS colonne (Postgres ne supporte pas le column-level RLS directement). Concrètement : la colonne `pickup_address` (texte exact) est lisible uniquement par le owner et le service_role ; les rameneurs y accèdent via une `SECURITY DEFINER` function `reveal_pickup_address(producer_id)` qui vérifie l'existence d'une mission en cours sur ce producteur pour le caller. Les acheteurs ne voient que `pickup_public_zone`.

## Packages touchés

- [x] `packages/contracts` — schémas Zod (`producerProfileSchema`, `pickupAddressSchema`, `farmPhotosSchema`)
- [x] `packages/core` — règles métier (validation labels enum, vérification taille photos, normalisation horaires)
- [x] `packages/db` — repo `producers` (ajout `findById`, `updateProfile`, `setPaused`), helper RPC `revealPickupAddress`
- [x] `apps/web` — page `/producer/profile`, intégration dans `/onboarding/producer` step 1, route handlers `app/api/v1/producer/profile/route.ts` + `app/api/v1/producer/photos/route.ts`
- [ ] `apps/mobile` — hors scope
- [ ] `packages/jobs` — aucun job nécessaire
- [x] `supabase/migrations` — extension colonnes `producers` + bucket `producer-photos` + RPC `reveal_pickup_address`
- [x] `supabase/policies` — RLS sur nouvelles colonnes (toujours via row-level), policy bucket Storage
- [ ] `packages/ui-web` — composant `<ProducerProfileForm />` placé directement dans `apps/web/components/producer/` au MVP (pas de réutilisation cross-app prévue)

## Modèle de données

Ajout sur la table `producers` (un seul commit de migration). Tous les champs nullable au début, remplis progressivement par le wizard puis l'édition libre.

| Colonne | Type | Note |
|---|---|---|
| `display_name` | `text` | Nom commercial (≤ 80 caractères, requis pour publication produits) |
| `public_description` | `text` | Description publique (≤ 500 caractères) |
| `profile_photo_url` | `text` | URL Supabase Storage du logo (bucket `producer-photos`) |
| `farm_photos` | `jsonb` | Array ordonné de `{ url, alt? }`, max 3 entries (CHECK en DB) |
| `labels` | `producer_label[]` | ENUM array — voir ci-dessous |
| `pickup_public_zone` | `text` | Libellé commune + département (ex « Bocage normand · Évreux (27) ») |
| `pickup_address` | `text` | Adresse exacte (sensible, RLS-protégée) |
| `pickup_location` | `geography(Point, 4326)` | Coordonnées issues de l'API Adresse, GIST pour future utilisation matching |
| `pickup_days` | `weekday[]` | ENUM array (mon, tue, …, sun) |
| `pickup_hours_start` | `time` | Heure d'ouverture créneau |
| `pickup_hours_end` | `time` | Heure de fermeture créneau (CHECK `end > start`) |
| `paused` | `boolean NOT NULL DEFAULT false` | Boutique en pause, gating produits |
| `paused_at` | `timestamptz` | Set quand `paused` passe à `true`, null sinon |

Nouveaux ENUM :

- `producer_label` : `'bio_ab' | 'demeter' | 'nature_et_progres' | 'hve_3' | 'producteur_fermier'`
- `weekday` : `'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun'`

RLS sur `producers` (mise à jour) :
- `select` : owner (déjà en place via KAN-16) + lecture publique restreinte aux colonnes non-sensibles via vue/policy ; *à finaliser*, voir RPC ci-dessous.
- `update` : owner uniquement sur ses propres colonnes ; `pickup_location` recalculée serveur, jamais en input client.

RPC `reveal_pickup_address(producer_id uuid) returns text` :
- SECURITY DEFINER, search_path = public
- Retourne `pickup_address` si :
  - `auth.uid()` est owner du producteur, OU
  - il existe une mission `confirmed | picked_up` ou `delivered` rattachée à `producer_id` dont le `trip` appartient à `auth.uid()` (rameneur)
- Sinon : null.

Storage : bucket `producer-photos`, public, 5 MB, MIME `image/jpeg|image/png|image/webp`. Policy d'upload restreinte à `auth.uid() = path[0]` (chemin convention `{producer_user_id}/logo.<ext>` et `{producer_user_id}/farm-<n>.<ext>`).

Référence : ARCHITECTURE.md §5.

## API / Endpoints

Versionnés `/api/v1/`, validés par Zod, handlers de 15-30 lignes max (cf. ARCHITECTURE.md §3, §14.2).

- `GET /api/v1/producer/profile` → renvoie le profil du producteur connecté, **incluant** `pickup_address` (owner).
- `PATCH /api/v1/producer/profile` → patch partiel. Input Zod `producerProfileUpdateSchema` (tous les champs optionnels, contraintes alignées sur la DB). Recalcule `pickup_location` serveur si `pickup_address` change (appel API Adresse).
- `POST /api/v1/producer/photos` → upload signé. Input `{ kind: 'logo' | 'farm', slot?: 0|1|2, contentType }`. Renvoie URL signée Supabase Storage. Le client upload puis appelle `PATCH /producer/profile` avec l'URL définitive.
- `DELETE /api/v1/producer/photos` → suppression d'un slot (logo ou farm[n]).
- `POST /api/v1/producer/pause` → body `{ paused: boolean }`. Endpoint séparé pour limiter la portée du PATCH et faciliter l'audit.

Erreurs typées (ARCHITECTURE.md §4.3) : `PROFILE_NOT_FOUND`, `INVALID_LABELS`, `ADDRESS_GEOCODE_FAILED`, `PHOTO_LIMIT_REACHED`, `UNAUTHORIZED`.

Pour la révélation côté rameneur : pas d'endpoint dédié dans KAN-17 (la lecture passera par l'écran mission rameneur, KAN-43/45). On expose juste la RPC SQL `reveal_pickup_address`, consommée plus tard.

## Impact state machine / events

Aucun. Pas de transition mission impactée. Le toggle `paused` n'émet pas d'event Inngest (au MVP — la liste catalogue se filtre par RLS, pas par cache à invalider).

## Dépendances

Services externes :
- **API Adresse Gouv.fr** — `tech/setup.md` § APIs externes ligne 203-206. Statut : Fait. Pas de clé, pas de quota documenté, cache 24 h serveur recommandé pour les requêtes répétées (peu probable ici, l'autocomplétion est rare et idempotente).
- **Supabase Storage** — `tech/setup.md` § Supabase ligne 25 (bucket `product-photos` existe déjà comme template ; nouveau bucket `producer-photos` créé par migration).
- **API Sirene INSEE** — non utilisée ici (KAN-16). Le chip « SIRET vérifié » sur le profil est dérivé du `siret_status` déjà présent.

Internes :
- Table `producers` (KAN-16) — étendue.
- RLS sur `products` (KAN-16) — condition `producer.paused = false` ajoutée à la clause `published`.

## État UI

Référence : DESIGN.md (tokens, breakpoints).

- Page `/producer/profile` : layout split 2 colonnes desktop (édition + preview sticky, breakpoint < 1080 px → mono-colonne). Sidebar producteur (cf. PR-03 dashboard) à gauche.
- Composant `<ProducerProfileForm />` : sections "Identité de la ferme", "Photos de la ferme", "Zone & adresse de récupération". Bouton « Enregistrer » sticky, qui appelle `PATCH` (debounce 800 ms sur les champs textuels pour autosave optimiste, voir notes ARCHITECTURE.md §3 sur autosave).
- Toggle "Boutique en pause" sur PR-09 — page `/producer/settings`. **Cette page est multi-tickets** ; au MVP la skeleton est posée mais seul le toggle pause est câblé (les autres rangs sont visuels, étiquetés « Bientôt »).
- Composant preview `<ProducerPublicCardPreview />` : rendu pur du panel droit de PR-08, partagé avec AC-08bis plus tard (KAN-53).
- Photo uploader : drag-drop + bouton « Changer » / « Supprimer ». Validation client-side (MIME + taille) avant signature.
- Autocomplétion adresse : `<AddressAutocomplete />` consomme l'API Adresse Gouv.fr directement (pas de proxy serveur), pose les coordonnées dans un input hidden envoyé au PATCH.
- Mobile : non livré, mais le formulaire est mobile-friendly (single-column < 1080 px) — décision « responsive obligatoire » respectée pour la version web.

## Risques techniques

- **Adresse exacte sensible** : le défaut RLS-row-level seul ne suffit pas. La RPC `reveal_pickup_address` + filtrage applicatif côté `GET /producer/profile` doivent être implémentés ensemble — sinon fuite via PostgREST direct. À tester explicitement (test négatif acheteur + test positif rameneur en mission).
- **Storage public + RLS** : le bucket est public en lecture (logos visibles dans le catalogue), mais l'upload est restreint à `auth.uid()`. Vérifier les policies Storage versionnées dans `supabase/policies/storage.sql` (principe A7).
- **Photos orphelines** : si l'utilisateur upload une photo puis n'enregistre pas, le fichier reste dans Storage. Au MVP on accepte la dette (volume négligeable) ; documenter pour un éventuel job cleanup post-MVP.
- **Géocodage API Adresse** : si l'API tombe ou retourne un score < 0.5, ne pas écrire de `pickup_location` mais accepter quand même `pickup_address` (texte). Le matching dégradera proprement en attendant la prochaine édition.
- **PostGIS** : la colonne `pickup_location` doit utiliser le type `geography` (sphérique, mètres) et non `geometry` (cartésien, degrés) pour cohérence avec `trips.route_geom` (ARCHITECTURE.md §5.4 mention `GIST (location)` sur `producers`).
- **Migration RLS** : la migration touche RLS sur `producers` (KAN-16) et `products` (KAN-16/20). Risque de régression — tests RLS automatisés (cf. supabase-postgres-best-practices) obligatoires sur les 3 personae × 3 niveaux d'autorisation.
- **Bundle web** : le composant preview embarque potentiellement les icônes label (5 SVG). Vérifier qu'on reste sous la cible bundle pour `/producer/profile` (ARCHITECTURE.md §11/§13).

## Tests envisagés

Référence : ARCHITECTURE.md §10.

- **Unit `packages/core`** :
  - Validation `producerProfileUpdateSchema` (limites taille, enum labels, format horaire, max 3 photos).
  - Normalisation adresse (geocoding off-path : on injecte un faux résultat API Adresse et on vérifie la pose des coordonnées).
  - Vérification logique pause → invisibilité produits (test en isolation de la fonction de gating).
- **Intégration DB** (vitest + supabase local) :
  - RLS `producers.update` : un user ne peut modifier que sa propre row.
  - RLS sur lecture `pickup_address` : acheteur ne lit pas, rameneur en mission `confirmed` lit, rameneur sans mission ne lit pas.
  - RPC `reveal_pickup_address` couvre les 3 cas (owner, rameneur autorisé, étranger).
  - CHECK constraints DB (max 3 farm photos, horaires cohérents).
- **E2E web Playwright** (`apps/web/e2e/producer-profile.spec.ts`) :
  - Producteur ouvre `/producer/profile`, modifie nom + description + ajoute logo + adresse, enregistre, recharge, voit la version persistée.
  - Onboarding step 1 : depuis `/onboarding/producer`, saisie nom + description + zone permet de passer à l'étape SIRET (KAN-16).
  - Toggle « Boutique en pause » : sur catalogue acheteur, le producteur disparaît.
  - Vérif adresse privée : un compte acheteur de test n'a pas accès à `pickup_address` via l'API publique.
- **Storage** : tests Vitest sur l'endpoint d'upload (signature OK, MIME refusé, slot ≤ 2 pour farm photos).
