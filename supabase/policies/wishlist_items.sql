-- Policies RLS pour public.wishlist_items (cf. ARCHITECTURE.md §5.2, §9.2)
-- Ticket : KAN-30 (Wishlist privée)
--
-- ⚠️ Ce fichier est un MIROIR documentaire. La source de vérité appliquée
-- en DB est la migration
-- `supabase/migrations/20260911100000_create_wishlist_items.sql`
-- (qui contient les mêmes CREATE POLICY inline). `supabase db push`
-- n'applique que les migrations — il ne lit pas ce dossier.
--
-- Toute évolution des policies passe par une NOUVELLE migration, qui doit
-- être miroitée ici dans le même commit (cf. ARCHITECTURE.md §14.2).
--
-- Règles (wishlist PRIVÉE — décision produit 2026-05-01) :
--   1. SELECT : self uniquement (auth.uid() = user_id), envie active.
--   2. INSERT : self uniquement (auth.uid() = user_id).
--   3. UPDATE : self uniquement (soft delete via deleted_at). user_id
--      verrouillé par WITH CHECK.
--   4. DELETE : aucune suppression physique via client utilisateur. Le retrait
--      d'une envie est un soft delete (UPDATE deleted_at).
--
-- Aucune policy cross-user : une envie n'est jamais lisible par un autre
-- utilisateur. La consommation par le matching (KAN-42) passera par un client
-- privilégié côté serveur, hors de ces policies.

----------------------------------------------------------------------
-- SELECT
----------------------------------------------------------------------
DROP POLICY IF EXISTS "wishlist_items_select_self" ON public.wishlist_items;
CREATE POLICY "wishlist_items_select_self"
  ON public.wishlist_items
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL);

----------------------------------------------------------------------
-- INSERT
----------------------------------------------------------------------
DROP POLICY IF EXISTS "wishlist_items_insert_self" ON public.wishlist_items;
CREATE POLICY "wishlist_items_insert_self"
  ON public.wishlist_items
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

----------------------------------------------------------------------
-- UPDATE — self uniquement ; user_id verrouillé
----------------------------------------------------------------------
DROP POLICY IF EXISTS "wishlist_items_update_self" ON public.wishlist_items;
CREATE POLICY "wishlist_items_update_self"
  ON public.wishlist_items
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

----------------------------------------------------------------------
-- DELETE (aucune policy permissive → rien ne passe côté client)
----------------------------------------------------------------------
-- Le retrait d'une envie est un soft delete (champ `deleted_at`), exécuté par
-- le route handler DELETE /api/v1/wishlist/[productId] via un UPDATE.
