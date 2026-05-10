-- Migration: init
-- Date: 2026-05-10
-- Auteur: Delta team
--
-- Première migration versionnée. Trois objectifs :
--   1. Valider le workflow `supabase migration new` + `supabase db push`
--      (cf. ARCHITECTURE.md §5.5 — un changement DB = un fichier SQL +
--      un commit dédié, jamais d'édition via le dashboard).
--   2. Vérifier que les extensions activées via UI le 2026-05-08 sont
--      bien en place sur l'environnement cible (postgis, pgcrypto).
--   3. Installer le helper `public.set_updated_at()` que toutes les
--      futures tables user-data attacheront en BEFORE UPDATE
--      (cf. ARCHITECTURE.md §5.1 — trigger d'auto-update updated_at).
--
-- Cette migration est idempotente : la rejouer ne casse rien.

----------------------------------------------------------------------
-- 1. Vérification idempotente des extensions
----------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    RAISE EXCEPTION
      'Extension postgis manquante. Activer via dashboard Supabase '
      '(Database → Extensions, schéma extensions) avant de rejouer.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    RAISE EXCEPTION
      'Extension pgcrypto manquante. Activer via dashboard Supabase '
      '(Database → Extensions, schéma extensions) avant de rejouer.';
  END IF;
END;
$$;

----------------------------------------------------------------------
-- 2. Helper trigger function : public.set_updated_at()
----------------------------------------------------------------------
-- À attacher sur chaque table user-data via :
--   CREATE TRIGGER set_updated_at
--     BEFORE UPDATE ON <table>
--     FOR EACH ROW
--     EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at() IS
  'Trigger BEFORE UPDATE auto-renseignant updated_at. Cf. ARCHITECTURE.md §5.1.';
