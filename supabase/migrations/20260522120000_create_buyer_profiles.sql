-- Migration: create_buyer_profiles
-- Date: 2026-05-22
-- Ticket: KAN-25 (Onboarding & zone)
-- Cadrage: specs/KAN-25/design.md, ARCHITECTURE.md §5 + §7 + §18
--
-- Crée la table public.buyer_profiles : profil acheteur minimal étendant
-- public.users (miroir du pattern public.producers de KAN-16/KAN-17).
--
-- Architecture (cf. specs/KAN-25/design.md §Modèle de données) :
--   - buyer_profiles.user_id (PK, FK vers public.users.id ON DELETE CASCADE) :
--     un compte utilisateur a 0 ou 1 profil acheteur. La row est créée lazy
--     à la première soumission de zone via PUT /api/v1/me/buyer-profile.
--   - buyer_profiles.location (geography Point, EPSG:4326) : zone d'habitation
--     géocodée via l'API Adresse Gouv.fr. Alimente le pipeline de matching
--     (ARCHITECTURE.md §7.2 étape 3 : ST_DWithin(buyer_address, route_geom,
--     10000)). Index GIST. supabase-js ne sait pas sérialiser une geography
--     en update direct → on passe par la RPC set_buyer_location (cf. § 3,
--     même approche que set_pickup_location de KAN-17).
--   - RLS forcée : SELECT/INSERT/UPDATE limités à auth.uid() = user_id ;
--     DELETE refusé côté client (soft delete via job RGPD). Policies dans
--     supabase/policies/buyer_profiles.sql (miroir) et inline ci-dessous.
--
-- Confidentialité (RGPD) : location et address_label sont des données
-- personnelles. Elles ne sont jamais exposées à un autre user via cette table
-- (aucune policy SELECT cross-user). La révélation au rameneur après
-- confirmation de mission relève d'une logique métier en aval (hors KAN-25).
--
-- Rollback documenté :
--   DROP FUNCTION IF EXISTS public.set_buyer_location(double precision, double precision);
--   DROP TRIGGER IF EXISTS set_updated_at ON public.buyer_profiles;
--   DROP TABLE IF EXISTS public.buyer_profiles;
--
-- Migration idempotente (rejouable sans erreur via IF NOT EXISTS / OR REPLACE).

----------------------------------------------------------------------
-- 1. Table public.buyer_profiles
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.buyer_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  display_name text,
  address_label text,
  city text,
  postcode text,
  location extensions.geography(Point, 4326),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

COMMENT ON TABLE public.buyer_profiles IS
  'Profil acheteur minimal projeté depuis public.users (KAN-25). Une ligne par compte ayant le rôle acheteur, créée lazy à la première soumission de zone via PUT /api/v1/me/buyer-profile.';
COMMENT ON COLUMN public.buyer_profiles.display_name IS
  'Nom d''affichage de l''acheteur (2..80 caractères). Nullable — capté à l''onboarding (KAN-81), facultatif pour ne pas bloquer le « Passer ».';
COMMENT ON COLUMN public.buyer_profiles.address_label IS
  'Label complet de l''adresse retourné par l''API Adresse Gouv.fr (sensible).';
COMMENT ON COLUMN public.buyer_profiles.city IS
  'Commune extraite de la suggestion Adresse Gouv.fr.';
COMMENT ON COLUMN public.buyer_profiles.postcode IS
  'Code postal extrait de la suggestion Adresse Gouv.fr.';
COMMENT ON COLUMN public.buyer_profiles.location IS
  'Zone d''habitation géocodée (extensions.geography sphérique, EPSG:4326). Index GIST. Alimente le matching (ARCHITECTURE.md §7.2). Null tant que la zone n''est pas saisie.';

-- Contraintes de longueur (alignées sur le contrat Zod).
ALTER TABLE public.buyer_profiles
  DROP CONSTRAINT IF EXISTS buyer_profiles_display_name_length;
ALTER TABLE public.buyer_profiles
  ADD CONSTRAINT buyer_profiles_display_name_length
  CHECK (display_name IS NULL OR char_length(display_name) BETWEEN 2 AND 80);

ALTER TABLE public.buyer_profiles
  DROP CONSTRAINT IF EXISTS buyer_profiles_address_label_length;
ALTER TABLE public.buyer_profiles
  ADD CONSTRAINT buyer_profiles_address_label_length
  CHECK (address_label IS NULL OR char_length(address_label) BETWEEN 5 AND 250);

ALTER TABLE public.buyer_profiles
  DROP CONSTRAINT IF EXISTS buyer_profiles_postcode_format;
ALTER TABLE public.buyer_profiles
  ADD CONSTRAINT buyer_profiles_postcode_format
  CHECK (postcode IS NULL OR postcode ~ '^[0-9]{5}$');

-- Index GIST pour ST_DWithin (matching côté destination, ARCHITECTURE.md §7.2).
CREATE INDEX IF NOT EXISTS buyer_profiles_location_gist
  ON public.buyer_profiles
  USING GIST (location);

-- Trigger BEFORE UPDATE pour rafraîchir updated_at (helper installé dans la
-- migration 20260510120000_init.sql).
DROP TRIGGER IF EXISTS set_updated_at ON public.buyer_profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.buyer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

----------------------------------------------------------------------
-- 2. RLS — forcée et restrictive par défaut
----------------------------------------------------------------------
ALTER TABLE public.buyer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_profiles FORCE ROW LEVEL SECURITY;

-- Les policies sont définies inline ci-dessous ET mirroées dans
-- supabase/policies/buyer_profiles.sql (convention ARCHITECTURE.md §14.2).
-- La migration reste la source de vérité appliquée.

-- SELECT : un user ne lit que sa propre row (et non soft-deleted).
DROP POLICY IF EXISTS "buyer_profiles_select_self" ON public.buyer_profiles;
CREATE POLICY "buyer_profiles_select_self"
  ON public.buyer_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- INSERT : un user ne crée que sa propre row.
DROP POLICY IF EXISTS "buyer_profiles_insert_self" ON public.buyer_profiles;
CREATE POLICY "buyer_profiles_insert_self"
  ON public.buyer_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE : un user ne met à jour que sa propre row. user_id verrouillé.
DROP POLICY IF EXISTS "buyer_profiles_update_self" ON public.buyer_profiles;
CREATE POLICY "buyer_profiles_update_self"
  ON public.buyer_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE : aucune policy permissive → refusé côté client. Soft delete via
-- job RGPD (client admin, bypass RLS).

----------------------------------------------------------------------
-- 3. RPC : set_buyer_location(longitude, latitude)
----------------------------------------------------------------------
-- supabase-js ne sait pas sérialiser une geography(Point) en update direct.
-- Cette fonction met à jour location de la row du caller (auth.uid()) à
-- partir de coordonnées WGS84 (EPSG:4326). Si les deux args sont null,
-- réinitialise location à NULL (cas : effacement de la zone).
--
-- SECURITY INVOKER : RLS du caller s'applique (un user ne peut modifier que
-- sa propre row, garanti par buyer_profiles_update_self). Même approche que
-- set_pickup_location (KAN-17).

CREATE OR REPLACE FUNCTION public.set_buyer_location(
  p_longitude double precision DEFAULT NULL,
  p_latitude  double precision DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF p_longitude IS NULL OR p_latitude IS NULL THEN
    UPDATE public.buyer_profiles
       SET location = NULL
     WHERE user_id = auth.uid();
  ELSE
    UPDATE public.buyer_profiles
       SET location =
         extensions.ST_SetSRID(
           extensions.ST_MakePoint(p_longitude, p_latitude),
           4326
         )::extensions.geography
     WHERE user_id = auth.uid();
  END IF;
END;
$$;

COMMENT ON FUNCTION public.set_buyer_location(double precision, double precision) IS
  'Met à jour location de la row buyer_profiles du caller à partir de coordonnées WGS84. SECURITY INVOKER → RLS appliquée. Appelée par PUT /api/v1/me/buyer-profile après géocodage API Adresse Gouv.fr (KAN-25).';

REVOKE ALL ON FUNCTION public.set_buyer_location(double precision, double precision) FROM public;
GRANT EXECUTE ON FUNCTION public.set_buyer_location(double precision, double precision) TO authenticated;
