# Cadrage — KAN-22 Stock & alertes

## Liens

- Jira : https://erkulaws.atlassian.net/browse/KAN-22
- Epic : KAN-5 Catalogue
- Maquettes :
  - `design/maquettes/producteur/pr-05-edition-produit.html` (section 4 « Stock et disponibilité » — champ « Seuil d'alerte stock » actuellement désactivé par KAN-20)
  - `design/maquettes/producteur/pr-04-catalogue.html` (badges `.status-badge.epuise`, `.product-stock.low`, `.product-stock.empty` — CSS déjà posé)
- PRD : §10.2 PR-05 Création / édition produit, §10.2 PR-04 Catalogue produits
- ARCHITECTURE : §5 (DB — colonne `low_stock_threshold` déjà présente), §7.1 (event `product.updated` — toujours hors scope), §14 (playbook), §18 entrée 1.22 (table `products` posée par KAN-20)

## Pourquoi (côté tech)

KAN-20 a livré la table `products` avec la colonne `low_stock_threshold integer` nullable, la CHECK `products_low_stock_threshold_nonneg`, et un champ « Seuil d'alerte stock » désactivé dans le formulaire PR-05 (overlay « Bientôt — KAN-22 »). Le snapshot de produit expose déjà la valeur (`packages/contracts/src/product/snapshot.ts:36`), mais aucun des schémas d'input (`ProductCreateInput`, `ProductUpdateInput`) ni des use cases (`createProduct`, `updateProduct`) ne la propage. Aucune logique d'affichage de stock dérivé (« Épuisé », « stock bas ») n'est câblée.

KAN-22 active réellement la couche stock du catalogue producteur : (a) persistance du seuil d'alerte (subtask KAN-74), (b) affichage automatique de l'état « Épuisé » en UI quand le stock atteint zéro (subtask KAN-75), (c) affichage de l'état « stock bas » quand `stock ≤ low_stock_threshold`. Aucune migration DB n'est nécessaire — tout est déjà préparé. La **delivery effective des notifications** (email / in-app / push quand le seuil est franchi) reste portée par KAN-56 (épic Notifications) ; KAN-22 ne câble pas d'event Inngest tant que son consommateur n'existe pas.

## Périmètre technique

**In scope :**

- Étendre `ProductCreateInput` et `ProductUpdateInput` (`packages/contracts/src/product/create.ts`, `update.ts`) avec `low_stock_threshold: z.number().int().min(0).nullable().optional()`. Tests Zod associés (`create.test.ts`, `update.test.ts`).
- Propager le champ dans les use cases `createProduct` et `updateProduct` (`packages/core/src/product/`) + tests unitaires.
- Propager dans le repo `productsRepo` (`packages/db/src/products/`) — `Insert` et `Update` types incluent déjà `low_stock_threshold` (cf. `packages/db/src/types.ts:281,301,316`), à vérifier que les mapping helpers le passent.
- Propager dans l'adapter web (`apps/web/lib/products/adapters.ts`) — déjà mappé en lecture, à vérifier en écriture.
- Activer le champ « Seuil d'alerte stock » dans `apps/web/components/producer/catalogue/product-form.tsx` (retirer `disabled`, l'overlay « Bientôt — KAN-22 », câbler l'état local `lowStockThreshold` et l'inclure dans le PATCH/POST).
- Helper UI `getStockDisplayState(product) → { kind: 'ok' | 'low' | 'empty', label: string }` dans `apps/web/lib/products/stock-display.ts`. Logique pure :
  - `stock === 0 && status === 'active'` → `empty` (badge « Épuisé » + libellé barré « Inactif »)
  - `stock > 0 && low_stock_threshold != null && stock <= low_stock_threshold` → `low` (libellé « ⚠ N en stock » orange)
  - sinon → `ok` (libellé « N en stock »)
- Câblage du helper dans `<ProductCard />` (catalogue PR-04) : remplacer le libellé statique par `<StockBadge state={…} />`, idem pour le badge de statut (afficher `epuise` au lieu de `actif` quand `stock === 0`).
- Câblage du helper dans `<ProductFormPreview />` (panneau droit de PR-05) : refléter l'état stock dans la card de prévisualisation.
- Tests unit du helper `getStockDisplayState` (5 scénarios : ok, low, empty-active, empty-draft, threshold-null).
- Si la liste PR-04 expose un compteur statut (badge filtres) : ajouter le décompte « Épuisés » dérivé côté liste (côté serveur via `WHERE stock = 0 AND status = 'active'`, optionnel — voir Hypothèses).

**Out of scope (cette US) :**

- **Notification delivery (event `product.stock_low`)** : émission + consumer (email Resend / in-app KAN-55 / push KAN-54) sont portés par KAN-56 « Alertes stock producteur » sous l'épic Notifications. Émettre un event sans consumer reviendrait à introduire du code mort — décision : on attend KAN-56. La donnée nécessaire (snapshot pré-update / post-update du stock + seuil) sera disponible côté use case `updateProduct` quand KAN-56 arrivera, sans changement structurel.
- **Nouvelle valeur enum `product_status = 'sold_out'`** : refusé. « Épuisé » est un état **dérivé** à l'affichage (fonction de `stock` + `status`), pas un statut applicatif persisté. Cohérent avec le pattern « status enum = visibilité applicative » documenté par KAN-20 (commentaire SQL ligne 89 de la migration). Évite la complexité d'un mini-state-machine produit (`active ↔ sold_out` au gré des updates de stock) et la divergence DB / réalité (un producteur qui ré-approvisionne `stock = 24` veut que le badge « Actif » revienne automatiquement).
- **Gating catalogue acheteur sur stock = 0** : la RLS `products_select_public` filtre actuellement sur `status = 'active'` mais pas sur `stock > 0`. KAN-22 ne touche pas à cette RLS — la question « un produit épuisé est-il visible à l'acheteur » relève de KAN-28 (catalogue acheteur) qui définira la stratégie (masquage, badge épuisé, ajout possible en wishlist, etc.).
- **Workflow draft → active dépendant du stock** : aucun pré-requis ajouté (KAN-23 gère).
- **Décrémentation automatique du stock lors d'une réservation** : modélisée par KAN-31 (Notification & confirmation match) + KAN-34 (Escrow). KAN-22 ne touche pas le stock côté flow de commande.
- **Migration DB** : aucune. La colonne, la CHECK et le commentaire existent déjà.
- **Mobile** : non livré (cohérent avec l'épic KAN-5).

## Hypothèses

- La valeur `low_stock_threshold = 0` est techniquement valide (CHECK `>= 0`) mais sans intérêt métier (alerte permanente). Le placeholder UI suggère « ex : 5 » et le helper text « Notification quand stock ≤ ce seuil » reste tel quel — pas de validation Zod supplémentaire pour interdire 0.
- `low_stock_threshold = null` (cas par défaut) signifie « pas d'alerte » : aucun badge « stock bas » affiché, quel que soit le stock. Cohérent avec la maquette PR-04 où la card sans seuil affiche « 18 en stock » sans warning.
- L'état « Épuisé » s'applique uniquement quand `status = 'active'`. Pour `status = 'draft'` ou `'disabled'`, le stock n'a pas d'effet visuel — le badge de statut existant prime (« Brouillon », « Désactivé »). C'est cohérent avec la maquette PR-04 (la card « Désactivée » montre `stock empty` barré « Inactif » sans badge « Épuisé » distinct).
- Le compteur de filtres « Tous (N) / Actifs (N) / Brouillons (N) / Désactivés (N) » de la maquette PR-04 ne distingue pas « Actifs » et « Épuisés » dans les tabs : un produit `status = active, stock = 0` reste comptabilisé dans « Actifs ». Le badge `epuise` est purement visuel sur la card. Pas de nouveau tab « Épuisés ».
- La règle « Stock ≤ seuil » est strictement inclusive : `stock = threshold` déclenche le badge « stock bas ». Cohérent avec le helper text de la maquette PR-05 (« Notification quand stock ≤ ce seuil »).
- Le champ « Seuil d'alerte stock » accepte une valeur **vide** (= `null` persisté). Si l'utilisateur entre une valeur puis efface, le PATCH transmet `null` explicitement (cohérent avec le pattern `description: null` côté `ProductUpdateInput`).
- Pas d'événement Inngest émis. Le jour où KAN-56 arrive, le hook se posera dans `updateProduct` (use case core) — la signature actuelle expose déjà `previousStock` côté repo si besoin, ou un re-fetch léger suffira. Pas de provision structurelle nécessaire au MVP de KAN-22.
- Les composants UI restent dans `apps/web/components/producer/catalogue/` (pas de promotion vers `packages/ui-web/`) — cohérent KAN-20/21, pas de réutilisation cross-app prévue.
