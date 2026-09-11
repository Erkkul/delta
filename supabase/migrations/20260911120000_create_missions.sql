-- Migration: create_missions
-- Date: 2026-09-11
-- Ticket: KAN-31 (Notification & confirmation match), sans lien Jira actif
--   (projet KAN supprimé le 2026-09-11 — cf. produit/jira_mapping.md)
-- Cadrage: specs/KAN-31/design.md, ARCHITECTURE.md §5, §6, §7, §14
--
-- Pose le socle DB minimal nécessaire à KAN-31 (confirmation acheteur d'un
-- match), qui n'existait pas encore : public.trips, public.missions,
-- public.mission_buyers, public.notifications. Décision assumée (validée en
-- chat le 2026-09-11) : KAN-31 pose ce socle lui-même plutôt que d'attendre
-- les tickets amont (ex-KAN-41 déclaration de trajet, ex-KAN-42 matching,
-- ex-KAN-43 réservation mission), tous supprimés de Jira et jamais livrés.
--
-- Portée volontairement minimale — ce que cette migration NE fait PAS :
--   - public.trips n'a PAS de géométrie PostGIS (route_geom). La recherche
--     spatiale du pipeline de matching (ARCHITECTURE §7) reste à poser par
--     la feature qui implémentera la déclaration de trajet réelle.
--   - public.opportunities (vue matérialisée du matching, ARCHITECTURE §7.3)
--     n'est PAS créée : hors périmètre de la confirmation acheteur.
--   - public.missions n'a PAS de state machine automatique câblée : seule la
--     transition individuelle `mission_buyers.status` (pending → accepted /
--     declined / expired) est implémentée par KAN-31. La règle de seuil pour
--     faire passer `missions.status` de `awaiting_buyers` à `confirmed` (ou
--     `cancelled_no_buyer`) dépend d'une décision produit non tranchée (cf.
--     produit/decisions/decisions_produit.md § Bloquantes pour développement)
--     — non implémentée ici, volontairement.
--   - public.trips.rameneur_display_name est un snapshot texte dénormalisé
--     (pas de table `profiles` rameneur — épic Profil Rameneur non livré).
--     À remplacer par une vraie jointure une fois ce profil modélisé.
--
-- Rollback documenté :
--   DROP VIEW IF EXISTS public.mission_match_details;
--   DROP TABLE IF EXISTS public.notifications;
--   DROP TABLE IF EXISTS public.mission_buyers;
--   DROP TABLE IF EXISTS public.missions;
--   DROP TABLE IF EXISTS public.trips;
--   DROP FUNCTION IF EXISTS public.confirm_mission_match(uuid);
--   DROP FUNCTION IF EXISTS public.notify_mission_buyer_confirmation_requested();
--   DROP TYPE IF EXISTS public.notification_channel;
--   DROP TYPE IF EXISTS public.mission_buyer_status;
--   DROP TYPE IF EXISTS public.mission_status;
--   DROP TYPE IF EXISTS public.trip_status;
--   DROP TYPE IF EXISTS public.trip_capacity;
--
-- Migration idempotente (rejouable sans erreur via IF NOT EXISTS / OR REPLACE).

----------------------------------------------------------------------
-- 0. Enums
----------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trip_capacity') THEN
    CREATE TYPE public.trip_capacity AS ENUM ('sac', 'coffre', 'break');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trip_status') THEN
    CREATE TYPE public.trip_status AS ENUM ('active', 'completed', 'cancelled');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mission_status') THEN
    -- Cf. ARCHITECTURE.md §6.1 — graphe complet de la state machine mission.
    -- Seuls `reserved` et `awaiting_buyers` sont produits par cette
    -- migration (via les seeds/tests) ; les transitions suivantes seront
    -- câblées par les features qui en ont besoin.
    CREATE TYPE public.mission_status AS ENUM (
      'draft', 'reserved', 'awaiting_buyers', 'confirmed',
      'picked_up', 'delivered', 'closed',
      'cancelled_no_buyer', 'cancelled_no_stock', 'cancelled_rameneur_dropout'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mission_buyer_status') THEN
    CREATE TYPE public.mission_buyer_status AS ENUM (
      'pending', 'accepted', 'declined', 'expired'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_channel') THEN
    CREATE TYPE public.notification_channel AS ENUM ('in_app', 'email', 'push');
  END IF;
END $$;

----------------------------------------------------------------------
-- 1. Table public.trips (minimale — cf. note de portée en tête de fichier)
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rameneur_user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,

  -- Snapshot dénormalisé faute de table de profil rameneur (cf. note de
  -- portée). Nullable : à défaut, l'UI retombe sur un libellé générique.
  rameneur_display_name text,

  origin_label text NOT NULL,
  destination_label text NOT NULL,
  depart_date date NOT NULL,
  return_date date,
  capacity public.trip_capacity NOT NULL,
  status public.trip_status NOT NULL DEFAULT 'active',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

COMMENT ON TABLE public.trips IS
  'Trajet déclaré par un rameneur (KAN-31 — socle minimal, pas de géométrie PostGIS). Une mission référence un trajet.';

DROP TRIGGER IF EXISTS set_updated_at ON public.trips;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

----------------------------------------------------------------------
-- 2. Table public.missions
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips (id) ON DELETE CASCADE,
  producer_user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  status public.mission_status NOT NULL,
  reserved_at timestamptz NOT NULL DEFAULT now(),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

COMMENT ON TABLE public.missions IS
  'Mission réservée (ARCHITECTURE.md §5.3, §6). Statut mission-level : transitions automatiques (awaiting_buyers → confirmed / cancelled_no_buyer) NON câblées par KAN-31 (décision produit du seuil non tranchée) — écrites explicitement par le caller (seed/test) à ce stade.';

CREATE INDEX IF NOT EXISTS missions_trip_status_idx
  ON public.missions (trip_id, status);

DROP TRIGGER IF EXISTS set_updated_at ON public.missions;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.missions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

----------------------------------------------------------------------
-- 3. Table public.mission_buyers
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mission_buyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions (id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE RESTRICT,

  quantity integer NOT NULL DEFAULT 1,
  -- Prix figé au moment du match (décision produit D4, 2026-05-01) : le prix
  -- courant du producteur au moment du match, pas celui de l'ajout wishlist.
  unit_price_cents integer NOT NULL,

  status public.mission_buyer_status NOT NULL DEFAULT 'pending',
  -- Délai de confirmation : 24h par défaut, valeur PROPOSÉE non tranchée
  -- (produit/decisions/decisions_produit.md § Bloquantes pour développement,
  -- cf. specs/KAN-31/proposal.md § Hypothèses). À ajuster dès arbitrage.
  confirmation_deadline timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  responded_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT mission_buyers_quantity_positive CHECK (quantity > 0),
  CONSTRAINT mission_buyers_unit_price_nonneg CHECK (unit_price_cents >= 0)
);

COMMENT ON TABLE public.mission_buyers IS
  'N acheteurs par mission (ARCHITECTURE.md §5.3), avec statut de confirmation individuel (KAN-31). Une row = un acheteur × un produit pour une mission donnée.';
COMMENT ON COLUMN public.mission_buyers.unit_price_cents IS
  'Prix figé au moment du match (décision D4) — pas le prix courant du produit.';
COMMENT ON COLUMN public.mission_buyers.confirmation_deadline IS
  'Valeur par défaut 24h PROPOSÉE, non tranchée en décision produit — cf. specs/KAN-31/proposal.md.';

-- Un acheteur ne peut avoir qu'un seul match actif (pending) pour un même
-- produit d'une même mission.
CREATE UNIQUE INDEX IF NOT EXISTS mission_buyers_mission_buyer_product_pending_uniq
  ON public.mission_buyers (mission_id, buyer_id, product_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS mission_buyers_buyer_status_idx
  ON public.mission_buyers (buyer_id, status);

-- Consommé par le sweep d'expiration (job Inngest, cf. packages/jobs).
CREATE INDEX IF NOT EXISTS mission_buyers_pending_deadline_idx
  ON public.mission_buyers (confirmation_deadline)
  WHERE status = 'pending';

DROP TRIGGER IF EXISTS set_updated_at ON public.mission_buyers;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.mission_buyers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

----------------------------------------------------------------------
-- 4. Table public.notifications
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  type text NOT NULL,
  channel public.notification_channel NOT NULL DEFAULT 'in_app',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notifications IS
  'Outbox notifications (ARCHITECTURE.md §5.3). Canal `in_app` seul consommé au MVP de KAN-31 : Resend et Expo Push restent "À faire" (tech/setup.md) — le câblage email/push réel est porté par l''épic Notifications (ex-KAN-54/55).';

CREATE UNIQUE INDEX IF NOT EXISTS notifications_idempotency_key_uniq
  ON public.notifications (idempotency_key);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

----------------------------------------------------------------------
-- 5. Trigger — notification automatique à la création d'un mission_buyers
----------------------------------------------------------------------
-- Rend l'émission de la notification indépendante de qui crée la row
-- (aucun flow de réservation rameneur n'existe encore pour l'émettre depuis
-- l'application — cf. note de portée en tête de fichier).
CREATE OR REPLACE FUNCTION public.notify_mission_buyer_confirmation_requested()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, channel, payload, idempotency_key)
  VALUES (
    NEW.buyer_id,
    'mission_match_confirmation_requested',
    'in_app',
    jsonb_build_object(
      'mission_buyer_id', NEW.id,
      'mission_id', NEW.mission_id,
      'confirmation_deadline', NEW.confirmation_deadline
    ),
    'mission_buyer_confirmation_requested:' || NEW.id::text
  )
  ON CONFLICT (idempotency_key) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mission_buyers_notify_confirmation_requested ON public.mission_buyers;
CREATE TRIGGER mission_buyers_notify_confirmation_requested
  AFTER INSERT ON public.mission_buyers
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.notify_mission_buyer_confirmation_requested();

----------------------------------------------------------------------
-- 6. Fonction RPC — confirmation atomique (transition + décrément stock)
----------------------------------------------------------------------
-- SECURITY DEFINER : la transition `mission_buyers.status` (self, RLS OK)
-- et le décrément `products.stock` (RLS réservée au producteur propriétaire)
-- doivent être atomiques dans UNE transaction (ARCHITECTURE.md §6.3). Le
-- contrôle d'accès est donc réimplémenté explicitement dans la fonction
-- (auth.uid() = buyer_id) plutôt que délégué à la RLS des tables touchées.
-- Codes d'erreur applicatifs (mappés côté repo, cf. packages/db/src/mission-match/repo.ts) :
--   P0001 mission_match_already_responded
--   P0002 mission_match_not_found
--   P0003 mission_match_expired
--   P0004 mission_match_out_of_stock
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
-- 7. RLS
----------------------------------------------------------------------
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips FORCE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mission_buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_buyers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

-- Les policies sont définies inline ci-dessous ET mirroées dans
-- supabase/policies/{trips,missions,mission_buyers,notifications}.sql
-- (convention ARCHITECTURE.md §14.2). La migration reste la source de
-- vérité appliquée.

-- trips : le rameneur propriétaire lit/écrit son trajet.
DROP POLICY IF EXISTS "trips_select_rameneur" ON public.trips;
CREATE POLICY "trips_select_rameneur"
  ON public.trips FOR SELECT TO authenticated
  USING (auth.uid() = rameneur_user_id);

-- trips : un acheteur voit le trajet d'une mission dont il est mission_buyer
-- (nécessaire pour afficher AC-07 — origine/destination/date du rameneur).
DROP POLICY IF EXISTS "trips_select_buyer_via_mission" ON public.trips;
CREATE POLICY "trips_select_buyer_via_mission"
  ON public.trips FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.missions m
      JOIN public.mission_buyers mb ON mb.mission_id = m.id
      WHERE m.trip_id = trips.id AND mb.buyer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "trips_insert_rameneur" ON public.trips;
CREATE POLICY "trips_insert_rameneur"
  ON public.trips FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = rameneur_user_id);

DROP POLICY IF EXISTS "trips_update_rameneur" ON public.trips;
CREATE POLICY "trips_update_rameneur"
  ON public.trips FOR UPDATE TO authenticated
  USING (auth.uid() = rameneur_user_id)
  WITH CHECK (auth.uid() = rameneur_user_id);

-- missions : le rameneur (via son trajet) et le producteur voient leurs
-- missions.
DROP POLICY IF EXISTS "missions_select_rameneur" ON public.missions;
CREATE POLICY "missions_select_rameneur"
  ON public.missions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = missions.trip_id AND t.rameneur_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "missions_select_producer" ON public.missions;
CREATE POLICY "missions_select_producer"
  ON public.missions FOR SELECT TO authenticated
  USING (auth.uid() = producer_user_id);

-- missions : un acheteur voit la mission dont il est mission_buyer.
DROP POLICY IF EXISTS "missions_select_buyer" ON public.missions;
CREATE POLICY "missions_select_buyer"
  ON public.missions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mission_buyers mb
      WHERE mb.mission_id = missions.id AND mb.buyer_id = auth.uid()
    )
  );

-- Pas de policy INSERT/UPDATE self-service au MVP de KAN-31 : la création
-- de missions passe par un client privilégié (seed/test, futur flow de
-- réservation rameneur), hors périmètre de ce ticket.

-- mission_buyers : self only (le match n'est visible que par l'acheteur
-- concerné — même posture que la wishlist privée).
DROP POLICY IF EXISTS "mission_buyers_select_self" ON public.mission_buyers;
CREATE POLICY "mission_buyers_select_self"
  ON public.mission_buyers FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id);

-- UPDATE self réservé au refus (decline). La confirmation (accept) passe
-- exclusivement par la fonction `confirm_mission_match` (SECURITY DEFINER,
-- transaction atomique avec le décrément de stock) — jamais par un UPDATE
-- direct côté client, donc pas de policy UPDATE autorisant status=accepted
-- ici : la policy ci-dessous ne restreint pas la valeur cible, le route
-- handler applique la règle `status IN ('pending')` en clause WHERE.
DROP POLICY IF EXISTS "mission_buyers_update_self" ON public.mission_buyers;
CREATE POLICY "mission_buyers_update_self"
  ON public.mission_buyers FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

-- Pas de policy INSERT self-service : la création d'un match (résultat du
-- matching) passe par un client privilégié, hors périmètre de KAN-31.

-- notifications : self only, lecture seule côté client (le marquage lu
-- passe par UPDATE self restreint à read_at).
DROP POLICY IF EXISTS "notifications_select_self" ON public.notifications;
CREATE POLICY "notifications_select_self"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_self" ON public.notifications;
CREATE POLICY "notifications_update_self"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

----------------------------------------------------------------------
-- 8. Policy additive products — visibilité pour un acheteur en cours de match
----------------------------------------------------------------------
-- La lecture catalogue publique (`products_select_public`, KAN-20) ne couvre
-- pas nécessairement l'état du produit au moment précis de la confirmation
-- (ex : stock épuisé entre-temps). Un acheteur doit pouvoir lire le produit
-- de son propre match quel que soit l'état courant du produit.
DROP POLICY IF EXISTS "products_select_buyer_mission_match" ON public.products;
CREATE POLICY "products_select_buyer_mission_match"
  ON public.products FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mission_buyers mb
      WHERE mb.product_id = products.id AND mb.buyer_id = auth.uid()
    )
  );

----------------------------------------------------------------------
-- 9. Vue mission_match_details (lecture composée pour AC-07)
----------------------------------------------------------------------
-- `public.producers` n'a qu'une policy `producers_select_self` (KAN-16) :
-- un acheteur ne peut PAS lire le `display_name` du producteur de son match
-- via une simple jointure RLS-safe (contrairement à trips/missions/
-- mission_buyers, dont les policies "buyer" ci-dessus se rattachent toutes
-- in fine à `mission_buyers_select_self`, un cas self réflexif). Même
-- contournement que `catalogue_products` (KAN-28, migration
-- 20260623180000) : `security_invoker = off` + prédicat d'autorisation
-- embarqué directement dans la vue (`mb.buyer_id = auth.uid()`), qui
-- n'expose que des colonnes non sensibles.
CREATE OR REPLACE VIEW public.mission_match_details
WITH (security_invoker = off)
AS
SELECT
  mb.id,
  mb.buyer_id,
  mb.status,
  mb.confirmation_deadline,
  mb.responded_at,
  mb.quantity,
  mb.unit_price_cents,
  p.id   AS product_id,
  p.name AS product_name,
  pr.user_id       AS producer_user_id,
  pr.display_name  AS producer_display_name,
  pr.pickup_public_zone AS producer_zone,
  t.rameneur_user_id,
  t.rameneur_display_name,
  t.origin_label,
  t.destination_label,
  t.depart_date
FROM public.mission_buyers mb
JOIN public.products p ON p.id = mb.product_id
JOIN public.missions m ON m.id = mb.mission_id
JOIN public.trips t ON t.id = m.trip_id
JOIN public.producers pr ON pr.user_id = m.producer_user_id
WHERE mb.buyer_id = auth.uid();

COMMENT ON VIEW public.mission_match_details IS
  'KAN-31 — projection composée d''un match pour son acheteur (écran AC-07). security_invoker=off volontaire (mêmes raisons que catalogue_products, KAN-28) : le prédicat mb.buyer_id = auth.uid() est embarqué dans la vue, pas délégué à la RLS producers (self-only).';
