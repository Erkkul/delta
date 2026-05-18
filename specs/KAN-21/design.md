# Conception technique — KAN-21 Gestion photos

## Vue d'ensemble

Un seul mouvement : connecter le pipeline Storage déjà battu par KAN-17 (`producer-photos`) au bucket frère `product-photos`, et câbler les invariants côté DB (`photos jsonb`, max 4, `photos[0] = couverture`) à l'UI déjà dessinée dans PR-05 mais désactivée par KAN-20.

Pas de nouvelle table, pas de nouvelle colonne — l'infrastructure DB est posée. La seule migration nécessaire crée les policies RLS Storage du bucket `product-photos` (4 policies miroir de `producer-photos`) et aligne la config du bucket via `INSERT INTO storage.buckets … ON CONFLICT DO UPDATE`. Côté code, le pattern POST signature + PUT direct + persistance DB est reproduit, avec une nuance : les écritures de `photos` se font par endpoints dédiés (POST confirm / DELETE / PATCH reorder), pas via le PATCH produit général.

## Packages touchés

- [x] `packages/contracts` — `product/photos.ts` (Zod : upload, confirm, delete, reorder ; types `ProductPhotoMime`, `ProductPhotoEntry`)
- [x] `packages/core` — `product/photos/` : use cases `addProductPhoto`, `removeProductPhoto`, `reorderProductPhotos` + erreurs typées (`PRODUCT_PHOTO_LIMIT_REACHED`, `PRODUCT_PHOTO_NOT_FOUND`, `PRODUCT_PHOTO_INVALID_REORDER`, `PRODUCT_PHOTO_MIME_REJECTED`)
- [x] `packages/db` — extension du repo `products` : `appendPhoto`, `removePhotoAt`, `reorderPhotos` (opérations DB pures, pas Storage)
- [x] `apps/web` — `app/api/v1/producer/products/[id]/photos/route.ts` (POST signature + DELETE), `…/photos/confirm/route.ts` (POST), `…/photos/reorder/route.ts` (PATCH), `lib/storage/product-photos.ts`
- [ ] `apps/mobile` — hors scope
- [ ] `packages/jobs` — aucun job
- [x] `supabase/migrations` — `20260518xxxxxx_create_product_photos_storage_policies.sql` (alignement bucket + 4 policies storage)
- [x] `supabase/policies/storage.sql` — miroir documentaire (ajout du bloc `product-photos` après celui de `producer-photos`)
- [ ] `packages/ui-web` — composants dans `apps/web/components/producer/catalogue/`, pas dans `packages/ui-web/` (cohérent KAN-17/20)

## Modèle de données

Aucun changement de schéma. Rappels :

- Table `public.products`, colonne `photos jsonb NOT NULL DEFAULT '[]'::jsonb`.
- CHECK `products_photos_max` : `jsonb_typeof(photos) = 'array' AND jsonb_array_length(photos) <= 4`.
- Format applicatif du tableau (validé Zod côté contracts, pas en DB) :

```ts
type ProductPhotoEntry = {
  url: string          // URL publique Storage (bucket product-photos public)
  path: string         // Path complet dans le bucket — utilisé au DELETE Storage
  alt?: string         // optionnel, vide au MVP
}
type Photos = ProductPhotoEntry[]  // 0..4 entries, photos[0] = couverture
```

- Pas de colonne `is_cover` : `photos[0]` fait foi par convention. Test unitaire core garantit que toute opération qui modifie le tableau préserve cette invariante.

**Storage** :

- Bucket `product-photos` (déjà créé via dashboard le 2026-05-08, cf. `tech/setup.md` ligne 25). Public en lecture, 5 MB max, MIME `image/{jpeg,png,webp}`.
- Migration KAN-21 : `INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('product-photos', 'product-photos', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']) ON CONFLICT (id) DO UPDATE SET …` (idempotent, aligne la config dashboard si dérive).
- Convention path : `{user_id}/{product_id}/<random8>.<ext>` (random short ID — voir Hypothèses dans proposal.md). Le 1ᵉʳ segment passe la `WITH CHECK` RLS.

**Policies RLS Storage du bucket `product-photos`** (miroir de `producer-photos`) :

| Policy | Opération | Cible | Condition |
|---|---|---|---|
| `product_photos_select_public` | SELECT | anon, authenticated | `bucket_id = 'product-photos'` |
| `product_photos_insert_owner` | INSERT | authenticated | `bucket_id = 'product-photos' AND auth.uid()::text = (storage.foldername(name))[1]` |
| `product_photos_update_owner` | UPDATE | authenticated | idem INSERT (USING + WITH CHECK) |
| `product_photos_delete_owner` | DELETE | authenticated | idem INSERT |

Note : la policy SELECT publique se justifie car le bucket est public (acheteurs anonymes voient les vignettes). L'isolement utilisateur est strictement côté write.

Référence : ARCHITECTURE.md §5.2, §9.2 ; `supabase/migrations/20260517150000_extend_producers_profile.sql` lignes 314-355 (modèle KAN-17).

## API / Endpoints

Tous versionnés `/api/v1/`, validés Zod, handlers 15-30 lignes (ARCHITECTURE §3, §14.2). Auth : `requireProducerRole(user)`, vérif ownership du produit (RLS `products` filtrera de toute façon ; on inline un check explicite 404/403 pour la lisibilité).

- `POST /api/v1/producer/products/[id]/photos`
  - Input Zod `productPhotoUploadInput` : `{ content_type: 'image/jpeg' | 'image/png' | 'image/webp' }` (pas de `slot` — l'index est calculé serveur = `photos.length`).
  - Vérifie `photos.length < 4` (sinon `PRODUCT_PHOTO_LIMIT_REACHED`, 409).
  - Génère un random short ID (8 chars hex via `crypto.randomBytes(4).toString('hex')`), construit le path `{user_id}/{product_id}/<id>.<ext>`.
  - Appelle `createSignedUploadUrl(path, { upsert: false })`.
  - Renvoie `{ path, upload_url, public_url, token_expires_in: 60 }`.
  - **Ne persiste pas encore** la photo dans `products.photos` — le client persistera après PUT réussi via l'endpoint `confirm`.

- `POST /api/v1/producer/products/[id]/photos/confirm`
  - Input Zod `productPhotoConfirmInput` : `{ path: string, public_url: string }`.
  - Vérifie que `path` commence bien par `{auth.uid()}/{product_id}/` (anti-tampering basique).
  - Use case `addProductPhoto` : append `{ url: public_url, path }` au tableau `photos` du produit (CHECK DB rattrape la race condition si deux uploads simultanés — handler catch sur Postgres `23514` → `PRODUCT_PHOTO_LIMIT_REACHED`).
  - Renvoie le snapshot complet du produit.

- `DELETE /api/v1/producer/products/[id]/photos`
  - Input Zod `productPhotoDeleteInput` : `{ index: number }` (0..3).
  - Use case `removeProductPhoto` : lit le `path` depuis `photos[index].path`, supprime le fichier Storage via `client.storage.from('product-photos').remove([path])` (tolère 404), retire l'entrée du tableau (réindexation auto par splice), renvoie le snapshot. Si le Storage remove échoue, on retourne quand même le snapshot DB mis à jour (le fichier devient orphelin — voir Risques).

- `PATCH /api/v1/producer/products/[id]/photos/reorder`
  - Input Zod `productPhotoReorderInput` : `{ from: number, to: number }`.
  - Use case `reorderProductPhotos` : check bornes (`0 ≤ from < photos.length`, `0 ≤ to < photos.length`, `from ≠ to`), permute, renvoie snapshot. Aucun appel Storage.

Erreurs typées (héritage `core/errors.ts`) :
- `PRODUCT_PHOTO_LIMIT_REACHED` (409)
- `PRODUCT_PHOTO_NOT_FOUND` (404 si `index ≥ photos.length`)
- `PRODUCT_PHOTO_INVALID_REORDER` (400 si `from === to` ou bornes invalides)
- `PRODUCT_PHOTO_MIME_REJECTED` (400, hérité de la validation Zod)
- `PRODUCT_FORBIDDEN` (403, déjà défini KAN-20)
- `PRODUCT_NOT_FOUND` (404, déjà défini KAN-20)

## Impact state machine / events

Aucun. Pas de transition mission, pas d'event Inngest (cohérent avec la note KAN-20 : `product.updated` reste théorique tant que KAN-42 ne consomme pas).

## Dépendances

Services externes :
- **Supabase Storage** — bucket `product-photos` (`tech/setup.md` § Supabase ligne 25, provisionné 2026-05-08, public, 5 MB, MIME jpeg/png/webp). KAN-21 ajoute les policies RLS Storage via migration (rattrapage de la convention « bucket versionné » posée par KAN-17).
- Aucune autre dépendance externe.

Internes :
- `apps/web/lib/storage/producer-photos.ts` (KAN-17) — modèle direct, factorisable mais on choisit de **dupliquer** dans `product-photos.ts` plutôt que d'abstraire prématurément. Si un 3ᵉ bucket apparaît (post-MVP), on extraira un helper générique. Trois similar lines is better than a premature abstraction (cf. CLAUDE.md).
- Table `products` (KAN-20) — colonnes `photos`, CHECK `products_photos_max`.
- Migration `20260517150000_extend_producers_profile.sql` — modèle des 4 policies storage (lignes 314-355).
- Composants `<ProductForm />` et `<ProductFormPreview />` (KAN-20) — câblage final.

## État UI

Référence : DESIGN.md (tokens, breakpoints) ; maquette `pr-05-edition-produit.html` lue intégralement, section 2 « Photos du produit » (lignes 717-745).

**Composant `<ProductPhotoUploader />`** (nouveau, dans `apps/web/components/producer/catalogue/photo-uploader.tsx`) :

- Grille `display: grid; grid-template-columns: 1fr 1fr; gap: 14px;` (desktop). Responsive : 1 colonne < 540 px (cf. maquette ligne 555).
- Affiche jusqu'à 4 slots :
  - Slots remplis (`i < photos.length`) : preview `<img src={photos[i].url} className="object-cover">`, badge « Couverture » sur i=0 (`photo-cover-tag`), boutons d'action en overlay top-right : « ↑ », « ↓ » (reorder, désactivés en bord), « 🗑 » (delete, hover rouge).
  - Slot vide suivant (`i === photos.length`) : zone dashed avec icône caméra + label « Ajouter une photo » (cf. maquette lignes 740-743). Clique → `<input type="file">`.
  - Slots vides au-delà (`i > photos.length`) : non rendus (la maquette montre 4 slots fixes, mais on rend seulement `photos.length + 1` slots — moins de bruit visuel quand 0 ou 1 photo).
- Pipeline upload : `<input file>` → validate MIME + size côté client (5 MB, jpeg/png/webp) → `POST /photos` (signature) → `PUT upload_url` avec `Content-Type` exact → `POST /photos/confirm`. État `busy` désactive tous les contrôles. Erreurs inline en `text-[#C0392B]` (pattern KAN-17).
- Pipeline reorder : click ↑ → `PATCH /photos/reorder { from: i, to: i-1 }`. Optimistic update local + revalidation au retour.
- Pipeline delete : click 🗑 → confirmation inline (« Supprimer ? Annuler ») → `DELETE /photos { index: i }`. Pas de modale (sécurité réversible par re-upload, opération non destructrice du produit).
- Helper text au-dessus : « Une à 4 photos. La première sera utilisée comme couverture. Format paysage de préférence. » (extrait de la maquette ligne 724).

**Câblage dans `<ProductForm />`** (KAN-20, `apps/web/components/producer/catalogue/product-form.tsx` ligne ~296) :

- Retirer l'overlay `disabledBanner="Bientôt — KAN-21"` (lignes 296-326 du JSX actuel).
- Monter `<ProductPhotoUploader productId={product.id} photos={product.photos} onChange={(updated) => setProduct({ ...product, photos: updated })} />`.
- En mode « nouveau » (pas d'`id` encore) : afficher un message « Enregistrez d'abord le produit pour ajouter des photos » (le `productId` n'existe pas tant que le POST initial n'a pas eu lieu — cohérent avec le flow KAN-17 où le wizard crée la coquille avant d'autoriser l'upload).
- Le PATCH général du produit n'écrit plus la clé `photos` — la sérialisation côté client retire ce champ avant l'envoi pour éviter toute désynchronisation.

**Câblage dans `<ProductFormPreview />`** (KAN-20) :

- Remplacer le `<span class="mock-card-emoji">🍯</span>` placeholder par `<img src={photos[0].url}>` quand `photos.length > 0`. Garder l'emoji fallback sinon.

Mobile : non livré (cohérent KAN-17/18/20).

## Risques techniques

- **Fichiers orphelins Storage** : si le PUT direct réussit mais que le `POST /photos/confirm` échoue (réseau, crash navigateur, etc.), le fichier reste dans Storage sans être référencé dans `products.photos`. Inversement, si `removeProductPhoto` met à jour `photos` mais que le Storage `.remove()` échoue. **Au MVP, on accepte cette dette**. Mitigation post-MVP : job Inngest périodique qui liste les fichiers `product-photos/{user_id}/*/*` et croise avec `products.photos` côté DB ; supprime les orphelins > 24 h. À noter dans backlog.
- **Race condition `photos.length`** : deux uploads quasi-simultanés peuvent passer la vérif `photos.length < 4` côté serveur avant le commit DB du premier. Le CHECK `products_photos_max` rattrape (la 5ᵉ ligne échoue avec un constraint violation). Bien gérer l'erreur DB côté handler `confirm` (catch sur code Postgres `23514`) et renvoyer `PRODUCT_PHOTO_LIMIT_REACHED` au lieu d'un 500.
- **Convention path divergente vs KAN-17** : KAN-17 utilise `{user_id}/logo.<ext>` ou `{user_id}/farm-<slot>.<ext>` (chemins déterministes, upsert), KAN-21 utilise `{user_id}/{product_id}/<random>.<ext>` (chemins uniques). Différence assumée : photos de profil = remplaçables (un seul logo), photos produit = collection variable. Documenter dans le commentaire de `product-photos.ts`.
- **`upsert: false` vs `upsert: true`** : KAN-17 utilise `upsert: true` pour permettre de remplacer le logo. KAN-21 utilise `upsert: false` car le path est unique par random ID — un `upsert: true` masquerait une collision (improbable mais possible). Rejeter explicitement.
- **Bucket public + RGPD** : les URLs sont devinables si on connaît le user_id + product_id + l'ID court (8 hex = 4 milliards de combinaisons). Pas un secret cryptographique mais largement suffisant pour des photos de produits non sensibles. Aligné avec `producer-photos`.
- **Limite free-tier Storage** : 1 GB de stockage et 2 GB de bande passante / mois sur le plan Free. 4 photos × 5 MB × ~50 producteurs = 1 GB. Surveiller le quota dashboard. Trigger d'upgrade documenté dans ARCHITECTURE.md §13.2.
- **Pas de transformation** : si un producteur upload une photo 5000×4000 px à 4 MB, elle sera servie telle quelle à l'acheteur (bande passante consommée). Acceptable au MVP (producteurs ciblés ≤ 50). Note pour KAN-28 acheteur : envisager Vercel Image Optimization (`<Image src>` auto-WebP + resize) à ce moment.
- **Anti-tampering du path côté `confirm`** : un client malveillant pourrait appeler `POST /photos/confirm` avec un path arbitraire (ex : pointant vers une photo d'un autre producteur). Le check `path.startsWith(`${auth.uid()}/${productId}/`)` côté handler bloque ce cas. RLS table `products` bloque de toute façon l'écriture sur un produit qui n'appartient pas à l'auteur.

## Tests envisagés

Référence : ARCHITECTURE.md §10.

- **Unit `packages/contracts`** (`product/photos.test.ts`) :
  - `productPhotoUploadInput` accepte `image/jpeg`, `png`, `webp`, refuse `image/gif`, `image/heic`.
  - `productPhotoReorderInput` : `from` et `to` ≥ 0 et < 4, `from ≠ to`.
  - `ProductPhotoEntry` exige `url` + `path`, accepte `alt` optionnel.
- **Unit `packages/core/src/product/photos/`** :
  - `addProductPhoto` : succès, refus si `photos.length === 4`, préservation des entrées existantes.
  - `removeProductPhoto` : succès (réindexation par splice), refus si index hors bornes, préservation de `photos[0]` comme couverture quand on supprime un autre index.
  - `reorderProductPhotos` : permutation correcte (from=2, to=0 → la photo passe en couverture), refus si index identiques ou hors bornes.
- **Intégration DB** (différée tant que CI Supabase locale non activée, cohérent KAN-20) :
  - CHECK `products_photos_max` rattrape un INSERT direct avec 5 entrées.
  - Policy Storage `product_photos_insert_owner` rejette un upload avec un path commençant par un autre user_id.
- **E2E web Playwright** (`apps/web/e2e/producer-catalogue.spec.ts` — étendre le fichier existant) :
  - Producteur ouvre `/producer/catalogue/[id]`, ajoute une photo, voit la couverture dans la preview droite.
  - Ajoute 4 photos, vérifie que le 5ᵉ slot disparaît.
  - Réordonne (↑ sur photo 2), vérifie que la couverture change.
  - Supprime la couverture, vérifie que la photo 2 devient couverture.
  - **Différé** si fixtures auth producteur indisponibles, cohérent avec note KAN-20.
- **Tests Storage policies** : différés (cohérent KAN-17 / KAN-20).
