# Tâches techniques internes — KAN-26 Préférences catégories

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> - KAN-83 — Indiquer ses préférences de catégories de produits lors de l'onboarding
> - KAN-84 — Modifier ses préférences de catégories depuis les paramètres

## Tâches

- [ ] Migration `supabase/migrations/<ts>_buyer_profiles_preferred_categories.sql` : `ADD COLUMN preferred_categories product_category[] NOT NULL DEFAULT '{}'` + `COMMENT ON COLUMN` (idempotence `ADD COLUMN IF NOT EXISTS`, rollback documenté `DROP COLUMN`).
- [ ] Déclarer `preferred_categories` sur `buyer_profiles` dans `packages/db/src/types.ts` (Row/Insert/Update, types maintenus à la main) et l'ajouter à `SELECT_COLUMNS` du repo.
- [ ] Étendre `BuyerProfileUpsertInput` + `BuyerProfileSnapshot` (`packages/contracts/buyer-profile`) avec `preferredCategories` (réutiliser `ProductCategory`, `.max(8)`, optionnel).
- [ ] Propager `preferredCategories` dans le use case upsert + adapters `packages/core/buyer-profile` (dédoublonnage).
- [ ] Étendre le route handler `PUT /api/v1/me/buyer-profile` (champ optionnel, rétro-compat KAN-25).
- [ ] Composant chips multi-select catégories réutilisable (onboarding + paramètres), alimenté par `PRODUCT_CATEGORIES` / `PRODUCT_CATEGORY_FR` / `PRODUCT_CATEGORY_EMOJI`.
- [ ] Étape 2 du wizard `/onboarding/acheteur` (intégration au stepper KAN-25) + section/sous-écran préférences dans `/acheteur/profil`.
- [ ] `specs/KAN-26/notes.md` : consigner la déviation taxonomie maquette AC-02 ↔ enum `product_category` (arbitrage produit).

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
