# Cadrage — KAN-21 Gestion photos

## Liens

- Jira : https://erkulaws.atlassian.net/browse/KAN-21
- Epic : KAN-5 Catalogue
- Maquette : `design/maquettes/producteur/pr-05-edition-produit.html` (section 2 « Photos du produit » — actuellement désactivée par KAN-20)
- PRD : §10.2 PR-05 Création / édition produit
- ARCHITECTURE : §5 (DB — colonne `photos jsonb` déjà présente, bucket `product-photos`), §9 (RLS Storage), §13 (free-tier Storage), §14 (playbook), §18 entrée 1.19 (pattern photos producteur posé par KAN-17), §18 entrée 1.22 (CHECK `products_photos_max` déjà en DB)

## Pourquoi (côté tech)

KAN-20 a livré la table `products` avec la colonne `photos jsonb NOT NULL DEFAULT '[]'` plafonnée à 4 entrées par un CHECK (`products_photos_max`), et le bucket Storage `product-photos` est provisionné depuis le 2026-05-08 (cf. `tech/setup.md` § Supabase ligne 25). Le formulaire d'édition (PR-05 section 2) affiche pour l'instant un overlay « Bientôt — KAN-21 » sur la zone d'upload.

KAN-21 active réellement cette section : pipeline d'upload signé identique à KAN-17 (`producer-photos`), persistance ordonnée des URLs dans `products.photos`, gestion d'une couverture (1ʳᵉ photo), réorganisation et suppression par photo. Aucun nouveau bucket, aucune nouvelle colonne — c'est purement câbler le contenant à l'écran.

## Périmètre technique

**In scope :**

- Policies RLS Storage du bucket `product-photos` (le bucket existe déjà mais ses policies n'ont jamais été versionnées via migration — KAN-17 a posé celles de `producer-photos`, on étend le même pattern). Convention de path : `{auth_user_id}/{product_id}/<random8>.<ext>`. Premier segment = `auth.uid()::text` pour passer `WITH CHECK`.
- Alignement de la config du bucket via `INSERT INTO storage.buckets … ON CONFLICT DO UPDATE` dans la même migration (convention « bucket versionné » posée par KAN-17 le 2026-05-17). Idempotent.
- Endpoint `POST /api/v1/producer/products/[id]/photos` → vérifie owner + producteur, valide MIME, vérifie `photos.length < 4`, génère URL signée d'upload via `client.storage.from('product-photos').createSignedUploadUrl(path, { upsert: false })`. Renvoie `{ path, upload_url, public_url, token_expires_in }`. Ne persiste rien en DB.
- Endpoint `POST /api/v1/producer/products/[id]/photos/confirm` → body `{ path, public_url }` ; persiste `{ url, path }` au tableau `photos` via le use case `addProductPhoto`. Renvoie le snapshot complet du produit.
- Endpoint `DELETE /api/v1/producer/products/[id]/photos` → body `{ index: number }` ; supprime le fichier Storage (via `path` stocké dans le tuple) + retire l'entrée du tableau en réindexant les suivantes.
- Endpoint `PATCH /api/v1/producer/products/[id]/photos/reorder` → body `{ from, to }` ; permute les entrées (couverture = `photos[0]`). Aucun appel Storage.
- Use cases core dans `packages/core/src/product/photos/` : `addProductPhoto`, `removeProductPhoto`, `reorderProductPhotos` — modélisent les invariants (max 4, indices contigus, format `{ url, path, alt? }`).
- Schémas Zod dans `packages/contracts/src/product/photos.ts` : `ProductPhotoMime`, `ProductPhotoEntry`, `productPhotoUploadInput`, `productPhotoUploadOutput`, `productPhotoConfirmInput`, `productPhotoDeleteInput`, `productPhotoReorderInput`. Le whitelist MIME (jpeg/png/webp) et la limite 5 MB sont identiques aux photos producteur — pas de partage de type avec `producer`, on duplique.
- Helper Storage `apps/web/lib/storage/product-photos.ts` (miroir de `producer-photos.ts`) : `buildProductPhotoPath(userId, productId, randomId, mime)`, `createProductPhotoUploadUrl(client, …)`, `deleteProductPhoto(client, path)`. Ce helper reste local à `apps/web` au MVP (cohérent KAN-17, pas de réutilisation cross-app).
- Composant `<ProductPhotoUploader />` dans `apps/web/components/producer/catalogue/` : grille 2×2 (responsive 1 col < 540 px, cf. maquette), slot couverture marqué `photo-cover-tag`, actions « ↑ », « ↓ », « 🗑 » au survol, état chargement, gestion d'erreur inline. Pas de drag-and-drop au MVP — les flèches haut/bas suffisent (PATCH reorder à chaque mouvement).
- Câblage dans `<ProductForm />` (KAN-20) : retirer l'overlay « Bientôt — KAN-21 », monter `<ProductPhotoUploader productId={…} photos={form.photos} onChange={…} />` à la place. Les endpoints dédiés font autorité sur l'écriture de `photos` ; le PATCH général du produit n'écrit plus cette colonne.
- Section preview droite (`<ProductFormPreview />`) : l'emoji catégorie placeholder est remplacé par `<img src={photos[0].url}>` quand au moins une photo est uploadée.
- Tests unitaires des use cases core + tests Zod + 1 scénario E2E Playwright « ajouter, réorganiser, supprimer une photo » (déféré si fixtures auth producteur non disponibles, cohérent KAN-20).

**Out of scope (cette US) :**

- **Drag-and-drop** réordonnement libre : KAN-21 livre les flèches up/down ; un drag-and-drop avec `react-dnd` ou natif est reporté post-MVP.
- **Compression / redimensionnement côté serveur** : non livré au MVP. Le format paysage est suggéré dans l'UI (« Format paysage de préférence ») mais aucune transformation n'est appliquée. Une étape Sharp + Vercel Image Optimization est notée en Risques mais hors livraison.
- **Génération d'`alt` automatique** : le champ `alt` du tuple reste vide au MVP — pas de champ UI ni de génération AI. Réservé v2.
- **Transactions atomiques DB + Storage** : on accepte qu'un upload Storage réussi puis un POST `confirm` qui échoue laisse un fichier orphelin (et inversement). Un cron de réconciliation pourra être ajouté post-MVP (cf. Risques).
- **Catalogue acheteur (KAN-28)** : la consommation des URLs publiques côté acheteur est différée. KAN-21 garantit juste que `photos[0].url` est lisible publiquement (bucket public + policy SELECT anon).
- **Mobile** : non livré (`apps/mobile/` reste non scaffoldé, cohérent avec l'épic KAN-5).

## Hypothèses

- Le bucket `product-photos` est déjà provisionné en mode **public**, 5 MB max, MIME `image/jpeg/png/webp` (cf. `tech/setup.md` ligne 25). Aucune création de bucket via migration nécessaire — seules les policies RLS Storage doivent être versionnées (le bucket a été créé via dashboard à l'init, avant la convention « bucket versionné par migration » posée par KAN-17). Migration KAN-21 = `INSERT INTO storage.buckets … ON CONFLICT DO UPDATE` pour aligner la config + 4 policies.
- La convention de path `{user_id}/{product_id}/<random8>.<ext>` permet à la RLS Storage de gérer l'autorisation sans connaître la table `products` (vérif uniquement `auth.uid()::text = foldername[1]`). L'appartenance produit → producteur est garantie par la RLS de la table `products` qui filtre déjà au niveau des endpoints. On accepte qu'un producteur puisse théoriquement uploader dans le dossier d'un produit qui ne lui appartient pas s'il devine l'UUID — mais (a) le `POST /photos/confirm` qui persisterait l'URL est bloqué par RLS `products_update_owner`, (b) l'URL publique reste inaccessible côté acheteur tant qu'elle n'est pas référencée dans `photos`. Risque résiduel = pollution Storage, accepté.
- Limite « 4 photos max » : enforced à 3 niveaux — UI (4 slots), serveur (check `photos.length < 4` avant signature), DB (`products_photos_max` CHECK `jsonb_array_length ≤ 4`). Le CHECK DB rattrape la race condition d'uploads concurrents (cf. Risques techniques dans design.md).
- `photos[0]` = couverture, par convention d'ordre du tableau. Aucune colonne `is_cover` séparée — la première position fait foi. Cohérent avec la maquette qui affiche le badge « Couverture » sur le premier slot.
- L'écriture finale de `photos jsonb` passe par les **endpoints dédiés** (`POST confirm`, `DELETE`, `PATCH reorder`), pas par le PATCH général du produit. Cela évite qu'un PATCH product « tout-en-un » soumette un `photos` désynchronisé du Storage. Le `<ProductForm />` reflète l'état serveur après chaque action photo.
- Le tuple stocké en DB est `{ url, path, alt? }` et non juste `{ url, alt? }`. Le `path` redondant supprime la fragilité du reparsing d'URL au DELETE Storage. Coût négligeable (~ 60 octets supplémentaires par photo).
- Le path Storage utilise un **random short ID** (8 chars hex) plutôt qu'un index positionnel `<n>.<ext>`. Cela évite tout rename Storage à la réindexation (DELETE / REORDER ne touchent que la DB, les fichiers sont écrasés uniquement à l'ajout). Décision retenue.
- Le bucket reste **public** : pas d'URL signée à la lecture (les acheteurs accèdent via `<img src>`). Aligné avec `producer-photos` (KAN-17) — décision identique, on ne change pas le compromis.
