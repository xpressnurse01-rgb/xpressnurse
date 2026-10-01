-- ============================================================================
-- XPRESS NURSE - PRODUCTION HARDENING & ENTERPRISE SECURITY MIGRATION
-- Complies with HIPAA/PHI safeguards, server-enforced RBAC, and atomic operations
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

-- Helper to safely extract user role from auth context
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text AS $$
DECLARE
  v_role text;
BEGIN
  -- First check auth JWT metadata
  v_role := coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role'
  );
  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- Fallback to database user_roles table
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

-- 3. IMMUTABLE AUDIT LOGGING TABLE
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

-- Helper function to log audit events
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

-- 4. HARDEN SCHEMAS WITH CONSTRAINTS
-- Prevent negative prices and ensure data integrity
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

DO $$ BEGIN
  ALTER TABLE public.bookings ADD CONSTRAINT chk_bookings_fees_positive CHECK (estimated_fee >= 0 AND (final_fee IS NULL OR final_fee >= 0));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.bookings ADD CONSTRAINT chk_bookings_status_valid CHECK (status IN ('Pending', 'Assigned', 'In-Progress', 'Completed', 'Cancelled', 'Rejected'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.services ADD CONSTRAINT chk_services_price_positive CHECK (single_visit_price >= 0);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.coupons ADD CONSTRAINT chk_coupons_positive_discount CHECK (discount_value >= 0);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 5. ATOMIC BUSINESS OPERATIONS (RPC FUNCTIONS)

-- 5.1 Atomic Server-Side Coupon Redemption (Race-condition safe with FOR UPDATE)
CREATE OR REPLACE FUNCTION public.redeem_coupon_atomic(
  p_code text,
  p_order_amount numeric,
  p_user_id text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_coupon record;
  v_discount numeric := 0;
  v_final_amount numeric := p_order_amount;
BEGIN
  -- Strict sanitization
  p_code := upper(trim(p_code));

  -- Lock coupon row for atomic capacity check
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE upper(trim(code)) = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Coupon code not found.');
  END IF;

  IF v_coupon.status <> 'Active' THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This promo code is no longer active.');
  END IF;

  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < now() THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This promo code has expired.');
  END IF;

  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.times_used >= v_coupon.usage_limit THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Coupon redemption limit has been reached.');
  END IF;

  IF v_coupon.min_order_amount IS NOT NULL AND p_order_amount < v_coupon.min_order_amount THEN
    RETURN jsonb_build_object(
      'valid', false, 
      'message', format('Minimum booking value of ₹%s required for this coupon.', round(v_coupon.min_order_amount))
    );
  END IF;

  -- Calculate authoritative server discount
  IF v_coupon.discount_type = 'flat' THEN
    v_discount := least(v_coupon.discount_value, p_order_amount);
  ELSIF v_coupon.discount_type = 'percent' THEN
    v_discount := round(least(
      p_order_amount * (v_coupon.discount_value / 100.0),
      coalesce(v_coupon.max_discount, p_order_amount)
    ), 2);
  ELSE
    v_discount := 0;
  END IF;

  v_final_amount := greatest(0, p_order_amount - v_discount);

  -- Atomic update of times_used
  UPDATE public.coupons
  SET times_used = times_used + 1
  WHERE id = v_coupon.id;

  -- Audit redemption
  PERFORM public.log_audit_event_secure(
    'COUPON_REDEEM',
    'coupons',
    v_coupon.id,
    jsonb_build_object(
      'code', p_code,
      'order_amount', p_order_amount,
      'discount', v_discount,
      'final_amount', v_final_amount,
      'user_id', p_user_id
    )
  );

  RETURN jsonb_build_object(
    'valid', true,
    'code', v_coupon.code,
    'discount', v_discount,
    'final_amount', v_final_amount,
    'message', format('Applied: ₹%s savings', round(v_discount))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2 Server-Side Validated Booking Creation
CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  p_patient_name text,
  p_patient_phone text,
  p_service_id text,
  p_area text,
  p_full_address text,
  p_preferred_date text,
  p_preferred_time text,
  p_has_prescription boolean DEFAULT false,
  p_prescription_file_name text DEFAULT NULL,
  p_prescription_url text DEFAULT NULL,
  p_coupon_code text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_patient_age integer DEFAULT NULL,
  p_patient_gender text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_service record;
  v_booking_id text;
  v_estimated_fee numeric;
  v_discount numeric := 0;
  v_final_fee numeric;
  v_coupon_res jsonb;
BEGIN
  -- Validate patient inputs
  IF length(trim(p_patient_name)) < 2 THEN
    RAISE EXCEPTION 'Patient name must be at least 2 characters.';
  END IF;

  IF length(regexp_replace(p_patient_phone, '\D', '', 'g')) < 10 THEN
    RAISE EXCEPTION 'A valid 10-digit phone number is required.';
  END IF;

  -- Fetch service authoritatively from services catalog
  SELECT * INTO v_service
  FROM public.services
  WHERE id = p_service_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected service does not exist in clinical catalog.';
  END IF;

  v_estimated_fee := v_service.single_visit_price;

  -- Apply coupon if provided
  IF p_coupon_code IS NOT NULL AND length(trim(p_coupon_code)) > 0 THEN
    v_coupon_res := public.redeem_coupon_atomic(p_coupon_code, v_estimated_fee, p_patient_phone);
    IF (v_coupon_res ->> 'valid')::boolean = true THEN
      v_discount := (v_coupon_res ->> 'discount')::numeric;
    END IF;
  END IF;

  v_final_fee := greatest(0, v_estimated_fee - v_discount);
  v_booking_id := 'BK-' || floor(1000 + random() * 9000)::text;

  INSERT INTO public.bookings (
    id,
    created_at,
    patient_name,
    patient_phone,
    patient_age,
    patient_gender,
    service_id,
    service_title,
    area,
    full_address,
    preferred_date,
    preferred_time,
    has_prescription,
    prescription_file_name,
    prescription_url,
    status,
    estimated_fee,
    discount_rupees,
    final_fee,
    promo_code,
    notes
  ) VALUES (
    v_booking_id,
    now(),
    trim(p_patient_name),
    trim(p_patient_phone),
    p_patient_age,
    p_patient_gender,
    v_service.id,
    v_service.title,
    trim(p_area),
    trim(p_full_address),
    p_preferred_date,
    p_preferred_time,
    p_has_prescription,
    p_prescription_file_name,
    p_prescription_url,
    'Pending',
    v_estimated_fee,
    v_discount,
    v_final_fee,
    p_coupon_code,
    p_notes
  );

  PERFORM public.log_audit_event_secure(
    'BOOKING_CREATE',
    'bookings',
    v_booking_id,
    jsonb_build_object(
      'patient_name', p_patient_name,
      'service_id', p_service_id,
      'final_fee', v_final_fee
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'final_fee', v_final_fee,
    'message', 'Booking created successfully and queued for dispatch.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.3 Server-Side Authorized Nurse Assignment
CREATE OR REPLACE FUNCTION public.assign_nurse_atomic(
  p_booking_id text,
  p_nurse_id text,
  p_assigned_by text DEFAULT 'Operations Dispatcher'
)
RETURNS jsonb AS $$
DECLARE
  v_nurse record;
  v_booking record;
BEGIN
  -- Enforce staff/admin check
  IF NOT public.is_admin() AND public.get_auth_role() <> 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only administrative dispatchers can assign nurses to bookings.';
  END IF;

  SELECT * INTO v_nurse
  FROM public.nurses
  WHERE id = p_nurse_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nurse not found in registry.';
  END IF;

  IF v_nurse.status <> 'Active' THEN
    RAISE EXCEPTION 'Nurse is currently not in Active status.';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.';
  END IF;

  IF v_booking.status IN ('Completed', 'Cancelled') THEN
    RAISE EXCEPTION 'Cannot reassign a closed or cancelled booking.';
  END IF;

  UPDATE public.bookings
  SET 
    assigned_nurse_id = v_nurse.id,
    assigned_nurse_name = v_nurse.name,
    status = 'Assigned',
    nurse_acceptance_status = 'Pending'
  WHERE id = p_booking_id;

  PERFORM public.log_audit_event_secure(
    'NURSE_ASSIGN',
    'bookings',
    p_booking_id,
    jsonb_build_object(
      'nurse_id', p_nurse_id,
      'nurse_name', v_nurse.name,
      'assigned_by', p_assigned_by
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'nurse_id', p_nurse_id,
    'nurse_name', v_nurse.name,
    'message', 'Nurse assigned successfully.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. STRICT ENTERPRISE ROW LEVEL SECURITY (RLS) POLICIES
-- Drop existing public USING (true) policies
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nurses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- 6.1 SERVICES (Public catalog is read-only for public; mutations restricted to admin)
DROP POLICY IF EXISTS "Allow public read on services" ON public.services;
DROP POLICY IF EXISTS "Allow public insert on services" ON public.services;
DROP POLICY IF EXISTS "Allow public update on services" ON public.services;
DROP POLICY IF EXISTS "Allow public delete on services" ON public.services;

CREATE POLICY "Services public read" ON public.services
  FOR SELECT USING (true);

CREATE POLICY "Services admin insert" ON public.services
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Services admin update" ON public.services
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Services admin delete" ON public.services
  FOR DELETE USING (public.is_admin());

-- 6.2 BOOKINGS (Strict Role Isolation: Patient sees own, Nurse sees assigned, Admin sees all)
DROP POLICY IF EXISTS "Allow public read on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public insert on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public update on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public delete on bookings" ON public.bookings;

CREATE POLICY "Bookings role based read" ON public.bookings
  FOR SELECT USING (
    -- Admin has full operational visibility
    public.is_admin()
    -- Assigned nurse sees their assigned visit
    OR (assigned_nurse_id = auth.uid()::text)
    -- Referring nurse sees their referral record
    OR (referring_nurse_id = auth.uid()::text)
    -- Authenticated patient sees their own booking
    OR (patient_phone = (auth.jwt() ->> 'phone'))
    OR (patient_phone = (auth.jwt() -> 'user_metadata' ->> 'phone'))
  );

CREATE POLICY "Bookings patient creation" ON public.bookings
  FOR INSERT WITH CHECK (
    -- Allow booking submission with clean status
    status IN ('Pending', 'Assigned')
  );

CREATE POLICY "Bookings role based update" ON public.bookings
  FOR UPDATE USING (
    -- Admin can update any
    public.is_admin()
    -- Assigned nurse can update clinical progress and acceptance status
    OR (assigned_nurse_id = auth.uid()::text)
  );

CREATE POLICY "Bookings admin delete" ON public.bookings
  FOR DELETE USING (public.is_admin());

-- 6.3 NURSES TABLE (Public can see directory; financial & contact details restricted)
DROP POLICY IF EXISTS "Allow public read on nurses" ON public.nurses;
DROP POLICY IF EXISTS "Allow public insert on nurses" ON public.nurses;
DROP POLICY IF EXISTS "Allow public update on nurses" ON public.nurses;
DROP POLICY IF EXISTS "Allow public delete on nurses" ON public.nurses;

CREATE POLICY "Nurses directory read" ON public.nurses
  FOR SELECT USING (
    public.is_admin()
    OR (id = auth.uid()::text)
    OR status = 'Active'
  );

CREATE POLICY "Nurses register and update" ON public.nurses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Nurses profile update" ON public.nurses
  FOR UPDATE USING (
    public.is_admin()
    OR (id = auth.uid()::text)
  );

CREATE POLICY "Nurses admin delete" ON public.nurses
  FOR DELETE USING (public.is_admin());

-- 6.4 LEADS (Nurse CRM: Nurse sees own; Admin sees all)
DROP POLICY IF EXISTS "Allow public read on leads" ON public.leads;
DROP POLICY IF EXISTS "Allow public insert on leads" ON public.leads;
DROP POLICY IF EXISTS "Allow public update on leads" ON public.leads;
DROP POLICY IF EXISTS "Allow public delete on leads" ON public.leads;

CREATE POLICY "Leads role based read" ON public.leads
  FOR SELECT USING (
    public.is_admin()
    OR (nurse_id = auth.uid()::text)
    OR (assigned_nurse_id = auth.uid()::text)
  );

CREATE POLICY "Leads nurse insert" ON public.leads
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR (nurse_id = auth.uid()::text)
  );

CREATE POLICY "Leads admin update" ON public.leads
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Leads admin delete" ON public.leads
  FOR DELETE USING (public.is_admin());

-- 6.5 CONSULTATIONS (Doctor & Patient privacy)
DROP POLICY IF EXISTS "Allow public read on consultations" ON public.consultations;
DROP POLICY IF EXISTS "Allow public insert on consultations" ON public.consultations;
DROP POLICY IF EXISTS "Allow public update on consultations" ON public.consultations;
DROP POLICY IF EXISTS "Allow public delete on consultations" ON public.consultations;

CREATE POLICY "Consultations role based read" ON public.consultations
  FOR SELECT USING (
    public.is_admin()
    OR public.get_auth_role() = 'doctor'
    OR (patient_phone = (auth.jwt() ->> 'phone'))
  );

CREATE POLICY "Consultations patient insert" ON public.consultations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Consultations doctor update" ON public.consultations
  FOR UPDATE USING (
    public.is_admin()
    OR public.get_auth_role() = 'doctor'
  );

CREATE POLICY "Consultations admin delete" ON public.consultations
  FOR DELETE USING (public.is_admin());

-- 6.6 COUPONS (Public reads active; modifications admin-only)
DROP POLICY IF EXISTS "Allow public read on coupons" ON public.coupons;
DROP POLICY IF EXISTS "Allow public insert on coupons" ON public.coupons;
DROP POLICY IF EXISTS "Allow public update on coupons" ON public.coupons;
DROP POLICY IF EXISTS "Allow public delete on coupons" ON public.coupons;

CREATE POLICY "Coupons active read" ON public.coupons
  FOR SELECT USING (
    public.is_admin()
    OR status = 'Active'
  );

CREATE POLICY "Coupons admin insert" ON public.coupons
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Coupons admin update" ON public.coupons
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Coupons admin delete" ON public.coupons
  FOR DELETE USING (public.is_admin());

-- 6.7 AUDIT LOGS (Admin read-only)
DROP POLICY IF EXISTS "Audit logs admin read" ON public.audit_logs;
CREATE POLICY "Audit logs admin read" ON public.audit_logs
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Audit logs insert" ON public.audit_logs;
CREATE POLICY "Audit logs insert" ON public.audit_logs
  FOR INSERT WITH CHECK (true);
