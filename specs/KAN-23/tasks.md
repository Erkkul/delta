# Tâches techniques internes — KAN-23 Statuts produit

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> - KAN-76 : Passer un produit de Brouillon à Actif ou le Désactiver temporairement
> - KAN-77 : Visualiser la liste des produits avec leur statut (Actif / Brouillon / Désactivé / Épuisé)

## Tâches

- [ ] Helper pur `getPublishPreconditions(product) → { ok: boolean, missing: ('name'|'description'|'price'|'stock'|'photos'|'availability')[] }` dans `packages/core/src/product/publish-preconditions.ts` + tests (couvrir chaque précondition + agrégat). Export depuis `packages/core/src/product/index.ts`.
- [ ] Use case `transitionProductStatus` dans `packages/core/src/product/transition-product-status.ts` :
  - Signature `(ctx, { productId, targetStatus, ownerUserId })` cohérente avec `updateProduct`.
  - Fetch produit owner (sinon `PRODUCT_NOT_FOUND` ou `PRODUCT_FORBIDDEN`).
  - Vérifier graphe de transitions ; refuser no-op et statuts inconnus avec `PRODUCT_TRANSITION_INVALID`.
  - Si `targetStatus = 'active'` : appliquer `getPublishPreconditions` ; si manquant, retourner `PRODUCT_TRANSITION_INVALID` avec `details.missing`.
  - Update DB via `productsRepo.update({ status })`.
- [ ] Erreurs typées dans `packages/core/src/product/errors.ts` (ou équivalent) : `PRODUCT_TRANSITION_INVALID` (+ un champ `details.missing?: string[]`).
- [ ] Schemas Zod :
  - [ ] `packages/contracts/src/product/transition-status.ts` (input du nouvel endpoint).
  - [ ] Étendre `packages/contracts/src/product/list.ts` : `status` accepte `'sold_out'`, ajouter `counts` à la response.
  - [ ] Tests Zod associés.
- [ ] Repo `packages/db/src/products/repo.ts` :
  - [ ] `findByOwner` : accepter `status = 'sold_out'` (traduit en `WHERE status = 'active' AND stock = 0`).
  - [ ] Nouvelle méthode `countByOwnerGroupedByStatus(ownerUserId)` retournant `{ all, active, draft, disabled, sold_out }` en une seule requête (`COUNT(*) FILTER`).
- [ ] Route handler `apps/web/app/api/v1/producer/products/[id]/status/route.ts` :
  - [ ] `POST` valide Zod input, appelle `transitionProductStatus`, mappe les erreurs typées en statuts HTTP (cf. ARCHITECTURE §4.3).
- [ ] Étendre `apps/web/app/api/v1/producer/products/route.ts` (`GET`) : accepter `status=sold_out`, retourner `counts`.
- [ ] Décision technique dans le handler `PATCH /[id]` : si `status` est présent dans le body et diffère de l'actuel, **router en interne** vers `transitionProductStatus` après avoir appliqué les autres champs. Documenter en commentaire de tête du fichier.
- [ ] Adapter web `apps/web/lib/products/adapter.ts` : nouvelle méthode `transitionStatus(productId, targetStatus)` qui appelle le nouveau endpoint.
- [ ] Composants :
  - [ ] `apps/web/components/producer/catalogue/catalogue-filters.tsx` : ajout du tab « Épuisés » avec compteur, style orange pour actif.
  - [ ] `apps/web/components/producer/catalogue/product-card.tsx` : câblage du menu kebab via `<DropdownMenu />` (shadcn), actions dynamiques selon le statut, toast succès / erreur, lien « Compléter la fiche » si précondition manquante.
  - [ ] `apps/web/components/producer/catalogue/product-form.tsx` : sous le radio `Actif`, bloc « Pour publier, il faut » alimenté par `getPublishPreconditions`. Lecture de `?focus=publish` au mount pour scroll + highlight section 5.
  - [ ] (Optionnel) Nouveau composant `<PublishPreconditionsList />` interne au form ou dans un fichier dédié.
- [ ] Page liste : passer `response.counts` à `<CatalogueFilters />` ; re-fetch après transition.
- [ ] Tests E2E `apps/web/e2e/producer-catalogue.spec.ts` (étendu) : 5 scénarios listés dans design.md.
- [ ] Mettre à jour `ARCHITECTURE.md` §18 : nouvelle entrée datée pour acter (a) le pattern « endpoint d'action `…/status` séparé du CRUD », (b) la contradiction documentée avec la décision KAN-22 (« pas de tab Épuisés ») et sa justification (subtask KAN-77).
- [ ] Mise à jour `produit/jira_mapping.md` (statut KAN-23 → `Examiner` au merge implémentation) — fait par le commit de mapping post-merge selon le cas B de CLAUDE.md, pas ici.
- [ ] (Différé KAN-56) Émission d'un éventuel event `product.status_changed` pour les notifications de transition.
- [ ] (Différé post-MVP) Job Inngest d'auto-désactivation pour les produits dont `availability_to` est échue.

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
