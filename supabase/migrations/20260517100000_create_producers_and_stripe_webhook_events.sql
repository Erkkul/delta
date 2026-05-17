-- Migration: create_producers_and_stripe_webhook_events
-- Date: 2026-05-17
-- Ticket: KAN-16 (Onboarding Stripe Connect)
-- Cadrage: specs/KAN-16/design.md, ARCHITECTURE.md §5 + §8 + §18 entrée 1.x
--
-- Crée :
--   1. Enum public.producer_siret_status (4 valeurs)
--   2. Enum public.producer_stripe_status (5 valeurs)
--   3. Table public.producers (RLS forcée, soft delete, user-owned)
--   4. Table public.stripe_webhook_events (immutable, RLS forcée sans policy)
--
-- Architecture (cf. specs/KAN-16/design.md §Modèle de données) :
--   - producers.user_id (FK UNIQUE vers public.users.id ON DELETE CASCADE) :
--     un compte utilisateur peut avoir 0 ou 1 profil producteur. La row est
--     créée à la première soumission SIRET via POST /api/v1/producer/onboarding/siret.
--   - producers.siret_status : not_submitted (default) → pending → verified | rejected.
--     verified est terminal au MVP — toute re-soumission retourne 409 côté API.
--   - producers.stripe_status : not_created (default) → pending → active | restricted | disabled.
--     Mis à jour par le webhook stripe `account.updated` (cf. design.md §API).
--   - stripe_webhook_events : table d'idempotence (ARCHITECTURE.md §5.3 et §8.2).
--     Pattern INSERT … ON CONFLICT (event_id) DO NOTHING : si l'insertion réussit,
--     le handler traite l'event ; si conflit, il a déjà été traité, skip. Strictement
--     immutable (ARCHITECTURE.md §5.1) — pas d'updated_at, pas de processed_at, pas
--     d'UPDATE. L'observabilité du traitement passe par les logs (pino JSON,
--     ARCHITECTURE.md §11), pas par cette table.
--
-- Gating catalogue (cf. specs/KAN-16/design.md §RLS sur products) :
--   La policy SELECT publique sur public.products (table livrée par KAN-20) inclura
--   `EXISTS (SELECT 1 FROM producers p WHERE p.user_id = products.producer_user_id
--   AND p.siret_status = 'verified' AND p.payouts_enabled = true AND p.deleted_at IS NULL)`.
--   Voir supabase/policies/products.sql (placeholder documentaire en attendant KAN-20).
--
-- Rollback documenté :
--   DROP TRIGGER IF EXISTS set_updated_at ON public.producers;
--   DROP TABLE IF EXISTS public.stripe_webhook_events;
--   DROP TABLE IF EXISTS public.producers;
--   DROP TYPE IF EXISTS public.producer_stripe_status;
--   DROP TYPE IF EXISTS public.producer_siret_status;
--
-- Migration idempotente (rejouable sans erreur via IF NOT EXISTS / OR REPLACE).

----------------------------------------------------------------------
-- 1. Enums
----------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'producer_siret_status') THEN
    CREATE TYPE public.producer_siret_status AS ENUM
      ('not_submitted', 'pending', 'verified', 'rejected');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'producer_stripe_status') THEN
    CREATE TYPE public.producer_stripe_status AS ENUM
      ('not_created', 'pending', 'active', 'restricted', 'disabled');
  END IF;
END;
$$;

COMMENT ON TYPE public.producer_siret_status IS
  'Statut de vérification SIRET d''un producteur (KAN-16). not_submitted → pending → verified | rejected. verified est terminal au MVP.';

COMMENT ON TYPE public.producer_stripe_status IS
  'Statut du compte Stripe Connect Express d''un producteur (KAN-16). not_created → pending → active | restricted | disabled. Mis à jour par le webhook account.updated.';

----------------------------------------------------------------------
-- 2. Table public.producers
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.producers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users (id) ON DELETE CASCADE,

  -- SIRET (étape 2 du wizard /onboarding/producteur)
  siret text,
  legal_name text,
  legal_form text,
  naf_code text,
  siret_status public.producer_siret_status NOT NULL DEFAULT 'not_submitted',
  siret_verified_at timestamptz,
  siret_rejection_reason text,

  -- Stripe Connect (étape 3 du wizard)
  stripe_account_id text UNIQUE,
  stripe_status public.producer_stripe_status NOT NULL DEFAULT 'not_created',
  payouts_enabled boolean NOT NULL DEFAULT false,
  charges_enabled boolean NOT NULL DEFAULT false,
  requirements_currently_due text[] NOT NULL DEFAULT '{}',

  -- Conventions user-data (ARCHITECTURE.md §5.1)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  CONSTRAINT producers_siret_format CHECK (
    siret IS NULL OR siret ~ '^[0-9]{14}$'
  ),
  CONSTRAINT producers_naf_format CHECK (
    naf_code IS NULL OR naf_code ~ '^[0-9]{2}\.[0-9]{2}[A-Z]?$'
  )
);

COMMENT ON TABLE public.producers IS
  'Profil producteur étendant public.users avec SIRET et compte Stripe Connect Express. 0 ou 1 row par user (KAN-16). Row créée lazy à la 1ère soumission SIRET.';

-- Trigger BEFORE UPDATE pour rafraîchir updated_at (helper installé en 20260510120000_init.sql).
DROP TRIGGER IF EXISTS set_updated_at ON public.producers;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.producers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

----------------------------------------------------------------------
-- 3. RLS sur public.producers — forcée et restrictive par défaut
----------------------------------------------------------------------
ALTER TABLE public.producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producers FORCE ROW LEVEL SECURITY;

-- Les policies sont définies inline ci-dessous ET mirroées dans
-- `supabase/policies/producers.sql` (cf. convention ARCHITECTURE.md §14.2).
-- La migration reste la source de vérité appliquée.

-- SELECT : un user ne lit que sa propre ligne producteur.
DROP POLICY IF EXISTS "producers_select_self" ON public.producers;
CREATE POLICY "producers_select_self"
  ON public.producers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT : un user ne peut créer que sa propre ligne producteur (1 par user
-- garanti par UNIQUE constraint sur user_id).
DROP POLICY IF EXISTS "producers_insert_self" ON public.producers;
CREATE POLICY "producers_insert_self"
  ON public.producers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE : un user ne met à jour que sa propre ligne. user_id est verrouillé
-- (un user ne peut pas réassigner sa ligne à un autre user). Les colonnes
-- stripe_* sont modifiables côté self uniquement pour cohérence — en pratique
-- elles sont écrites exclusivement par le webhook handler (service_role bypass).
DROP POLICY IF EXISTS "producers_update_self" ON public.producers;
CREATE POLICY "producers_update_self"
  ON public.producers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE : aucune policy permissive → toute suppression bloquée côté client.
-- Le soft delete via deleted_at est géré côté core (use case dédié futur).
-- Le hard delete cascade vient de la FK ON DELETE CASCADE depuis public.users.

----------------------------------------------------------------------
-- 4. Table public.stripe_webhook_events
----------------------------------------------------------------------
-- Table d'idempotence des webhooks Stripe (ARCHITECTURE.md §5.3 et §8.2).
-- Strictement immutable (ARCHITECTURE.md §5.1) : pas d'updated_at, pas de
-- soft delete, pas d'UPDATE, pas de DELETE. Pattern :
--   INSERT … ON CONFLICT (event_id) DO NOTHING
--   IF inserted → traiter l'event
--   ELSE        → déjà traité, ignorer
-- L'observabilité du traitement (succès / échec) passe par les logs pino
-- (ARCHITECTURE.md §11), pas par cette table.

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.stripe_webhook_events IS
  'Idempotence des webhooks Stripe (KAN-16, premier handler du repo). Pattern INSERT … ON CONFLICT (event_id) DO NOTHING. Strictement immutable (ARCHITECTURE.md §5.1).';

-- RLS forcée sans policy permissive : aucun accès via client utilisateur.
-- Le handler webhook utilise la secret key (createAdminClient) qui bypass RLS.
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events FORCE ROW LEVEL SECURITY;
