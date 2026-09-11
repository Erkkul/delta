-- Policies RLS pour public.notifications (cf. ARCHITECTURE.md §5.2, §9.2)
-- Ticket : KAN-31 (Notification & confirmation match), sans lien Jira actif
--
-- ⚠️ Ce fichier est un MIROIR documentaire. La source de vérité appliquée
-- en DB est la migration
-- `supabase/migrations/20260911120000_create_missions.sql`.
-- `supabase db push` n'applique que les migrations — il ne lit pas ce
-- dossier.
--
-- Règles :
--   1. SELECT : self uniquement (auth.uid() = user_id).
--   2. UPDATE : self uniquement (marquage lu via `read_at`).
--   3. Aucune policy INSERT self-service : l'écriture passe par le trigger
--      `notify_mission_buyer_confirmation_requested` (SECURITY DEFINER) ou
--      par un client privilégié (jobs Inngest).

----------------------------------------------------------------------
-- SELECT
----------------------------------------------------------------------
DROP POLICY IF EXISTS "notifications_select_self" ON public.notifications;
CREATE POLICY "notifications_select_self"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

----------------------------------------------------------------------
-- UPDATE — self uniquement
----------------------------------------------------------------------
DROP POLICY IF EXISTS "notifications_update_self" ON public.notifications;
CREATE POLICY "notifications_update_self"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
