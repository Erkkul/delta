# Conception technique — KAN-20 Création & édition produit

## Vue d'ensemble

Une seule migration crée la table `products` avec toutes les colonnes que les tickets frères de l'épic KAN-5 vont câbler (photos, labels, seuil d'alerte), de manière à ne pas re-migrer la table 4 fois. KAN-20 livre la logique CRUD complète (endpoints, validation, use cases, repo) et l'UI minimale (liste + formulaire) qui couvre les champs de la subtask KAN-69. Les sections de la maquette qui dépendent d'autres tickets sont rendues en placeholder sans logique applicative.

Le mouvement principal est conservatif : on suit le pattern KAN-17 (formulaire unique + page d'édition + endpoint PATCH + Zod + use cases). Pas de state machine ni d'event Inngest — c'est un CRUD pur. La complexité du ticket réside dans la délimitation propre des frontières vis-à-vis de KAN-21/22/23/24 et dans la RLS multi-cas (owner R/W, public lecture conditionnelle).

## Packages touchés

- [x] `packages/contracts` — `productCreateSchema`, `productUpdateSchema`, `productListQuerySchema`, snapshot output
- [x] `packages/core` — use cases `createProduct`, `updateProduct`, `softDeleteProduct`, `listOwnerProducts`, `getOwnerProduct` + erreurs typées
- [x] `packages/db` — repo `products` (`create`, `findById`, `findByOwner`, `update`, `softDelete`), helpers FTS query
- [x] `apps/web` — pages `/producer/catalogue`, `/producer/catalogue/nouveau`, `/producer/catalogue/[id]`, route handlers `app/api/v1/producer/products/{,[id]}/route.ts`
- [ ] `apps/mobile` — hors scope
- [ ] `packages/jobs` — aucun job
- [x] `supabase/migrations` — création table `products`, enums, RLS, FTS, index, CHECK
- [x] `supabase/policies` — `products.sql` (réécrit : remplacer le placeholder documentaire par les vraies policies, ou supprimer si la migration les intègre directement — voir Tâches)
- [ ] `packages/ui-web` — composants placés directement dans `apps/web/components/producer/catalogue/` (pas de réutilisation cross-app prévue au MVP)

## Modèle de données

Table `public.products` (création neuve). Toutes les colonnes optionnelles à part le minimum requis pour qu'un produit existe.

| Colonne | Type | Note |
|---|---|---|
| `id` | `uuid pk default gen_random_uuid()` | |
| `producer_user_id` | `uuid not null references public.users(id) on delete cascade` | FK vers `producers.user_id` (1-1 avec `users`) |
| `name` | `text not null` | CHECK 1 ≤ length ≤ 120 |
| `description` | `text` | CHECK length ≤ 2000 |
| `category` | `product_category not null` | ENUM (8 valeurs, cf. ci-dessous) |
| `packaging` | `product_packaging not null` | ENUM (8 valeurs, cf. ci-dessous) |
| `unit_price_cents` | `integer not null` | CHECK > 0 et ≤ 100_000 (1 000 €) ; prix net producteur |
| `stock` | `integer not null default 0` | CHECK ≥ 0 |
| `low_stock_threshold` | `integer` | CHECK ≥ 0 ; nullable ; câblé par KAN-22 |
| `availability_from` | `date` | nullable (= disponible immédiatement) |
| `availability_to` | `date` | nullable (= sans limite) ; CHECK `availability_to >= availability_from` quand les deux sont set |
| `status` | `product_status not null default 'active'` | ENUM ; full workflow KAN-23 |
| `labels` | `text[] not null default '{}'` | Stocké en `text[]` au MVP ; swap → `product_label[]` par KAN-24 |
| `photos` | `jsonb not null default '[]'` | Array `{ url, alt? }` ; CHECK `jsonb_array_length ≤ 4` ; câblé par KAN-21 |
| `search_vector` | `tsvector generated always as (...) stored` | FTS sur `name` + `description` (poids A + B), config `french` |
| `created_at` | `timestamptz not null default now()` | |
| `updated_at` | `timestamptz not null default now()` | trigger `public.set_updated_at()` (déjà installé par `20260510120000_init.sql`) |
| `deleted_at` | `timestamptz` | soft delete |

Nouveaux ENUM :

- `product_category` : `'miel_et_ruche' | 'fruits' | 'legumes' | 'cereales_legumineuses' | 'conserves_confitures' | 'pain_biscuits' | 'huiles' | 'boissons_non_alcoolisees'` (alcool exclu — décision produit hors scope MVP).
- `product_packaging` : `'pot_250g' | 'pot_500g' | 'pot_1kg' | 'bouteille_50cl' | 'bouteille_75cl' | 'sachet_500g' | 'carton_6' | 'au_kilo'`.
- `product_status` : `'active' | 'draft' | 'disabled'`.

Pour les labels : Postgres ne supporte pas un enum vide, et KAN-24 n'a pas encore défini ses valeurs. Décision retenue → stocker en `text[]` au MVP de KAN-20 (vide par défaut, validé Zod côté contracts), puis KAN-24 fera un swap colonne `text[]` → `product_label[]` dans sa propre migration. Documenter dans le journal ARCHITECTURE §18.

Index :

- `(producer_user_id, status) WHERE deleted_at IS NULL` — listing producteur (cf. ARCHITECTURE §5.4)
- `GIN (search_vector)` — FTS
- `(producer_user_id, deleted_at) WHERE deleted_at IS NOT NULL` — admin / RGPD post-MVP

RLS sur `products` (toutes les policies dans la migration) :

- `products_select_owner` (FOR SELECT TO authenticated USING `auth.uid() = producer_user_id`) — le producteur voit toujours ses produits, y compris soft-deleted (utile à un futur écran « corbeille ») et tous statuts.
- `products_select_public` (FOR SELECT TO anon, authenticated USING `auth.uid() <> producer_user_id AND ...`) — reproduit le placeholder : producer vérifié + payouts ON + paused = false + deleted_at IS NULL + status = 'active' + (availability_from IS NULL OR availability_from ≤ current_date) + (availability_to IS NULL OR availability_to ≥ current_date).
- `products_insert_owner` (FOR INSERT WITH CHECK `auth.uid() = producer_user_id`).
- `products_update_owner` (FOR UPDATE TO authenticated USING `auth.uid() = producer_user_id` WITH CHECK `auth.uid() = producer_user_id`).
- Pas de `products_delete_owner` : DELETE physique non utilisé, la suppression passe par `UPDATE deleted_at`.

Référence : ARCHITECTURE.md §5, §9.2.

## API / Endpoints

Versionnés `/api/v1/`, validés Zod, handlers 15-30 lignes (cf. ARCHITECTURE §3, §14.2).

- `GET /api/v1/producer/products` → liste des produits du producteur connecté. Query Zod : `status?: 'all'|'active'|'draft'|'disabled'`, `q?: string` (FTS), `limit?: number ≤ 50`, `cursor?: string`. Renvoie `{ items, nextCursor }`.
- `POST /api/v1/producer/products` → création. Input `productCreateSchema` (name, category, packaging, unit_price_cents, stock, availability_from?, availability_to?, description?, status?). Renvoie le snapshot complet.
- `GET /api/v1/producer/products/[id]` → lecture par owner (RLS filtre les autres).
- `PATCH /api/v1/producer/products/[id]` → partial update. Input `productUpdateSchema` (tous optionnels sauf invariants). Recalcul `updated_at` côté DB (trigger existant).
- `DELETE /api/v1/producer/products/[id]` → soft delete : `UPDATE products SET deleted_at = now() WHERE id = $1 AND producer_user_id = auth.uid() AND deleted_at IS NULL`.

Erreurs typées (ARCHITECTURE §4.3) : `PRODUCT_NOT_FOUND`, `PRODUCT_FORBIDDEN`, `PRODUCT_INVALID_PRICE`, `PRODUCT_INVALID_AVAILABILITY_WINDOW`, `PRODUCT_NAME_TOO_LONG`, `PRODUCT_ALREADY_DELETED`.

## Impact state machine / events

Aucun. Pas de transition mission impactée, pas d'event Inngest émis dans ce ticket (cf. proposal — `product.updated` reste théorique tant que KAN-42 n'arrive pas).

## Dépendances

Services externes :
- **Supabase Storage** — `tech/setup.md` § Supabase ligne 25 (bucket `product-photos` existe déjà, créé à l'init le 2026-05-08). Non consommé par KAN-20 (consommation par KAN-21).
- Aucune autre dépendance externe.

Internes :
- Table `users` (KAN-2) et `producers` (KAN-16) — FK et conditions RLS.
- Placeholder `supabase/policies/products.sql` (introduit par KAN-16) — **supprimé** par la migration KAN-20 (sa raison d'être disparaît).
- Trigger `public.set_updated_at()` (migration init `20260510120000_init.sql`) — réutilisé.

## État UI

Référence : DESIGN.md (tokens, breakpoints) ; maquettes PR-04 et PR-05 lues intégralement.

**Page `/producer/catalogue` (PR-04) :**
- Layout : sidebar producteur (réutilisée de PR-03/PR-08/PR-09) + main page max-width 1200.
- Stats banner : 4 cards (Produits actifs / Envies / Récup. à venir / Revenus). Seul « Produits actifs » est dérivé du listing KAN-20. Les 3 autres affichent `—` et un libellé « Bientôt » au MVP.
- Tabs filtres `Tous / Actifs / Brouillons / Désactivés` câblés au query param `status`. Recherche FTS (input contrôlé, debounce 300 ms, envoi via `q`).
- Products grid : `repeat(auto-fill, minmax(240px, 1fr))`. Carte = image placeholder gradient (cf. maquette) + nom + catégorie + prix + stock + fenêtre. Pas de compteurs Envies/Vendus (rendus `—` ou retirés au MVP).
- Empty state : illustration + bouton CTA → `/producer/catalogue/nouveau`.
- Responsive : mêmes breakpoints que les autres pages producteur (sidebar fixe < 920 px, grid mono-colonne < 540 px).

**Page `/producer/catalogue/nouveau` et `/producer/catalogue/[id]` (PR-05) :**
- Layout : split 2 colonnes desktop (édition + preview sticky, breakpoint < 1080 px → mono-colonne).
- Sections du form (cf. maquette PR-05) :
  - **Section 1 — Identité** : `name`, `category` (select), `description`. Câblé.
  - **Section 2 — Photos** : grille `photo-uploader` rendue en **désactivée** (overlay « Bientôt — KAN-21 »). Pas de logique upload.
  - **Section 3 — Prix et conditionnement** : `unit_price_cents` (input préfixe €), `packaging` (select). Le toggle « afficher prix voisin tout compris » est **retiré** au MVP.
  - **Section 4 — Stock et disponibilité** : `stock` (input + unit derived from packaging), `low_stock_threshold` désactivé (« Bientôt — KAN-22 »), `availability_from` + `availability_to` (date pickers).
  - **Section 5 — Visibilité** : tri-état (`active` / `draft` / `disabled`). Câblé en édition uniquement (les conséquences workflow restent KAN-23 : au MVP de KAN-20, changer le statut est purement persistant, sans validations d'éligibilité).
- Sticky `actions-bar` : « Annuler » → retour catalogue, « Enregistrer » → POST/PATCH puis redirection vers liste.
- Mode `nouveau` : pas de `id` dans l'URL, valeurs par défaut (`stock = 0`, `status = active`, `availability_*` vides). Bouton « Supprimer » (subtask KAN-71) ajouté en mode édition uniquement, dans un sous-menu de l'`actions-bar` (confirmation modale « Supprimer ce produit ? Action réversible 30 j. »).
- Preview right column (PR-05 panel droit) : carte mockée vue acheteur, dérivée du state local. Note pédagogique « Ajoutez une photo… » conservée même si la section photos est désactivée.

**Composants nouveaux dans `apps/web/components/producer/catalogue/` :**
- `<CatalogueList />`, `<CatalogueFilters />`, `<ProductCard />`, `<ProductForm />`, `<ProductFormPreview />`, `<ProductDeleteConfirm />`.

Mobile : non livré (cohérent avec KAN-17/18 — `apps/mobile/` non scaffold).

## Risques techniques

- **Soft delete + RLS** : `products_select_owner` doit inclure les soft-deleted (utile pour annulation post-MVP), mais l'API `GET /producer/products` doit filtrer `deleted_at IS NULL` par défaut côté repo. Si on oublie ce filtre, le producteur voit ses produits supprimés dans la liste. Test explicite à écrire.
- **FTS configuration `french`** : la migration init n'a pas explicité de dictionnaire. Vérifier qu'`extensions` expose `french` config (par défaut sur Supabase, mais à valider). Sinon basculer sur `simple` en attendant (perte d'accents/stemming).
- **Enum vs `text[]` pour labels** : décision retenue de stocker `labels text[]` au MVP pour éviter une migration enum-vide impossible. KAN-24 swap → enum dans sa propre migration. Documenter cette dette dans `tasks.md` + tag `// KAN-24 swap` côté repo.
- **CHECK `availability_to >= availability_from`** : doit utiliser `CHECK (availability_from IS NULL OR availability_to IS NULL OR availability_to >= availability_from)` (sinon il refuse les `null`).
- **Quantité d'index** : 3 index sur une table neuve, c'est OK (volume faible). À surveiller si la table dépasse 100k rows post-MVP.
- **Suppression du placeholder `supabase/policies/products.sql`** : ne pas oublier dans le commit. Sinon doublon trompeur.
- **`unit_price_cents` int** : 1 000 € max suffit largement (le plus cher dans les exemples est 15 €). Hard cap à 100 000 cents en DB.
- **Statut `draft` éditable sans validation** : un producteur peut publier (`status = 'active'`) un produit sans description ni photos. Au MVP de KAN-20 on l'accepte (l'écran l'autorise via les radios). KAN-23 ajoutera les pré-requis de publication.

## Tests envisagés

Référence : ARCHITECTURE.md §10.

- **Unit `packages/core`** :
  - Validation `productCreateSchema` / `productUpdateSchema` (bornes nom, prix, stock, fenêtre, enums).
  - Use case `createProduct` : succès, refus si producer non-existant (FK), refus si prix ≤ 0.
  - Use case `softDeleteProduct` : succès puis idempotence (deleted_at déjà set → erreur typée).
  - Use case `listOwnerProducts` : tri date desc, exclusion `deleted_at IS NOT NULL`, filtre `status`, recherche `q`.
- **Intégration DB (Vitest + Supabase local quand disponible)** :
  - RLS `products_select_owner` : le producteur voit ses produits actifs + brouillons + désactivés + soft-deleted.
  - RLS `products_select_public` : un acheteur ne voit que des produits actifs d'un producteur vérifié + payouts ON + non en pause + dans la fenêtre de disponibilité.
  - CHECK contraintes (longueur nom, prix borné, stock ≥ 0, fenêtre cohérente, max 4 photos).
  - Trigger `set_updated_at` se déclenche bien sur PATCH.
- **E2E web Playwright** (`apps/web/e2e/producer-catalogue.spec.ts`) :
  - Producteur ouvre `/producer/catalogue` vide, clique « Nouveau produit », remplit le form minimal, enregistre, voit son produit dans la liste.
  - Édition : modifier prix, recharger, prix persisté.
  - Suppression : confirmer dans la modale, le produit disparaît de la liste.
  - Filtres : créer 1 produit `active` + 1 `draft`, vérifier que les tabs filtrent correctement.
  - Recherche FTS : créer 2 produits avec noms différents, recherche → 1 résultat.
- **Tests Storage / photos** : différés (KAN-21).
