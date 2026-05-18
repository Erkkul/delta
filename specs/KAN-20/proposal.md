# Cadrage — KAN-20 Création & édition produit

## Liens

- Jira : https://erkulaws.atlassian.net/browse/KAN-20
- Epic : KAN-5 Catalogue
- Maquettes :
  - `design/maquettes/producteur/pr-04-catalogue.html` (liste catalogue + vide state)
  - `design/maquettes/producteur/pr-05-edition-produit.html` (formulaire CRUD)
- PRD : §10.2 PR-04 Catalogue produits, §10.2 PR-05 Création / édition produit
- ARCHITECTURE : §3 (monorepo), §5 (DB — création table `products`), §7.1 (event `product.updated` consommé par matching, hors livraison KAN-20), §9 (RLS), §10 (tests), §14 (playbook)

## Pourquoi (côté tech)

KAN-17 et KAN-16 ont livré la couche `producers` (vérification SIRET, Stripe Connect, profil ferme, photos, adresse). Le producteur peut configurer son compte mais ne peut pas encore le rendre vendeur : il n'a pas de catalogue. KAN-20 ouvre la table `products` et livre le CRUD fondamental — création, lecture liste, édition, suppression douce. C'est la première fois qu'on instancie l'objet « produit » côté domaine, et c'est le préalable matérialisé à toutes les features de l'épic KAN-5 (photos, stock, statuts, labels) et à plusieurs features cousines (wishlist KAN-30, catalogue acheteur KAN-28, opportunités KAN-42).

Le ticket s'aligne sur la subtask KAN-69 : « créer un produit avec nom, description, catégorie, prix net, stock et fenêtre de disponibilité ». Les champs photos / labels / alertes stock présents dans la maquette PR-05 sont **préparés en DB** (colonnes nullable) mais leur UI et leur logique sont délibérément laissées aux tickets dédiés.

## Périmètre technique

**In scope :**

- Migration `products` : schéma complet de la table (avec colonnes nullable pour photos/labels/seuil afin que KAN-21/22/24 ne re-migrent pas), index `(producer_user_id, status) WHERE deleted_at IS NULL`, index GIN FTS sur `name + description` (cf. ARCHITECTURE §5.4), CHECK contraintes, RLS complète intégrant le placeholder `supabase/policies/products.sql` + suppression de ce placeholder.
- Enums DB : `product_category` (8 valeurs alignées sur la maquette PR-05), `product_packaging` (8 valeurs idem), `product_status` (`active`, `draft`, `disabled`) — la valeur par défaut est `active` au MVP de KAN-20 (le workflow complet « brouillon → publication » est porté par KAN-23).
- Endpoints `/api/v1/producer/products` : `GET` (liste owner), `POST` (create), `GET /[id]`, `PATCH /[id]`, `DELETE /[id]` (soft delete via `deleted_at`).
- Validation Zod (`packages/contracts/src/product/`) + use cases core (`packages/core/src/product/`) + repo (`packages/db/src/products/`).
- Page `/producer/catalogue` (PR-04) : liste, filtres par statut (tabs « Tous / Actifs / Brouillons / Désactivés », pré-câblés mais pas tous fonctionnels avant KAN-23), recherche FTS, vide state, bouton « Nouveau produit ». Stats banner uniquement avec « Produits actifs » (les 3 autres KPI = placeholders dépendants d'autres tickets).
- Page `/producer/catalogue/nouveau` et `/producer/catalogue/[id]` (PR-05) : form CRUD avec sections 1 (identité), 3 (prix + conditionnement), 4 (stock + fenêtre), 5 (statut → tri-état seulement câblé sur `active` au MVP, brouillon/désactivé livrés UI mais sans logique de gating différenciée — finalisé par KAN-23).
- Soft delete : `DELETE` set `deleted_at = now()` ; le repo expose toujours `WHERE deleted_at IS NULL` par défaut.
- Gating RLS lecture publique : `products_select_public` reproduit le placeholder (verified + payouts_enabled + paused = false + deleted_at IS NULL) ; le producteur voit ses propres rows toujours.
- Tests unitaires Zod + use cases + tests RLS minimaux (intégration owner/anon).

**Out of scope (cette US) :**

- **Photos** (KAN-21) : la colonne `photos jsonb` (max 4 entries, CHECK en DB) et le bucket `product-photos` (déjà provisionné dans `tech/setup.md`) sont préparés ; aucune UI d'upload ni route signature ici. Le visuel de la maquette PR-05 section 2 est livré en placeholder désactivé.
- **Stock — seuil d'alerte + notifs** (KAN-22) : la colonne `low_stock_threshold int` est créée mais l'UI et les jobs notification (event `product.stock_low` côté Inngest, cf. KAN-56) sont hors scope. La cellule « stock bas » de la maquette PR-04 est rendue (style visuel uniquement, sans alerte applicative).
- **Workflow statuts** (KAN-23) : le champ `status` accepte les trois valeurs en DB et est éditable depuis le form, mais les règles métier de transition (ex. « `draft` → `active` exige photos + description ») et le filtre « Brouillons » de la liste ne sont pas câblés — ils relèvent de KAN-23.
- **Labels & catégories étendues** (KAN-24) : la colonne `labels text[]` est créée vide ; aucune UI de sélection chips. Catégorie obligatoire au MVP via le `select` natif de PR-05 (8 valeurs enum dur).
- **Toggle « afficher prix voisin tout compris »** (PR-05 section 3) : pas livré au MVP. Le `unit_price_cents` reste le prix net producteur (85 % décision produit 2026-05-01) ; la conversion en prix tout-compris pour l'affichage acheteur sera dérivée à la lecture (catalogue acheteur, KAN-28).
- Toute consommation du catalogue côté acheteur / matching : KAN-28 / KAN-42.
- Mobile : non livré (`apps/mobile/` reste non-scaffold, cohérent avec KAN-16/17/18).
- Event Inngest `product.updated` (ARCHITECTURE §7.1) : émis depuis les use cases ? **Non au MVP de KAN-20** — l'event sera câblé par KAN-42 (matching) qui s'abonnera à des hooks DB ou émettra depuis ses propres handlers. KAN-20 reste pur CRUD.

## Hypothèses

- La table `products` n'existe pas encore (placeholder `supabase/policies/products.sql` confirme). KAN-20 est donc « green-field » sur le catalogue.
- Soft-delete via `deleted_at` aligné avec le pattern déjà documenté en ARCHITECTURE §5.4 (« partial `WHERE deleted_at IS NULL` »). Pas de table d'archivage séparée. La subtask KAN-71 = soft delete (UI + endpoint) ; un hard delete RGPD éventuel sera traité globalement (backlog post-MVP).
- `unit_price_cents` est exclusivement le prix net producteur. La calculatrice « 85 % / 10 % / 5 % » de répartition reste l'apanage du module paiement (KAN-33/34). La maquette helper « Prix net que vous touchez : 85% du montant » est un message d'UI mais n'introduit aucune logique calculatoire ici.
- `stock` est un entier simple (unités du conditionnement). Le seuil d'alerte est nullable. Pas d'historique de variations stock à ce stade — toute consommation (réservation par mission) sera modélisée par KAN-22 + KAN-31.
- Fenêtre de disponibilité (`availability_from`, `availability_to`) : dates seulement (cohérent avec décision produit 2026-05-01 « Dates seulement au MVP »). Hors fenêtre, le produit est exclu du catalogue acheteur (logique de gating ajoutée dans `products_select_public`).
- La maquette PR-04 affiche des compteurs « Envies / Vendus » par produit : ces stats sont **hors scope** (envies → KAN-30, ventes → KAN-19/27). Au MVP de KAN-20, ces blocs sont rendus avec `—` ou retirés.
- Catégories : enum dur en DB (8 valeurs), aligné sur le `select` du form. KAN-24 pourra étendre vers une table `categories` si besoin (post-MVP).
- Labels : stockés en `text[]` au MVP de KAN-20 pour contourner l'impossibilité Postgres de créer un enum vide ; KAN-24 swap colonne → enum dans sa propre migration.
- Pas d'event Inngest émis depuis ce ticket. Les hooks de cache (opportunités, etc.) seront mis en place quand le module qui les consomme arrivera, pour éviter de créer un event mort.
