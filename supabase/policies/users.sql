-- Policies RLS pour public.users (cf. ARCHITECTURE.md §5.2, §9.2)
-- Ticket : KAN-2
--
-- ⚠️ Ce fichier est un MIROIR documentaire. La source de vérité appliquée
-- en DB est la migration `supabase/migrations/20260512090000_create_users.sql`
-- (qui contient les mêmes CREATE POLICY inline). `supabase db push`
-- n'applique que les migrations — il ne lit pas ce dossier.
--
-- Toute évolution des policies passe par une NOUVELLE migration, qui
-- doit être miroitée ici dans le même commit (cf. ARCHITECTURE.md §14.2).
--
-- Règles (décision 2026-05-13 multi-rôle) :
--   1. SELECT : self uniquement (auth.uid() = id).
--   2. UPDATE : self uniquement. Le user peut modifier `roles` (multi-
--      sélection via /onboarding/role) et `metadata`. `email` et `id`
--      sont verrouillés par WITH CHECK + ownership Supabase Auth.
--   3. INSERT : aucune insertion via client utilisateur. Le trigger
--      SECURITY DEFINER et le client admin (secret key, qui bypass RLS)
--      sont les seuls chemins légitimes.
--   4. DELETE : aucune suppression via client utilisateur. La suppression
--      RGPD passe par un job dédié (pending_deletions, cf. ARCHITECTURE.md
--      §5.3 — table à venir).

----------------------------------------------------------------------
-- SELECT
----------------------------------------------------------------------
DROP POLICY IF EXISTS "users_select_self" ON public.users;
CREATE POLICY "users_select_self"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

----------------------------------------------------------------------
-- UPDATE — `roles` et `metadata` modifiables par self ; `id` et `email` verrouillés
----------------------------------------------------------------------
DROP POLICY IF EXISTS "users_update_self" ON public.users;
CREATE POLICY "users_update_self"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND id = (SELECT u.id FROM public.users u WHERE u.id = auth.uid())
    AND email = (SELECT u.email FROM public.users u WHERE u.id = auth.uid())
  );

----------------------------------------------------------------------
-- INSERT (aucune policy permissive → rien ne passe côté client)
----------------------------------------------------------------------
-- Pas de policy CREATE … FOR INSERT. La RLS forcée + l'absence de policy
-- permissive bloquent toute insertion via la clé publishable. Le trigger
-- `handle_new_auth_user` (SECURITY DEFINER) et la secret key
-- (`createAdminClient`) sont les deux seuls chemins de création.

----------------------------------------------------------------------
-- DELETE (aucune policy permissive → rien ne passe côté client)
----------------------------------------------------------------------
-- Soft delete uniquement (champ `deleted_at`), exécuté par un job
-- backend dédié (RGPD). À implémenter dans un ticket dédié.
