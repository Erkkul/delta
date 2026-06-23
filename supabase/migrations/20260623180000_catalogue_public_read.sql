-- ============================================================================
-- KAN-28 — Catalogue filtré : chemin de lecture publique du catalogue acheteur
-- ============================================================================
--
-- Problème résolu : la table `public.producers` n'a que `producers_select_self`
-- (lecture limitée au owner). Un acheteur ne peut donc pas lire le nom / la zone
-- publique du producteur pour afficher une carte catalogue. La RLS étant
-- row-level (et non column-level), ouvrir `producers` en lecture publique
-- exposerait toutes les colonnes sensibles (SIRET, identifiants Stripe).
--
-- Solution : une vue `public.catalogue_products` qui
--   - joint `products` + `producers` ;
--   - n'expose qu'une **whitelist** de colonnes publiques (jamais SIRET / Stripe
--     / adresse exacte de collecte) ;
--   - réplique **exactement** le prédicat de visibilité de la policy
--     `products_select_public` (migration 20260518000000) — produit `active`,
--     non soft-deleted, fenêtre de disponibilité couvrante, producteur vérifié
--     + payouts ON + non en pause + non soft-deleted.
--
-- La vue est détenue par le rôle de migration (`postgres`) et créée en
-- `security_invoker = off` (défaut) : elle accède aux tables sous-jacentes avec
-- les privilèges du owner, contournant la RLS de `producers` MAIS en ne
-- révélant que les colonnes whitelistées projetées ici. C'est le pattern
-- « projection publique curée » : la sécurité repose sur la liste de colonnes
-- et le prédicat WHERE, pas sur la RLS de `producers`.
--
-- ⚠️ La vue est intentionnellement « security definer-like ». L'advisor Supabase
-- la signalera ; c'est attendu et documenté (cf. specs/KAN-28/design.md).
--
-- Rollback :
--   DROP VIEW IF EXISTS public.catalogue_products;
-- ============================================================================

CREATE OR REPLACE VIEW public.catalogue_products
WITH (security_invoker = off)
AS
SELECT
  p.id,
  p.producer_user_id,
  p.name,
  p.description,
  p.category,
  p.packaging,
  p.unit_price_cents,
  p.labels,
  p.photos,
  p.created_at,
  p.search_vector,
  pr.display_name      AS producer_display_name,
  pr.pickup_public_zone AS producer_zone
FROM public.products p
JOIN public.producers pr
  ON pr.user_id = p.producer_user_id
WHERE p.deleted_at IS NULL
  AND p.status = 'active'
  AND (p.availability_from IS NULL OR p.availability_from <= current_date)
  AND (p.availability_to   IS NULL OR p.availability_to   >= current_date)
  AND pr.siret_status    = 'verified'
  AND pr.payouts_enabled = true
  AND pr.paused          = false
  AND pr.deleted_at IS NULL;

COMMENT ON VIEW public.catalogue_products IS
  'KAN-28 — Projection publique curée du catalogue acheteur (AC-03/04/05). Whitelist produit + producteur public (display_name, pickup_public_zone). Réplique le prédicat de visibilité de products_select_public. security_invoker=off volontaire : contourne la RLS producers en n''exposant que des colonnes non sensibles.';

-- Lecture publique : anon (futur catalogue SEO) + authenticated (acheteur).
GRANT SELECT ON public.catalogue_products TO anon, authenticated;
