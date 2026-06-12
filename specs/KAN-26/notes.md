# Notes d'implémentation — KAN-26 Préférences catégories

## Déviations vs cadrage / maquette (pour arbitrage)

### 1. Taxonomie maquette AC-02 ↔ enum `product_category` (arbitrage produit)

La maquette `design/maquettes/acheteur/ac-02-onboarding.html` (étape 2) liste
8 chips d'une taxonomie distincte de l'enum produit réel :

| Maquette | Enum `product_category` |
|---|---|
| Miel & confitures | `miel_et_ruche` + `conserves_confitures` (scindé) |
| Produits laitiers secs | *(absent — pas de catégorie laitages)* |
| Œufs | *(absent)* |
| Farines & céréales | `cereales_legumineuses` |
| Légumes robustes | `legumes` |
| Fruits | `fruits` |
| Conserves artisanales | `conserves_confitures` |
| Légumineuses | `cereales_legumineuses` |
| *(absent maquette)* | `pain_biscuits`, `huiles`, `boissons_non_alcoolisees` |

**Décision tech retenue** : les chips sont pilotés par l'enum `product_category`
(`PRODUCT_CATEGORIES` / `PRODUCT_CATEGORY_FR` / `PRODUCT_CATEGORY_EMOJI`), **pas**
par la liste en dur de la maquette. Sans cet alignement, une préférence ne
pourrait ni filtrer ni trier le catalogue (KAN-28), qui ne connaît que
`product_category`. Les libellés/emoji affichés sont donc ceux du contrat.

**À arbitrer côté produit** : si la taxonomie acheteur doit différer de la
taxonomie producteur (catégories marketing distinctes des catégories de mise en
vente), il faudra une table de correspondance dédiée — hors périmètre KAN-26.

### 2. Endpoint dédié plutôt qu'extension de `PUT /api/v1/me/buyer-profile`

Le cadrage (`design.md`) recommandait d'étendre l'endpoint d'upsert de KAN-25.
À l'implémentation, deux contraintes du code KAN-25 l'ont rendu risqué :

- `BuyerProfileUpsertInput` **exige** `address_label` (≥ 5 car.) : un payload
  catégories-seul ne le satisferait pas sans rendre le champ optionnel.
- `upsertBuyerProfile` appelle `setLocation(null, null)` dès qu'aucune coordonnée
  n'est fournie : une écriture catégories-seul **réinitialiserait la zone**.

**Décision** : endpoint dédié `PUT /api/v1/me/buyer-profile/categories`
(use case `updateBuyerCategories`, contrat `BuyerCategoriesInput`,
adapter `BuyerCategoriesAdapter.setCategories`). Le chemin zone de KAN-25 reste
strictement inchangé ; seul le `BuyerProfileSnapshot` (lecture) est étendu avec
`preferred_categories`. C'est l'option granulaire signalée comme alternative
dans `proposal.md` § Hypothèses.

## Écarts mineurs

- **Chips non promus dans `packages/ui-web`** : le composant
  `BuyerCategoriesForm` vit dans `apps/web/components/buyer/` (partagé entre
  onboarding et paramètres), cohérent avec le choix KAN-24 de ne pas promouvoir
  le pattern chips. La case `packages/ui-web` du `design.md` est donc traitée
  par un composant `apps/web` partagé plutôt qu'un export ui-web.
- **Wizard onboarding à 2 étapes** : l'onboarding acheteur passe de 1 (KAN-25)
  à 2 étapes (zone → catégories). L'étape 3 notifications de la maquette reste
  hors périmètre (KAN-14).
