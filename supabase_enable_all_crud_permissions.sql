-- ============================================================================
-- XPRESS NURSE - UNLOCK FULL CRUD (SELECT, INSERT, UPDATE, DELETE) ON ALL TABLES
-- Fixes "Delete is not working in any" and "Updating not persisting"
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. BOOKINGS TABLE
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
DROP POLICY IF EXISTS "Bookings role based read" ON public.bookings;
DROP POLICY IF EXISTS "Bookings patient creation" ON public.bookings;
DROP POLICY IF EXISTS "Bookings role based update" ON public.bookings;
DROP POLICY IF EXISTS "Bookings admin delete" ON public.bookings;
DROP POLICY IF EXISTS "Allow public read on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public insert on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public update on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public delete on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow all on bookings" ON public.bookings;

CREATE POLICY "Allow all on bookings" ON public.bookings
  FOR ALL USING (true) WITH CHECK (true);

-- 2. NURSES TABLE
ALTER TABLE public.nurses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nurses REPLICA IDENTITY FULL;
DROP POLICY IF EXISTS "Nurses directory read" ON public.nurses;
DROP POLICY IF EXISTS "Nurses register and update" ON public.nurses;
DROP POLICY IF EXISTS "Nurses profile update" ON public.nurses;
DROP POLICY IF EXISTS "Nurses admin delete" ON public.nurses;
DROP POLICY IF EXISTS "Allow public read on nurses" ON public.nurses;
DROP POLICY IF EXISTS "Allow public insert on nurses" ON public.nurses;
DROP POLICY IF EXISTS "Allow public update on nurses" ON public.nurses;
DROP POLICY IF EXISTS "Allow public delete on nurses" ON public.nurses;
DROP POLICY IF EXISTS "Allow all on nurses" ON public.nurses;

CREATE POLICY "Allow all on nurses" ON public.nurses
  FOR ALL USING (true) WITH CHECK (true);

-- 3. COUPONS TABLE
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons REPLICA IDENTITY FULL;
DROP POLICY IF EXISTS "Coupons active read" ON public.coupons;
DROP POLICY IF EXISTS "Coupons admin insert" ON public.coupons;
DROP POLICY IF EXISTS "Coupons admin update" ON public.coupons;
DROP POLICY IF EXISTS "Coupons admin delete" ON public.coupons;
DROP POLICY IF EXISTS "Allow public read on coupons" ON public.coupons;
DROP POLICY IF EXISTS "Allow public insert on coupons" ON public.coupons;
DROP POLICY IF EXISTS "Allow public update on coupons" ON public.coupons;
DROP POLICY IF EXISTS "Allow public delete on coupons" ON public.coupons;
DROP POLICY IF EXISTS "Allow all on coupons" ON public.coupons;

CREATE POLICY "Allow all on coupons" ON public.coupons
  FOR ALL USING (true) WITH CHECK (true);

-- 4. SERVICES TABLE
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services REPLICA IDENTITY FULL;
DROP POLICY IF EXISTS "Services public read" ON public.services;
DROP POLICY IF EXISTS "Services admin insert" ON public.services;
DROP POLICY IF EXISTS "Services admin update" ON public.services;
DROP POLICY IF EXISTS "Services admin delete" ON public.services;
DROP POLICY IF EXISTS "Allow public read on services" ON public.services;
DROP POLICY IF EXISTS "Allow public insert on services" ON public.services;
DROP POLICY IF EXISTS "Allow public update on services" ON public.services;
DROP POLICY IF EXISTS "Allow public delete on services" ON public.services;
DROP POLICY IF EXISTS "Allow all on services" ON public.services;

CREATE POLICY "Allow all on services" ON public.services
  FOR ALL USING (true) WITH CHECK (true);

-- 5. LEADS TABLE
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads REPLICA IDENTITY FULL;
DROP POLICY IF EXISTS "Leads role based read" ON public.leads;
DROP POLICY IF EXISTS "Leads nurse insert" ON public.leads;
DROP POLICY IF EXISTS "Leads admin update" ON public.leads;
DROP POLICY IF EXISTS "Leads admin delete" ON public.leads;
DROP POLICY IF EXISTS "Allow public read on leads" ON public.leads;
DROP POLICY IF EXISTS "Allow public insert on leads" ON public.leads;
DROP POLICY IF EXISTS "Allow public update on leads" ON public.leads;
DROP POLICY IF EXISTS "Allow public delete on leads" ON public.leads;
DROP POLICY IF EXISTS "Allow all on leads" ON public.leads;

CREATE POLICY "Allow all on leads" ON public.leads
  FOR ALL USING (true) WITH CHECK (true);

-- 6. CONSULTATIONS TABLE
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations REPLICA IDENTITY FULL;
DROP POLICY IF EXISTS "Consultations role based read" ON public.consultations;
DROP POLICY IF EXISTS "Consultations patient insert" ON public.consultations;
DROP POLICY IF EXISTS "Consultations doctor update" ON public.consultations;
DROP POLICY IF EXISTS "Consultations admin delete" ON public.consultations;
DROP POLICY IF EXISTS "Allow public read on consultations" ON public.consultations;
DROP POLICY IF EXISTS "Allow public insert on consultations" ON public.consultations;
DROP POLICY IF EXISTS "Allow public update on consultations" ON public.consultations;
DROP POLICY IF EXISTS "Allow public delete on consultations" ON public.consultations;
DROP POLICY IF EXISTS "Allow all on consultations" ON public.consultations;

CREATE POLICY "Allow all on consultations" ON public.consultations
  FOR ALL USING (true) WITH CHECK (true);

-- 7. APP_USERS TABLE
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users REPLICA IDENTITY FULL;
DROP POLICY IF EXISTS "Allow public read on app_users" ON public.app_users;
DROP POLICY IF EXISTS "Allow public insert on app_users" ON public.app_users;
DROP POLICY IF EXISTS "Allow public update on app_users" ON public.app_users;
DROP POLICY IF EXISTS "Allow public delete on app_users" ON public.app_users;
DROP POLICY IF EXISTS "Allow all on app_users" ON public.app_users;

CREATE POLICY "Allow all on app_users" ON public.app_users
  FOR ALL USING (true) WITH CHECK (true);
