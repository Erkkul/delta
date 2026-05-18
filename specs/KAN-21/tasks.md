# Tâches techniques internes — KAN-21 Gestion photos

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> (aucune au moment du cadrage — la feature n'a pas encore été éclatée en subtasks Jira)

## Tâches

- [ ] Migration `supabase/migrations/20260518xxxxxx_create_product_photos_storage_policies.sql` :
  - [ ] `INSERT INTO storage.buckets … ON CONFLICT (id) DO UPDATE` pour aligner config bucket `product-photos` (public, 5242880, MIME jpeg/png/webp) — convention KAN-17
  - [ ] 4 policies storage : `product_photos_select_public`, `product_photos_insert_owner`, `product_photos_update_owner`, `product_photos_delete_owner` (miroir de `producer-photos`, segment 1 du path = `auth.uid()::text`)
  - [ ] DROP POLICY IF EXISTS avant chaque CREATE pour rendre la migration idempotente
- [ ] Mise à jour `supabase/policies/storage.sql` (miroir documentaire) — ajouter le bloc `product-photos` après le bloc `producer-photos`. Rappel : ce fichier est purement documentaire, la source de vérité reste la migration.
- [ ] Schémas Zod `packages/contracts/src/product/photos.ts` :
  - [ ] `ProductPhotoMime` (`'image/jpeg' | 'image/png' | 'image/webp'`)
  - [ ] `ProductPhotoEntry` (`{ url: string, path: string, alt?: string }`) — **important** : `path` est stocké en plus de `url` pour éviter le reparsing fragile au DELETE (cf. design.md Risques)
  - [ ] `productPhotoUploadInput`, `productPhotoUploadOutput`, `productPhotoConfirmInput`, `productPhotoDeleteInput`, `productPhotoReorderInput`
  - [ ] Export depuis `packages/contracts/src/product/index.ts` + racine
- [ ] Mettre à jour `packages/contracts/src/product/{create,update,snapshot}.ts` pour intégrer `ProductPhotoEntry` dans le tuple `photos` (au lieu d'un placeholder vide hérité de KAN-20)
- [ ] Use cases core `packages/core/src/product/photos/` :
  - [ ] `add-product-photo.ts` + test
  - [ ] `remove-product-photo.ts` + test (réindexation par splice, préservation couverture)
  - [ ] `reorder-product-photos.ts` + test (bornes, permutation, couverture)
  - [ ] Erreurs typées dans `packages/core/src/errors.ts` : `PRODUCT_PHOTO_LIMIT_REACHED`, `PRODUCT_PHOTO_NOT_FOUND`, `PRODUCT_PHOTO_INVALID_REORDER`, `PRODUCT_PHOTO_MIME_REJECTED`
- [ ] Repo `packages/db/src/products/repo.ts` : ajout `appendPhoto(productId, entry)`, `removePhotoAt(productId, index)`, `reorderPhotos(productId, from, to)` (opérations DB pures, pas Storage)
- [ ] Helper Storage `apps/web/lib/storage/product-photos.ts` (miroir de `producer-photos.ts`) :
  - [ ] `buildProductPhotoPath(userId, productId, randomId, mime)` — convention `{user_id}/{product_id}/<random8>.<ext>`
  - [ ] `createProductPhotoUploadUrl(client, userId, productId, input)` → `{ path, upload_url, public_url, token_expires_in }`
  - [ ] `deleteProductPhoto(client, path)` → `client.storage.from('product-photos').remove([path])` (tolère 404, ne throw pas)
  - [ ] Génération random short ID : 8 chars hex via `crypto.randomBytes(4).toString('hex')`
  - [ ] Documenter en tête du fichier la différence de convention vs `producer-photos.ts` (path random vs déterministe, upsert false vs true)
- [ ] Route handlers :
  - [ ] `apps/web/app/api/v1/producer/products/[id]/photos/route.ts` (POST signature + DELETE remove)
  - [ ] `apps/web/app/api/v1/producer/products/[id]/photos/confirm/route.ts` (POST persiste DB après PUT direct, catch Postgres `23514` → `PRODUCT_PHOTO_LIMIT_REACHED`)
  - [ ] `apps/web/app/api/v1/producer/products/[id]/photos/reorder/route.ts` (PATCH)
  - [ ] Tous les handlers : check `requireProducerRole` + check `productExists && product.producer_user_id === user.id` (helper à inliner ou factoriser depuis les routes KAN-20)
- [ ] Composant `apps/web/components/producer/catalogue/photo-uploader.tsx` :
  - [ ] Grille 2×2 responsive, slots avec badges/actions selon design.md
  - [ ] Pipeline upload (validate MIME + size côté client → POST signature → PUT direct → POST confirm)
  - [ ] Pipeline reorder (boutons ↑/↓ avec PATCH, optimistic update)
  - [ ] Pipeline delete (confirmation inline + DELETE)
  - [ ] Gestion `busy` et erreurs inline (pattern KAN-17)
- [ ] Modifier `apps/web/components/producer/catalogue/product-form.tsx` :
  - [ ] Retirer l'overlay `disabledBanner="Bientôt — KAN-21"` (lignes ~296-326)
  - [ ] Monter `<ProductPhotoUploader />` avec props `productId`, `photos`, `onChange`
  - [ ] En mode « nouveau » : afficher message « Enregistrez d'abord le produit pour ajouter des photos »
  - [ ] Retirer la clé `photos` du payload PATCH général (sérialisation client) — les endpoints dédiés font autorité
- [ ] Modifier `apps/web/components/producer/catalogue/product-form-preview.tsx` :
  - [ ] Remplacer emoji placeholder par `<img src={photos[0].url}>` quand `photos.length > 0`
- [ ] Tests :
  - [ ] Unit contracts (`photos.test.ts`) — couvre MIME, reorder bornes, ProductPhotoEntry
  - [ ] Unit core (3 use cases × ~5 scénarios chacun)
  - [ ] E2E Playwright différés cohérent KAN-17/20 (mais étendre `producer-catalogue.spec.ts` avec les scénarios définis dans design.md, prêts à activer dès que la fixture auth producteur arrive)
- [ ] Vérifier l'idempotence de la migration (`DROP POLICY IF EXISTS` + `ON CONFLICT`) pour pouvoir relancer `supabase db push` sans erreur.
- [ ] **Décision technique à journaliser** dans ARCHITECTURE.md §18 (dans le commit d'implémentation, pas dans le commit de cadrage) :
  - Activation du bucket `product-photos` (alignement config + 4 policies storage) — 2ᵉ bucket versionné, confirme la convention KAN-17
  - Pattern « path random ID + entry `{url, path, alt?}` en DB » (distinct de `producer-photos` qui utilise des paths déterministes) — décision retenue pour fragilité au DELETE
  - Pattern « endpoints photo dédiés + PATCH produit n'écrit pas `photos` » — séparation responsabilité Storage / metadata
- [ ] Mise à jour `produit/jira_mapping.md` :
  - [ ] Ligne KAN-21 dans la table KAN-5 — mention `[Cadrage tech](specs/KAN-21/)` (statut reste `Ideas` jusqu'au merge)
  - [ ] Section « Vue d'ensemble » : entrée État au YYYY-MM-DD avec KAN-21 en *Ideas (cadrage)*

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
