# Conception technique — KAN-23 Statuts produit

## Vue d'ensemble

Mouvement principal : ajouter un mini-graphe de transitions au-dessus de la table `products` existante, sans migration. Toute la logique est applicative et tient dans (a) un use case `transitionProductStatus` qui valide la transition + applique les préconditions de publication, (b) un endpoint d'action dédié `POST /…/status`, (c) du câblage UI sur deux composants déjà livrés (`<CatalogueFilters />` et `<ProductCard />` pour le tab « Épuisés » et le menu kebab) et un nouveau bloc inline dans `<ProductForm />`.

Pas de state machine formelle (pas de discriminated union à la Mission §6 ARCHITECTURE) : trois statuts, six transitions, c'est sous le seuil où une `switch` lisible coûte moins qu'une abstraction. Pas d'event Inngest, pas d'`audit_trail` — la traçabilité des transitions est différée.

## Packages touchés

Référence : ARCHITECTURE.md §14.2.

- [x] `packages/contracts` — nouveau `productTransitionStatusInput` (Zod), extension de `productListQuerySchema` (status accepte `'sold_out'`), erreurs typées exposées
- [x] `packages/core` — nouveau use case `transition-product-status.ts` + erreurs `PRODUCT_TRANSITION_*`, helper pur `getPublishPreconditions(product)` (réutilisé UI + use case)
- [x] `packages/db` — pas de schema neuf ; `productsRepo.findByOwner` étendu pour accepter le filtre `sold_out` et retourner les `counts` (5 valeurs)
- [x] `apps/web` — adapter web (`apps/web/lib/products/adapter.ts`) : nouvelle méthode `transitionStatus`, route handler `app/api/v1/producer/products/[id]/status/route.ts`, composants `<CatalogueFilters />`, `<ProductCard />`, `<ProductForm />`
- [ ] `apps/mobile` — hors scope
- [ ] `packages/jobs` — aucun event au MVP (différé KAN-56)
- [ ] `supabase/migrations` — aucune migration
- [ ] `supabase/policies` — pas de changement RLS (le filtre `sold_out` est appliqué côté repo, RLS owner `auth.uid() = producer_user_id` couvre déjà tout)
- [ ] `packages/ui-web` — non promu (cohérent KAN-20/21/22)

## Modèle de données

Aucun changement DB. Pour mémoire :

| Colonne | Type | Note |
|---|---|---|
| `status` | `product_status not null default 'active'` | enum `'active' \| 'draft' \| 'disabled'`. CHECK existant (KAN-20). |

Le statut dérivé `sold_out` n'est **pas** persisté — calculé à la lecture (`status = 'active' AND stock = 0`). Cohérent avec la décision documentée dans `specs/KAN-22/proposal.md` (« Nouvelle valeur enum `product_status = 'sold_out'` : refusé »).

Référence : `supabase/migrations/20260518000000_create_products.sql`, ARCHITECTURE.md §5, §18 entrée 1.22.

## API / Endpoints

Référence : ARCHITECTURE.md §3, §4.3, §14.2.

- **Nouveau** : `POST /api/v1/producer/products/[id]/status`
  - Body Zod : `{ status: 'active' | 'draft' | 'disabled' }`.
  - Use case : `transitionProductStatus(productId, targetStatus, ownerUserId)`.
  - Réponses : `200 OK` avec snapshot du produit ; `400 PRODUCT_TRANSITION_INVALID` (transition non autorisée) ; `400 PRODUCT_PUBLISH_MISSING_*` (préconditions) ; `404 PRODUCT_NOT_FOUND` ; `403 PRODUCT_FORBIDDEN`.
- **Étendu** : `GET /api/v1/producer/products`
  - Query Zod : `status: z.enum(['all','active','draft','disabled','sold_out']).optional()` (au lieu de `'all' | 'active' | 'draft' | 'disabled'` côté KAN-20).
  - Response : ajout d'un objet `counts: { all, active, draft, disabled, sold_out }` à côté de `{ items, nextCursor }`. Toujours retourné (même en mode filtré, pour stabiliser les badges des tabs).
- **Inchangés** : `POST`, `GET /[id]`, `PATCH /[id]`, `DELETE /[id]`. Le `PATCH` accepte toujours `status` ; si `status` est présent et différent de l'actuel, le handler **délègue** au use case `transitionProductStatus` plutôt que d'appliquer un update naïf. Évite la divergence des chemins (cf. proposal § Hypothèses).

Erreurs typées (nouvelles) :

- `PRODUCT_TRANSITION_INVALID` — la transition n'est pas dans le graphe (ex : appelée vers le statut courant, ou statut inconnu).
- `PRODUCT_PUBLISH_MISSING_NAME` — non null mais vide après trim (sécurité ; en pratique bloqué par le CHECK DB sur `length ≥ 1`).
- `PRODUCT_PUBLISH_MISSING_DESCRIPTION` — null ou vide après trim.
- `PRODUCT_PUBLISH_MISSING_PRICE` — `unit_price_cents <= 0` (sécurité ; bloqué par CHECK DB).
- `PRODUCT_PUBLISH_MISSING_STOCK` — `stock <= 0`.
- `PRODUCT_PUBLISH_MISSING_PHOTOS` — `photos` vide.
- `PRODUCT_PUBLISH_AVAILABILITY_EXPIRED` — `availability_to < current_date`.

Chaque erreur expose un `details` listant la précondition manquante pour permettre à l'UI d'afficher un message ciblé.

## Impact state machine / events

Aucun. Pas de transition mission impactée, aucun event Inngest émis (cohérent KAN-22 — pas de consumer en place). La table `mission_events` (ARCHITECTURE §6) n'est pas touchée — pas d'équivalent `product_events` créé au MVP.

## Dépendances

Services externes : aucun. Référence : ARCHITECTURE.md §2. Pas de mise à jour `tech/setup.md`.

Internes :

- Table `products` (KAN-20) — colonnes `status`, `stock`, `photos`, `description`, `availability_to` lues pour les préconditions.
- Use case `updateProduct` (KAN-20) — pattern repris pour la signature du nouveau use case (auth via `ownerUserId`, fetch + update, erreur typée si non trouvé).
- Helper `getStockDisplayState` (KAN-22, dans `packages/core/src/product/stock-display.ts`) — non touché, la dérivation `sold_out` reste pure côté affichage. Le filtrage `sold_out` côté liste est implémenté **séparément** dans le repo (clause `WHERE status = 'active' AND stock = 0`) pour cohérence DB.
- Composant `<CatalogueFilters />` (KAN-20) — étendu avec un 5ᵉ tab.
- Composant `<ProductCard />` (KAN-20/22) — menu kebab câblé.
- Composant `<ProductForm />` (KAN-20/22) — section 5 enrichie de messages inline.

## État UI

Référence : DESIGN.md (tokens, breakpoints) ; maquettes PR-04 et PR-05.

**Catalogue PR-04 — `<CatalogueFilters />` :**

- 5 tabs : `Tous (N) / Actifs (N) / Brouillons (N) / Désactivés (N) / Épuisés (N)`.
- Le tab actif applique `?status=<value>` à la query de liste.
- Compteurs récupérés depuis `response.counts` (re-fetch après transition).
- Style : tab « Épuisés » réutilise la couleur orange `--orange-500` du badge `epuise` pour l'indicateur actif (cohérent visuel avec la card). Le CSS du tab `filter-pill.active` reste vert ; le tab Épuisés actif passe en orange (`background: var(--orange-500)`). À valider visuellement en review.

**Catalogue PR-04 — `<ProductCard />` :**

- Menu kebab `product-menu-btn` : `onClick` ouvre un `<DropdownMenu />` (réutilisable shadcn). Actions selon le statut courant :
  - `active` → « Mettre en brouillon » + « Désactiver » + (séparateur) « Supprimer »
  - `draft` → « Publier » (= transition vers `active`) + « Désactiver » + (séparateur) « Supprimer »
  - `disabled` → « Réactiver » (= transition vers `active`) + « Mettre en brouillon » + (séparateur) « Supprimer »
- Chaque clic → `POST .../status` → `toast.success("Produit publié")` ou `toast.error(...)`. En cas d'erreur de précondition, le toast inclut un lien « Compléter la fiche » qui pointe sur `/producer/catalogue/[id]` avec query `?focus=publish` (le formulaire scrolle sur la section 5 et affiche la liste des préconditions manquantes en rouge).
- Badge `epuise` (KAN-22) reste affiché tel quel quand `stock = 0 && status = 'active'`.

**Formulaire PR-05 — `<ProductForm />`, section 5 « Visibilité » :**

- Sous le radio `Actif`, un bloc compact « Pour publier, il faut » qui liste dynamiquement les préconditions manquantes (basées sur le helper `getPublishPreconditions(product)`). Coché ✓ vert = OK, ◯ gris = manquant.
- Le bouton « Enregistrer » reste **toujours actif** : si l'utilisateur soumet `status = 'active'` avec préconditions manquantes, le serveur renvoie l'erreur typée → toast d'erreur ciblé + scroll sur la section 5 + highlight des préconditions manquantes.
- Si `?focus=publish` est dans l'URL au chargement, scroll initial sur la section 5 et tooltip ouvert.

**Préconditions affichées (libellés FR) :**

- « Un nom » ✓ (toujours présent — sécurité)
- « Une description » (requis non vide)
- « Un prix > 0 € »
- « Au moins 1 article en stock »
- « Au moins 1 photo »
- « Une fenêtre de disponibilité valide » (si `availability_to` est dans le passé)

**Composants nouveaux / modifiés dans `apps/web/components/producer/catalogue/` :**

- `catalogue-filters.tsx` — ajout du tab « Épuisés », couleur orange pour actif.
- `product-card.tsx` — ajout du `<DropdownMenu />` câblé, handlers de transition.
- `product-form.tsx` — section 5 enrichie ; ajout du bloc « Pour publier, il faut » dynamique.
- Nouveau composant `<PublishPreconditionsList />` (interne à `product-form.tsx` ou fichier dédié) qui mappe le retour de `getPublishPreconditions` à la liste cochée.

Mobile : non livré.

## Risques techniques

- **`PATCH /[id]` qui contient `status` + autres champs** : si l'utilisateur édite description ET passe en `active` dans la même soumission, le handler doit appliquer d'abord les autres champs (`updateProduct`), puis tenter la transition (`transitionProductStatus`). Sinon les préconditions se déclencheront sur l'état **pré-update**. Ordre à formaliser dans le handler `PATCH` (cf. tasks.md). Test E2E ciblé à écrire.
- **Concurrence transition / update** : un producteur clique « Désactiver » dans le menu kebab pendant que la liste se re-fetch après une autre action. Pas de verrou pessimiste — l'`updated_at` du snapshot permet une vérification optimiste si nécessaire, mais on accepte le « last write wins » au MVP.
- **Décompte `sold_out`** : la requête SQL `COUNT(*) FILTER (WHERE status = 'active' AND stock = 0)` se calcule sans nouveau index (l'index `(producer_user_id, status) WHERE deleted_at IS NULL` posé par KAN-20 couvre déjà le scan). À surveiller si un producteur a > 1000 produits — peu probable au MVP.
- **Erreurs typées en cascade** : si plusieurs préconditions sont manquantes, le use case doit toutes les retourner d'un coup (`PRODUCT_TRANSITION_INVALID` avec `details.missing: ['photos', 'stock']`) plutôt qu'au compte-gouttes. Sinon l'UI doit faire N allers-retours pour voir tous les manques. Convention de retour à formaliser.
- **Tab Épuisés en orange** : si la couleur jure dans la grille des tabs (vert / vert / vert / vert / orange), tomber sur un style plus neutre (border orange + texte orange, mais background blanc). À tester visuellement.
- **`focus=publish` côté URL** : nouvelle convention, à documenter en commentaire de tête du `<ProductForm />`. Pas de risque d'XSS (query param consommée via `useSearchParams` Next, jamais injectée dans le DOM).
- **Conformité avec décision KAN-22 (« pas de tab Épuisés »)** : KAN-23 contredit. Justifié par le subtask KAN-77. À mentionner explicitement dans le commit + journal §18 d'ARCHITECTURE.md.

## Tests envisagés

Référence : ARCHITECTURE.md §10.

- **Unit contracts (`packages/contracts/src/product/`)** :
  - `transition-status.test.ts` : Zod accepte `'active' | 'draft' | 'disabled'`, refuse `'sold_out'` (statut dérivé, non transitionable).
  - `list.test.ts` (étendu) : `status` accepte `'sold_out'` ; refuse les valeurs inconnues.
- **Unit core (`packages/core/src/product/`)** :
  - `transition-product-status.test.ts` :
    - Transitions valides : `draft → active` avec préconditions OK ; `active → draft` ; `active → disabled` ; `disabled → active` ; `draft → disabled` ; `disabled → draft`.
    - Transitions refusées : `active → active` (no-op refusé `PRODUCT_TRANSITION_INVALID`), statut inconnu.
    - Préconditions : chaque manque retourne sa propre erreur typée. Multi-manques retournent une seule erreur agrégée `PRODUCT_TRANSITION_INVALID` avec `details.missing`.
    - Sécurité : tentative de transition sur un produit d'un autre owner → `PRODUCT_FORBIDDEN`.
  - `get-publish-preconditions.test.ts` (helper pur) : tous les combinaisons (5 préconditions × OK/KO).
  - `list-owner-products.test.ts` (étendu) : filtre `sold_out` retourne uniquement les produits `active, stock = 0` ; `counts` retournés cohérents.
- **Unit display** : `stock-display.test.ts` (KAN-22) inchangé. Pas de nouveau helper d'affichage.
- **E2E web Playwright** (`apps/web/e2e/producer-catalogue.spec.ts`, étendu) :
  - Producteur crée un produit minimal (sans photo) en `draft`, tente de publier via le menu kebab → toast d'erreur + lien « Compléter la fiche » qui ouvre le formulaire avec la section 5 en focus.
  - Producteur ajoute une photo + stock + description, publie via le formulaire → produit `active` apparaît dans le tab « Actifs ».
  - Producteur passe `stock` à 0 (toujours `active`), la liste affiche le badge « Épuisé » et le tab « Épuisés (1) » apparaît avec le décompte correct.
  - Quick action « Désactiver » depuis la card d'un produit `active` → bascule en `disabled` sans confirmation, toast succès, tab « Désactivés (1) » à jour.
  - Filtres : naviguer entre les 5 tabs, vérifier que les `items` correspondent à la query.
- **Tests RLS DB** : différés (cohérent KAN-20/21/22) — pas de changement RLS dans KAN-23 de toute façon.
