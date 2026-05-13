-- Migration: create_users
-- Date: 2026-05-12 (révisée 2026-05-13 — pivot multi-rôle)
-- Ticket: KAN-2 (Création de compte)
-- Cadrage: specs/KAN-2/design.md, ARCHITECTURE.md §5 + §9 + §18 entrée 1.13
--
-- Crée la table métier `users` projetée depuis `auth.users` (Supabase Auth).
--
-- Architecture retenue (cf. décision produit 2026-05-13 multi-rôle) :
--   - L'unicité d'identité reste portée par `auth.users` (Supabase Auth).
--   - `public.users` étend cette identité avec les champs métier : roles
--     (multi : array du enum user_role), metadata (consents RGPD, etc.).
--   - Atomicité Auth ↔ métier : trigger AFTER INSERT sur `auth.users`
--     qui insère atomiquement la ligne `public.users` correspondante.
--   - `roles` démarre VIDE (`'{}'`). L'écran AU-06 « Choix rôle » (multi-
--     select 1..3) le peuple via `PATCH /api/v1/me/roles` après vérif
--     email. La policy UPDATE autorise le user à modifier ses propres
--     roles ; `email` et `id` restent verrouillés.
--   - `metadata.consents` : copié depuis `raw_user_meta_data->>'consents'`
--     si présent (cas signup email/password — le route handler passe
--     `options.data = { consents: { termsVersion, privacyVersion,
--     acceptedAt } }`). Pour les flows OAuth (Google) qui ne transmettent
--     pas notre metadata custom, le callback `/auth/callback` côté Next
--     pose les consents a posteriori (idempotent).
--   - RLS forcée : SELECT/UPDATE limités à `auth.uid() = id` ; INSERT et
--     DELETE refusés côté client (gérés exclusivement par le trigger
--     SECURITY DEFINER ou un client admin). Policies dans
--     `supabase/policies/users.sql` (miroir) et inline ci-dessous.
--
-- Rollback documenté :
--   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--   DROP FUNCTION IF EXISTS public.handle_new_auth_user();
--   DROP TRIGGER IF EXISTS set_updated_at ON public.users;
--   DROP TABLE IF EXISTS public.users;
--   DROP TYPE IF EXISTS public.user_role;
--
-- Migration idempotente (rejouable sans erreur via IF NOT EXISTS / OR REPLACE).

----------------------------------------------------------------------
-- 1. Enum user_role
----------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('acheteur', 'rameneur', 'producteur');
  END IF;
END;
$$;

COMMENT ON TYPE public.user_role IS
  'Rôle utilisateur (KAN-2). Multi-rôles progressif (décision produit 2026-05-03 + 2026-05-13) : un compte peut cumuler 1 à 3 rôles dans le tableau users.roles.';

----------------------------------------------------------------------
-- 2. Table public.users
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  roles public.user_role[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

COMMENT ON TABLE public.users IS
  'Compte métier projeté depuis auth.users. Une ligne par utilisateur authentifié, créée par trigger on_auth_user_created (cf. KAN-2 design.md). users.roles démarre vide et est peuplé par PATCH /api/v1/me/roles après vérif email.';

-- Index unique case-insensitive sur l'email (Supabase Auth normalise déjà
-- côté gotrue, on garantit la cohérence côté métier).
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique_idx
  ON public.users (lower(email));

-- Trigger BEFORE UPDATE pour rafraîchir updated_at (helper installé dans
-- la migration 20260510120000_init.sql).
DROP TRIGGER IF EXISTS set_updated_at ON public.users;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

----------------------------------------------------------------------
-- 3. Trigger d'atomicité Auth ↔ métier
----------------------------------------------------------------------
-- SECURITY DEFINER : la fonction s'exécute avec les privilèges du owner
-- (postgres / supabase_admin), qui peut écrire dans public.users malgré
-- la RLS. Aucun input utilisateur n'est concaténé en SQL dynamique →
-- pas de vecteur d'injection.
--
-- Comportement : insère la ligne users avec roles = '{}'. Si l'appel
-- côté serveur a fourni `options.data.consents` (cas signup email/pwd),
-- on les copie dans metadata.consents. Sinon (cas Google OAuth), on
-- laisse metadata vide ; le callback côté Next posera les consents.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meta jsonb;
  v_consents jsonb;
BEGIN
  -- Copie les consents si fournis via options.data lors du signUp.
  v_consents := NEW.raw_user_meta_data->'consents';
  IF v_consents IS NULL OR v_consents = 'null'::jsonb THEN
    v_meta := '{}'::jsonb;
  ELSE
    v_meta := jsonb_build_object('consents', v_consents);
  END IF;

  INSERT INTO public.users (id, email, roles, metadata)
  VALUES (NEW.id, NEW.email, '{}'::public.user_role[], v_meta)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_auth_user() IS
  'Trigger AFTER INSERT sur auth.users — insère atomiquement la ligne public.users (roles vide, consents copiés depuis raw_user_meta_data si présents).';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

----------------------------------------------------------------------
-- 4. RLS — forcée et restrictive par défaut
----------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

-- Les policies sont définies inline ci-dessous ET mirroées dans
-- `supabase/policies/users.sql` pour respecter la convention
-- ARCHITECTURE.md §14.2 (policies isolées par table). La migration
-- reste la source de vérité appliquée — toute modif des policies passe
-- par une nouvelle migration.

-- SELECT : un user ne lit que sa propre ligne.
DROP POLICY IF EXISTS "users_select_self" ON public.users;
CREATE POLICY "users_select_self"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- UPDATE : un user ne met à jour que sa propre ligne. `roles` et
-- `metadata` sont modifiables par self. `email` et `id` sont
-- verrouillés (Supabase Auth est seul propriétaire de l'email ;
-- WITH CHECK refuse toute modification de ces champs côté client).
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

-- INSERT et DELETE : aucune policy permissive → tout est refusé côté
-- client. Le trigger `handle_new_auth_user` (SECURITY DEFINER) et le
-- client admin (secret key, bypass RLS) sont les seuls chemins légitimes.
