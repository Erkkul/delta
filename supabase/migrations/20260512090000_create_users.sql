-- Migration: create_users
-- Date: 2026-05-12
-- Ticket: KAN-2 (Création de compte)
-- Cadrage: specs/KAN-2/design.md, ARCHITECTURE.md §5 + §9
--
-- Crée la table métier `users` projetée depuis `auth.users` (Supabase Auth).
--
-- Architecture retenue (cf. specs/KAN-2/design.md § Risques techniques) :
--   - L'unicité d'identité reste portée par `auth.users` (Supabase Auth).
--   - `public.users` étend cette identité avec les champs métier : rôle,
--     metadata (consents RGPD, etc.).
--   - Atomicité Auth ↔ métier : trigger AFTER INSERT sur `auth.users`
--     qui insère atomiquement la ligne `public.users` correspondante.
--   - `role` lu depuis `raw_user_meta_data->>'role'` quand fourni (cas
--     email/password : la valeur est passée via `options.data` côté
--     `auth.signUp`). Fallback `'acheteur'` pour les flows OAuth qui ne
--     transmettent pas notre metadata custom (Google Sign In) — le
--     callback OAuth côté Next met à jour le rôle effectif a posteriori.
--   - RLS forcée : SELECT/UPDATE limités à `auth.uid() = id` ; INSERT et
--     DELETE refusés côté client (gérés exclusivement par le trigger
--     SECURITY DEFINER ou un client admin). Policies dans
--     `supabase/policies/users.sql`.
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
  'Rôle initial à la création de compte (KAN-2). Multi-rôles progressif (cf. décision produit 2026-05-03) : un rameneur a aussi capacité d''acheter, un producteur peut être rameneur/acheteur ; le rôle initial détermine seulement le premier onboarding.';

----------------------------------------------------------------------
-- 2. Table public.users
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.user_role NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

COMMENT ON TABLE public.users IS
  'Compte métier projeté depuis auth.users. Une ligne par utilisateur authentifié, créée par trigger on_auth_user_created (cf. KAN-2 design.md).';

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
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
  v_meta jsonb;
BEGIN
  -- Lecture du rôle déclaré côté client via options.data.role.
  -- Si invalide ou absent (cas OAuth Google sans round-trip custom),
  -- fallback sur 'acheteur' (entrée de l'entonnoir multi-rôles progressif).
  -- Le callback OAuth Next côté apps/web met à jour le rôle si nécessaire.
  BEGIN
    v_role := COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', ''),
      'acheteur'
    )::public.user_role;
  EXCEPTION WHEN invalid_text_representation THEN
    v_role := 'acheteur';
  END;

  -- Metadata métier : on conserve les consents RGPD si fournis.
  v_meta := COALESCE(NEW.raw_user_meta_data->'consents', 'null'::jsonb);
  IF v_meta = 'null'::jsonb THEN
    v_meta := '{}'::jsonb;
  ELSE
    v_meta := jsonb_build_object('consents', v_meta);
  END IF;

  INSERT INTO public.users (id, email, role, metadata)
  VALUES (NEW.id, NEW.email, v_role, v_meta)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_auth_user() IS
  'Trigger AFTER INSERT sur auth.users — insère atomiquement la ligne public.users correspondante. Lit role + consents depuis raw_user_meta_data.';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

----------------------------------------------------------------------
-- 4. RLS — forcée et restrictive par défaut
----------------------------------------------------------------------
-- Les policies sont définies dans `supabase/policies/users.sql` et
-- rejouées par cette migration via \ir (à exécuter manuellement) ou
-- via supabase db push (qui inclut les fichiers .sql sous migrations/).
-- On force RLS dès maintenant pour qu'aucune donnée ne fuite si le
-- fichier de policies n'a pas encore tourné.
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

-- UPDATE : un user ne met à jour que sa propre ligne, et n'a PAS le droit
-- de modifier `role` (escalade de privilège) ni `email` (verrouillé côté
-- Supabase Auth). Seules les modifs de `metadata` (et `deleted_at` pour
-- soft delete via job) sont effectives en pratique.
DROP POLICY IF EXISTS "users_update_self_metadata" ON public.users;
CREATE POLICY "users_update_self_metadata"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT u.role FROM public.users u WHERE u.id = auth.uid())
    AND email = (SELECT u.email FROM public.users u WHERE u.id = auth.uid())
  );

-- INSERT et DELETE : aucune policy permissive → tout est refusé côté
-- client. Le trigger `handle_new_auth_user` (SECURITY DEFINER) et le
-- client admin (secret key, bypass RLS) sont les seuls chemins légitimes.
