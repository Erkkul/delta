# Cadrage — KAN-26 Préférences catégories

## Liens

- Jira : https://erkulaws.atlassian.net/browse/KAN-26
- Epic : KAN-6 Profil Acheteur
- Maquette : design/maquettes/acheteur/ac-02-onboarding.html (étape 2), design/maquettes/acheteur/ac-11-profil.html (ligne « Catégories d'intérêt »)
- PRD : §10 sitemap acheteur (AC-02 Onboarding étape 2, AC-11 Profil + paramètres) — PRD local non versionné
- ARCHITECTURE : §5 (DB + RLS), §3 (API), §7 (matching — sans impact), §10 (tests)

## Pourquoi (côté tech)

KAN-25 a posé le profil acheteur (`buyer_profiles`), l'étape 1 du wizard
`/onboarding/acheteur` (zone) et la page paramètres `/acheteur/profil`. KAN-26
ajoute la **2ᵉ étape** de ce même wizard (AC-02 « Qu'est-ce qui vous tente ? »)
et la **ligne « Catégories d'intérêt »** des paramètres (AC-11) : l'acheteur
sélectionne un sous-ensemble de catégories produit qui personnalise son accueil
(tri / mise en avant côté AC-03, livré par KAN-28). C'est une préférence de
confort, pas un filtre dur ni un gate d'onboarding. Aucun impact sur le pipeline
de matching (§7), piloté par la wishlist et la zone, pas par les préférences.

La liste de catégories est déjà la source de vérité produit :
`PRODUCT_CATEGORIES` (`packages/contracts/src/product/shared.ts`, 8 valeurs +
`PRODUCT_CATEGORY_FR` + `PRODUCT_CATEGORY_EMOJI`), miroir de l'enum Postgres
`product_category` (KAN-20). On la réutilise telle quelle — pas de taxonomie
acheteur parallèle.

## Périmètre technique

**In scope :**

- Étape 2 du wizard onboarding acheteur AC-02 « Qu'est-ce qui vous tente ? » :
  grille de chips multi-select alimentée par `PRODUCT_CATEGORIES`, persistance
  d'un `product_category[]` sur `buyer_profiles` (KAN-83).
- Édition des préférences depuis les paramètres (AC-11, ligne « Catégories
  d'intérêt » → sous-écran ou section dédiée) (KAN-84).
- Extension du contrat / use case / repo `buyer-profile` existants (KAN-25)
  pour porter le champ `preferredCategories`.

**Out of scope (cette US) :**

- Étape 1 zone (KAN-25, livré) et étape 3 notifications (KAN-14) du wizard AC-02.
- Exploitation des préférences pour trier/filtrer l'accueil (KAN-28 Catalogue filtré).
- Wishlist (KAN-30) et matching (KAN-7) — préférences ≠ envies.
- Toute nouvelle catégorie produit (gérée par l'enum `product_category`, KAN-20/24).

## Hypothèses

- **Conflit maquette ↔ enum produit (à arbitrer produit)** : la maquette AC-02
  étape 2 liste 8 chips d'une taxonomie distincte (« Produits laitiers secs »,
  « Œufs », « Légumes robustes », « Légumineuses »…) qui ne mappe pas 1:1 sur
  les 8 `product_category` réels (miel_et_ruche, fruits, legumes,
  cereales_legumineuses, conserves_confitures, pain_biscuits, huiles,
  boissons_non_alcoolisees). Hypothèse retenue : **on aligne les préférences sur
  l'enum `product_category`** (sinon le tri/filtrage AC-03 est impossible), et on
  consigne l'écart dans `specs/KAN-26/notes.md` à l'implémentation pour arbitrage.
- **Sélection facultative** : 0 catégorie autorisé (`preferred_categories = '{}'`),
  bouton « Passer » de la maquette honoré. Pas de gate d'onboarding.
- **Personnalisation seule** : les préférences influencent l'affichage (KAN-28),
  jamais la visibilité réelle du catalogue (« vous pourrez tout voir »).
- **Réutilisation de l'endpoint KAN-25** : `PUT /api/v1/me/buyer-profile` (upsert)
  est étendu avec `preferredCategories` plutôt que de créer une route dédiée — le
  profil existe déjà (créé à l'étape 1). À confirmer si l'on préfère un endpoint
  granulaire `PUT …/buyer-profile/categories`.
