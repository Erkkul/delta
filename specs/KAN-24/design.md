# Conception technique — KAN-24 Labels & catégories

## Vue d'ensemble

Câblage applicatif d'un champ déjà présent en DB, avec une migration de type. Le mouvement principal : figer la whitelist `product_label` (en suspens depuis KAN-20), swap la colonne `products.labels` de `text[]` → `product_label[]`, puis propager l'enum à travers contrats Zod → use cases → repo → formulaire PR-05 → affichage chips (card + preview). La catégorie est hors périmètre (livrée par KAN-20).

Pas de state machine, pas d'event Inngest. Seule nouveauté DB : un enum + un `ALTER COLUMN … TYPE` avec cast.

## Packages touchés

- [x] `packages/contracts` — `shared.ts` : ajout `PRODUCT_LABELS`, `ProductLabel`, `PRODUCT_LABEL_FR`. `create.ts` / `update.ts` / `snapshot.ts` : `labels: z.array(ProductLabel).max(10)`.
- [x] `packages/core` — use cases `createProduct` / `updateProduct` : le champ est déjà propagé (`labels: data.labels ?? []`) ; vérifier le typage, ajouter couverture test.
- [x] `packages/db` — `types.ts` : `labels` passe de `string[]` à `ProductLabel[]` sur `Row` / `Insert` / `Update`. Vérifier le mapping repo (déjà générique).
- [x] `apps/web` — `product-form.tsx` (sélecteur labels multi en chips, section 1), `product-card.tsx` + `product-form-preview.tsx` (chips), réutilisation du pattern chips du profil producteur.
- [ ] `apps/mobile` — hors scope.
- [ ] `packages/jobs` — aucun event.
- [x] `supabase/migrations` — nouvelle migration : `CREATE TYPE product_label` + swap colonne.
- [ ] `supabase/policies` — aucun changement RLS.
- [ ] `packages/ui-web` — non promu (cohérent KAN-20/21/22/23).

## Modèle de données

Enum `product_label` (D1 — union pertinente) :

```
bio_ab, demeter, nature_et_progres, label_rouge, hve_3, producteur_fermier
```

Nouvelle migration `supabase/migrations/<ts>_product_labels_enum.sql` :

- `CREATE TYPE public.product_label AS ENUM (…)` (garde `IF NOT EXISTS` via `DO $$`).
- `ALTER TABLE public.products ALTER COLUMN labels TYPE public.product_label[] USING labels::public.product_label[];` — la colonne ne contient que `'{}'` en prod (feature non exposée), cast sans risque. Conserver `NOT NULL DEFAULT '{}'`.
- Mettre à jour le `COMMENT ON COLUMN products.labels` (retirer la mention « text[] au MVP de KAN-20 / KAN-24 swap », documenter l'enum + la non-fusion avec `producer_label`).
- Rollback documenté : `ALTER COLUMN labels TYPE text[]` + `DROP TYPE product_label`.
- Idempotence : garde sur le type, swap conditionnel (ne pas re-caster si déjà `product_label[]`).

Référence : `supabase/migrations/20260518000000_create_products.sql:104,164-166`, ARCHITECTURE.md §5, §18 entrée 1.22.

## API / Endpoints

Aucun nouvel endpoint. Les endpoints existants resserrent la validation :

- `POST /api/v1/producer/products` et `PATCH /api/v1/producer/products/[id]` : `labels` n'accepte plus que des valeurs de la whitelist `product_label` (au lieu de chaînes libres). Un label hors whitelist → `PRODUCT_VALIDATION_FAILED` (Zod, cf. shared.ts).
- `GET` retourne déjà `labels` via le snapshot.

Pas de nouveau code d'erreur.

## Impact state machine / events

Aucun. Pas de transition mission, pas d'event Inngest (cohérent KAN-22).

## Dépendances

Services externes : aucun. Pas de mise à jour `tech/setup.md`.

Internes :
- Table `products` (KAN-20) — colonne `labels` déjà présente.
- Pattern chips multi-select du profil producteur (`PRODUCER_LABELS` / `PRODUCER_LABEL_FR`) — modèle UI à répliquer pour les labels produit.
- `<ProductForm />`, `<ProductCard />`, `<ProductFormPreview />` (KAN-20/21/22).

## État UI

Référence : `DESIGN.md` (tokens, breakpoints), maquette PR-05 section 1.

**Formulaire PR-05 — Section 1 « Identité » :**
- Ajouter le champ « Labels / certifications (optionnel) » après la catégorie.
- Rendu : **chips multi-select** (D2) alimenté par `PRODUCT_LABELS` + `PRODUCT_LABEL_FR`. Déviation vs le `select` mono-valeur de la maquette → à consigner dans `notes.md` à l'implémentation.
- État vide accepté (`labels: []`).

**Card PR-04 + preview PR-05 :**
- Afficher les labels en petits chips sobres (token vert clair) sous la catégorie. Pas de chip si `labels` vide.
- Desktop + mobile (responsive obligatoire).

## Risques techniques

- **Cast de migration** : sûr tant que la colonne ne contient que `'{}'` (feature jamais exposée). Si des données de test contiennent des chaînes hors whitelist, le cast échoue → vérifier `SELECT DISTINCT unnest(labels) FROM products` avant apply. Au besoin, nettoyer dans la migration.
- **Cohérence avec `ProducerLabel`** : deux enums proches mais distincts. Documenter en commentaire pourquoi ils ne sont pas fusionnés (D1) pour éviter une fausse duplication aux yeux d'un reviewer.
- **Déviation maquette single → multi** : assumée (D2), consignée dans `notes.md`.

## Tests envisagés

Référence : ARCHITECTURE.md §10.

- **Unit contracts** (`product/{create,update}.test.ts`) : label whitelisté accepté (`["bio_ab"]`), refusé (`["not-a-label"]`, chaîne libre), `> 10` refusé, `[]` accepté. Mettre à jour les fixtures qui utilisent `labels: ["Bio AB"]` (chaîne libre → clé enum `bio_ab`).
- **Unit core** (`create-product.test.ts` / `update-product.test.ts`) : propagation `labels`, réinitialisation à `[]`.
- **Unit display** : helper de rendu chips (libellé FR, ordre stable).
- **E2E web Playwright** : déféré (fixtures auth producteur indisponibles, cohérent KAN-20→23).
