-- Policies RLS pour public.missions (cf. ARCHITECTURE.md §5.2, §9.2)
-- Ticket : KAN-31 (Notification & confirmation match), sans lien Jira actif
--
-- ⚠️ Ce fichier est un MIROIR documentaire. La source de vérité appliquée
-- en DB est la migration
-- `supabase/migrations/20260911120000_create_missions.sql`.
-- `supabase db push` n'applique que les migrations — il ne lit pas ce
-- dossier.
--
-- Règles :
--   1. SELECT : le rameneur (via son trajet), le producteur, ou un acheteur
--      qui a un match (mission_buyers) sur cette mission.
--   2. Aucune policy INSERT/UPDATE self-service au MVP de KAN-31 : la
--      création de missions passe par un client privilégié (seed/test,
--      futur flow de réservation rameneur), hors périmètre de ce ticket.

----------------------------------------------------------------------
-- SELECT — rameneur propriétaire du trajet
----------------------------------------------------------------------
DROP POLICY IF EXISTS "missions_select_rameneur" ON public.missions;
CREATE POLICY "missions_select_rameneur"
  ON public.missions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = missions.trip_id AND t.rameneur_user_id = auth.uid()
    )
  );

----------------------------------------------------------------------
-- SELECT — producteur de la mission
----------------------------------------------------------------------
DROP POLICY IF EXISTS "missions_select_producer" ON public.missions;
CREATE POLICY "missions_select_producer"
  ON public.missions FOR SELECT TO authenticated
  USING (auth.uid() = producer_user_id);

----------------------------------------------------------------------
-- SELECT — acheteur avec un match sur cette mission
----------------------------------------------------------------------
DROP POLICY IF EXISTS "missions_select_buyer" ON public.missions;
CREATE POLICY "missions_select_buyer"
  ON public.missions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mission_buyers mb
      WHERE mb.mission_id = missions.id AND mb.buyer_id = auth.uid()
    )
  );
