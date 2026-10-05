-- Migration: buyer_penalty
-- Date: 2026-10-05
-- Ticket: KAN-32 (Pénalités acheteur), sans lien Jira actif (projet KAN
--   supprimé le 2026-09-11 — cf. produit/jira_mapping.md)
-- Cadrage: specs/KAN-32/design.md, ARCHITECTURE.md §5, §6, §9, §14
--
-- Complément direct de KAN-31 (migration 20260911120000_create_missions.sql) :
-- applique la décision produit D7 (produit/decisions/decisions_produit.md,
-- 2026-05-01) — pénalité crescendo sur les refus de match répétés côté
-- acheteur : 1er refus neutre, 2e dans un mois glissant = avertissement,
-- 3e+ = suspension temporaire.
--
-- ⚠️ Seuils et durée de suspension = hypothèse de travail non finalisée par
-- le produit (D7 dit elle-même "seuils précis à finaliser" ; cf.
-- specs/KAN-32/proposal.md § Hypothèses, et
-- produit/decisions/decisions_produit.md § Bloquantes pour développement).
-- Valeurs reprises ici : seuil avertissement = 2e refus, seuil suspension =
-- 3e refus, fenêtre = 1 mois glissant, durée de suspension = 14 jours. Même
-- posture que KAN-31 pour son délai de confirmation 24h (valeur PROPOSÉE
-- câblée en attendant l'arbitrage produit). Source de vérité pour ces
-- constantes côté lecture humaine : packages/core/src/mission-match/
-- compute-buyer-penalty-outcome.ts (dupliquées ici faute de pouvoir
-- partager des constantes entre SQL et TypeScript — à garder synchronisées
-- si le produit tranche d'autres valeurs).
--
-- Portée volontairement limitée — ce que cette migration NE fait PAS :
--   - Ne bloque PAS la création de nouveaux `mission_buyers` pour un
--     acheteur suspendu : aucune policy INSERT self-service n'existe sur
--     cette table (la création passe par un client privilégié, pipeline de
--     matching non livré — ex-KAN-41/42/43). Rien à gater ici.
--   - Ne câble AUCUN canal de notification réel (email/push) : réutilise
--     l'outbox `notifications` existante (in_app uniquement), même posture
--     que KAN-31.
--   - Ne crée PAS d'écran de levée de suspension manuelle (pas d'espace
--     admin au MVP) : la suspension se lève seule à `suspended_until`.
--
-- Rollback documenté :
--   DROP POLICY IF EXISTS "mission_buyers_update_self" ON public.mission_buyers; -- déjà supprimée par cette migration, ne pas recréer sans réintroduire le risque de contournement décrit ci-dessous
--   DROP FUNCTION IF EXISTS public.decline_mission_match(uuid);
--   -- confirm_mission_match et users_update_self reviennent à leur version KAN-31 — rejouer 20260911120000 / 20260512090000 après rollback de cette migration.
--   DROP INDEX IF EXISTS public.mission_buyers_buyer_declined_responded_idx;
--   ALTER TABLE public.users DROP COLUMN IF EXISTS suspended_until;
--
-- Migration idempotente (rejouable sans erreur via IF NOT EXISTS / OR REPLACE).

----------------------------------------------------------------------
-- 1. Colonne public.users.suspended_until
----------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS suspended_until timestamptz;

COMMENT ON COLUMN public.users.suspended_until IS
  'Pénalité acheteur (KAN-32, D7) : NULL ou date passée = pas de restriction. Date future = compte suspendu jusqu''à cette date (bloque confirm_mission_match). Écrite exclusivement par decline_mission_match (SECURITY DEFINER) — jamais par un UPDATE self direct, cf. policy users_update_self.';

----------------------------------------------------------------------
-- 2. Index — comptage des refus sur fenêtre glissante
----------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS mission_buyers_buyer_declined_responded_idx
  ON public.mission_buyers (buyer_id, responded_at)
  WHERE status = 'declined';

----------------------------------------------------------------------
-- 3. Fonction RPC — refus atomique + comptage + pénalité crescendo
----------------------------------------------------------------------
-- SECURITY DEFINER : remplace le simple UPDATE self utilisé par KAN-31
-- (policy mission_buyers_update_self, supprimée ci-dessous §5) — le
-- comptage des refus et l'écriture éventuelle de la suspension
-- (public.users, hors RLS self) doivent être atomiques avec la transition
-- de statut, dans la même transaction que la décision de pénalité
-- (ARCHITECTURE.md §6.3, même pattern que confirm_mission_match).
-- Codes d'erreur applicatifs (mappés côté repo, cf.
-- packages/db/src/mission-match/repo.ts) :
--   P0001 mission_match_already_responded
--   P0002 mission_match_not_found
CREATE OR REPLACE FUNCTION public.decline_mission_match(p_mission_buyer_id uuid)
RETURNS public.mission_buyers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id uuid := auth.uid();
  v_row public.mission_buyers;
  v_decline_count integer;
  v_suspended_until timestamptz;
BEGIN
  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_row
  FROM public.mission_buyers
  WHERE id = p_mission_buyer_id AND buyer_id = v_buyer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'mission_match_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'mission_match_already_responded' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.mission_buyers
  SET status = 'declined', responded_at = now(), updated_at = now()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  -- Comptage incluant le refus qui vient d'être écrit (fenêtre glissante
  -- d'un mois, D7). Verrouillage FOR UPDATE ci-dessus sur mission_buyers
  -- empêche deux décomptes concurrents de diverger pour le même match,
  -- mais pas pour deux matches différents du même acheteur en parallèle :
  -- acceptable (le pire cas retarde d'un refus l'escalade, jamais ne la
  -- déclenche à tort).
  SELECT count(*) INTO v_decline_count
  FROM public.mission_buyers
  WHERE buyer_id = v_buyer_id
    AND status = 'declined'
    AND responded_at > now() - interval '1 month';

  IF v_decline_count >= 3 THEN
    v_suspended_until := now() + interval '14 days';
    UPDATE public.users SET suspended_until = v_suspended_until WHERE id = v_buyer_id;

    INSERT INTO public.notifications (user_id, type, channel, payload, idempotency_key)
    VALUES (
      v_buyer_id,
      'buyer_penalty_suspended',
      'in_app',
      jsonb_build_object(
        'mission_buyer_id', v_row.id,
        'decline_count', v_decline_count,
        'suspended_until', v_suspended_until
      ),
      'buyer_penalty_suspended:' || v_row.id::text
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  ELSIF v_decline_count = 2 THEN
    INSERT INTO public.notifications (user_id, type, channel, payload, idempotency_key)
    VALUES (
      v_buyer_id,
      'buyer_penalty_warning',
      'in_app',
      jsonb_build_object('mission_buyer_id', v_row.id, 'decline_count', v_decline_count),
      'buyer_penalty_warning:' || v_row.id::text
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.decline_mission_match(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decline_mission_match(uuid) TO authenticated;

----------------------------------------------------------------------
-- 4. Fonction RPC confirm_mission_match — ajout du gate de suspension
----------------------------------------------------------------------
-- Redéfinition complète (KAN-31 + KAN-32) : seul ajout vs. la version
-- 20260911120000 : lecture de `users.suspended_until` juste après la
-- vérification d'authentification, avant tout accès à mission_buyers.
-- Nouveau code d'erreur :
--   P0005 mission_match_buyer_suspended
CREATE OR REPLACE FUNCTION public.confirm_mission_match(p_mission_buyer_id uuid)
RETURNS public.mission_buyers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id uuid := auth.uid();
  v_row public.mission_buyers;
  v_stock_updated integer;
  v_suspended_until timestamptz;
BEGIN
  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT suspended_until INTO v_suspended_until
  FROM public.users
  WHERE id = v_buyer_id;

  IF v_suspended_until IS NOT NULL AND v_suspended_until > now() THEN
    RAISE EXCEPTION 'mission_match_buyer_suspended' USING ERRCODE = 'P0005';
  END IF;

  SELECT * INTO v_row
  FROM public.mission_buyers
  WHERE id = p_mission_buyer_id AND buyer_id = v_buyer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'mission_match_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'mission_match_already_responded' USING ERRCODE = 'P0001';
  END IF;

  IF v_row.confirmation_deadline < now() THEN
    UPDATE public.mission_buyers SET status = 'expired', updated_at = now()
    WHERE id = v_row.id;
    RAISE EXCEPTION 'mission_match_expired' USING ERRCODE = 'P0003';
  END IF;

  UPDATE public.products
  SET stock = stock - v_row.quantity
  WHERE id = v_row.product_id AND stock >= v_row.quantity;
  GET DIAGNOSTICS v_stock_updated = ROW_COUNT;

  IF v_stock_updated = 0 THEN
    RAISE EXCEPTION 'mission_match_out_of_stock' USING ERRCODE = 'P0004';
  END IF;

  UPDATE public.mission_buyers
  SET status = 'accepted', responded_at = now(), updated_at = now()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_mission_match(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_mission_match(uuid) TO authenticated;

----------------------------------------------------------------------
-- 5. RLS — mission_buyers : suppression de l'UPDATE self direct
----------------------------------------------------------------------
-- KAN-31 autorisait un UPDATE self direct (policy mission_buyers_update_self)
-- pour le refus, le route handler appliquant `WHERE status = 'pending'` côté
-- application. Ce chemin contourne désormais le comptage de pénalité
-- introduit ci-dessus : un client pourrait écrire `status = 'declined'` par
-- un PATCH REST direct sans jamais passer par `decline_mission_match`, et
-- échapper à l'escalade D7. Les deux transitions (accept et decline)
-- passent maintenant exclusivement par des fonctions RPC SECURITY DEFINER
-- (confirm_mission_match, decline_mission_match) : plus aucune policy
-- UPDATE self-service n'est nécessaire ni souhaitable sur cette table.
DROP POLICY IF EXISTS "mission_buyers_update_self" ON public.mission_buyers;

----------------------------------------------------------------------
-- 6. RLS — users : verrouillage de suspended_until contre l'auto-écriture
----------------------------------------------------------------------
-- La policy users_update_self (KAN-2) autorisait déjà la modification de
-- toute colonne hors `id`/`email` par son propriétaire (utilisé par
-- PATCH /api/v1/me/roles). `suspended_until` doit rester écrit
-- exclusivement par `decline_mission_match` (SECURITY DEFINER, qui
-- contourne la RLS) — un acheteur ne doit pas pouvoir lever (ni poser) sa
-- propre suspension via un UPDATE self.
DROP POLICY IF EXISTS "users_update_self" ON public.users;
CREATE POLICY "users_update_self"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND id = (SELECT u.id FROM public.users u WHERE u.id = auth.uid())
    AND email = (SELECT u.email FROM public.users u WHERE u.id = auth.uid())
    AND suspended_until IS NOT DISTINCT FROM (SELECT u.suspended_until FROM public.users u WHERE u.id = auth.uid())
  );
