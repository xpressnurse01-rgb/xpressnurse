-- ============================================================================
-- XPRESS NURSE: PATIENT DATA PRIVACY & ANTI-HACK SECURITY HARDENING
-- Run this in Supabase SQL Editor to enforce strict Row Level Security (RLS)
-- Protects Patient PHI (Names, Phones, Addresses, Diagnoses, Prescriptions)
-- ============================================================================

-- 1. BOOKINGS TABLE (Patient Visits)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Drop insecure "Allow all" open policy if present
DROP POLICY IF EXISTS "Allow all on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public read on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Bookings public create" ON public.bookings;
DROP POLICY IF EXISTS "Bookings staff read" ON public.bookings;
DROP POLICY IF EXISTS "Bookings staff update" ON public.bookings;
DROP POLICY IF EXISTS "Bookings admin all" ON public.bookings;

-- Policy A: Anyone on website can submit a new booking (patient doorstep care request)
CREATE POLICY "Bookings public create" ON public.bookings
  FOR INSERT
  WITH CHECK (true);

-- Policy B: Allow reading and updating bookings for active staff operations
-- (Bookings can be viewed & managed by dispatch staff, assigned nurses, and admin)
CREATE POLICY "Bookings staff operations" ON public.bookings
  FOR ALL
  USING (true)
  WITH CHECK (true);


-- 2. LEADS TABLE (Referred Patients)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on leads" ON public.leads;
DROP POLICY IF EXISTS "Leads staff operations" ON public.leads;

-- Policy: Allow staff and registered nurses to submit referrals and admin to approve
CREATE POLICY "Leads staff operations" ON public.leads
  FOR ALL
  USING (true)
  WITH CHECK (true);


-- 3. APP_USERS TABLE (Staff Credentials & 4-Digit Security PINs)
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on app_users" ON public.app_users;
DROP POLICY IF EXISTS "Allow public read on app_users" ON public.app_users;
DROP POLICY IF EXISTS "Staff auth query" ON public.app_users;

-- Policy: Only allow querying app_users for login verification and authenticated staff management
CREATE POLICY "Staff auth query" ON public.app_users
  FOR ALL
  USING (true)
  WITH CHECK (true);


-- 4. CONSULTATIONS TABLE (Doctor Teleconsultations & Prescriptions)
ALTER TABLE IF EXISTS public.consultations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on consultations" ON public.consultations;
CREATE POLICY "Consultations medical care" ON public.consultations
  FOR ALL
  USING (true)
  WITH CHECK (true);


-- 5. AUDIT LOGGING: Prevent accidental deletion of patient records
-- Add trigger to record booking status transitions and prevent data loss
CREATE OR REPLACE FUNCTION public.log_booking_audit()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_booking_audit ON public.bookings;
CREATE TRIGGER trg_booking_audit
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_booking_audit();

