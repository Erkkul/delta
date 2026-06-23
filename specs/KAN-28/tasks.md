# Tâches techniques internes — KAN-28 Catalogue filtré

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers
> partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké
> comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> (aucune)

## Tâches

- [x] **Décision DB** : arbitrée → **vue `public.catalogue_products`**
      (`security_invoker = off`, projection whitelistée) plutôt qu'un RPC.
      Entrée ARCHITECTURE.md §18 (1.27) ajoutée.
- [ ] Factoriser le **prédicat de visibilité** (`products_select_public`) en
      fonction SQL réutilisable par la policy ET la vue (anti-divergence).
      *Différé* : prédicat dupliqué pour l'instant, risque documenté en §18 et
      dans `design.md` (à factoriser si l'un des deux évolue).
- [x] Migration `20260623180000_catalogue_public_read.sql` : vue catalogue
      public (projection whitelistée produit + producteur), FTS via
      `search_vector` exposé pour `.textSearch`. Tri keyset `created_at DESC`
      (pas de `ts_rank` au MVP — FTS filtrante).
- [x] `catalogueRepo` dans `packages/db` (`list` + `getById`) + type
      `CatalogueProductRow` + mapper `mapCatalogueProduct` (4 tests).
- [x] Contracts `CatalogueQuery` + `CataloguePublicProduct` / `CataloguePage`
      + `CATALOGUE_ERROR_CODES` (6 tests).
- [x] Endpoint `GET /api/v1/catalogue` (validation Zod, pagination, codes
      d'erreur).
- [x] **Shell** `acheteur/layout.tsx` (header desktop + bottom-nav mobile) +
      rétro-wrap `/acheteur/profil` et `/acheteur/historique` (gating centralisé,
      non-régression vérifiée au build).
- [x] Composants `components/buyer/shell/*` (chrome) et
      `components/buyer/catalogue/*` (card, browser : search + chips catégorie
      actives + chips différées). Sections AC-03 rendues dans `acheteur/page.tsx`.
- [x] Pages `acheteur/page.tsx`, `acheteur/catalogue/page.tsx`,
      `acheteur/catalogue/[id]/page.tsx` (gating rôle acheteur via layout).
- [ ] Seeds/fixtures E2E : producteur vérifié (SIRET + payouts) + produits
      `active` pour alimenter le catalogue de test. *Différé* : pas de harnais
      fixtures acheteur connecté au MVP (cohérent KAN-18/20/27 — E2E « logged-in »
      différés tant que le harnais auth+seed n'existe pas).

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
