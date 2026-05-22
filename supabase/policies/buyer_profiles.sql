-- Policies RLS pour public.buyer_profiles (cf. ARCHITECTURE.md §5.2, §9.2)
-- Ticket : KAN-25
--
-- ⚠️ Ce fichier est un MIROIR documentaire. La source de vérité appliquée
-- en DB est la migration
-- `supabase/migrations/20260522120000_create_buyer_profiles.sql`
-- (qui contient les mêmes CREATE POLICY inline). `supabase db push`
-- n'applique que les migrations — il ne lit pas ce dossier.
--
-- Toute évolution des policies passe par une NOUVELLE migration, qui doit
-- être miroitée ici dans le même commit (cf. ARCHITECTURE.md §14.2).
--
-- Règles :
--   1. SELECT : self uniquement (auth.uid() = user_id), row non soft-deleted.
--   2. INSERT : self uniquement (auth.uid() = user_id).
--   3. UPDATE : self uniquement. user_id verrouillé par WITH CHECK.
--   4. DELETE : aucune suppression via client utilisateur. Soft delete RGPD
--      (champ deleted_at) via job backend dédié (client admin, bypass RLS).

----------------------------------------------------------------------
-- SELECT
----------------------------------------------------------------------
DROP POLICY IF EXISTS "buyer_profiles_select_self" ON public.buyer_profiles;
CREATE POLICY "buyer_profiles_select_self"
  ON public.buyer_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL);

----------------------------------------------------------------------
-- INSERT
----------------------------------------------------------------------
DROP POLICY IF EXISTS "buyer_profiles_insert_self" ON public.buyer_profiles;
CREATE POLICY "buyer_profiles_insert_self"
  ON public.buyer_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

----------------------------------------------------------------------
-- UPDATE — self uniquement ; user_id verrouillé
----------------------------------------------------------------------
DROP POLICY IF EXISTS "buyer_profiles_update_self" ON public.buyer_profiles;
CREATE POLICY "buyer_profiles_update_self"
  ON public.buyer_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

----------------------------------------------------------------------
-- DELETE (aucune policy permissive → rien ne passe côté client)
----------------------------------------------------------------------
-- Soft delete uniquement (champ `deleted_at`), exécuté par un job backend
-- dédié (RGPD). À implémenter dans un ticket dédié.
