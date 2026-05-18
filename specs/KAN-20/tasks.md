# Tâches techniques internes — KAN-20 Création & édition produit

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> - KAN-69 — Créer un produit (nom, description, catégorie, prix net, stock, fenêtre de dispo)
> - KAN-70 — Modifier les informations d'un produit existant
> - KAN-71 — Supprimer un produit du catalogue

## Tâches

- [ ] Migration `supabase/migrations/20260518xxxxxx_create_products.sql` :
  - [ ] ENUM `product_category` (8 valeurs)
  - [ ] ENUM `product_packaging` (8 valeurs)
  - [ ] ENUM `product_status` (`active`, `draft`, `disabled`)
  - [ ] Table `products` avec colonnes, CHECK, defaults, `search_vector` généré (`to_tsvector('french', coalesce(name,'')||' '||coalesce(description,''))`)
  - [ ] Index `(producer_user_id, status) WHERE deleted_at IS NULL`
  - [ ] Index GIN sur `search_vector`
  - [ ] Trigger `set_updated_at` BEFORE UPDATE
  - [ ] RLS enable + policies `products_select_owner`, `products_select_public`, `products_insert_owner`, `products_update_owner`
- [ ] Suppression du placeholder `supabase/policies/products.sql` (sa raison d'être disparaît) — dans la même migration / PR
- [ ] Schemas Zod `packages/contracts/src/product/{create,update,list,snapshot}.ts` + export depuis `packages/contracts/src/product/index.ts` + index racine
- [ ] Use cases core dans `packages/core/src/product/` : `create-product.ts`, `update-product.ts`, `soft-delete-product.ts`, `list-owner-products.ts`, `get-owner-product.ts` + erreurs typées dans `errors.ts`
- [ ] Repo `packages/db/src/products/repo.ts` (`create`, `findById`, `findByOwner` avec filtres, `update`, `softDelete`) + factory `getProductsRepo()`
- [ ] Adapter web `getProductAdapter()` dans `apps/web/lib/products/adapter.ts`
- [ ] Route handlers `apps/web/app/api/v1/producer/products/route.ts` (GET + POST), `…/[id]/route.ts` (GET + PATCH + DELETE)
- [ ] Page `apps/web/app/producer/catalogue/page.tsx` (liste, filtres, recherche, vide state)
- [ ] Page `apps/web/app/producer/catalogue/nouveau/page.tsx` (form mode `new`)
- [ ] Page `apps/web/app/producer/catalogue/[id]/page.tsx` (form mode `edit` + bouton suppression)
- [ ] Composants `apps/web/components/producer/catalogue/` : `CatalogueList`, `CatalogueFilters`, `ProductCard`, `ProductForm`, `ProductFormPreview`, `ProductDeleteConfirm`
- [ ] Sidebar producteur (`apps/web/components/producer/sidebar.tsx`) : activer le lien « Catalogue » (déjà dans le markup) + badge dynamique « Produits actifs » optionnel
- [ ] Tests unitaires `packages/core/src/product/*.test.ts` (use cases) + `packages/contracts/src/product/*.test.ts` (Zod)
- [ ] Tests E2E `apps/web/e2e/producer-catalogue.spec.ts` (5 scénarios listés dans design.md)
- [ ] Tests RLS DB : différés tant que la CI Supabase locale n'est pas activée (cohérent KAN-17)
- [ ] Seed dev `supabase/seeds/products-sample.sql` (optionnel — 3 à 5 produits sur le producteur de test) — différé si bloque pas la livraison
- [ ] **Décision technique structurante à journaliser** dans ARCHITECTURE.md §18 :
  - Création de la table `products` (premier objet catalogue côté DB)
  - Pattern enum vide → `text[]` au MVP de KAN-20, swap par KAN-24 (à documenter pour ne pas reproduire)
  - Suppression du placeholder `supabase/policies/products.sql` (introduit par KAN-16, levé par KAN-20)
- [ ] Mise à jour `produit/jira_mapping.md` : ligne KAN-20 (statut, mention `[Cadrage tech](specs/KAN-20/)`), entrée "État au YYYY-MM-DD"

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
