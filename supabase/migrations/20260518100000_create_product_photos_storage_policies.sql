-- Migration: create_product_photos_storage_policies
-- Date: 2026-05-18
-- Ticket: KAN-21 (Gestion photos)
-- Cadrage: specs/KAN-21/design.md
--
-- Active le bucket `product-photos` (déjà créé via dashboard à l'init, cf.
-- `tech/setup.md` § Supabase ligne 25) en versionnant sa configuration et ses
-- policies RLS Storage. C'est le 2ᵉ bucket versionné après `producer-photos`
-- (KAN-17, migration `20260517150000_extend_producers_profile.sql`) — confirme
-- la convention « bucket versionné par migration » posée par KAN-17.
--
-- Convention chemins de fichiers (KAN-21, bucket `product-photos`) :
--   {producer_user_id}/{product_id}/<random8>.<ext>
--
-- Le 1ᵉʳ segment doit être `auth.uid()::text` pour passer les policies
-- WITH CHECK. L'appartenance produit → producteur est garantie par la RLS
-- de la table `public.products` (`products_update_owner`) qui filtre côté
-- endpoints `POST/DELETE/PATCH /products/[id]/photos*`. Un producteur peut
-- théoriquement uploader dans le dossier d'un produit qui ne lui appartient
-- pas s'il devine l'UUID — mais le `POST /photos/confirm` qui persisterait
-- l'URL serait bloqué par RLS. Risque résiduel = pollution Storage, accepté.
--
-- Divergence vs KAN-17 :
--   - KAN-17 : path déterministe `{user_id}/logo.<ext>` ou `{user_id}/farm-<slot>.<ext>`,
--     upsert=true (la photo de profil est remplaçable).
--   - KAN-21 : path random `{user_id}/{product_id}/<random8>.<ext>`,
--     upsert=false (chaque photo produit est une entrée unique d'une collection).
--
-- Rollback documenté :
--   DROP POLICY IF EXISTS "product_photos_select_public" ON storage.objects;
--   DROP POLICY IF EXISTS "product_photos_insert_owner" ON storage.objects;
--   DROP POLICY IF EXISTS "product_photos_update_owner" ON storage.objects;
--   DROP POLICY IF EXISTS "product_photos_delete_owner" ON storage.objects;
--   DELETE FROM storage.buckets WHERE id = 'product-photos';  -- non recommandé en prod
--
-- Migration idempotente.

----------------------------------------------------------------------
-- 1. Storage bucket : product-photos
----------------------------------------------------------------------
-- Aligne la config dashboard si elle dérive (idempotent via ON CONFLICT
-- DO UPDATE). Le bucket existe déjà côté Supabase mais sa config n'avait
-- pas été versionnée.

INSERT INTO storage.buckets
  (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-photos',
  'product-photos',
  true,
  5242880,  -- 5 MiB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

----------------------------------------------------------------------
-- 2. Policies RLS storage.objects pour product-photos
----------------------------------------------------------------------
-- Miroir des policies `producer-photos` (KAN-17). Lecture publique
-- (bucket public, acheteurs anonymes voient les vignettes) ; écriture
-- restreinte au owner via `auth.uid()::text = (storage.foldername(name))[1]`.

DROP POLICY IF EXISTS "product_photos_select_public" ON storage.objects;
CREATE POLICY "product_photos_select_public"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'product-photos');

DROP POLICY IF EXISTS "product_photos_insert_owner" ON storage.objects;
CREATE POLICY "product_photos_insert_owner"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "product_photos_update_owner" ON storage.objects;
CREATE POLICY "product_photos_update_owner"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'product-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "product_photos_delete_owner" ON storage.objects;
CREATE POLICY "product_photos_delete_owner"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
