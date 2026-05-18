-- Migration: extend_producers_profile
-- Date: 2026-05-17
-- Ticket: KAN-17 (Informations profil & ferme)
-- Cadrage: specs/KAN-17/design.md, ARCHITECTURE.md §5 + §9 + §18
--
-- Ajoute à la table public.producers (créée par KAN-16) :
--   - Couche publique (display_name, public_description, profile_photo_url,
--     farm_photos, labels)
--   - Adresse de récupération (pickup_address sensible, pickup_public_zone,
--     pickup_location PostGIS, pickup_days, pickup_hours_start/end)
--   - Toggle "Boutique en pause" (paused, paused_at)
--
-- Introduit :
--   - Enum public.producer_label (5 valeurs)
--   - Enum public.weekday (7 valeurs)
--   - RPC SECURITY DEFINER public.reveal_pickup_address(producer_id uuid)
--     pour révéler l'adresse exacte aux seuls rameneurs autorisés
--   - Bucket Storage `producer-photos` (public, 5 MB, jpeg/png/webp) + policies
--
-- Gating produits (cf. décision produit 2026-05-03 + KAN-16) :
--   Le placeholder docu `supabase/policies/products.sql` est étendu pour
--   intégrer le filtre `producers.paused = false` quand KAN-20 livrera la
--   table products.
--
-- Rollback documenté :
--   DROP FUNCTION IF EXISTS public.reveal_pickup_address(uuid);
--   -- Re-vidage du bucket storage côté apps/cron avant DROP BUCKET.
--   DELETE FROM storage.buckets WHERE id = 'producer-photos';
--   -- (les colonnes ajoutées peuvent être laissées en place ou DROP COLUMN
--   --  chacune individuellement — pas de path de rollback automatisé)
--   DROP TYPE IF EXISTS public.producer_label;
--   DROP TYPE IF EXISTS public.weekday;
--
-- Migration idempotente.

----------------------------------------------------------------------
-- 1. Enums
----------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'producer_label') THEN
    CREATE TYPE public.producer_label AS ENUM
      ('bio_ab', 'demeter', 'nature_et_progres', 'hve_3', 'producteur_fermier');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'weekday') THEN
    CREATE TYPE public.weekday AS ENUM
      ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');
  END IF;
END;
$$;

COMMENT ON TYPE public.producer_label IS
  'Labels/certifications éditables affichés sur le profil public producteur (KAN-17). Whitelist fermée au MVP — étendre via migration en ajoutant des valeurs ENUM.';

COMMENT ON TYPE public.weekday IS
  'Jour de la semaine, court (KAN-17). Utilisé pour pickup_days, étendable à d''autres tables horaires.';

----------------------------------------------------------------------
-- 2. Extension table public.producers
----------------------------------------------------------------------
-- Toutes les colonnes sont nullable / default — remplies progressivement
-- par le wizard step 1 puis par la page d'édition.

ALTER TABLE public.producers
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS public_description text,
  ADD COLUMN IF NOT EXISTS profile_photo_url text,
  ADD COLUMN IF NOT EXISTS farm_photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS labels public.producer_label[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pickup_public_zone text,
  ADD COLUMN IF NOT EXISTS pickup_address text,
  ADD COLUMN IF NOT EXISTS pickup_location extensions.geography(Point, 4326),
  ADD COLUMN IF NOT EXISTS pickup_days public.weekday[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pickup_hours_start time,
  ADD COLUMN IF NOT EXISTS pickup_hours_end time,
  ADD COLUMN IF NOT EXISTS paused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paused_at timestamptz;

COMMENT ON COLUMN public.producers.display_name IS
  'Nom commercial public (≤ 80 caractères, requis pour publication produits côté UI).';
COMMENT ON COLUMN public.producers.public_description IS
  'Description publique (≤ 500 caractères).';
COMMENT ON COLUMN public.producers.profile_photo_url IS
  'URL Supabase Storage du logo (bucket producer-photos).';
COMMENT ON COLUMN public.producers.farm_photos IS
  'Array ordonné jsonb de { url: text, alt?: text }, max 3 entries (CHECK ci-dessous).';
COMMENT ON COLUMN public.producers.labels IS
  'Labels/certifications éditables (enum producer_label). « SIRET vérifié » est dérivé, pas dans cet array.';
COMMENT ON COLUMN public.producers.pickup_public_zone IS
  'Libellé public commune + département (ex « Bocage normand · Évreux (27) »). Visible par tous.';
COMMENT ON COLUMN public.producers.pickup_address IS
  'Adresse exacte du point de récupération (sensible). RLS strict + RPC reveal_pickup_address pour exposer aux rameneurs en mission.';
COMMENT ON COLUMN public.producers.pickup_location IS
  'Coordonnées géocodées via API Adresse Gouv.fr (extensions.geography sphérique, EPSG:4326). Index GIST pour matching futur (KAN-42).';
COMMENT ON COLUMN public.producers.pickup_days IS
  'Jours d''ouverture des créneaux de récupération (array enum weekday).';
COMMENT ON COLUMN public.producers.pickup_hours_start IS
  'Heure d''ouverture du créneau (time sans timezone, fuseau de la ferme).';
COMMENT ON COLUMN public.producers.pickup_hours_end IS
  'Heure de fermeture du créneau (CHECK end > start si les deux sont posés).';
COMMENT ON COLUMN public.producers.paused IS
  'Toggle "Boutique en pause". Quand true, les produits du producteur sont masqués du catalogue acheteur (gating exprimé par RLS sur public.products, étendu par KAN-20).';
COMMENT ON COLUMN public.producers.paused_at IS
  'Timestamp de la mise en pause (set quand paused passe à true, null sinon).';

-- Contraintes
ALTER TABLE public.producers
  DROP CONSTRAINT IF EXISTS producers_display_name_length;
ALTER TABLE public.producers
  ADD CONSTRAINT producers_display_name_length
  CHECK (display_name IS NULL OR char_length(display_name) BETWEEN 2 AND 80);

ALTER TABLE public.producers
  DROP CONSTRAINT IF EXISTS producers_public_description_length;
ALTER TABLE public.producers
  ADD CONSTRAINT producers_public_description_length
  CHECK (public_description IS NULL OR char_length(public_description) <= 500);

ALTER TABLE public.producers
  DROP CONSTRAINT IF EXISTS producers_farm_photos_max;
ALTER TABLE public.producers
  ADD CONSTRAINT producers_farm_photos_max
  CHECK (jsonb_typeof(farm_photos) = 'array' AND jsonb_array_length(farm_photos) <= 3);

ALTER TABLE public.producers
  DROP CONSTRAINT IF EXISTS producers_pickup_hours_order;
ALTER TABLE public.producers
  ADD CONSTRAINT producers_pickup_hours_order
  CHECK (
    pickup_hours_start IS NULL
    OR pickup_hours_end IS NULL
    OR pickup_hours_end > pickup_hours_start
  );

ALTER TABLE public.producers
  DROP CONSTRAINT IF EXISTS producers_pickup_public_zone_length;
ALTER TABLE public.producers
  ADD CONSTRAINT producers_pickup_public_zone_length
  CHECK (pickup_public_zone IS NULL OR char_length(pickup_public_zone) BETWEEN 2 AND 120);

ALTER TABLE public.producers
  DROP CONSTRAINT IF EXISTS producers_pickup_address_length;
ALTER TABLE public.producers
  ADD CONSTRAINT producers_pickup_address_length
  CHECK (pickup_address IS NULL OR char_length(pickup_address) BETWEEN 5 AND 250);

-- Index GIST pour la colonne géographique (réutilisé par matching plus tard)
CREATE INDEX IF NOT EXISTS producers_pickup_location_gist
  ON public.producers
  USING GIST (pickup_location);

----------------------------------------------------------------------
-- 3. RPC : reveal_pickup_address(producer_id uuid)
----------------------------------------------------------------------
-- Retourne l'adresse exacte du producteur SI :
--   - le caller est le owner du producteur, OU
--   - le caller a une mission `confirmed`/`picked_up`/`delivered` rattachée à
--     ce producteur (lecture transverse sur public.missions / public.trips —
--     tables livrées par KAN-11 / KAN-10). Garde-fou : la fonction tolère
--     l'absence de ces tables au MVP (KAN-17 livré avant les missions) — le
--     EXISTS retombe en `false` si les tables n'existent pas. Le caller
--     non-owner reçoit alors `null` (échec safe).
--
-- SECURITY DEFINER : la fonction est exécutée avec les droits du owner du
-- schéma (postgres), elle peut donc lire public.producers.pickup_address
-- malgré la RLS. Le filtrage est fait dans la WHERE.
--
-- search_path verrouillé (Critical, supabase-postgres-best-practices) pour
-- éviter les schemas injectés via les hooks d'extension.

CREATE OR REPLACE FUNCTION public.reveal_pickup_address(producer_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_address text;
  v_user_id uuid;
  v_caller uuid := auth.uid();
  v_has_mission boolean := false;
BEGIN
  IF v_caller IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT p.pickup_address, p.user_id
    INTO v_address, v_user_id
  FROM public.producers p
  WHERE p.id = producer_id
    AND p.deleted_at IS NULL;

  IF v_address IS NULL THEN
    RETURN NULL;
  END IF;

  -- Cas owner : self-révélation autorisée.
  IF v_user_id = v_caller THEN
    RETURN v_address;
  END IF;

  -- Cas rameneur : vérifier qu'il a une mission active sur ce producteur.
  -- Les tables `missions` / `trips` n'existent pas encore (livrées par
  -- KAN-10 / KAN-11). On utilise to_regclass pour ne pas casser la fonction
  -- tant que les tables manquent (retour null = safe).
  IF to_regclass('public.missions') IS NOT NULL
     AND to_regclass('public.trips') IS NOT NULL THEN
    EXECUTE
      'SELECT EXISTS ('
      || ' SELECT 1 FROM public.missions m'
      || ' JOIN public.trips t ON t.id = m.trip_id'
      || ' WHERE m.producer_id = $1'
      || '   AND t.rameneur_user_id = $2'
      || '   AND m.status IN (''confirmed'', ''picked_up'', ''delivered'')'
      || ')'
    INTO v_has_mission
    USING producer_id, v_caller;

    IF v_has_mission THEN
      RETURN v_address;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.reveal_pickup_address(uuid) IS
  'Révèle l''adresse exacte d''un producteur au caller s''il est owner ou rameneur en mission active. SECURITY DEFINER + search_path verrouillé. Tolère l''absence des tables missions/trips au MVP (KAN-17 livré avant KAN-10/11) en retournant null.';

-- Permissions explicites : authenticated peut appeler, anon non.
REVOKE ALL ON FUNCTION public.reveal_pickup_address(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.reveal_pickup_address(uuid) TO authenticated;

----------------------------------------------------------------------
-- 3.b RPC : set_pickup_location(longitude, latitude)
----------------------------------------------------------------------
-- supabase-js ne sait pas sérialiser une geography(Point) en update
-- direct. Cette fonction met à jour pickup_location du caller (auth.uid())
-- à partir de coordonnées WGS84 (EPSG:4326). Si les deux args sont null,
-- réinitialise pickup_location à NULL (cas : effacement de l'adresse).
--
-- SECURITY INVOKER : RLS du caller s'applique (un user ne peut modifier
-- que sa propre row producteur, garanti par producers_update_self).

CREATE OR REPLACE FUNCTION public.set_pickup_location(
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
    UPDATE public.producers
       SET pickup_location = NULL
     WHERE user_id = auth.uid();
  ELSE
    UPDATE public.producers
       SET pickup_location =
         extensions.ST_SetSRID(
           extensions.ST_MakePoint(p_longitude, p_latitude),
           4326
         )::extensions.geography
     WHERE user_id = auth.uid();
  END IF;
END;
$$;

COMMENT ON FUNCTION public.set_pickup_location(double precision, double precision) IS
  'Met à jour pickup_location du caller à partir de coordonnées WGS84. SECURITY INVOKER → RLS appliquée. Appelée par PATCH /api/v1/producer/profile après géocodage API Adresse Gouv.fr (KAN-17).';

REVOKE ALL ON FUNCTION public.set_pickup_location(double precision, double precision) FROM public;
GRANT EXECUTE ON FUNCTION public.set_pickup_location(double precision, double precision) TO authenticated;

----------------------------------------------------------------------
-- 4. Storage bucket : producer-photos
----------------------------------------------------------------------
-- Public en lecture (logos/photos affichées dans le catalogue), upload
-- restreint au owner via policies storage.objects (cf. § 5).
--
-- Conventions chemin :
--   {producer_user_id}/logo.<ext>
--   {producer_user_id}/farm-<0|1|2>.<ext>

INSERT INTO storage.buckets
  (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'producer-photos',
  'producer-photos',
  true,
  5242880,  -- 5 MiB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

----------------------------------------------------------------------
-- 5. Policies RLS storage.objects pour producer-photos
----------------------------------------------------------------------
-- Lecture publique (le bucket est public) — pas de policy nécessaire pour
-- SELECT côté anon/authenticated, Supabase Storage gère ça en interne via
-- la flag `public`. On pose néanmoins une policy explicite pour la traçabilité.
--
-- Pattern : le 1er segment du chemin est `auth.uid()::text`. La fonction
-- helper `storage.foldername(name)` retourne un text[] des segments.

DROP POLICY IF EXISTS "producer_photos_select_public" ON storage.objects;
CREATE POLICY "producer_photos_select_public"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'producer-photos');

DROP POLICY IF EXISTS "producer_photos_insert_owner" ON storage.objects;
CREATE POLICY "producer_photos_insert_owner"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'producer-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "producer_photos_update_owner" ON storage.objects;
CREATE POLICY "producer_photos_update_owner"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'producer-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'producer-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "producer_photos_delete_owner" ON storage.objects;
CREATE POLICY "producer_photos_delete_owner"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'producer-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

----------------------------------------------------------------------
-- 6. RLS sur public.producers — révision pour pickup_address
----------------------------------------------------------------------
-- Postgres n'a pas de RLS column-level. Approche retenue :
--   - SELECT self continue d'exposer toute la row au owner (inchangé).
--   - SELECT cross-user est bloqué par défaut (pas de policy permissive).
--   - L'exposition publique des colonnes non-sensibles (display_name,
--     description, photos, labels, zone) se fera côté KAN-53 (page publique
--     `/p/[id]`), soit via une vue dédiée, soit via une fonction SQL.
--     Pour KAN-17, la preview est rendue 100 % client-side à partir du state
--     du formulaire — pas de route publique nécessaire.
--   - pickup_address reste lu via la RPC reveal_pickup_address (cf. § 3).
--
-- Aucune nouvelle policy à poser ici : les policies existantes
-- (producers_select_self, producers_insert_self, producers_update_self)
-- s'appliquent telles quelles aux nouvelles colonnes. Le owner peut tout
-- éditer ; aucun autre client ne lit la row directement.
--
-- Le wizard step 1 et la page /producer/profile écrivent display_name,
-- description, photos, labels et adresse via PATCH (client utilisateur
-- → policy update_self). pickup_location est recalculée serveur uniquement.

----------------------------------------------------------------------
-- 7. Note sur public.products (gating boutique en pause)
----------------------------------------------------------------------
-- public.products n'existe pas encore (livré par KAN-20). Le placeholder
-- documentaire `supabase/policies/products.sql` est mis à jour dans le
-- même commit pour inclure la condition `producers.paused = false` côté
-- catalogue public. Quand KAN-20 livrera sa migration, elle reprendra le
-- gating consolidé (siret_status = verified + payouts_enabled + paused = false).
