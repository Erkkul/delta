-- Migration: create_products
-- Date: 2026-05-18
-- Ticket: KAN-20 (Création & édition produit)
-- Cadrage: specs/KAN-20/design.md, ARCHITECTURE.md §5 + §9 + §18
--
-- Crée la table public.products (premier objet « catalogue » côté DB) avec :
--   - Trois enums dédiés : product_category (8 valeurs), product_packaging
--     (8 valeurs), product_status (active/draft/disabled).
--   - Toutes les colonnes que les tickets frères de l'épic KAN-5 (KAN-21
--     photos, KAN-22 seuil d'alerte stock, KAN-23 workflow statut, KAN-24
--     labels et catégories étendues) vont câbler — préparées en DB pour ne
--     pas re-migrer la table.
--   - FTS via colonne générée `search_vector` (config `french`, poids A nom
--     + B description).
--   - Index `(producer_user_id, status)` partiel `WHERE deleted_at IS NULL`,
--     index GIN sur `search_vector`, index `(producer_user_id, deleted_at)`
--     partiel `WHERE deleted_at IS NOT NULL` (corbeille admin / RGPD).
--   - Trigger `set_updated_at` BEFORE UPDATE (helper installé par
--     `20260510120000_init.sql`).
--   - RLS enable + 4 policies : owner R/W (tout statut, y compris soft
--     deleted) + lecture publique gated par producteurs vérifiés, payouts
--     ON, non en pause, fenêtre de disponibilité respectée et status =
--     'active'.
--
-- Décision technique structurante (cf. ARCHITECTURE.md §18, entrée 1.22) :
--   - `labels` est stocké en `text[]` au MVP de KAN-20 car Postgres ne
--     supporte pas un enum vide. KAN-24 swap la colonne vers un type
--     `product_label[]` dans sa propre migration (whitelist d'enum
--     définie à ce moment-là).
--   - Suppression du placeholder documentaire `supabase/policies/products.sql`
--     (introduit par KAN-16, levé par cette migration — sa raison d'être
--     disparaît dès que la table existe).
--
-- Rollback documenté :
--   DROP TABLE IF EXISTS public.products;
--   DROP TYPE  IF EXISTS public.product_status;
--   DROP TYPE  IF EXISTS public.product_packaging;
--   DROP TYPE  IF EXISTS public.product_category;
--
-- Migration idempotente.

----------------------------------------------------------------------
-- 1. Enums
----------------------------------------------------------------------
-- Catégories MVP — alignées sur le `select` du form (PR-05). Alcool exclu
-- (décision produit 2026-05-01, cf. CLAUDE.md « Hors scope MVP »). La
-- catégorie « boissons » est volontairement restreinte aux non alcoolisées.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_category') THEN
    CREATE TYPE public.product_category AS ENUM (
      'miel_et_ruche',
      'fruits',
      'legumes',
      'cereales_legumineuses',
      'conserves_confitures',
      'pain_biscuits',
      'huiles',
      'boissons_non_alcoolisees'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_packaging') THEN
    CREATE TYPE public.product_packaging AS ENUM (
      'pot_250g',
      'pot_500g',
      'pot_1kg',
      'bouteille_50cl',
      'bouteille_75cl',
      'sachet_500g',
      'carton_6',
      'au_kilo'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_status') THEN
    CREATE TYPE public.product_status AS ENUM ('active', 'draft', 'disabled');
  END IF;
END;
$$;

COMMENT ON TYPE public.product_category IS
  'Catégorie produit (8 valeurs MVP KAN-20). Alcool exclu (décision produit 2026-05-01). Extension via migration en ajoutant des valeurs ENUM si nécessaire (KAN-24 pourra migrer vers une table `categories` si la liste explose post-MVP).';

COMMENT ON TYPE public.product_packaging IS
  'Conditionnement produit (8 valeurs MVP KAN-20). Whitelist alignée sur le select du form PR-05.';

COMMENT ON TYPE public.product_status IS
  'Statut produit. `active` = visible catalogue acheteur si producteur vérifié + payouts + non en pause + fenêtre OK ; `draft` = visible owner seul ; `disabled` = visible owner seul (masquage temporaire). Workflow complet câblé par KAN-23.';

----------------------------------------------------------------------
-- 2. Table public.products
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name                text NOT NULL,
  description         text,
  category            public.product_category  NOT NULL,
  packaging           public.product_packaging NOT NULL,
  unit_price_cents    integer NOT NULL,
  stock               integer NOT NULL DEFAULT 0,
  low_stock_threshold integer,
  availability_from   date,
  availability_to     date,
  status              public.product_status NOT NULL DEFAULT 'active',
  labels              text[] NOT NULL DEFAULT '{}',
  photos              jsonb  NOT NULL DEFAULT '[]'::jsonb,
  search_vector       tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('french', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(description, '')), 'B')
  ) STORED,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

COMMENT ON TABLE public.products IS
  'Catalogue producteur (KAN-20). Une row par produit. Soft delete via deleted_at (cf. ARCHITECTURE.md §5.4). Gating catalogue acheteur via RLS products_select_public.';

COMMENT ON COLUMN public.products.producer_user_id IS
  'FK vers public.users(id) — alias de producers.user_id (relation 1-1).';
COMMENT ON COLUMN public.products.name IS
  'Nom du produit (1..120 caractères, CHECK products_name_length).';
COMMENT ON COLUMN public.products.description IS
  'Description optionnelle (≤ 2000 caractères, CHECK products_description_length). Recommandée — augmente x3 le taux d''ajout aux envies (cf. PR-05).';
COMMENT ON COLUMN public.products.unit_price_cents IS
  'Prix unitaire net producteur en centimes d''euro (1..100000, CHECK products_unit_price_range). Cf. décision 85/10/5 du 2026-05-01 — c''est exclusivement le prix net producteur, pas le prix tout-compris acheteur (dérivé à la lecture catalogue acheteur, KAN-28).';
COMMENT ON COLUMN public.products.stock IS
  'Stock disponible en unités du conditionnement (≥ 0). Pas d''historique de variations au MVP — la consommation par mission sera modélisée par KAN-22 + KAN-31.';
COMMENT ON COLUMN public.products.low_stock_threshold IS
  'Seuil d''alerte stock (≥ 0, nullable). Câblé par KAN-22 (jobs notif `product.stock_low`). UI désactivée au MVP de KAN-20.';
COMMENT ON COLUMN public.products.availability_from IS
  'Début de la fenêtre de disponibilité (date, nullable = disponible immédiatement). Hors fenêtre, le produit est masqué du catalogue acheteur (cf. RLS products_select_public).';
COMMENT ON COLUMN public.products.availability_to IS
  'Fin de la fenêtre de disponibilité (date, nullable = sans limite). CHECK products_availability_window assure `availability_to >= availability_from` quand les deux sont set.';
COMMENT ON COLUMN public.products.status IS
  'Visibilité applicative : `active` (publié), `draft` (visible owner seul — KAN-23 ajoutera les pré-requis de publication), `disabled` (désactivé temporairement).';
COMMENT ON COLUMN public.products.labels IS
  'Labels / certifications produit. Stocké en text[] au MVP de KAN-20 (Postgres ne supporte pas un enum vide). KAN-24 swap colonne → product_label[] dans sa propre migration.';
COMMENT ON COLUMN public.products.photos IS
  'Array jsonb ordonné de { url: text, alt?: text }, max 4 entries (CHECK products_photos_max). Câblé par KAN-21 (bucket product-photos déjà provisionné).';
COMMENT ON COLUMN public.products.search_vector IS
  'tsvector FTS généré sur (name pondéré A + description pondéré B), config french. Index GIN dédié.';
COMMENT ON COLUMN public.products.deleted_at IS
  'Soft delete (KAN-71). Repo expose `WHERE deleted_at IS NULL` par défaut ; le owner peut lire ses produits supprimés pour un futur écran corbeille.';

----------------------------------------------------------------------
-- 3. Contraintes CHECK
----------------------------------------------------------------------
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_name_length;
ALTER TABLE public.products
  ADD CONSTRAINT products_name_length
  CHECK (char_length(name) BETWEEN 1 AND 120);

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_description_length;
ALTER TABLE public.products
  ADD CONSTRAINT products_description_length
  CHECK (description IS NULL OR char_length(description) <= 2000);

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_unit_price_range;
ALTER TABLE public.products
  ADD CONSTRAINT products_unit_price_range
  CHECK (unit_price_cents > 0 AND unit_price_cents <= 100000);

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_stock_nonneg;
ALTER TABLE public.products
  ADD CONSTRAINT products_stock_nonneg
  CHECK (stock >= 0);

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_low_stock_threshold_nonneg;
ALTER TABLE public.products
  ADD CONSTRAINT products_low_stock_threshold_nonneg
  CHECK (low_stock_threshold IS NULL OR low_stock_threshold >= 0);

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_availability_window;
ALTER TABLE public.products
  ADD CONSTRAINT products_availability_window
  CHECK (
    availability_from IS NULL
    OR availability_to IS NULL
    OR availability_to >= availability_from
  );

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_photos_max;
ALTER TABLE public.products
  ADD CONSTRAINT products_photos_max
  CHECK (
    jsonb_typeof(photos) = 'array'
    AND jsonb_array_length(photos) <= 4
  );

----------------------------------------------------------------------
-- 4. Index
----------------------------------------------------------------------
-- Listing producteur courant (le 99 % des reads passent par cet index).
CREATE INDEX IF NOT EXISTS products_owner_status_idx
  ON public.products (producer_user_id, status)
  WHERE deleted_at IS NULL;

-- FTS (catalogue acheteur futur + recherche producteur sur sa propre liste).
CREATE INDEX IF NOT EXISTS products_search_vector_idx
  ON public.products
  USING GIN (search_vector);

-- Corbeille / RGPD (rare lookup admin sur les rows soft-deleted).
CREATE INDEX IF NOT EXISTS products_owner_deleted_idx
  ON public.products (producer_user_id, deleted_at)
  WHERE deleted_at IS NOT NULL;

----------------------------------------------------------------------
-- 5. Trigger updated_at
----------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_updated_at ON public.products;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

----------------------------------------------------------------------
-- 6. RLS
----------------------------------------------------------------------
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products FORCE  ROW LEVEL SECURITY;

-- Owner : voit toujours ses produits (tous statuts, y compris soft-deleted).
DROP POLICY IF EXISTS "products_select_owner" ON public.products;
CREATE POLICY "products_select_owner"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (auth.uid() = producer_user_id);

-- Catalogue public : un produit n'est visible côté acheteur QUE si
--   - le caller n'est pas le owner (les rows owner sont déjà couvertes
--     par products_select_owner) ;
--   - son producteur a SIRET vérifié + payouts ON + non en pause + non
--     soft-deleted ;
--   - le produit est `active`, non soft-deleted ;
--   - la fenêtre de disponibilité (si renseignée) couvre la date du jour.
DROP POLICY IF EXISTS "products_select_public" ON public.products;
CREATE POLICY "products_select_public"
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (
    deleted_at IS NULL
    AND status = 'active'
    AND (availability_from IS NULL OR availability_from <= current_date)
    AND (availability_to   IS NULL OR availability_to   >= current_date)
    AND EXISTS (
      SELECT 1 FROM public.producers p
      WHERE p.user_id = public.products.producer_user_id
        AND p.siret_status   = 'verified'
        AND p.payouts_enabled = true
        AND p.paused         = false
        AND p.deleted_at IS NULL
    )
  );

-- Insertion : seul le owner peut créer ses produits.
DROP POLICY IF EXISTS "products_insert_owner" ON public.products;
CREATE POLICY "products_insert_owner"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = producer_user_id);

-- Update : seul le owner peut modifier ses produits (USING + WITH CHECK
-- pour éviter qu'on transfère un produit à un autre user via UPDATE).
DROP POLICY IF EXISTS "products_update_owner" ON public.products;
CREATE POLICY "products_update_owner"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = producer_user_id)
  WITH CHECK (auth.uid() = producer_user_id);

-- Volontairement pas de policy DELETE : la suppression passe par
-- UPDATE deleted_at = now() (soft delete, KAN-71).
