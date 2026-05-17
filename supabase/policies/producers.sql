-- Policies RLS pour public.producers (cf. ARCHITECTURE.md §5.2, §9.2)
-- Ticket : KAN-16
--
-- ⚠️ Ce fichier est un MIROIR documentaire. La source de vérité appliquée
-- en DB est la migration `supabase/migrations/20260517100000_create_producers_and_stripe_webhook_events.sql`
-- (qui contient les mêmes CREATE POLICY inline). `supabase db push`
-- n'applique que les migrations — il ne lit pas ce dossier.
--
-- Toute évolution des policies passe par une NOUVELLE migration, qui
-- doit être miroitée ici dans le même commit (cf. ARCHITECTURE.md §14.2).
--
-- Règles (cf. specs/KAN-16/design.md §RLS) :
--   1. SELECT : self uniquement (auth.uid() = user_id).
--   2. INSERT : self uniquement (1 producer par user garanti par UNIQUE
--      sur user_id côté schéma).
--   3. UPDATE : self uniquement. user_id verrouillé via WITH CHECK.
--      Les colonnes stripe_* sont théoriquement modifiables côté self
--      mais sont en pratique écrites uniquement par le webhook handler
--      (service_role bypass RLS).
--   4. DELETE : aucune policy permissive → bloqué côté client. Soft delete
--      via deleted_at géré côté core. Hard delete cascade depuis
--      public.users via FK ON DELETE CASCADE.

----------------------------------------------------------------------
-- SELECT
----------------------------------------------------------------------
DROP POLICY IF EXISTS "producers_select_self" ON public.producers;
CREATE POLICY "producers_select_self"
  ON public.producers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

----------------------------------------------------------------------
-- INSERT
----------------------------------------------------------------------
DROP POLICY IF EXISTS "producers_insert_self" ON public.producers;
CREATE POLICY "producers_insert_self"
  ON public.producers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

----------------------------------------------------------------------
-- UPDATE
----------------------------------------------------------------------
DROP POLICY IF EXISTS "producers_update_self" ON public.producers;
CREATE POLICY "producers_update_self"
  ON public.producers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

----------------------------------------------------------------------
-- DELETE (aucune policy permissive → rien ne passe côté client)
----------------------------------------------------------------------
-- Voir docstring ci-dessus : soft delete via deleted_at géré côté core,
-- hard delete cascade depuis public.users via FK ON DELETE CASCADE.
