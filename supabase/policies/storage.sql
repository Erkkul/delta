-- Policies RLS Storage (cf. ARCHITECTURE.md §5.2, §9.2 ; principe A7)
-- Ticket source : KAN-17 (Informations profil & ferme — premier bucket
-- versionné par migration)
--
-- ⚠️ Ce fichier est un MIROIR documentaire. La source de vérité appliquée
-- en DB est la migration `supabase/migrations/20260517150000_extend_producers_profile.sql`
-- (qui contient les mêmes CREATE POLICY inline). `supabase db push`
-- n'applique que les migrations — il ne lit pas ce dossier.
--
-- Convention chemins de fichiers (KAN-17, bucket `producer-photos`) :
--   {producer_user_id}/logo.<ext>
--   {producer_user_id}/farm-<0|1|2>.<ext>
-- Le 1er segment doit être `auth.uid()::text` pour passer la WITH CHECK.

----------------------------------------------------------------------
-- Bucket producer-photos (KAN-17)
----------------------------------------------------------------------
-- Lecture publique (bucket public + policy explicite pour traçabilité)
DROP POLICY IF EXISTS "producer_photos_select_public" ON storage.objects;
CREATE POLICY "producer_photos_select_public"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'producer-photos');

-- INSERT : seuls le owner peut uploader, le chemin doit commencer par son auth.uid()
DROP POLICY IF EXISTS "producer_photos_insert_owner" ON storage.objects;
CREATE POLICY "producer_photos_insert_owner"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'producer-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- UPDATE : idem
DROP POLICY IF EXISTS "producer_photos_update_owner" ON storage.objects;
CREATE POLICY "producer_photos_update_owner"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'producer-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'producer-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- DELETE : idem
DROP POLICY IF EXISTS "producer_photos_delete_owner" ON storage.objects;
CREATE POLICY "producer_photos_delete_owner"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'producer-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

----------------------------------------------------------------------
-- Bucket product-photos (KAN-21)
----------------------------------------------------------------------
-- ⚠️ Source de vérité appliquée : migration
-- `20260518100000_create_product_photos_storage_policies.sql`. Bloc ci-dessous
-- = miroir documentaire.
--
-- Convention chemins (différente de `producer-photos`) :
--   {producer_user_id}/{product_id}/<random8>.<ext>
-- Le 1ᵉʳ segment doit être `auth.uid()::text` pour passer les WITH CHECK.

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
