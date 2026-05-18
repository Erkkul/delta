# Tâches techniques internes — KAN-22 Stock & alertes

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> - KAN-74 : Renseigner le stock disponible et définir un seuil d'alerte
> - KAN-75 : Affichage automatique du statut « Épuisé » quand le stock atteint zéro

## Tâches

- [ ] Étendre `ProductCreateInput` (`packages/contracts/src/product/create.ts`) avec `low_stock_threshold: z.number().int().min(0).nullable().optional()`.
- [ ] Étendre `ProductUpdateInput` (`packages/contracts/src/product/update.ts`) idem.
- [ ] Ajouter cas de test `low_stock_threshold` dans `packages/contracts/src/product/create.test.ts` et `update.test.ts` (null, 0, 5, négatif refusé, float refusé).
- [ ] Propager `low_stock_threshold` dans `createProduct` et `updateProduct` (`packages/core/src/product/`) + tests unit (couvrir null par défaut, valeur explicite, réinitialisation via PATCH).
- [ ] Vérifier que `productsRepo` (`packages/db/src/products/`) mappe bien `low_stock_threshold` en `create` et `update` (types déjà exposés via `packages/db/src/types.ts:281,301,316` — purement vérification, à corriger si manquant).
- [ ] Vérifier que l'adapter web (`apps/web/lib/products/adapters.ts`) propage le champ dans les deux sens (lecture déjà câblée KAN-20 ligne 28 ; écriture à confirmer).
- [ ] Créer `apps/web/lib/products/stock-display.ts` : helper pur `getStockDisplayState(product) → { kind: 'ok' | 'low' | 'empty' }` + types exportés.
- [ ] Créer `apps/web/lib/products/stock-display.test.ts` : 5+ scénarios (ok, low avec stock = threshold, low avec stock < threshold, empty + active, empty + draft, threshold null).
- [ ] Modifier `apps/web/components/producer/catalogue/product-form.tsx` :
  - Retirer `disabled`, `readOnly`, la classe `opacity-50` et le libellé « (Bientôt — KAN-22) » du champ « Seuil d'alerte stock ».
  - Ajouter `lowStockThreshold` au state local + reset, et inclure dans le payload PATCH/POST (avec normalisation `"" → null`).
  - Mettre à jour le commentaire en tête (« 4. Stock et fenêtre de disponibilité (low_stock_threshold désactivé) » → version sans cette mention).
- [ ] Modifier le composant card de catalogue (`apps/web/components/producer/catalogue/product-card.tsx` ou nom équivalent) : consommer `getStockDisplayState`, basculer le badge `status-badge` vers `epuise` quand le helper renvoie `empty` + `status === 'active'`, basculer la ligne `product-stock` vers `low` / `empty` selon le `kind`.
- [ ] Modifier `<ProductFormPreview />` (composant preview de PR-05) : afficher le badge stock dérivé et une note secondaire orange « Ce produit apparaîtra comme épuisé » quand `stock === 0 && status === 'active'`.
- [ ] Vérifier que les fixtures de test repo / core qui créent un produit acceptent `low_stock_threshold` (ajustement minimal des `test-helpers.ts` si besoin — ligne 19 référence déjà `low_stock_threshold: null`).
- [ ] (Optionnel) Mettre à jour le snapshot du commentaire SQL `COMMENT ON COLUMN public.products.low_stock_threshold` si la mention « UI désactivée au MVP de KAN-20 » devient trompeuse. Décision : laisser tel quel pour éviter une migration de doc — la mention historique est inoffensive et le commentaire reste juste sur la cible KAN-56 (notif delivery).
- [ ] Mettre à jour `produit/jira_mapping.md` : ligne de KAN-22 dans la table « Catalogue Jira complet » + cellule « Tickets liés » du PR-05 dans le parcours Producteur — ajouter mention `[Cadrage tech](specs/KAN-22/)` ; ajuster la ligne « État au YYYY-MM-DD » si nécessaire.
- [ ] Mettre à jour `ARCHITECTURE.md` §18 (journal) avec une entrée datée résumant la livraison KAN-22 (au moment du merge implémentation, pas du cadrage).

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
