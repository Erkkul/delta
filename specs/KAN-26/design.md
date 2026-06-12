# Conception technique — KAN-26 Préférences catégories

## Vue d'ensemble

Extension du profil acheteur de KAN-25 : on ajoute une colonne tableau
`preferred_categories product_category[]` à `buyer_profiles` et on la propage à
travers les couches déjà en place (contrats → core → repo → wizard onboarding +
paramètres). Aucune nouvelle table, aucune nouvelle RLS (les policies self de
`buyer_profiles` couvrent la colonne). Le mouvement principal est côté
`apps/web` (étape 2 du wizard `/onboarding/acheteur` + sous-écran préférences
dans `/acheteur/profil`) avec une grille de chips multi-select calquée sur le
pattern existant (labels producteur / KAN-24). La liste de catégories vient de
`PRODUCT_CATEGORIES` — pas de duplication.

## Packages touchés

- [x] `packages/contracts` — `buyer-profile` : ajout `preferredCategories: z.array(ProductCategory).max(8)` dans `BuyerProfileUpsertInput` + `BuyerProfileSnapshot` (réutilise `ProductCategory` de `product/shared.ts`)
- [x] `packages/core` — `buyer-profile` : propagation `preferredCategories` dans le use case upsert + adapters (dédoublonnage, validation whitelist)
- [x] `packages/db` — `buyerProfilesRepo` : `preferred_categories` ajouté à `SELECT_COLUMNS` + mapping `create`/`update` (déjà générique via `BuyerProfileUpdate`) ; `types.ts` mis à jour
- [x] `apps/web` — étape 2 wizard `/onboarding/acheteur` + section/sous-écran préférences dans `/acheteur/profil` + extension du route handler `PUT /api/v1/me/buyer-profile`
- [ ] `apps/mobile` — différé (non scaffoldé)
- [ ] `packages/jobs` — non applicable (aucun event)
- [x] `supabase/migrations` — `ALTER TABLE buyer_profiles ADD COLUMN preferred_categories product_category[] NOT NULL DEFAULT '{}'`
- [ ] `supabase/policies` — aucun changement (policies self existantes suffisent)
- [x] `packages/ui-web` — composant chips multi-select catégories (réutilisable onboarding + paramètres), ou réutilisation du pattern chips existant

## Modèle de données

Référence : ARCHITECTURE.md §5.

Table `public.buyer_profiles` (KAN-25), ajout d'une colonne :

- `preferred_categories` (`product_category[]`, NOT NULL, DEFAULT `'{}'`) —
  sous-ensemble de l'enum `product_category` (KAN-20). Vide = aucune préférence.

Pas d'index (lecture ponctuelle par `user_id`, jamais filtrée en masse au MVP).
Type enum déjà existant (`product_category`) — aucun `CREATE TYPE`. RLS
inchangée : les policies `buyer_profiles_{select,insert,update}_self` couvrent
la nouvelle colonne. Rollback : `ALTER TABLE buyer_profiles DROP COLUMN preferred_categories`.

## API / Endpoints

Référence : ARCHITECTURE.md §3.

Extension de l'endpoint KAN-25 (pas de nouvelle route) :

| Endpoint | Input (Zod) | Output | Codes |
|---|---|---|---|
| `GET /api/v1/me/buyer-profile` | — | `{ profile \| null }` (inclut `preferredCategories`) | 200 / 401 |
| `PUT /api/v1/me/buyer-profile` | `BuyerProfileUpsertInput { …, preferredCategories: ProductCategory[] }` | `{ profile }` | 200 / 400 / 401 |

`preferredCategories` optionnel à l'input (rétro-compat KAN-25) : absent =
inchangé, `[]` = réinitialisé. Valeurs hors whitelist `product_category` →
400 (Zod). Couvre KAN-83 (onboarding) et KAN-84 (paramètres) via le même upsert.

## Impact state machine / events

Référence : ARCHITECTURE.md §6 et §8.

Aucun. Pas de transition mission, pas d'event Inngest, pas d'impact matching (§7).

## Dépendances

Référence : ARCHITECTURE.md §2. Provisionnement : `tech/setup.md`.

- Aucun service externe. Pas de mise à jour `tech/setup.md`.
- Internes : `buyer_profiles` + repo/contrats/core `buyer-profile` (KAN-25) ;
  enum `product_category` + `PRODUCT_CATEGORIES`/`PRODUCT_CATEGORY_FR`/
  `PRODUCT_CATEGORY_EMOJI` (KAN-20/24) ; pattern chips multi-select (KAN-24).

## État UI

Référence : DESIGN.md + maquettes AC-02 (étape 2) / AC-11.

- **AC-02 étape 2** : stepper 2/3, H1 Lora « Qu'est-ce qui vous tente ? »,
  sous-titre, grille de `cat-chip` (2 colonnes) avec emoji + libellé + check,
  multi-select, help-text « secs / non sensibles uniquement », CTA « Continuer »,
  « Retour », lien « Passer ». Chips pilotés par `PRODUCT_CATEGORIES` (libellés
  FR + emoji du contrat), **pas** la liste en dur de la maquette (cf. hypothèse
  conflit taxonomie → `notes.md`).
- **AC-11** : la ligne « Catégories d'intérêt » (sous « Préférences ») ouvre un
  sous-écran / section d'édition réutilisant la même grille de chips ;
  sous-titre = résumé des catégories choisies.
- Responsive mobile + desktop obligatoire (DESIGN.md).

## Risques techniques

Références : ARCHITECTURE.md §9, §11, §13.

- **Divergence taxonomie maquette ↔ enum produit** : risque principal. La
  maquette propose des catégories absentes de `product_category` (laitages,
  œufs). Aligner sur l'enum (décision tech) et faire arbitrer le libellé produit ;
  consigner dans `notes.md`. Ne pas inventer de second enum côté acheteur.
- **Évolution de l'enum** : si `product_category` gagne une valeur (`ALTER TYPE`),
  les préférences en bénéficient automatiquement (tableau du même type) — pas de
  migration de données.
- **Free-tier** : aucun appel externe, coût nul.

## Tests envisagés

Référence : ARCHITECTURE.md §10.

- Unitaire `packages/contracts` : `BuyerProfileUpsertInput.preferredCategories`
  (valeur whitelistée acceptée, hors whitelist refusée, `> 8` refusé, `[]` et
  absent acceptés, doublons normalisés).
- Unitaire `packages/core` : propagation + dédoublonnage des préférences.
- Intégration `packages/db` : upsert `preferred_categories` + RLS self (Supabase local).
- E2E web (Playwright) : onboarding étape 2 → sélection chips → persistance ;
  édition depuis `/acheteur/profil` (déféré si fixtures auth acheteur indisponibles,
  cohérent KAN-25).
