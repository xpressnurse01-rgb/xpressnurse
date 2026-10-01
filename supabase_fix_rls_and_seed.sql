-- ============================================================================
-- XPRESS NURSE - FIX RLS PERMISSIONS & SEED INITIAL BOOKINGS & LEADS
-- Run this in Supabase SQL Editor to restore full read/write/delete access for all portals
-- ============================================================================

-- 1. BOOKINGS TABLE (Allow full read, insert, update, delete)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "Allow public read on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public insert on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public update on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public delete on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Bookings role based read" ON public.bookings;
DROP POLICY IF EXISTS "Bookings patient creation" ON public.bookings;
DROP POLICY IF EXISTS "Bookings role based update" ON public.bookings;
DROP POLICY IF EXISTS "Bookings admin delete" ON public.bookings;
DROP POLICY IF EXISTS "Allow all on bookings" ON public.bookings;

CREATE POLICY "Allow all on bookings" ON public.bookings
  FOR ALL USING (true) WITH CHECK (true);

-- 2. NURSES TABLE (Allow full read, insert, update, delete)
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

-- 3. COUPONS TABLE (Allow full read, insert, update, delete)
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

-- 4. SERVICES TABLE (Allow full read, insert, update, delete)
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

-- 5. LEADS TABLE (Allow full read, insert, update, delete)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "Allow public read on leads" ON public.leads;
DROP POLICY IF EXISTS "Allow public insert on leads" ON public.leads;
DROP POLICY IF EXISTS "Allow public update on leads" ON public.leads;
DROP POLICY IF EXISTS "Allow public delete on leads" ON public.leads;
DROP POLICY IF EXISTS "Leads role based read" ON public.leads;
DROP POLICY IF EXISTS "Leads nurse insert" ON public.leads;
DROP POLICY IF EXISTS "Leads admin update" ON public.leads;
DROP POLICY IF EXISTS "Leads admin delete" ON public.leads;
DROP POLICY IF EXISTS "Allow all on leads" ON public.leads;

CREATE POLICY "Allow all on leads" ON public.leads
  FOR ALL USING (true) WITH CHECK (true);

-- 6. CONSULTATIONS TABLE (Allow full read, insert, update, delete)
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "Allow public read on consultations" ON public.consultations;
DROP POLICY IF EXISTS "Allow public insert on consultations" ON public.consultations;
DROP POLICY IF EXISTS "Allow public update on consultations" ON public.consultations;
DROP POLICY IF EXISTS "Allow public delete on consultations" ON public.consultations;
DROP POLICY IF EXISTS "Consultations role based read" ON public.consultations;
DROP POLICY IF EXISTS "Consultations patient insert" ON public.consultations;
DROP POLICY IF EXISTS "Consultations doctor update" ON public.consultations;
DROP POLICY IF EXISTS "Consultations admin delete" ON public.consultations;
DROP POLICY IF EXISTS "Allow all on consultations" ON public.consultations;

CREATE POLICY "Allow all on consultations" ON public.consultations
  FOR ALL USING (true) WITH CHECK (true);

-- 7. APP_USERS TABLE (Allow full read, insert, update, delete)
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "Allow public read on app_users" ON public.app_users;
DROP POLICY IF EXISTS "Allow public insert on app_users" ON public.app_users;
DROP POLICY IF EXISTS "Allow public update on app_users" ON public.app_users;
DROP POLICY IF EXISTS "Allow public delete on app_users" ON public.app_users;
DROP POLICY IF EXISTS "Allow all on app_users" ON public.app_users;

CREATE POLICY "Allow all on app_users" ON public.app_users
  FOR ALL USING (true) WITH CHECK (true);

-- 8. OPTIONAL SEED BOOKINGS (Only inserted if table is empty; DO NOTHING if already exists)
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
  status, 
  assigned_nurse_id, 
  assigned_nurse_name, 
  referring_nurse_id, 
  referring_nurse_name, 
  estimated_fee, 
  night_surcharge, 
  referral_bonus_rupees, 
  notes
) VALUES
(
  'BK-8901', 
  now() - interval '2 hours', 
  'K. Venkatesh Rao (68 yrs, Male)', 
  '98765 43210', 
  68, 
  'Male', 
  'saline-infusion', 
  'IV Infusions & Antibiotics Infusion', 
  'Gachibowli', 
  'Flat 402, Aditya Empress Towers, Gachibowli, Hyderabad', 
  'Today', 
  '11:00 AM - 12:30 PM', 
  true, 
  'Dr_Reddy_IV_Prescription.pdf', 
  'Assigned', 
  'nurse-101', 
  'Nurse Priya Sharma (Gachibowli Area Match)', 
  NULL, 
  NULL, 
  899.00, 
  0.00, 
  0.00, 
  'Normal Saline 500ml post gastroenteritis.'
),
(
  'BK-8902', 
  now() - interval '1 hour', 
  'Smt. Lakshmi Devi (74 yrs, Female)', 
  '97654 32109', 
  74, 
  'Female', 
  'foleys-catheter', 
  'Foley Catheter Replacement', 
  'LB Nagar', 
  'H.No 3-4-12, Near Kamineni Hospital, LB Nagar, Hyderabad', 
  'Today', 
  '02:00 PM - 03:00 PM', 
  true, 
  'Dr_Rao_Urology_Rx.pdf', 
  'Assigned', 
  'nurse-102', 
  'Nurse Rajesh Kumar (LB Nagar Area Match)', 
  'nurse-101', 
  'Nurse Priya Sharma (Gachibowli - 10% Referral)', 
  1299.00, 
  0.00, 
  129.90, 
  'Referred by Nurse Priya from Gachibowli for LB Nagar resident. 10% bonus credited to Priya.'
)
ON CONFLICT (id) DO NOTHING;

-- 9. OPTIONAL SEED LEADS (Only inserted if table is empty; DO NOTHING if already exists)
INSERT INTO public.leads (
  id, 
  nurse_id, 
  patient_name, 
  patient_phone, 
  service_id, 
  area, 
  submitted_at, 
  status, 
  assigned_nurse_id, 
  lead_value_rupees, 
  points_awarded, 
  referral_commission_rupees
) VALUES
(
  'LD-4001', 
  'nurse-101', 
  'Smt. Lakshmi Devi', 
  '97654 32109', 
  'foleys-catheter', 
  'LB Nagar', 
  now() - interval '1 hour', 
  'Converted', 
  'nurse-102', 
  1299.00, 
  50, 
  129.90
)
ON CONFLICT (id) DO NOTHING;
