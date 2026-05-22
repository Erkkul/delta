# Tâches techniques internes — KAN-25 Onboarding & zone

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> - KAN-81 — Renseigner son nom et sa zone d'habitation lors de l'onboarding
> - KAN-82 — Modifier sa zone d'habitation depuis les paramètres

## Tâches

- [ ] Migration `supabase/migrations/<ts>_create_buyer_profiles.sql` : table + index GIST + trigger updated_at + RLS forcée (idempotente, rollback documenté).
- [ ] Miroir RLS dans `supabase/policies/buyer_profiles.sql`.
- [ ] Régénérer `packages/db/src/types.ts` (types Supabase) après migration.
- [ ] Promouvoir `apps/web/components/producer/address-autocomplete.tsx` → `apps/web/components/forms/address-autocomplete.tsx` (ou `packages/ui-web`) et mettre à jour l'import côté producteur (KAN-17).
- [ ] Helper PostGIS d'upsert point dans `packages/db` (`ST_SetSRID(ST_MakePoint(lng,lat),4326)`).
- [ ] Schéma `BuyerProfileInput` dans `packages/contracts`.
- [ ] Remplacer le stub `/onboarding/[role]` pour `acheteur` par le vrai écran (cf. specs/KAN-2/tasks.md).

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
