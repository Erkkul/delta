-- Policies RLS pour public.trips (cf. ARCHITECTURE.md §5.2, §9.2)
-- Ticket : KAN-31 (Notification & confirmation match), sans lien Jira actif
--
-- ⚠️ Ce fichier est un MIROIR documentaire. La source de vérité appliquée
-- en DB est la migration
-- `supabase/migrations/20260911120000_create_missions.sql`
-- (qui contient les mêmes CREATE POLICY inline). `supabase db push`
-- n'applique que les migrations — il ne lit pas ce dossier.
--
-- Toute évolution des policies passe par une NOUVELLE migration, qui doit
-- être miroitée ici dans le même commit (cf. ARCHITECTURE.md §14.2).
--
-- Règles :
--   1. SELECT : le rameneur propriétaire du trajet.
--   2. SELECT : un acheteur qui a un match (mission_buyers) sur une mission
--      rattachée à ce trajet (nécessaire pour AC-07 — origine/destination).
--   3. INSERT/UPDATE : le rameneur propriétaire uniquement.

----------------------------------------------------------------------
-- SELECT — rameneur propriétaire
----------------------------------------------------------------------
DROP POLICY IF EXISTS "trips_select_rameneur" ON public.trips;
CREATE POLICY "trips_select_rameneur"
  ON public.trips FOR SELECT TO authenticated
  USING (auth.uid() = rameneur_user_id);

----------------------------------------------------------------------
-- SELECT — acheteur en cours de match sur ce trajet
----------------------------------------------------------------------
DROP POLICY IF EXISTS "trips_select_buyer_via_mission" ON public.trips;
CREATE POLICY "trips_select_buyer_via_mission"
  ON public.trips FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.missions m
      JOIN public.mission_buyers mb ON mb.mission_id = m.id
      WHERE m.trip_id = trips.id AND mb.buyer_id = auth.uid()
    )
  );

----------------------------------------------------------------------
-- INSERT / UPDATE — rameneur propriétaire uniquement
----------------------------------------------------------------------
DROP POLICY IF EXISTS "trips_insert_rameneur" ON public.trips;
CREATE POLICY "trips_insert_rameneur"
  ON public.trips FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = rameneur_user_id);

DROP POLICY IF EXISTS "trips_update_rameneur" ON public.trips;
CREATE POLICY "trips_update_rameneur"
  ON public.trips FOR UPDATE TO authenticated
  USING (auth.uid() = rameneur_user_id)
  WITH CHECK (auth.uid() = rameneur_user_id);
