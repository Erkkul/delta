-- Policies RLS pour public.products (cf. ARCHITECTURE.md §5.2, §9.2)
--
-- ⚠️ Ce fichier ne mirroite QUE la policy ajoutée par KAN-31 (sans lien Jira
-- actif). Les policies posées par KAN-20 (`products_select_owner`,
-- `products_select_public`, `products_insert_owner`, `products_update_owner`)
-- restent inline-only dans
-- `supabase/migrations/20260518000000_create_products.sql` — dette
-- préexistante, non introduite par KAN-31, à combler séparément si besoin.
--
-- Règle ajoutée par KAN-31 :
--   SELECT additive — un acheteur lit le produit de son propre match
--   (`mission_buyers`), quel que soit l'état courant de visibilité publique
--   du produit (ex : stock épuisé entre-temps). Nécessaire pour l'écran
--   AC-07 (récap produit sur la confirmation de match).

DROP POLICY IF EXISTS "products_select_buyer_mission_match" ON public.products;
CREATE POLICY "products_select_buyer_mission_match"
  ON public.products FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mission_buyers mb
      WHERE mb.product_id = products.id AND mb.buyer_id = auth.uid()
    )
  );
