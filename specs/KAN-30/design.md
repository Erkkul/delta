# Conception technique — KAN-30 Wishlist privée

## Vue d'ensemble

CRUD minimal privé au-dessus d'une nouvelle table `public.wishlist_items`, câblé
sur deux écrans acheteur (toggle AC-05, gestion AC-06). Aucune logique métier
lourde, aucune state machine, aucun job, aucun paiement. La sécurité repose sur
la RLS forcée self-only (pattern `buyer_profiles`). L'affichage des cartes AC-06
réutilise la vue `public.catalogue_products` (KAN-28) par jointure sur
`product_id`. Le seul vrai point de conception est la **règle du plafond 20** et
la **contrainte d'unicité** produit ↔ acheteur, plus la posture « statuts
différés » héritée de KAN-28.

## Packages touchés

- [x] `packages/contracts` — `WishlistAddInput`, `WishlistItem`, `WishlistPage`,
      `WISHLIST_ERROR_CODES`
- [ ] `packages/core` — a priori aucun (règle du plafond exprimable en repo/SQL ;
      un garde `assertWishlistCapacity` peut y vivre si réutilisé — à trancher)
- [x] `packages/db` — `wishlistRepo` (list / add / remove / count)
- [x] `apps/web` — page `acheteur/envies/page.tsx`, endpoints
      `app/api/v1/wishlist/route.ts` + `app/api/v1/wishlist/[productId]/route.ts`,
      composants `components/buyer/wishlist/*`, bouton toggle sur la fiche AC-05
- [ ] `apps/mobile` — hors scope
- [ ] `packages/jobs` — aucun
- [x] `supabase/migrations` — table `wishlist_items` + RLS + contraintes + index
- [x] `supabase/policies` — miroir `wishlist_items.sql` (convention §14.2)
- [ ] `packages/ui-web` — non (composants locaux `components/buyer/`, cohérent
      KAN-25 → KAN-28)

## Modèle de données

Référence : ARCHITECTURE.md §5.

Nouvelle table `public.wishlist_items` :

- `id uuid PK default gen_random_uuid()`
- `user_id uuid NOT NULL` → FK `public.users(id)` ON DELETE CASCADE
- `product_id uuid NOT NULL` → FK `public.products(id)` ON DELETE CASCADE
- `created_at timestamptz NOT NULL default now()`
- `deleted_at timestamptz` (soft delete)

Contraintes / index :

- **Unicité** : index unique partiel `(user_id, product_id) WHERE deleted_at IS
  NULL` — un même produit ne peut être en envie active qu'une fois par acheteur.
- Index `(user_id) WHERE deleted_at IS NULL` pour la liste + le comptage plafond.
- **Plafond 20** : appliqué côté serveur (COUNT actif avant INSERT dans le repo,
  ou fonction/trigger SQL). L'approche exacte (garde applicative vs. contrainte
  DB) à arbitrer — proposition : garde dans le repo/route + test, car un trigger
  de comptage sur INSERT est plus coûteux à maintenir. À documenter.

RLS forcée (miroir `buyer_profiles`) :

- `ENABLE` + `FORCE ROW LEVEL SECURITY`
- SELECT / INSERT / DELETE (ou UPDATE pour soft delete) `TO authenticated`
  `USING (auth.uid() = user_id)`. Aucune policy cross-user → wishlist privée
  garantie au niveau DB.
- Pas de lecture publique (décision « wishlist privée » 2026-05-01).

Pas de colonne `status` ni `price` stockée (hypothèses proposal : statut dérivé
par KAN-42, prix appliqué au match par D4/KAN-31).

## API / Endpoints

Référence : ARCHITECTURE.md §3.

- `GET /api/v1/wishlist` → `{ items: WishlistItem[], count, max: 20 }`.
  Jointure `wishlist_items` (du caller) × `catalogue_products` pour la projection
  carte (nom, producteur, zone, photo, prix courant indicatif). Tri : récence.
- `POST /api/v1/wishlist` body `{ productId }` → 201 `WishlistItem`.
  Validation Zod. Vérifie : produit existe et est publiquement visible
  (présent dans `catalogue_products`), non déjà en envie active, plafond < 20.
  Codes : `WISHLIST_PRODUCT_NOT_FOUND` (404), `WISHLIST_ALREADY_ADDED` (409),
  `WISHLIST_LIMIT_REACHED` (409), `WISHLIST_VALIDATION_FAILED` (400).
- `DELETE /api/v1/wishlist/{productId}` → 204. Soft delete de la row active du
  caller. Idempotent (204 même si déjà absente).
- Toggle AC-05 = POST si absent / DELETE si présent (état lu au chargement de la
  fiche via `wishlistRepo` ou flag SSR).

## Impact state machine / events

Référence : ARCHITECTURE.md §6 et §8.

Aucun. La wishlist est un signal de demande privé, hors cycle de vie mission.
Sa consommation par le matching (calcul d'opportunités, notification de match)
relève de KAN-42 / KAN-31 — non câblée ici. Aucun event Inngest, aucun webhook,
aucune transition mission.

## Dépendances

Référence : ARCHITECTURE.md §2. Provisionnement : `tech/setup.md`.

- **Supabase Postgres** — nouvelle table + RLS + réutilisation de la vue
  `catalogue_products`. Déjà provisionné, cf. `tech/setup.md` § Supabase
  (Postgres + Auth + Storage + Realtime). Aucun nouveau service externe.
- Internes : vue `catalogue_products` (KAN-28), shell + gating `/acheteur/*`
  (KAN-28), `productsRepo` (KAN-20) pour référence du modèle, tokens DESIGN.md,
  icônes lucide-react. Pas d'API Adresse, pas de Stripe, pas d'Inngest.

## État UI

Référence : DESIGN.md (tokens, breakpoints) + maquettes ac-05 / ac-06.

- **AC-05 (fiche produit)** : bouton « Ajouter à mes envies » (CTA sticky mobile
  + bloc desktop) et cœur du header deviennent un **toggle** reflétant la
  présence en wishlist (plein = déjà en envie → « Retirer de mes envies »).
  Le bloc « Comment ça marche » reste (microcopy inchangée). Le `match-card`
  (« 3 rameneurs font le trajet ») reste rendu en placeholder / différé (KAN-42).
- **AC-06 `/acheteur/envies`** : titre « Mes envies » + sous-titre « Vos envies
  restent privées… », **compteur** « N envies sur 20 max » avec barre de
  progression, **liste** des envies réelles (carte : image, nom, producteur ·
  zone, action retirer). Une seule section active « En attente d'un rameneur »
  (état `pending`) ; sections « Confirmation requise » / « Match probable » et
  onglets de filtrage rendus **différés/inertes** (aria-disabled), pas de données
  mockées. Empty state = bloc CTA « Parcourir le catalogue ». Badge nav « Envies »
  reflète le nombre d'envies (ou différé si trop couplé au matching).
- **Responsive** : mobile + desktop obligatoires (DESIGN.md). Bottom-nav mobile /
  header desktop hérités du shell KAN-28.

## Risques techniques

Références : ARCHITECTURE.md §9, §11, §13.

- **Envie orpheline / produit devenu invisible** : la jointure sur
  `catalogue_products` masque une envie dont le produit n'est plus visible
  (producteur en pause, produit `disabled`, hors fenêtre). Décider : masquer au
  MVP (proposé) vs. carte grisée « indisponible ». À acter, sinon incohérence
  compteur (row en base non affichée). Le comptage plafond porte sur les rows,
  pas sur la visibilité.
- **Course sur le plafond 20** : deux POST concurrents pourraient dépasser 20.
  Mitigation : garde + contrainte, ou vérification transactionnelle. À traiter
  explicitement (test de concurrence ou contrainte DB).
- **Tentation de mocker statuts/notifications** : maquette AC-06 très riche
  (« Match probable », « Confirmer sous 23h »). Règle KAN-28 reprise — **aucune
  fixture en prod**, uniquement réel (`pending`) ou différé.
- **Fuite de confidentialité** : wishlist privée — vérifier qu'aucune policy ni
  aucun endpoint n'expose les envies d'un autre user. Test RLS dédié.
- **Cohérence toggle AC-05** : l'état initial du bouton nécessite de savoir si le
  produit est déjà en envie (lecture au SSR de la fiche). Éviter un flash
  d'état incorrect.
- **Idempotence DELETE + ré-ajout** : réconcilier contrainte d'unicité partielle
  et réutilisation d'une row soft-deleted (ré-ajout après retrait).

## Tests envisagés

Référence : ARCHITECTURE.md §10.

- **Unit `packages/contracts`** (Vitest) : `WishlistAddInput` (productId requis,
  uuid), `WishlistItem` / `WishlistPage` (forme), codes d'erreur.
- **DB / intégration** : RLS — un user ne lit/écrit que ses propres envies
  (aucune fuite cross-user) ; unicité (double ajout du même produit → conflit) ;
  plafond 20 (21ᵉ ajout refusé) ; soft delete exclut de la liste et du compteur ;
  jointure `catalogue_products` exclut un produit non visible.
- **Unit `apps/web`** (RTL) : carte envie (image/nom/producteur/action) ;
  compteur + barre ; empty state ; bouton toggle AC-05 (plein/vide) ; sections
  différées `aria-disabled`.
- **E2E web Playwright** : acheteur connecté → fiche AC-05 → « Ajouter à mes
  envies » → AC-06 montre l'envie ; retrait → disparaît + compteur décrémente ;
  plafond atteint → message ; non-connecté → `/login` ; sans rôle acheteur →
  `/onboarding/role` (cohérent KAN-25/28) ; responsive mobile.
- **Accessibilité** : axe-core sur AC-06 (0 violation critique).
