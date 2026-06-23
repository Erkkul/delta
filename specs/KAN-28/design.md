# Conception technique — KAN-28 Catalogue filtré

## Vue d'ensemble

Le mouvement principal : ouvrir un **chemin de lecture publique du catalogue**
(produit + producteur public) et le câbler sur trois pages acheteur, le tout sous
un nouveau **shell acheteur**. La donnée produit existe déjà (RLS
`products_select_public`, FTS `search_vector`) ; l'inconnue est la projection
producteur, car `producers` n'a pas de policy de lecture publique. On introduit
donc une vue/RPC dédiée qui réutilise le prédicat de visibilité existant et
n'expose qu'une whitelist de colonnes. Les pages sont des Server Components pour
le rendu initial (SSR + gating rôle acheteur), avec un endpoint
`GET /api/v1/catalogue` pour la recherche/filtre/pagination côté client. Aucune
logique métier lourde, aucune state machine, aucun job.

## Packages touchés

- [x] `packages/contracts` — `CatalogueQuery` (input) + `CataloguePublicProduct`
      (output)
- [ ] `packages/core` — aucun (lecture pure ; un mince mapper DB→DTO peut vivre
      dans `packages/db` ou `core` si réutilisé — à trancher à l'implémentation)
- [x] `packages/db` — `catalogueRepo` (appel vue/RPC), types de projection
- [x] `apps/web` — `acheteur/layout.tsx`, pages `acheteur/page.tsx`,
      `acheteur/catalogue/page.tsx`, `acheteur/catalogue/[id]/page.tsx`,
      endpoint `app/api/v1/catalogue/route.ts`, composants `components/buyer/*`
- [ ] `apps/mobile` — hors scope
- [ ] `packages/jobs` — aucun
- [x] `supabase/migrations` — vue ou RPC catalogue public (+ éventuelle policy)
- [ ] `supabase/policies` — pas de nouvelle policy table si on passe par RPC
      SECURITY DEFINER ; à confirmer selon le mécanisme retenu
- [ ] `packages/ui-web` — non (composants locaux `components/buyer/`, cohérent
      KAN-25/26/27)

## Modèle de données

Référence : ARCHITECTURE.md §5.

Aucune nouvelle table. **Décision structurante à valider** : comment exposer la
projection catalogue publique alors que `producers` est `select_self` only.

- **Contrainte** : la RLS étant row-level (pas column-level), ajouter
  `producers_select_public` exposerait *toutes* les colonnes producteur (SIRET,
  identifiants Stripe) à quiconque requête la table — inacceptable.
- **Approche recommandée** : un **RPC SECURITY DEFINER** `catalogue_search(...)`
  et `catalogue_get(id)` (ou une vue `public.catalogue_products` détenue par un
  rôle privilégié) qui :
  - réutilise **exactement** le prédicat de `products_select_public` (statut
    `active`, non soft-deleted, fenêtre dispo, producteur vérifié + payouts +
    non en pause) — DRY à garantir (cf. Risques) ;
  - ne renvoie qu'une **whitelist** : `product.id`, `name`, `category`,
    `packaging`, `unit_price_cents`, `labels`, `photos[0]`, + producteur public
    (`display_name`, `city`) ;
  - applique FTS (`websearch_to_tsquery('french', q)` + `ts_rank`) et le tri.
- Mécanisme exact (RPC vs vue `security_invoker`) à arbitrer à l'implémentation ;
  possible entrée ARCHITECTURE §18 (nouveau pattern « lecture catalogue public »).

Champ « ville » producteur : confirmer la colonne disponible (profil KAN-17 /
`producers`) ; à défaut, dériver de l'adresse de collecte sans exposer l'adresse
exacte.

## API / Endpoints

Référence : ARCHITECTURE.md §3.

- `GET /api/v1/catalogue?q=&category=&producer=&cursor=&limit=` →
  `{ items: CataloguePublicProduct[], nextCursor: string | null }`.
  Validation Zod (`CatalogueQuery`). Lecture via client utilisateur appelant la
  vue/RPC. Tri : pertinence (`ts_rank`) si `q`, sinon récence. Pagination cursor.
- Fiche produit AC-05 : lecture server-side directe dans
  `acheteur/catalogue/[id]/page.tsx` via `catalogueRepo.getById` (pattern KAN-25),
  pas d'endpoint dédié au MVP.
- Codes d'erreur : `CATALOGUE_VALIDATION_FAILED`, `CATALOGUE_NOT_FOUND`
  (fiche produit inexistante ou non visible → 404).

## Impact state machine / events

Référence : ARCHITECTURE.md §6 et §8.

Aucun. Lecture strictement read-only, aucune transition mission, aucun event
Inngest, aucun webhook.

## Dépendances

Référence : ARCHITECTURE.md §2. Provisionnement : `tech/setup.md`.

- **Supabase Postgres** — FTS + RLS + vue/RPC, déjà provisionné, cf.
  `tech/setup.md` § Supabase (Postgres + Auth + Storage + Realtime). Aucun
  nouveau service externe.
- **Supabase Storage** — lecture publique des photos produit (`product-photos`)
  et producteur (`producer-photos`) déjà ouverte (policies `*_select_public`).
- Internes : gating `/acheteur/profil` (KAN-25), `productsRepo` (KAN-20) pour
  référence du modèle produit, tokens DESIGN.md, icônes lucide-react. Pas
  d'API Adresse ni Stripe au runtime de KAN-28.

## État UI

Référence : DESIGN.md (tokens, breakpoints) + maquettes ac-03/04/05.

- **`acheteur/layout.tsx`** (shell) : header (logo, nav desktop Accueil /
  Catalogue / Mes envies / Commandes, cloche notifs, avatar) + bottom-nav mobile
  (Accueil / Catalogue / Envies / Commandes / Profil). Liens « Mes envies » et
  badge → cibles KAN-30 (rendus, inertes ou pointant vers placeholder).
- **AC-03 `/acheteur`** : greeting « Bonjour {prénom} » ; « Découvrir des
  producteurs » = grille réelle (producteurs vérifiés) ; « Disponible cette
  semaine » et « Mes envies » en `<EmptyState>` / différé (pas de données mockées,
  pas de notes ★) ; bannière impact CO₂ différée (placeholder neutre).
- **AC-04 `/acheteur/catalogue`** : search bar (FTS), 2 rangées de chips —
  **actives** : catégorie, producteur ; **différées** (`aria-disabled` + tooltip
  « Disponible bientôt ») : Zone d'origine, Disponibilité, Trajet actif. Grille
  responsive `repeat(2/3/4, 1fr)` (mobile/≥720/≥1000). Carte : image (photos[0]),
  nom, producteur · ville, prix + unité. Badge trajet et bouton cœur non rendus
  ou désactivés (→ KAN-30/42). Ligne résultats « N produits · M producteurs ».
- **AC-05 `/acheteur/catalogue/[id]`** : galerie photos, nom, prix, producteur,
  catégorie, labels, description. Bloc « match / trajets » et bouton « Ajouter aux
  envies » rendus désactivés/différés (KAN-30/42). 404 si produit non visible.
- **Responsive** : mobile + desktop obligatoires (DESIGN.md). Bottom-nav mobile /
  header desktop. États vides neutres, jamais de fixture en prod.

## Risques techniques

Références : ARCHITECTURE.md §9, §11, §13.

- **Divergence du prédicat de visibilité** : la vue/RPC duplique le prédicat de
  `products_select_public`. Risque de désynchronisation si l'un évolue sans
  l'autre. Mitigation : factoriser le prédicat (fonction SQL partagée) ou test
  SQL qui compare les deux ensembles. À traiter explicitement.
- **Exposition de colonnes producteur sensibles** : whitelist stricte (jamais
  SIRET / Stripe / adresse exacte). Test dédié sur la projection.
- **Tentation de mocker trajets / notes / envies** : maquettes très riches
  (badges trajet, ★, match probable). Règle KAN-18/19/27 reprise — **aucune
  fixture en prod**, uniquement réel ou empty/différé.
- **Écart règle métier matchabilité** (PRD §12 H3) : catalogue non filtré par
  trajet au MVP. À acter en décision produit, sinon flag rouge au review.
- **Perf FTS + pagination** : index GIN existant ; valider le plan (cursor stable,
  `ts_rank` borné, `limit` plafonné côté contrat).
- **Non-régression KAN-25/27** : l'ajout de `acheteur/layout.tsx` enveloppe les
  pages existantes — vérifier que leur gating et leur rendu ne cassent pas.
- **Bundle** `/acheteur/*` : pages légères, cible bundle respectée (§11/§13).

## Tests envisagés

Référence : ARCHITECTURE.md §10.

- **Unit `packages/contracts`** (Vitest) : `CatalogueQuery` (defaults, bornes
  limit, q/category/producer optionnels) ; `CataloguePublicProduct` (forme).
- **DB / intégration** (SQL ou via repo) : la vue/RPC **exclut** un produit
  `draft`/`disabled`, un produit de producteur non vérifié / en pause / payouts
  off, un produit hors fenêtre dispo, un soft-deleted ; **inclut** un produit
  conforme ; la projection ne contient aucune colonne sensible.
- **Unit `apps/web`** (RTL) : carte catalogue (image/nom/producteur/prix) ;
  chips différées rendues `aria-disabled` ; empty states AC-03 ; bouton envie
  désactivé.
- **E2E web Playwright** : acheteur connecté → `/acheteur/catalogue` voit la
  grille réelle ; recherche FTS filtre ; filtre catégorie filtre ; clic carte →
  fiche AC-05 ; produit inexistant → 404 ; non-connecté → `/login` ; connecté
  sans rôle acheteur → `/onboarding/role` (cohérent KAN-25) ; responsive mobile.
- **Accessibilité** : axe-core sur AC-03/04/05 (0 violation critique).
