# Tâches techniques internes — KAN-30 Wishlist privée

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers
> partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké
> comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> (aucune)

## Tâches

- [x] **Décision plafond** : arbitrée → **garde applicative** (COUNT
      `wishlistRepo.countActive` avant `add` dans le route handler POST). Le
      risque de course sur le 20ᵉ ajout est documenté (design.md § Risques) et
      jugé acceptable au MVP ; l'unicité produit reste, elle, garantie par
      l'index unique partiel DB.
- [x] **Décision envie orpheline** : arbitrée → **masquer**. La jointure
      applicative `wishlist_items × catalogue_products` (`loadWishlistPage`) ne
      renvoie que les envies dont le produit est encore visible ; `count` reste
      le nombre d'envies actives (peut dépasser `items.length`). Documenté dans
      design.md § Risques et contracts `WishlistPage`.
- [x] Migration `20260911100000_create_wishlist_items.sql` : table + FKs +
      index unique partiel `(user_id, product_id) WHERE deleted_at IS NULL` +
      index liste/comptage + RLS forcée self-only. Pas d'`updated_at` (retrait =
      soft delete via `deleted_at`). Rollback documenté, idempotente.
- [x] Miroir `supabase/policies/wishlist_items.sql` (convention §14.2).
- [x] `wishlistRepo` dans `packages/db` (`listActive`, `countActive`,
      `findActiveByProduct`, `add` → `WishlistAlreadyExistsError`,
      `softRemoveByProduct`) + `catalogueRepo.listByIds` (jointure).
      *Tests repo/DB différés* : nécessitent un harnais Supabase live (cohérent
      catalogue KAN-28, non testé unitairement).
- [x] Contracts `WishlistAddInput` / `WishlistItem` / `WishlistPage` +
      `WISHLIST_ERROR_CODES` + `WISHLIST_MAX` + tests (`wishlist.test.ts`).
- [x] Endpoints `GET/POST /api/v1/wishlist` + `DELETE /api/v1/wishlist/[productId]`
      (validation Zod, gating rôle acheteur, plafond, unicité, codes d'erreur).
- [x] Composants `components/buyer/wishlist/*` (toggle AC-05, liste + retrait
      optimiste, compteur/barre, empty state) + page `acheteur/envies/page.tsx`.
      Sections `matchable`/`matched` et onglets non rendus (différés KAN-42),
      pas de données mockées.
- [x] Toggle « Ajouter / Retirer de mes envies » sur la fiche AC-05 (état SSR
      initial + optimistic update).
- [x] Câbler le lien « Mes envies » du shell acheteur (KAN-28) vers AC-06 +
      aperçu réel sur l'accueil AC-03. *Badge numérique nav différé* (couplé au
      matching, cf. design.md § État UI).
- [ ] Seeds/fixtures E2E : **différé** — pas de harnais « acheteur connecté +
      seed » (cohérent KAN-25/27/28). Seul le gating de `/acheteur/envies` est
      couvert (`e2e/buyer-wishlist.spec.ts`).

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
