# Tâches techniques internes — KAN-25 Onboarding & zone

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> - KAN-81 — Renseigner son nom et sa zone d'habitation lors de l'onboarding
> - KAN-82 — Modifier sa zone d'habitation depuis les paramètres

## Tâches

- [x] Migration `supabase/migrations/20260522120000_create_buyer_profiles.sql` : table + index GIST + trigger updated_at + RLS forcée + RPC `set_buyer_location` (idempotente, rollback documenté).
- [x] Miroir RLS dans `supabase/policies/buyer_profiles.sql`.
- [x] Déclarer `buyer_profiles` + RPC `set_buyer_location` dans `packages/db/src/types.ts` (types maintenus à la main, cf. en-tête du fichier).
- [x] Promouvoir `apps/web/components/producer/address-autocomplete.tsx` → `apps/web/components/forms/address-autocomplete.tsx` et mettre à jour l'import côté producteur (KAN-17). Extension : exposition `city` / `postcode`.
- [x] Helper PostGIS d'upsert point via RPC dans `packages/db` (`buyerProfilesRepo.setLocationViaRpc`).
- [x] Schéma `BuyerProfileUpsertInput` + `BuyerProfileSnapshot` dans `packages/contracts/buyer-profile`.
- [x] Use case `upsertBuyerProfile` + adapters dans `packages/core/buyer-profile`.
- [x] Route handler `GET`/`PUT /api/v1/me/buyer-profile`.
- [x] Écran onboarding `/onboarding/acheteur` (supersede le stub `[role]` pour `acheteur`) + page paramètres `/acheteur/profil`.
- [ ] Rebrancher l'atterrissage post-onboarding sur l'accueil acheteur AC-03 quand KAN-28 le livrera (actuellement `/acheteur/profil`).

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
