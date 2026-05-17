# Tâches techniques internes — KAN-17 Informations profil & ferme

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> - KAN-63 — Renseigner ses informations de profil (nom, description, photo)
> - KAN-64 — Renseigner l'adresse exacte de la ferme ou du point de collecte
> - KAN-65 — Modifier ses informations de profil
> - KAN-66 — Visualiser son profil public (vue acheteur / rameneur)

## Tâches

- [ ] Migration `supabase/migrations/YYYYMMDDHHMMSS_extend_producers_profile.sql` :
  - Création des ENUM `producer_label`, `weekday`
  - Ajout des colonnes profil + adresse + créneaux + `paused`
  - Création de la colonne `pickup_location geography(Point, 4326)` + index GIST
  - CHECK constraints (max 3 farm photos, horaires cohérents, longueurs textes)
  - RPC `reveal_pickup_address(producer_id uuid)` SECURITY DEFINER
  - Mise à jour RLS `producers` (insert/update owner-only sur les nouvelles colonnes)
  - Mise à jour RLS `products` (étendre gating `published` avec `producer.paused = false`)
- [ ] Migration bucket Storage `producer-photos` :
  - Création bucket via `storage.buckets` insert (config 5 MB, MIME jpeg/png/webp, public)
  - Policies dans `supabase/policies/storage.sql` (upload owner-only, lecture publique)
- [ ] Helper `packages/db/src/producers/repo.ts` — méthodes `findById`, `findByUserId`, `updateProfile(partial)`, `setPaused(bool)`, `revealPickupAddress(producerId)` (wrap RPC)
- [ ] Helper `apps/web/lib/storage/producer-photos.ts` — signature upload, suppression, helper chemin canonique
- [ ] Helper `apps/web/lib/geocoding/adresse-gouv.ts` — wrapper API Adresse Gouv.fr (search + get coordinates) + cache mémoire 24 h
- [ ] Schemas Zod `packages/contracts/src/producer-profile.ts` — `producerProfileSchema`, `producerProfileUpdateSchema`, `pickupAddressSchema`, `farmPhotosSchema`, `labels` (z.enum)
- [ ] Export depuis `packages/contracts/src/index.ts`
- [ ] Composant `apps/web/components/producer/ProducerProfileForm.tsx` (form unique, props `mode: 'wizard' | 'edit'`)
- [ ] Composant `apps/web/components/producer/ProducerPublicCardPreview.tsx` (rendu pur, prêt pour réutilisation KAN-53)
- [ ] Composant `apps/web/components/forms/AddressAutocomplete.tsx` (réutilisable — sera repris par KAN-25 acheteur, KAN-41 rameneur)
- [ ] Composant `apps/web/components/producer/PhotoUploader.tsx` (avatar + galerie)
- [ ] Page `apps/web/app/producer/profile/page.tsx` (mode édition)
- [ ] Intégration dans `apps/web/app/onboarding/producer/page.tsx` (mode wizard step 1, remplace le placeholder de KAN-16)
- [ ] Skeleton page `apps/web/app/producer/settings/page.tsx` avec le toggle pause câblé + les autres sections en placeholder « Bientôt » (à supprimer / compléter au fil des tickets KAN-3 / KAN-14)
- [ ] Tests unitaires `packages/core/src/producer/profile.test.ts`
- [ ] Tests intégration RLS `supabase/tests/producers-rls.sql` (ou vitest avec supabase local — convention à valider, voir notes KAN-3)
- [ ] Tests E2E Playwright `apps/web/e2e/producer-profile.spec.ts`
- [ ] Seed dev `supabase/seeds/producer-profile-sample.sql` (un producteur démo avec profil rempli — utile pour KAN-53 / catalogue acheteur)

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
