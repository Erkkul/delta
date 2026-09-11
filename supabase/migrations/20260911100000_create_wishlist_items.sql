-- Migration: create_wishlist_items
-- Date: 2026-09-11
-- Ticket: KAN-30 (Wishlist privée)
-- Cadrage: specs/KAN-30/design.md, ARCHITECTURE.md §5 + §14
--
-- Crée la table public.wishlist_items : la wishlist privée acheteur (« Mes
-- envies », AC-06). Une envie = un produit précis d'un producteur précis
-- (décision produit D1, 2026-05-01). Miroir du pattern RLS self-only de
-- public.buyer_profiles (KAN-25).
--
-- Architecture (cf. specs/KAN-30/design.md § Modèle de données) :
--   - wishlist_items.user_id (FK public.users.id ON DELETE CASCADE) : le
--     propriétaire de l'envie.
--   - wishlist_items.product_id (FK public.products.id ON DELETE CASCADE) :
--     le produit souhaité. Aucun prix n'est stocké — le prix appliqué est
--     celui en vigueur au moment du match (décision D4, KAN-31).
--   - Aucune colonne `status` : l'état affiché (en attente / match probable /
--     à confirmer) est *dérivé* par le matching (KAN-42) à la lecture. Au MVP
--     de KAN-30, toute envie est en état logique `pending`.
--   - deleted_at : le retrait d'une envie est un soft delete (RGPD / cohérence
--     repo). Un ré-ajout après retrait crée une nouvelle row (l'index unique
--     partiel ne couvre que les envies actives).
--
-- Confidentialité (décision « wishlist privée » 2026-05-01) : aucune policy
-- SELECT cross-user. Une envie n'est jamais lisible par un autre utilisateur.
-- La consommation par le matching (KAN-42) se fera côté serveur avec un client
-- privilégié, hors périmètre de cette migration.
--
-- Plafond de 20 envies actives (maquette AC-06) : appliqué côté serveur
-- (COUNT actif avant INSERT dans le route handler), pas par contrainte DB —
-- cf. specs/KAN-30/design.md § Modèle de données et tasks.md.
--
-- Rollback documenté :
--   DROP TABLE IF EXISTS public.wishlist_items;
--
-- Migration idempotente (rejouable sans erreur via IF NOT EXISTS / OR REPLACE).

----------------------------------------------------------------------
-- 1. Table public.wishlist_items
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

COMMENT ON TABLE public.wishlist_items IS
  'Wishlist privée acheteur (KAN-30, AC-06). Une row = un produit précis souhaité par un acheteur. Privée (aucune lecture cross-user). Statut d''envie dérivé par le matching (KAN-42), non stocké. Prix appliqué au match (KAN-31), non stocké. Plafond 20 envies actives appliqué côté serveur.';
COMMENT ON COLUMN public.wishlist_items.user_id IS
  'Propriétaire de l''envie (FK public.users). RLS : accès strictement self.';
COMMENT ON COLUMN public.wishlist_items.product_id IS
  'Produit souhaité (FK public.products). L''affichage passe par la vue publique catalogue_products (KAN-28) : une envie dont le produit n''est plus visible n''apparaît pas dans la liste.';
COMMENT ON COLUMN public.wishlist_items.deleted_at IS
  'Soft delete : retrait d''une envie. NULL = envie active. Un ré-ajout après retrait crée une nouvelle row.';

-- Unicité : un même produit ne peut être en envie ACTIVE qu'une fois par
-- acheteur. L'index partiel n'engage que les envies non supprimées, ce qui
-- autorise le ré-ajout après un retrait (soft delete).
CREATE UNIQUE INDEX IF NOT EXISTS wishlist_items_user_product_active_uniq
  ON public.wishlist_items (user_id, product_id)
  WHERE deleted_at IS NULL;

-- Liste + comptage plafond : envies actives d'un acheteur, triées par récence.
CREATE INDEX IF NOT EXISTS wishlist_items_user_active_idx
  ON public.wishlist_items (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

----------------------------------------------------------------------
-- 2. RLS — forcée et restrictive par défaut (miroir buyer_profiles)
----------------------------------------------------------------------
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items FORCE ROW LEVEL SECURITY;

-- Les policies sont définies inline ci-dessous ET mirroées dans
-- supabase/policies/wishlist_items.sql (convention ARCHITECTURE.md §14.2).
-- La migration reste la source de vérité appliquée.

-- SELECT : un user ne lit que ses propres envies actives.
DROP POLICY IF EXISTS "wishlist_items_select_self" ON public.wishlist_items;
CREATE POLICY "wishlist_items_select_self"
  ON public.wishlist_items
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- INSERT : un user ne crée que ses propres envies.
DROP POLICY IF EXISTS "wishlist_items_insert_self" ON public.wishlist_items;
CREATE POLICY "wishlist_items_insert_self"
  ON public.wishlist_items
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE : un user ne modifie que ses propres envies (soft delete via
-- deleted_at). user_id verrouillé (USING + WITH CHECK sur auth.uid()).
DROP POLICY IF EXISTS "wishlist_items_update_self" ON public.wishlist_items;
CREATE POLICY "wishlist_items_update_self"
  ON public.wishlist_items
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE : aucune policy permissive → suppression physique refusée côté
-- client. Le retrait d'une envie est un soft delete (UPDATE deleted_at).
