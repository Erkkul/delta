-- Policies RLS pour public.mission_buyers (cf. ARCHITECTURE.md §5.2, §9.2)
-- Ticket : KAN-31 (Notification & confirmation match), sans lien Jira actif
--
-- ⚠️ Ce fichier est un MIROIR documentaire. La source de vérité appliquée
-- en DB est la migration
-- `supabase/migrations/20260911120000_create_missions.sql`.
-- `supabase db push` n'applique que les migrations — il ne lit pas ce
-- dossier.
--
-- Règles (match PRIVÉ — même posture que wishlist_items) :
--   1. SELECT : self uniquement (auth.uid() = buyer_id).
--   2. UPDATE : self uniquement. Réservé au refus (decline) côté client —
--      la confirmation (accept) passe exclusivement par la fonction RPC
--      `confirm_mission_match` (SECURITY DEFINER, transaction atomique avec
--      le décrément de stock produit). Le route handler applique la clause
--      `WHERE status = 'pending'` pour le decline ; cette policy ne
--      restreint pas la valeur cible de `status`.
--   3. Aucune policy INSERT self-service : la création d'un match (résultat
--      du matching) passe par un client privilégié, hors périmètre de
--      KAN-31.

----------------------------------------------------------------------
-- SELECT
----------------------------------------------------------------------
DROP POLICY IF EXISTS "mission_buyers_select_self" ON public.mission_buyers;
CREATE POLICY "mission_buyers_select_self"
  ON public.mission_buyers FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id);

----------------------------------------------------------------------
-- UPDATE — self uniquement (decline direct ; accept via RPC dédiée)
----------------------------------------------------------------------
DROP POLICY IF EXISTS "mission_buyers_update_self" ON public.mission_buyers;
CREATE POLICY "mission_buyers_update_self"
  ON public.mission_buyers FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);
