-- ============================================================================
-- MODULE 1 OF 3: EXTENSIONS, AUDIT LOGGING, AND SCHEMA COLUMNS
-- Fast, lightweight schema updates designed to execute in <1s without timeouts
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ROLE DEFINITIONS & USER ROLES TABLE
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'doctor', 'nurse', 'patient');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  email text,
  phone text,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. ROLE HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text AS $$
DECLARE
  v_role text;
BEGIN
  v_role := coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role'
  );
  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  SELECT role::text INTO v_role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;

  RETURN coalesce(v_role, 'patient');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (public.get_auth_role() = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean AS $$
BEGIN
  RETURN (public.get_auth_role() IN ('admin', 'nurse', 'doctor'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. IMMUTABLE AUDIT LOGGING TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id text,
  actor_role text,
  action text NOT NULL,
  target_entity text NOT NULL,
  target_id text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Enforce strict immutability: NO ONE can UPDATE or DELETE audit logs
CREATE OR REPLACE FUNCTION public.prevent_audit_tampering()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are strictly immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_tampering();

-- Helper function to log audit events securely
CREATE OR REPLACE FUNCTION public.log_audit_event_secure(
  p_action text,
  p_target_entity text,
  p_target_id text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
  v_actor_id text;
  v_actor_role text;
BEGIN
  v_actor_id := coalesce(auth.uid()::text, 'system');
  v_actor_role := public.get_auth_role();

  INSERT INTO public.audit_logs (
    actor_id,
    actor_role,
    action,
    target_entity,
    target_id,
    details
  ) VALUES (
    v_actor_id,
    v_actor_role,
    p_action,
    p_target_entity,
    p_target_id,
    p_details
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. SAFELY ADD MISSING COLUMNS TO BOOKINGS TABLE (Non-locking)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS promo_code text,
  ADD COLUMN IF NOT EXISTS discount_rupees numeric DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS final_fee numeric,
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS invoice_url text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS rejected_by text,
  ADD COLUMN IF NOT EXISTS rejected_nurse_id text,
  ADD COLUMN IF NOT EXISTS rejected_nurse_name text,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS nurse_acceptance_status text DEFAULT 'Pending';

-- Optional indexes to boost query performance and prevent slow sequential scans
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_nurse ON public.bookings(assigned_nurse_id);
CREATE INDEX IF NOT EXISTS idx_bookings_patient_phone ON public.bookings(patient_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
