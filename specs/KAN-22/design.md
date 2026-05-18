# Conception technique — KAN-22 Stock & alertes

## Vue d'ensemble

KAN-22 est un câblage applicatif sans migration. La colonne `low_stock_threshold` posée par KAN-20 est propagée à travers les schémas Zod, les use cases, le repo, l'adapter web, et le formulaire. En parallèle, un helper d'affichage pur dérive l'état stock (`ok` / `low` / `empty`) à partir du couple `(stock, low_stock_threshold, status)` et alimente les badges de la card produit (PR-04) et du panneau preview (PR-05).

Pas de state machine, pas d'event Inngest, pas de DB change. Le mouvement principal est la propagation d'un champ existant + une logique d'affichage pure. Toute la complexité est dans la séparation propre des frontières : la notification effective (KAN-56) reste différée, le gating acheteur (KAN-28) reste hors scope, le workflow statut (KAN-23) reste indépendant.

## Packages touchés

- [x] `packages/contracts` — `ProductCreateInput`, `ProductUpdateInput` : ajout de `low_stock_threshold` (nullable optional)
- [x] `packages/core` — use cases `createProduct`, `updateProduct` : propager le champ ; pas de nouvelle erreur typée
- [x] `packages/db` — vérifier que `productsRepo` mappe bien le champ en `create` / `update` (les types `Insert` / `Update` l'exposent déjà via `types.ts`)
- [x] `apps/web` — `product-form.tsx` (activation du champ), `product-card.tsx` ou équivalent dans `components/producer/catalogue/`, `lib/products/stock-display.ts` (nouveau helper), `lib/products/adapters.ts` (vérification du mapping en écriture)
- [ ] `apps/mobile` — hors scope
- [ ] `packages/jobs` — pas d'event au MVP (KAN-56)
- [ ] `supabase/migrations` — aucune migration (colonne déjà présente)
- [ ] `supabase/policies` — aucun changement RLS (KAN-28 gérera le gating acheteur)
- [ ] `packages/ui-web` — non promu (cohérent KAN-20/21)

## Modèle de données

Aucun changement. Pour mémoire, la colonne existe déjà :

| Colonne | Type | Note |
|---|---|---|
| `low_stock_threshold` | `integer` | nullable, `CHECK low_stock_threshold IS NULL OR >= 0` (contrainte `products_low_stock_threshold_nonneg`). Commentaire SQL : « Seuil d'alerte stock (≥ 0, nullable). Câblé par KAN-22 (jobs notif `product.stock_low`). UI désactivée au MVP de KAN-20. » — à laisser tel quel, la mention « jobs notif » documente la cible KAN-56 sans engager KAN-22.

Référence : `supabase/migrations/20260518000000_create_products.sql:104,177-180`, ARCHITECTURE.md §5, §18 entrée 1.22.

## API / Endpoints

Aucun nouvel endpoint. Les endpoints existants acceptent désormais `low_stock_threshold` :

- `POST /api/v1/producer/products` — body étendu : `{ ..., low_stock_threshold?: number | null }`. Validation Zod : entier ≥ 0 ou `null`.
- `PATCH /api/v1/producer/products/[id]` — idem, en optionnel partiel. `null` est accepté pour réinitialiser le seuil.

Le `GET` (liste + détail) retourne déjà le champ via le snapshot (KAN-20).

Pas de nouvelle erreur typée. Les bornes Zod (≥ 0) suffisent : un input invalide retourne `VALIDATION_ERROR` standard (cf. ARCHITECTURE.md §4.3).

## Impact state machine / events

Aucun. Pas de transition mission impactée. **Aucun event Inngest émis** : l'event `product.stock_low` cible KAN-56 (épic Notifications), pas KAN-22 — émettre sans consumer reviendrait à introduire du code mort.

Pour mémoire, ARCHITECTURE.md §7.1 documente déjà `product.updated` comme déclencheur de recompute matching ; cet event reste différé à KAN-42 (matching) — non émis par KAN-22.

## Dépendances

Services externes : aucun nouveau. Référence : ARCHITECTURE.md §2. Pas de mise à jour `tech/setup.md`.

Internes :
- Table `products` (KAN-20) — colonne `low_stock_threshold` déjà créée.
- Composant `<ProductForm />` (KAN-20) — extension du champ désactivé existant.
- Composant `<ProductCard />` ou équivalent dans `apps/web/components/producer/catalogue/` (KAN-20) — câblage du badge stock.
- `<ProductFormPreview />` (KAN-20) — câblage de l'état stock dans la card de preview.
- `apps/web/lib/products/adapters.ts` (KAN-20) — vérification du mapping écriture.

Aucune dépendance KAN-56 / KAN-54 / KAN-55 (différé).

## État UI

Référence : `DESIGN.md` (tokens, breakpoints), maquettes PR-05 (section 4) et PR-04 (CSS badges déjà posé : `.status-badge.epuise`, `.product-stock.low`, `.product-stock.empty`).

**Formulaire PR-05 — Section 4 « Stock et disponibilité » :**
- Champ « Seuil d'alerte stock » : retirer `disabled`, retirer l'overlay/libellé « (Bientôt — KAN-22) ». Conserver le helper text « Notification quand stock ≤ ce seuil. » (cohérent avec la maquette, et toujours vrai même si la notif effective arrive avec KAN-56 — l'écrit est neutre sur le canal).
- Placeholder : `5` (cohérent avec la maquette).
- Unité affichée à droite : dérivée du `packaging` choisi (cohérent avec le champ stock voisin, déjà câblé par KAN-20 via `unitShort`).
- Type input : `number`, `min={0}`, `step={1}`, valeur vide = `null` à l'envoi.

**Catalogue PR-04 — `<ProductCard />` :**
- Badge en haut à gauche (`status-badge`) : si `stock === 0 && status === 'active'` → badge `epuise` (« Épuisé », CSS déjà posé). Sinon → badge correspondant au `status` (`actif` / `brouillon` / `desactive` — déjà câblé KAN-20).
- Ligne stock sous le nom du produit :
  - `stock === 0` → libellé barré « Épuisé » avec classe `product-stock.empty` (la maquette utilise « Inactif » pour un produit `disabled` ; on aligne sur « Épuisé » quand `status = 'active'` pour clarté).
  - `stock > 0 && low_stock_threshold != null && stock <= low_stock_threshold` → « ⚠ N en stock » avec classe `product-stock.low`.
  - sinon → « N en stock » (libellé neutre).
- Pas de nouveau tab de filtre « Épuisés » dans la liste — le badge visuel suffit.

**Preview PR-05 — `<ProductFormPreview />` :**
- La card mockée vue acheteur reflète le badge stock (utiliser le même `<StockBadge />`).
- Si `stock === 0` la note pédagogique « Ajoutez une photo… » est conservée ; un avertissement secondaire « Ce produit apparaîtra comme épuisé » est ajouté en orange sobre.

**Composants à toucher dans `apps/web/components/producer/catalogue/` :**
- `product-form.tsx` : activer le champ + ajouter au state local + au payload PATCH/POST.
- `product-card.tsx` (ou nom équivalent) : consommer `getStockDisplayState`.
- `product-form-preview.tsx` (ou équivalent) : idem.
- Nouveau : `apps/web/lib/products/stock-display.ts` (helper pur, testable hors React).

Mobile : non livré.

## Risques techniques

- **`null` côté input number** : le composant `<input type="number">` envoie une string vide quand l'utilisateur efface. Le state local doit normaliser `"" → null` avant l'envoi, et le payload PATCH doit transmettre `null` explicitement (pas `undefined`, sinon le champ n'est pas touché — pattern déjà utilisé sur `description` côté KAN-20). Test E2E pour couvrir : « renseigner un seuil, sauver, revenir, effacer, sauver → snapshot retourne `null` ».
- **Re-render coût `getStockDisplayState`** : helper pur sans coût. Pas de mémorisation nécessaire.
- **Cohérence du badge sur produit `draft` avec stock = 0** : décision retenue → ne pas afficher « Épuisé » pour un brouillon (le badge `brouillon` prime). Test unit explicite.
- **Pas d'event Inngest = pas de notification au merge** : c'est volontaire et documenté en proposal. Risque côté produit : un utilisateur configure un seuil et s'attend à recevoir une alerte. Mitigation : l'écran PR-05 reste muet sur le canal (« Notification quand… ») — neutre. Si une mention produit explicite est nécessaire (« Les alertes arrivent prochainement »), à arbitrer en review.
- **Affichage côté catalogue acheteur** : non touché. Un acheteur peut donc voir un produit `stock = 0` tant que `status = 'active'`. C'est la responsabilité de KAN-28 de gérer ce gating (ou pas). À documenter dans le commentaire du commit / PR pour ne pas surprendre.
- **Compteurs de filtres** : la maquette PR-04 affiche des compteurs `(N)` sur chaque pill. Ces compteurs sont déjà câblés par KAN-20 sur `status`. KAN-22 ne touche pas — l'ajout éventuel d'un compteur « Épuisés » est out of scope.
- **Test pre-existing** : `snapshot.test.ts:14` utilise `low_stock_threshold: null`. À vérifier que les fixtures de test des use cases / E2E couvrent aussi des valeurs non-null.

## Tests envisagés

Référence : ARCHITECTURE.md §10.

- **Unit contracts (`packages/contracts/src/product/`)** :
  - `create.test.ts` : `low_stock_threshold` accepté (null, 0, 5), refusé (-1, "5", float).
  - `update.test.ts` : idem + cas `null` pour réinitialiser, `undefined` pour ne pas toucher.
- **Unit core (`packages/core/src/product/`)** :
  - `create-product.test.ts` : `low_stock_threshold` propagé dans le payload repo (null par défaut, valeur explicite).
  - `update-product.test.ts` : `low_stock_threshold` propagé en PATCH (mise à jour, réinitialisation `null`, absence = pas de touche).
- **Unit display (`apps/web/lib/products/stock-display.test.ts`)** :
  - `stock = 0, status = 'active'` → `empty`.
  - `stock = 0, status = 'draft'` → état neutre (le badge brouillon prime, le helper renvoie `empty` mais le composant `<ProductCard />` n'affiche pas le badge `epuise`).
  - `stock = 3, threshold = 5` → `low`.
  - `stock = 5, threshold = 5` → `low` (inclusif).
  - `stock = 10, threshold = 5` → `ok`.
  - `stock = 10, threshold = null` → `ok`.
- **E2E web Playwright** (`apps/web/e2e/producer-catalogue.spec.ts`) — déféré si fixtures auth producteur non disponibles (cohérent KAN-20/21), sinon :
  - Producteur édite un produit, renseigne `low_stock_threshold = 5`, sauve, recharge → seuil persisté.
  - Producteur passe `stock` à 0, sauve → la card du catalogue affiche badge « Épuisé ».
  - Producteur efface le seuil, sauve → snapshot retourne `null`, badge « stock bas » disparaît.
