# Tâches techniques internes — KAN-23 Statuts produit

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> - KAN-76 : Passer un produit de Brouillon à Actif ou le Désactiver temporairement
> - KAN-77 : Visualiser la liste des produits avec leur statut (Actif / Brouillon / Désactivé / Épuisé)

## Tâches

- [x] Helper pur `getPublishPreconditions(product, today) → { ok, missing }` dans `packages/core/src/product/publish-preconditions.ts` + 11 tests (couvrir chaque précondition + agrégat). Export depuis `packages/core/src/product/index.ts`. **Décision** : `today` est passé en paramètre (et non `new Date()` inline) pour rester pur côté tests ; le route handler injecte `new Date().toISOString().slice(0, 10)`.
- [x] Use case `transitionProductStatus(productId, target, ownerId, today, deps)` dans `packages/core/src/product/transition-product-status.ts` + 11 tests :
  - Fetch produit owner (sinon `ProductNotFoundError`).
  - Vérifier graphe de transitions (`draft ↔ active`, `active ↔ disabled`, `draft → disabled`, `disabled → draft`) ; refuser no-op et statuts inconnus avec `ProductTransitionInvalidError` (`reason = 'invalid_transition'`).
  - Si `targetStatus = 'active'` : appliquer `getPublishPreconditions` ; si manquant, lever `ProductTransitionInvalidError` (`reason = 'missing_preconditions'`) avec `details.missing` agrégé.
  - Update DB via `deps.update({ status })`.
- [x] Erreur typée `ProductTransitionInvalidError` (code `PRODUCT_TRANSITION_INVALID`, `details: { reason, missing }`) ajoutée à `packages/core/src/errors.ts`. Code miroir dans `packages/contracts/src/product/shared.ts` (`PRODUCT_ERROR_CODES.TransitionInvalid`).
- [x] Schemas Zod :
  - [x] `packages/contracts/src/product/transition-status.ts` (`ProductTransitionStatusInput`, strict, refuse `'sold_out'`).
  - [x] Étendre `packages/contracts/src/product/list.ts` : `status` accepte `'sold_out'` via la nouvelle union `ProductListStatusFilter`.
  - [x] 5 tests Zod ajoutés (`transition-status.test.ts`) + 1 cas ajouté (`list.test.ts`).
- [x] Repo `packages/db/src/products/repo.ts` :
  - [x] `findByOwner` : accepter `status = 'sold_out'` (traduit en `WHERE status = 'active' AND stock = 0`).
  - [ ] **Décision pragmatique** : pas de méthode `countByOwnerGroupedByStatus` côté serveur — la liste est chargée d'un coup côté client (`<CatalogueClient />`), le décompte vit côté client via `useMemo`. À reconsidérer si la pagination serveur devient effective. Documenté dans le journal §18.
- [x] Route handler `apps/web/app/api/v1/producer/products/[id]/status/route.ts` :
  - [x] `POST` valide Zod input, appelle `transitionProductStatus`, mappe les erreurs typées en statuts HTTP (200 / 400 `PRODUCT_TRANSITION_INVALID` avec `details` / 404 / 403 / 500).
- [x] Modification du handler `PATCH /[id]` (`apps/web/app/api/v1/producer/products/[id]/route.ts`) : si `status` est présent dans le body et diffère de l'actuel, on extrait `status` du body, on applique d'abord `updateProduct` sur les autres champs, puis on délègue à `transitionProductStatus`. Préconditions vérifiées sur l'état post-update. Documenté en commentaire de tête du handler.
- [ ] **Décision pragmatique** : pas d'extension de l'adapter web (`apps/web/lib/products/adapters.ts`) avec une méthode `transitionStatus`. Le composant `<ProductCard />` appelle directement `fetch(POST /…/status)` — cohérent avec le pattern existant du formulaire (qui fait du `fetch` direct).
- [x] Composants :
  - [x] `apps/web/components/producer/catalogue/catalogue-filters.tsx` : ajout du 5ᵉ tab « Épuisés » avec compteur, style orange en actif. Type `Filter` étendu à `'sold_out'`.
  - [x] `apps/web/components/producer/catalogue/product-card.tsx` : câblage du menu kebab (dropdown maison, click outside, pas de dépendance shadcn ajoutée), actions dynamiques selon le statut (`getQuickActions`), navigation `?focus=publish` si précondition manquante, `router.refresh()` au succès.
  - [x] `apps/web/components/producer/catalogue/product-form.tsx` : bloc « Pour publier, il faut » sous la section 5 quand `status === 'active'` et préconditions non remplies (calculé live via `getPublishPreconditions`). Lecture de `?focus=publish` au mount avec `scrollIntoView` sur la section. Mise en avant des préconditions retournées par le serveur (`serverMissing`) en orange après une soumission rejetée.
  - [x] `<PublishPreconditionsList />` interne à `product-form.tsx`.
- [x] Page liste (`apps/web/app/producer/catalogue/catalogue-client.tsx`) : décompte `sold_out` ajouté à `counts`, filtre `sold_out` câblé côté client (`status === 'active' && stock === 0`).
- [ ] Tests E2E `apps/web/e2e/producer-catalogue.spec.ts` (étendu) — **différés** : la base E2E producteur reste sans fixtures « logged-in » au MVP (cohérent KAN-17/18/20/21/22). Les scénarios sont documentés dans `design.md` mais pas implémentés tant que le harnais auth n'est pas en place.
- [x] Mettre à jour `ARCHITECTURE.md` §18 : entrée 1.25 datée 2026-05-18 actant (a) le pattern « endpoint d'action `…/status` séparé du CRUD », (b) la contradiction documentée avec la décision KAN-22 (« pas de tab Épuisés ») et sa justification (subtask KAN-77).
- [ ] Mise à jour `produit/jira_mapping.md` (statut KAN-23 → `Examiner` au merge implémentation) — fait par le commit de mapping post-merge selon le cas B de CLAUDE.md, pas ici.
- [ ] (Différé KAN-56) Émission d'un éventuel event `product.status_changed` pour les notifications de transition.
- [ ] (Différé post-MVP) Job Inngest d'auto-désactivation pour les produits dont `availability_to` est échue.

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
