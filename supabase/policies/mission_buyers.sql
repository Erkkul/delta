-- Policies RLS pour public.mission_buyers (cf. ARCHITECTURE.md §5.2, §9.2)
-- Ticket : KAN-31 (Notification & confirmation match) + KAN-32 (Pénalités
-- acheteur), sans lien Jira actif
--
-- ⚠️ Ce fichier est un MIROIR documentaire. La source de vérité appliquée
-- en DB est la migration
-- `supabase/migrations/20260911120000_create_missions.sql` (policies
-- initiales KAN-31), modifiée par
-- `supabase/migrations/20261005120000_buyer_penalty.sql` (KAN-32 —
-- suppression de l'UPDATE self). `supabase db push` n'applique que les
-- migrations — il ne lit pas ce dossier.
--
-- Règles (match PRIVÉ — même posture que wishlist_items) :
--   1. SELECT : self uniquement (auth.uid() = buyer_id).
--   2. UPDATE : AUCUNE policy self-service (supprimée par KAN-32). Les deux
--      transitions de statut (accept ET decline) passent exclusivement par
--      des fonctions RPC SECURITY DEFINER (`confirm_mission_match`,
--      `decline_mission_match`) — la seconde compte désormais les refus
--      pour la pénalité crescendo D7 (specs/KAN-32/design.md), ce qu'un
--      UPDATE self direct contournerait.
--   3. Aucune policy INSERT self-service : la création d'un match (résultat
--      du matching) passe par un client privilégié, hors périmètre de
--      KAN-31/KAN-32.

----------------------------------------------------------------------
-- SELECT
----------------------------------------------------------------------
DROP POLICY IF EXISTS "mission_buyers_select_self" ON public.mission_buyers;
CREATE POLICY "mission_buyers_select_self"
  ON public.mission_buyers FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id);

----------------------------------------------------------------------
-- UPDATE — aucune policy self-service (KAN-32 : cf. règle 2 ci-dessus)
----------------------------------------------------------------------
DROP POLICY IF EXISTS "mission_buyers_update_self" ON public.mission_buyers;
