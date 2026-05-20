-- Migration: product_labels_enum
-- Date: 2026-05-20
-- Ticket: KAN-24 (Labels & catégories)
-- Cadrage: specs/KAN-24/design.md, ARCHITECTURE.md §5 + §18
--
-- Fige la whitelist `product_label` laissée en suspens par KAN-20 (qui avait
-- stocké `products.labels` en `text[]` car Postgres ne supporte pas un enum
-- vide — cf. ARCHITECTURE.md §18 entrée 1.22) et swap la colonne
-- `products.labels` de `text[]` vers `product_label[]`.
--
-- Whitelist (D1, union pertinente maquette PR-05 + PRODUCER_LABELS) :
--   bio_ab, demeter, nature_et_progres, label_rouge, hve_3, producteur_fermier
--
-- Enum DISTINCT de `producer_label` : un label produit (certification du
-- produit) n'est pas une certification de ferme, même si les valeurs se
-- recouvrent. On ne réutilise donc pas le type `producer_label`.
--
-- Le swap est sûr : la feature n'a jamais été exposée (la colonne ne contient
-- que `'{}'` en base). Le cast `text[] -> product_label[]` est conditionnel
-- pour rester idempotent (ne re-caste pas si déjà migré).
--
-- Rollback documenté :
--   ALTER TABLE public.products
--     ALTER COLUMN labels DROP DEFAULT,
--     ALTER COLUMN labels TYPE text[] USING labels::text[],
--     ALTER COLUMN labels SET DEFAULT '{}';
--   DROP TYPE IF EXISTS public.product_label;
--
-- Migration idempotente.

----------------------------------------------------------------------
-- 1. Enum product_label
----------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_label') THEN
    CREATE TYPE public.product_label AS ENUM (
      'bio_ab',
      'demeter',
      'nature_et_progres',
      'label_rouge',
      'hve_3',
      'producteur_fermier'
    );
  END IF;
END;
$$;

COMMENT ON TYPE public.product_label IS
  'Label / certification produit (KAN-24, 6 valeurs). Union pertinente de la maquette PR-05 et de producer_label. Distinct de producer_label (certification produit ≠ certification ferme). Extension via ALTER TYPE … ADD VALUE.';

----------------------------------------------------------------------
-- 2. Swap colonne products.labels : text[] -> product_label[]
----------------------------------------------------------------------
-- Conditionnel : ne re-caste pas si la colonne est déjà product_label[].
DO $$
DECLARE
  current_udt text;
BEGIN
  SELECT udt_name INTO current_udt
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'products'
    AND column_name = 'labels';

  -- udt_name d'une colonne text[] = '_text' ; d'une colonne product_label[]
  -- = '_product_label'. On ne migre que depuis _text.
  IF current_udt = '_text' THEN
    ALTER TABLE public.products
      ALTER COLUMN labels DROP DEFAULT;
    ALTER TABLE public.products
      ALTER COLUMN labels TYPE public.product_label[]
      USING labels::text[]::public.product_label[];
    ALTER TABLE public.products
      ALTER COLUMN labels SET DEFAULT '{}';
  END IF;
END;
$$;

COMMENT ON COLUMN public.products.labels IS
  'Labels / certifications produit (KAN-24). product_label[] NOT NULL DEFAULT ''{}''. Whitelist figée (enum product_label, distinct de producer_label).';
