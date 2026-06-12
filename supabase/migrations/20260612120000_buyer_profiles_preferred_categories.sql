-- Migration: buyer_profiles_preferred_categories
-- Date: 2026-06-12
-- Ticket: KAN-26 (Préférences catégories)
-- Cadrage: specs/KAN-26/design.md, ARCHITECTURE.md §5
--
-- Ajoute la colonne public.buyer_profiles.preferred_categories : sous-ensemble
-- de l'enum product_category (KAN-20) que l'acheteur déclare comme centres
-- d'intérêt. Capté à l'onboarding (AC-02 étape 2, KAN-83) et éditable depuis
-- les paramètres (AC-11, KAN-84). Personnalise l'affichage de l'accueil
-- (tri / mise en avant, KAN-28) — jamais un filtre dur ni un impact matching.
--
-- Réutilise le type enum product_category déjà créé par la migration KAN-20
-- (20260518000000_create_products.sql) : aucun CREATE TYPE ici. La RLS de la
-- table (policies *_self de KAN-25) couvre la nouvelle colonne sans changement.
--
-- Rollback documenté :
--   ALTER TABLE public.buyer_profiles DROP COLUMN IF EXISTS preferred_categories;
--
-- Migration idempotente (ADD COLUMN IF NOT EXISTS).

ALTER TABLE public.buyer_profiles
  ADD COLUMN IF NOT EXISTS preferred_categories public.product_category[]
  NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.buyer_profiles.preferred_categories IS
  'Catégories produit (sous-ensemble de l''enum product_category) déclarées comme centres d''intérêt par l''acheteur (KAN-26). Vide = aucune préférence. Personnalise l''accueil (KAN-28), pas un filtre dur.';
