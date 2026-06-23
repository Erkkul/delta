# Tâches techniques internes — KAN-28 Catalogue filtré

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers
> partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké
> comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> (aucune)

## Tâches

- [ ] **Décision DB** : arbitrer vue `public.catalogue_products` vs RPC
      `catalogue_search` / `catalogue_get` (SECURITY DEFINER). Acter le choix et,
      s'il est structurant, ajouter une entrée ARCHITECTURE.md §18.
- [ ] Factoriser le **prédicat de visibilité** (`products_select_public`) en
      fonction SQL réutilisable par la policy ET la vue/RPC (anti-divergence).
- [ ] Migration : vue/RPC catalogue public (projection whitelistée produit +
      producteur), tri FTS (`websearch_to_tsquery('french')` + `ts_rank`),
      pagination cursor. + tests SQL de visibilité et de non-exposition.
- [ ] `catalogueRepo` dans `packages/db` (+ types de projection, mapper DB→DTO).
- [ ] Contracts `CatalogueQuery` + `CataloguePublicProduct` (+ tests).
- [ ] Endpoint `GET /api/v1/catalogue` (validation Zod, pagination, codes
      d'erreur).
- [ ] **Shell** `acheteur/layout.tsx` + rétro-wrap `/acheteur/profil` et
      `/acheteur/historique` ; vérifier non-régression gating KAN-25/27.
- [ ] Composants `components/buyer/catalogue/*` (cards, search, chips filtres
      actifs/différés) et `components/buyer/home/*` (sections AC-03 réelles +
      différées).
- [ ] Pages `acheteur/page.tsx`, `acheteur/catalogue/page.tsx`,
      `acheteur/catalogue/[id]/page.tsx` (gating rôle acheteur).
- [ ] Seeds/fixtures E2E : producteur vérifié (SIRET + payouts) + produits
      `active` pour alimenter le catalogue de test.

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
