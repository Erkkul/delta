# Tâches techniques internes — KAN-17 Informations profil & ferme

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> - KAN-63 — Renseigner ses informations de profil (nom, description, photo)
> - KAN-64 — Renseigner l'adresse exacte de la ferme ou du point de collecte
> - KAN-65 — Modifier ses informations de profil
> - KAN-66 — Visualiser son profil public (vue acheteur / rameneur)

## Tâches

- [x] Migration `supabase/migrations/20260517150000_extend_producers_profile.sql` :
  - [x] Création des ENUM `producer_label`, `weekday`
  - [x] Ajout des colonnes profil + adresse + créneaux + `paused`
  - [x] Création de la colonne `pickup_location geography(Point, 4326)` + index GIST
  - [x] CHECK constraints (max 3 farm photos, horaires cohérents, longueurs textes)
  - [x] RPC `reveal_pickup_address(producer_id uuid)` SECURITY DEFINER
  - [x] RPC `set_pickup_location(longitude, latitude)` SECURITY INVOKER (PostGIS update)
  - [x] RLS `producers` (les policies existantes couvrent les nouvelles colonnes — pas de policy à ajouter)
  - [x] Mise à jour `supabase/policies/products.sql` (placeholder doc enrichi de `paused = false` — pour KAN-20 quand la table products livrera)
- [x] Migration bucket Storage `producer-photos` :
  - [x] Création bucket via `storage.buckets` upsert (5 MB, MIME jpeg/png/webp, public)
  - [x] Policies dans `supabase/policies/storage.sql` (upload owner-only, lecture publique)
- [x] Repo `packages/db/src/producers/repo.ts` — méthodes `updateProfile`, `setPaused`, `setPickupLocationViaRpc`, `revealPickupAddress`
- [x] Helper `apps/web/lib/storage/producer-photos.ts` — signature upload, suppression, helper chemin canonique
- [x] Helper `apps/web/lib/geocoding/adresse-gouv.ts` — wrapper API Adresse Gouv.fr (best-effort, timeout 4 s)
- [x] Schemas Zod `packages/contracts/src/producer/profile.ts` — `ProducerProfileUpdateInput`, `ProducerProfileSnapshot`, `ProducerPhotoUploadInput`, `ProducerPauseInput`, libellés FR labels/jours
- [x] Export depuis `packages/contracts/src/producer/index.ts`
- [x] Use cases core : `updateProducerProfile`, `setProducerPause` + erreurs typées (`ProducerProfileNotFoundError`, `AddressGeocodeFailedError`, `PhotoLimitReachedError`, `PhotoMimeRejectedError`)
- [x] Adapter web `getGeocodeAdapter()` + extension `getProducerAdapter` (updateProfile / setPauseState / setPickupLocation)
- [x] Route handlers `apps/web/app/api/v1/producer/profile/route.ts` (GET + PATCH), `…/pause/route.ts` (POST), `…/photos/route.ts` (POST + DELETE)
- [x] Composant `apps/web/components/producer/producer-profile-form.tsx` (form unique, props `mode: 'wizard' | 'edit'`)
- [x] Composant `apps/web/components/producer/producer-public-card-preview.tsx` (rendu pur, prêt pour réutilisation KAN-53)
- [x] Composant `apps/web/components/producer/address-autocomplete.tsx` (API Adresse Gouv.fr, debounce 350 ms — à déplacer dans `forms/` quand KAN-25/41 le reprendront)
- [x] Composant `apps/web/components/producer/photo-uploader.tsx` (upload signé → PUT direct → callback URL)
- [x] Page `apps/web/app/producer/profile/page.tsx` (mode édition)
- [x] Intégration dans `apps/web/app/(auth)/onboarding/producteur/` (phase `profile` ajoutée, étape 1 active avec `ProducerProfileForm` en mode wizard)
- [x] Skeleton page `apps/web/app/producer/settings/page.tsx` avec le toggle pause câblé + les autres sections en placeholder « Bientôt »
- [x] Tests unitaires : 21 contracts profile.test.ts + 10 update-profile.test.ts + 5 set-pause.test.ts (factories `freshProducer` étendues dans les tests SIRET/Stripe existants)
- [ ] Tests intégration RLS `supabase/tests/producers-rls.sql` — différé (pas d'environnement Supabase local automatisé dans la CI au MVP)
- [ ] Tests E2E Playwright `apps/web/e2e/producer-profile.spec.ts` — différé (les tests d'auth existants n'ont pas de scénario producteur post-onboarding ; à câbler dans un ticket polish)
- [ ] Seed dev `supabase/seeds/producer-profile-sample.sql` — différé (utile mais bloque pas la livraison ; suit l'arrivée de KAN-53 / catalogue acheteur)

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.

## Décision technique structurante introduite

Une entrée ajoutée au journal §18 d'`ARCHITECTURE.md` :
- Premier bucket Supabase Storage créé par migration (`producer-photos`).
- Premier usage PostGIS dans le schéma applicatif (`pickup_location geography(Point, 4326)`).
- Pattern « colonne sensible exposée via RPC SECURITY DEFINER » établi avec `reveal_pickup_address`.
