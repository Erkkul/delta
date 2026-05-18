# Tâches techniques internes — KAN-22 Stock & alertes

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> - KAN-74 : Renseigner le stock disponible et définir un seuil d'alerte
> - KAN-75 : Affichage automatique du statut « Épuisé » quand le stock atteint zéro

## Tâches

- [x] Étendre `ProductCreateInput` (`packages/contracts/src/product/create.ts`) avec `low_stock_threshold: z.number().int().min(0).nullable().optional()`.
- [x] Étendre `ProductUpdateInput` (`packages/contracts/src/product/update.ts`) idem.
- [x] Ajouter cas de test `low_stock_threshold` dans `packages/contracts/src/product/create.test.ts` et `update.test.ts` (null, 0, 5, négatif refusé, float refusé).
- [x] Propager `low_stock_threshold` dans `createProduct` et `updateProduct` (`packages/core/src/product/`) + tests unit (couvrir null par défaut, valeur explicite, réinitialisation via PATCH).
- [x] Vérifier que `productsRepo` (`packages/db/src/products/`) mappe bien `low_stock_threshold` en `create` et `update` — OK, `ProductInsert` / `ProductUpdate` (`types.ts:281,301,316`) exposent déjà le champ ; pas de modification repo nécessaire.
- [x] Vérifier que l'adapter web (`apps/web/lib/products/adapters.ts`) propage le champ — manquait en écriture (`create()`), corrigé.
- [x] Créer le helper pur `getStockDisplayState(product) → { kind, showSoldOutBadge }` — **placé dans `packages/core/src/product/stock-display.ts`** (et non `apps/web/lib/products/` comme initialement prévu) car (1) `apps/web` n'a pas vitest configuré, (2) la logique est pure et indépendante de React, (3) cohérent pattern « core porte les helpers métier purs ». Export via `packages/core/src/product/index.ts`.
- [x] Tests du helper : `packages/core/src/product/stock-display.test.ts`, 8 scénarios (ok, low stock<seuil, low stock=seuil inclusif, empty + active, empty + draft, empty + disabled, threshold null, threshold 0).
- [x] Modifier `apps/web/components/producer/catalogue/product-form.tsx` :
  - Retiré `disabled`, `readOnly`, classe `opacity-50`, libellé « (Bientôt — KAN-22) » du champ « Seuil d'alerte stock ».
  - Ajouté `lowStockThreshold` au state local + champ dans le payload PATCH/POST avec normalisation `"" → null`.
  - Validation locale : entier ≥ 0 sinon erreur inline « Le seuil d'alerte stock doit être un nombre entier ≥ 0 ».
  - Mis à jour le commentaire de tête de fichier (« 4. Stock, seuil d'alerte et fenêtre de disponibilité »).
- [x] Modifier `<ProductCard />` (`apps/web/components/producer/catalogue/product-card.tsx`) : consommer `getStockDisplayState`, ajouter un type interne `DisplayStatus = ProductStatus | 'sold_out'`, basculer badge + libellé stock selon `kind`.
- [x] Modifier `<ProductFormPreview />` : props étendues avec `stock` et `status`, badge orange « Épuisé » en haut à droite + avertissement secondaire orange sous le bloc conseil quand `stock === 0 && status === 'active'`.
- [x] Vérifier `test-helpers.ts` (`packages/core/src/product/test-helpers.ts`) — `low_stock_threshold: null` déjà présent (ligne 19), aucune modif nécessaire.
- [x] Étendre `ProductCardItem` (type) et la page édition (`apps/web/app/producer/catalogue/[id]/page.tsx`) + le client liste (`catalogue-client.tsx`) pour transporter `low_stock_threshold`.
- [x] Mettre à jour `ARCHITECTURE.md` §18 — entrée 1.24 datée 2026-05-18.
- [ ] Mettre à jour `produit/jira_mapping.md` (statut KAN-22 → `Examiner` au merge implémentation) — fait par le commit de mapping post-merge selon le cas B de CLAUDE.md, pas ici.
- [ ] (Différé KAN-56) Émission de l'event Inngest `product.stock_low` + consumer email/in-app/push.

> Note : le commentaire SQL `COMMENT ON COLUMN public.products.low_stock_threshold` mentionne « UI désactivée au MVP de KAN-20 » — laissé tel quel comme prévu dans la spec (la mention historique est inoffensive et reste juste sur la cible KAN-56).

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
