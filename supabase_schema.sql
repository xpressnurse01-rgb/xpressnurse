-- ============================================================================
-- XPRESS NURSE - SUPABASE PRODUCTION DATABASE SCHEMA
-- Exactly aligned with schema definition
-- Tables:
--   1. public.nurses
--   2. public.services
--   3. public.bookings
--   4. public.leads
--   5. public.consultations
--   6. public.coupons
--   7. public.app_users (optional authentication table)
-- ============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. NURSES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nurses (
  id text NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL UNIQUE,
  experience_years integer DEFAULT 5,
  qualification text NOT NULL,
  service_area text NOT NULL,
  status text DEFAULT 'Active'::text,
  total_leads integer DEFAULT 0,
  converted_leads integer DEFAULT 0,
  total_referrals integer DEFAULT 0,
  points_earned integer DEFAULT 300,
  referral_earnings_rupees numeric DEFAULT 0,
  rating numeric DEFAULT 4.90,
  avatar_url text,
  certificate_verified boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT nurses_pkey PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------------
-- 2. SERVICES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.services (
  id text NOT NULL,
  title text NOT NULL,
  subtitle text,
  description text,
  single_visit_price numeric NOT NULL,
  multi_visit_price numeric,
  night_surcharge numeric DEFAULT 399.00,
  prescription_required boolean DEFAULT true,
  duration text,
  icon text,
  badge text,
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT services_pkey PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------------
-- 3. BOOKINGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
  id text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  patient_name text NOT NULL,
  patient_phone text NOT NULL,
  patient_age integer,
  patient_gender text,
  service_id text,
  service_title text NOT NULL,
  area text NOT NULL,
  full_address text NOT NULL,
  preferred_date text,
  preferred_time text,
  has_prescription boolean DEFAULT false,
  prescription_file_name text,
  prescription_url text,
  status text DEFAULT 'Assigned'::text,
  assigned_nurse_id text,
  assigned_nurse_name text,
  referring_nurse_id text,
  referring_nurse_name text,
  estimated_fee numeric DEFAULT 800.00,
  night_surcharge numeric DEFAULT 0.00,
  referral_bonus_rupees numeric DEFAULT 0.00,
  notes text,
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL,
  CONSTRAINT bookings_assigned_nurse_id_fkey FOREIGN KEY (assigned_nurse_id) REFERENCES public.nurses(id) ON DELETE SET NULL,
  CONSTRAINT bookings_referring_nurse_id_fkey FOREIGN KEY (referring_nurse_id) REFERENCES public.nurses(id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- 4. LEADS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
  id text NOT NULL,
  nurse_id text,
  patient_name text NOT NULL,
  patient_phone text NOT NULL,
  service_id text NOT NULL,
  area text NOT NULL,
  submitted_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'Converted'::text,
  assigned_nurse_id text,
  lead_value_rupees numeric DEFAULT 1000.00,
  points_awarded integer DEFAULT 50,
  referral_commission_rupees numeric DEFAULT 100.00,
  CONSTRAINT leads_pkey PRIMARY KEY (id),
  CONSTRAINT leads_nurse_id_fkey FOREIGN KEY (nurse_id) REFERENCES public.nurses(id) ON DELETE SET NULL,
  CONSTRAINT leads_assigned_nurse_id_fkey FOREIGN KEY (assigned_nurse_id) REFERENCES public.nurses(id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- 5. CONSULTATIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consultations (
  id text NOT NULL,
  patient_name text NOT NULL,
  patient_age integer,
  patient_phone text NOT NULL,
  symptoms text NOT NULL,
  area text NOT NULL,
  requested_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'Awaiting Call'::text,
  prescription_issued boolean DEFAULT false,
  prescription_text text,
  recommended_service text,
  CONSTRAINT consultations_pkey PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------------
-- 6. COUPONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
  id text NOT NULL DEFAULT ('CPN-'::text || upper(SUBSTRING(md5((random())::text) FROM 1 FOR 6))),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type = ANY (ARRAY['flat'::text, 'percent'::text])),
  discount_value numeric NOT NULL,
  max_discount numeric,
  min_order_amount numeric DEFAULT 0,
  description text NOT NULL,
  status text DEFAULT 'Active'::text CHECK (status = ANY (ARRAY['Active'::text, 'Inactive'::text, 'Expired'::text])),
  usage_limit integer,
  times_used integer DEFAULT 0,
  valid_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT coupons_pkey PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------------
-- 7. APP USERS / 4-DIGIT PIN AUTHENTICATION TABLE (Optional)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_users (
  id text PRIMARY KEY,
  role text NOT NULL,
  identifier text UNIQUE NOT NULL,
  name text NOT NULL,
  pin varchar(4) NOT NULL,
  phone text,
  email text,
  designation text,
  service_area text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) & PUBLIC ANON ACCESS POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.nurses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Nurses Policies
DROP POLICY IF EXISTS "Allow public read on nurses" ON public.nurses;
CREATE POLICY "Allow public read on nurses" ON public.nurses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on nurses" ON public.nurses;
CREATE POLICY "Allow public insert on nurses" ON public.nurses FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on nurses" ON public.nurses;
CREATE POLICY "Allow public update on nurses" ON public.nurses FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete on nurses" ON public.nurses;
CREATE POLICY "Allow public delete on nurses" ON public.nurses FOR DELETE USING (true);

-- Services Policies
DROP POLICY IF EXISTS "Allow public read on services" ON public.services;
CREATE POLICY "Allow public read on services" ON public.services FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on services" ON public.services;
CREATE POLICY "Allow public insert on services" ON public.services FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on services" ON public.services;
CREATE POLICY "Allow public update on services" ON public.services FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete on services" ON public.services;
CREATE POLICY "Allow public delete on services" ON public.services FOR DELETE USING (true);

-- Bookings Policies
DROP POLICY IF EXISTS "Allow public read on bookings" ON public.bookings;
CREATE POLICY "Allow public read on bookings" ON public.bookings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on bookings" ON public.bookings;
CREATE POLICY "Allow public insert on bookings" ON public.bookings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on bookings" ON public.bookings;
CREATE POLICY "Allow public update on bookings" ON public.bookings FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete on bookings" ON public.bookings;
CREATE POLICY "Allow public delete on bookings" ON public.bookings FOR DELETE USING (true);

-- Leads Policies
DROP POLICY IF EXISTS "Allow public read on leads" ON public.leads;
CREATE POLICY "Allow public read on leads" ON public.leads FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on leads" ON public.leads;
CREATE POLICY "Allow public insert on leads" ON public.leads FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on leads" ON public.leads;
CREATE POLICY "Allow public update on leads" ON public.leads FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete on leads" ON public.leads;
CREATE POLICY "Allow public delete on leads" ON public.leads FOR DELETE USING (true);

-- Consultations Policies
DROP POLICY IF EXISTS "Allow public read on consultations" ON public.consultations;
CREATE POLICY "Allow public read on consultations" ON public.consultations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on consultations" ON public.consultations;
CREATE POLICY "Allow public insert on consultations" ON public.consultations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on consultations" ON public.consultations;
CREATE POLICY "Allow public update on consultations" ON public.consultations FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete on consultations" ON public.consultations;
CREATE POLICY "Allow public delete on consultations" ON public.consultations FOR DELETE USING (true);

-- Coupons Policies
DROP POLICY IF EXISTS "Allow public read on coupons" ON public.coupons;
CREATE POLICY "Allow public read on coupons" ON public.coupons FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on coupons" ON public.coupons;
CREATE POLICY "Allow public insert on coupons" ON public.coupons FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on coupons" ON public.coupons;
CREATE POLICY "Allow public update on coupons" ON public.coupons FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete on coupons" ON public.coupons;
CREATE POLICY "Allow public delete on coupons" ON public.coupons FOR DELETE USING (true);

-- App Users Policies
DROP POLICY IF EXISTS "Allow public read on app_users" ON public.app_users;
CREATE POLICY "Allow public read on app_users" ON public.app_users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on app_users" ON public.app_users;
CREATE POLICY "Allow public insert on app_users" ON public.app_users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on app_users" ON public.app_users;
CREATE POLICY "Allow public update on app_users" ON public.app_users FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete on app_users" ON public.app_users;
CREATE POLICY "Allow public delete on app_users" ON public.app_users FOR DELETE USING (true);

-- ----------------------------------------------------------------------------
-- SEED DATA: OFFICIAL SERVICES CATALOG
-- ----------------------------------------------------------------------------
INSERT INTO public.services (id, title, subtitle, description, single_visit_price, multi_visit_price, night_surcharge, prescription_required, duration, icon, badge, image_url)
VALUES
('saline-infusion', 'IV Infusions & Antibiotics Infusion', 'Safe and hygienic infusion at home, subject to prescription', 'Safe and hygienic infusion at home, subject to prescription and clinical suitability. We will take care of it till disconnect the fluid and secure the line.', 899.00, 699.00, 399.00, true, '45 - 90 mins', 'Droplet', 'High Demand', '/images/services/saline-infusion.jpg'),
('wound-dressing', 'Wound Dressing', 'Professional wound cleaning and dressing according to care plan', 'Post-operative wound care, diabetic foot ulcers, bedsores (pressure ulcers), and traumatic wounds managed with clinical precision.', 800.00, 800.00, 399.00, true, '30 - 45 mins', 'ShieldCheck', 'Popular', '/images/services/wound-dressing.jpg'),
('foleys-catheter', 'Foley Catheter Replacement', 'Insertion / replacement and related nursing care at home', 'Expert urethral catheterization for elderly, bedridden, and post-surgery patients. Minimizes discomfort and protects against CAUTI.', 1299.00, 1299.00, 399.00, true, '30 - 45 mins', 'Activity', NULL, '/images/services/foleys-catheter.jpg'),
('ryles-tube', 'Ryles / Nasogastric Tube Care', 'Selected tube-related nursing care and feeding support', 'Safe insertion and replacement of nasogastric tubes for patients unable to swallow orally or requiring gastric aspiration.', 1299.00, 1299.00, 399.00, true, '30 - 45 mins', 'FileText', NULL, '/images/services/ryles-tube.jpg'),
('suture-removal', 'Suture / Staple Removal', 'Removal according to the treating clinician instructions', 'Save elderly or recovering patients a stressful hospital visit. Certified nurses evaluate incision healing before removing non-absorbable sutures.', 1000.00, 1000.00, 399.00, true, '20 - 30 mins', 'Scissors', 'Quick Service', '/images/services/suture-removal.jpg'),
('injection-administration', 'Injection & Vitals Monitoring', 'Administration of prescribed injections by qualified RNs', 'Intramuscular (IM), Subcutaneous (SC), or IV push injections administered with vitals monitoring and sterile needle handling.', 699.00, 699.00, 399.00, true, '15 - 20 mins', 'Activity', NULL, '/images/services/lab-diagnostics.jpg'),
('doctor-consult', 'Online Doctor Consultation', 'Connect with verified general physicians within 15 minutes', 'Valid digital prescription issued on WhatsApp. Direct coordination with Xpress Nurse visiting team across Hyderabad.', 299.00, 299.00, 0.00, false, '15 - 20 mins', 'Stethoscope', 'Instant Prescription', '/images/services/doctor-consult.jpg'),
('lab-diagnostics', 'Lab Sample Collection at Home', 'Home blood & urine sample collection with NABL reports', 'Complete blood count, lipid profile, HbA1c, liver/kidney function tests collected at home with digital WhatsApp report delivery.', 399.00, 399.00, 0.00, false, '15 - 25 mins', 'TestTube2', NULL, '/images/services/lab-diagnostics.jpg')
ON CONFLICT (id) DO UPDATE SET 
  single_visit_price = EXCLUDED.single_visit_price,
  multi_visit_price = EXCLUDED.multi_visit_price;

-- ----------------------------------------------------------------------------
-- SEED DATA: REGISTERED NURSES FLEET
-- ----------------------------------------------------------------------------
INSERT INTO public.nurses (id, name, phone, email, experience_years, qualification, service_area, status, total_leads, converted_leads, total_referrals, points_earned, referral_earnings_rupees, rating, avatar_url, certificate_verified)
VALUES
('nurse-101', 'Nurse Priya Sharma', '98490 12345', 'priya.nursing@xpressnurse.in', 6, 'B.Sc Nursing (Registered Nurse)', 'Gachibowli', 'Active', 18, 15, 12, 1650, 3800.00, 4.90, 'https://images.unsplash.com/photo-1594824813589-9a25b42d768a?w=150&auto=format&fit=crop&q=80', true),
('nurse-102', 'Nurse Rajesh Kumar', '98490 67890', 'rajesh.nursing@xpressnurse.in', 8, 'General Nursing & Midwifery (GNM)', 'LB Nagar', 'Active', 24, 21, 19, 2200, 5400.00, 4.95, 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80', true),
('nurse-103', 'Nurse Anjali Rao', '98490 45678', 'anjali.rao@xpressnurse.in', 5, 'B.Sc Nursing (Critical Care)', 'Madhapur', 'Active', 14, 11, 9, 1250, 2900.00, 4.88, 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80', true),
('nurse-104', 'Nurse Sunita Reddy', '98490 89123', 'sunita.reddy@xpressnurse.in', 7, 'GNM & Geriatric Care Specialist', 'Banjara Hills', 'Active', 29, 26, 22, 2800, 6700.00, 5.00, 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&auto=format&fit=crop&q=80', true)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- SEED DATA: INITIAL SAMPLE BOOKINGS
-- ----------------------------------------------------------------------------
INSERT INTO public.bookings (id, created_at, patient_name, patient_phone, patient_age, patient_gender, service_id, service_title, area, full_address, preferred_date, preferred_time, has_prescription, prescription_file_name, status, assigned_nurse_id, assigned_nurse_name, referring_nurse_id, referring_nurse_name, estimated_fee, night_surcharge, referral_bonus_rupees, notes)
VALUES
('BK-8901', now() - interval '2 hours', 'K. Venkatesh Rao (68 yrs, Male)', '98765 43210', 68, 'Male', 'saline-infusion', 'IV Infusions & Antibiotics Infusion', 'Gachibowli', 'Flat 402, Aditya Empress Towers, Gachibowli, Hyderabad', 'Today', '11:00 AM - 12:30 PM', true, 'Dr_Reddy_IV_Prescription.pdf', 'Assigned', 'nurse-101', 'Nurse Priya Sharma (Gachibowli Area Match)', NULL, NULL, 899.00, 0.00, 0.00, 'Normal Saline 500ml post gastroenteritis.'),
('BK-8902', now() - interval '1 hour', 'Smt. Lakshmi Devi (74 yrs, Female)', '97654 32109', 74, 'Female', 'foleys-catheter', 'Foley Catheter Replacement', 'LB Nagar', 'H.No 3-4-12, Near Kamineni Hospital, LB Nagar, Hyderabad', 'Today', '02:00 PM - 03:00 PM', true, 'Urology_Catheter_Order.pdf', 'Assigned', 'nurse-102', 'Nurse Rajesh Kumar (LB Nagar Area Match)', 'nurse-101', 'Nurse Priya Sharma (Gachibowli - 10% Referral)', 1299.00, 0.00, 129.90, 'Referred by Nurse Priya from Gachibowli for LB Nagar resident. 10% bonus credited to Priya.'),
('BK-8903', now() - interval '30 mins', 'Arun Kumar (45 yrs, Male)', '96543 21098', 45, 'Male', 'wound-dressing', 'Wound Dressing', 'LB Nagar', 'Villa 18, Golf View, LB Nagar, Hyderabad', 'Tomorrow', '09:00 AM - 10:00 AM', true, 'PostOp_Dressing.pdf', 'Assigned', 'nurse-102', 'Nurse Rajesh Kumar (LB Nagar Area Match)', 'nurse-101', 'Nurse Priya Sharma (Gachibowli - 10% Referral)', 800.00, 0.00, 80.00, 'Post knee arthroscopy dressing change. Referred by Nurse Priya.')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- SEED DATA: SAMPLE NURSE LEADS
-- ----------------------------------------------------------------------------
INSERT INTO public.leads (id, nurse_id, patient_name, patient_phone, service_id, area, submitted_at, status, assigned_nurse_id, lead_value_rupees, points_awarded, referral_commission_rupees)
VALUES
('LD-4001', 'nurse-101', 'Smt. Lakshmi Devi', '97654 32109', 'foleys-catheter', 'LB Nagar', now() - interval '1 hour', 'Converted', 'nurse-102', 1299.00, 50, 129.90),
('LD-4002', 'nurse-101', 'Arun Kumar', '96543 21098', 'wound-dressing', 'LB Nagar', now() - interval '30 mins', 'Converted', 'nurse-102', 800.00, 50, 80.00)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- SEED DATA: SAMPLE DOCTOR CONSULTATIONS
-- ----------------------------------------------------------------------------
INSERT INTO public.consultations (id, patient_name, patient_age, patient_phone, symptoms, area, requested_at, status, prescription_issued, prescription_text, recommended_service)
VALUES
('CNS-5001', 'K. Venkatesh Rao', 68, '98765 43210', 'Mild dehydration & electrolyte depletion following acute gastroenteritis.', 'Gachibowli', now() - interval '2 hours', 'Prescription Issued', true, 'Rx: Normal Saline 0.9% 500ml IV Infusion slowly over 60 mins. Monitor BP & vitals pre/post.', 'saline-infusion'),
('CNS-5002', 'Suresh Babu', 58, '98490 55667', 'Post-op knee arthroscopy dressing replacement & stitch line check.', 'Madhapur', now() - interval '30 mins', 'Awaiting Call', false, '', 'wound-dressing')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- SEED DATA: PROMO COUPONS
-- ----------------------------------------------------------------------------
INSERT INTO public.coupons (id, code, discount_type, discount_value, max_discount, min_order_amount, description, status, usage_limit, times_used, valid_until)
VALUES
('CPN-FIRST100', 'FIRST100', 'flat', 100.00, NULL, 500.00, 'Flat ₹100 instant off on your first home visit in Hyderabad', 'Active', 1000, 38, now() + interval '90 days'),
('CPN-CARE15', 'CARE15', 'percent', 15.00, 200.00, 600.00, '15% off up to ₹200 on all clinical nursing procedures', 'Active', 500, 24, now() + interval '60 days'),
('CPN-SENIOR20', 'SENIOR20', 'percent', 20.00, 250.00, 700.00, '20% off up to ₹250 dedicated to senior citizen care', 'Active', 500, 19, now() + interval '120 days'),
('CPN-HYD50', 'HYD50', 'flat', 50.00, NULL, 300.00, 'Flat ₹50 quick discount across all Hyderabad zones', 'Active', 2000, 85, now() + interval '30 days'),
('CPN-HYDCARE150', 'HYDCARE150', 'flat', 150.00, NULL, 1000.00, 'Special ₹150 off on critical procedures & catheter/tube care', 'Active', 200, 12, now() + interval '45 days'),
('CPN-WELCOME50', 'WELCOME50', 'percent', 10.00, 100.00, 400.00, '10% welcome bonus for all new patient registrations', 'Active', 1000, 42, now() + interval '180 days')
ON CONFLICT (code) DO UPDATE SET
  discount_value = EXCLUDED.discount_value,
  max_discount = EXCLUDED.max_discount,
  min_order_amount = EXCLUDED.min_order_amount,
  description = EXCLUDED.description,
  status = EXCLUDED.status;

-- ----------------------------------------------------------------------------
-- SEED DATA: 4-DIGIT PIN APP USERS (Optional Table)
-- ----------------------------------------------------------------------------
INSERT INTO public.app_users (id, role, identifier, name, pin, phone, email, designation, service_area)
VALUES
  ('user-admin-1', 'admin', 'admin@xpressnurse.in', 'Operations Dispatcher', '2026', '7569657371', 'admin@xpressnurse.in', 'Fleet Supervisor & Dispatch Head', 'Hyderabad HQ'),
  ('user-doc-1', 'doctor', 'dr.reddy@xpressnurse.in', 'Dr. K. V. Reddy (MD Gen Med)', '4321', '9848011223', 'dr.reddy@xpressnurse.in', 'Senior Physician', 'Hyderabad Tele-Care'),
  ('user-nurse-101', 'nurse', 'priya.nursing@xpressnurse.in', 'Nurse Priya Sharma', '1001', '9849012345', 'priya.nursing@xpressnurse.in', 'Registered Nurse (B.Sc Nursing)', 'Gachibowli'),
  ('user-nurse-102', 'nurse', 'rajesh.nursing@xpressnurse.in', 'Nurse Rajesh Kumar', '1002', '9849067890', 'rajesh.nursing@xpressnurse.in', 'General Nursing & Midwifery (GNM)', 'LB Nagar'),
  ('user-nurse-103', 'nurse', 'anjali.rao@xpressnurse.in', 'Nurse Anjali Rao', '1003', '9849045678', 'anjali.rao@xpressnurse.in', 'Critical Care Nurse', 'Madhapur'),
  ('user-nurse-104', 'nurse', 'sunita.reddy@xpressnurse.in', 'Nurse Sunita Reddy', '1004', '9849089123', 'sunita.reddy@xpressnurse.in', 'Geriatric Care Specialist', 'Banjara Hills')
ON CONFLICT (id) DO UPDATE SET
  pin = EXCLUDED.pin,
  identifier = EXCLUDED.identifier,
  name = EXCLUDED.name,
  role = EXCLUDED.role;
