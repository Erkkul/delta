# Tâches techniques internes — KAN-30 Wishlist privée

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers
> partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké
> comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> (aucune)

## Tâches

- [ ] **Décision plafond** : arbitrer garde applicative (COUNT dans le repo/route
      + test de concurrence) vs. contrainte/trigger DB. Documenter le choix.
- [ ] **Décision envie orpheline** : masquer (proposé) vs. carte grisée quand le
      produit n'est plus visible via `catalogue_products`. Acter dans design.md.
- [ ] Migration `2026XXXXXXXXXX_create_wishlist_items.sql` : table + FKs +
      index unique partiel `(user_id, product_id) WHERE deleted_at IS NULL` +
      index liste/comptage + RLS forcée self-only + trigger `set_updated_at`
      si colonne `updated_at` retenue. Rollback documenté, idempotente.
- [ ] Miroir `supabase/policies/wishlist_items.sql` (convention §14.2).
- [ ] `wishlistRepo` dans `packages/db` (`list` avec jointure
      `catalogue_products`, `add`, `remove`, `count`) + mapper + tests.
- [ ] Contracts `WishlistAddInput` / `WishlistItem` / `WishlistPage` +
      `WISHLIST_ERROR_CODES` + tests.
- [ ] Endpoints `GET/POST /api/v1/wishlist` + `DELETE /api/v1/wishlist/[productId]`
      (validation Zod, plafond, unicité, codes d'erreur).
- [ ] Composants `components/buyer/wishlist/*` (carte envie, compteur/barre,
      sections différées, empty state) + page `acheteur/envies/page.tsx`.
- [ ] Toggle « Ajouter / Retirer de mes envies » sur la fiche AC-05 (état SSR
      initial + optimistic update).
- [ ] Câbler badge + lien « Mes envies » du shell acheteur (KAN-28) vers AC-06.
- [ ] Seeds/fixtures E2E : *différé* si le harnais « acheteur connecté + seed »
      n'existe toujours pas (cohérent posture KAN-28).

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
