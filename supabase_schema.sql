-- ============================================================================
-- XPRESS NURSE - SUPABASE DATABASE SCHEMA
-- Project: https://ncgugriphhrhvdunluiz.supabase.co
-- Features: 
--   1. Services Catalog with PDF pricing (IV, Catheter, Dressing, etc.)
--   2. Registered Nursing Fleet (Gachibowli, LB Nagar, Madhapur, etc.)
--   3. Patient Bookings & Records
--   4. Cross-Area Nurse Referrals & 10% Benefit / Points Ledger
--   5. Doctor Teleconsultations & Digital Prescriptions
-- ============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. NURSES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nurses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    experience_years INTEGER DEFAULT 5,
    qualification TEXT NOT NULL,
    service_area TEXT NOT NULL, -- 'Gachibowli', 'LB Nagar', 'Madhapur', etc.
    status TEXT DEFAULT 'Active', -- 'Active', 'Pending Verification', 'On Leave'
    total_leads INTEGER DEFAULT 0,
    converted_leads INTEGER DEFAULT 0,
    total_referrals INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 300, -- Initial login: 300 points
    referral_earnings_rupees NUMERIC(10, 2) DEFAULT 0, -- 10% commission
    rating NUMERIC(3, 2) DEFAULT 4.90,
    avatar_url TEXT,
    certificate_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. SERVICES TABLE (Pricing as per official PDF guidelines)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.services (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    single_visit_price NUMERIC(10, 2) NOT NULL,
    multi_visit_price NUMERIC(10, 2),
    night_surcharge NUMERIC(10, 2) DEFAULT 399.00, -- ₹399 after 9pm
    prescription_required BOOLEAN DEFAULT TRUE,
    duration TEXT,
    icon TEXT,
    badge TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. BOOKINGS TABLE (Records & Patient Appointments)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    patient_age INTEGER,
    patient_gender TEXT,
    service_id TEXT REFERENCES public.services(id) ON DELETE SET NULL,
    service_title TEXT NOT NULL,
    area TEXT NOT NULL, -- e.g. 'LB Nagar', 'Gachibowli'
    full_address TEXT NOT NULL,
    preferred_date TEXT,
    preferred_time TEXT,
    has_prescription BOOLEAN DEFAULT FALSE,
    prescription_file_name TEXT,
    prescription_url TEXT,
    status TEXT DEFAULT 'Assigned', -- 'Pending', 'Assigned', 'In-Progress', 'Completed', 'Cancelled'
    assigned_nurse_id TEXT REFERENCES public.nurses(id) ON DELETE SET NULL,
    assigned_nurse_name TEXT,
    referring_nurse_id TEXT REFERENCES public.nurses(id) ON DELETE SET NULL,
    referring_nurse_name TEXT,
    estimated_fee NUMERIC(10, 2) DEFAULT 800.00,
    night_surcharge NUMERIC(10, 2) DEFAULT 0.00,
    referral_bonus_rupees NUMERIC(10, 2) DEFAULT 0.00, -- 10% referral credit
    notes TEXT
);

-- ----------------------------------------------------------------------------
-- 4. NURSE LEADS & REFERRALS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
    id TEXT PRIMARY KEY,
    nurse_id TEXT REFERENCES public.nurses(id) ON DELETE CASCADE, -- Referring Nurse
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    service_id TEXT NOT NULL,
    area TEXT NOT NULL, -- Target patient area (e.g. 'LB Nagar')
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'Converted', -- 'Submitted', 'Assigned', 'Converted', 'Lost'
    assigned_nurse_id TEXT REFERENCES public.nurses(id) ON DELETE SET NULL, -- Assigned executing nurse
    lead_value_rupees NUMERIC(10, 2) DEFAULT 1000.00,
    points_awarded INTEGER DEFAULT 50, -- 50 points per milestone / referral
    referral_commission_rupees NUMERIC(10, 2) DEFAULT 100.00 -- 10% of lead value
);

-- ----------------------------------------------------------------------------
-- 5. DOCTOR CONSULTATIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consultations (
    id TEXT PRIMARY KEY,
    patient_name TEXT NOT NULL,
    patient_age INTEGER,
    patient_phone TEXT NOT NULL,
    symptoms TEXT NOT NULL,
    area TEXT NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'Awaiting Call', -- 'Awaiting Call', 'Prescription Issued', 'Completed'
    prescription_issued BOOLEAN DEFAULT FALSE,
    prescription_text TEXT,
    recommended_service TEXT
);

-- ----------------------------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY (RLS) & OPEN ACCESS FOR ANON
-- ----------------------------------------------------------------------------
ALTER TABLE public.nurses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

-- Allow anon public full read/write access for web demo
CREATE POLICY "Allow public read on nurses" ON public.nurses FOR SELECT USING (true);
CREATE POLICY "Allow public insert on nurses" ON public.nurses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on nurses" ON public.nurses FOR UPDATE USING (true);

CREATE POLICY "Allow public read on services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Allow public insert on services" ON public.services FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on services" ON public.services FOR UPDATE USING (true);

CREATE POLICY "Allow public read on bookings" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Allow public insert on bookings" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on bookings" ON public.bookings FOR UPDATE USING (true);

CREATE POLICY "Allow public read on leads" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Allow public insert on leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on leads" ON public.leads FOR UPDATE USING (true);

CREATE POLICY "Allow public read on consultations" ON public.consultations FOR SELECT USING (true);
CREATE POLICY "Allow public insert on consultations" ON public.consultations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on consultations" ON public.consultations FOR UPDATE USING (true);

-- ----------------------------------------------------------------------------
-- SEED DATA: OFFICIAL SERVICES & PRICING (FROM PDF)
-- ----------------------------------------------------------------------------
INSERT INTO public.services (id, title, subtitle, description, single_visit_price, multi_visit_price, night_surcharge, prescription_required, duration, icon, badge, image_url)
VALUES
('saline-infusion', 'IV Infusions & Antibiotics Infusion', 'Safe and hygienic infusion at home, subject to prescription', 'Safe and hygienic infusion at home, subject to prescription and clinical suitability. We will take care of it till disconnect the fluid and secure the line.', 899.00, 699.00, 399.00, TRUE, '45 - 90 mins', 'Droplet', 'High Demand', '/images/services/saline-infusion.jpg'),
('wound-dressing', 'Wound Dressing', 'Professional wound cleaning and dressing according to care plan', 'Post-operative wound care, diabetic foot ulcers, bedsores (pressure ulcers), and traumatic wounds managed with clinical precision.', 800.00, 800.00, 399.00, TRUE, '30 - 45 mins', 'ShieldCheck', 'Popular', '/images/services/wound-dressing.jpg'),
('foleys-catheter', 'Foley Catheter Replacement', 'Insertion / replacement and related nursing care at home', 'Expert urethral catheterization for elderly, bedridden, and post-surgery patients. Minimizes discomfort and protects against CAUTI.', 1299.00, 1299.00, 399.00, TRUE, '30 - 45 mins', 'Activity', NULL, '/images/services/foleys-catheter.jpg'),
('ryles-tube', 'Ryles / Nasogastric Tube Care', 'Selected tube-related nursing care and feeding support', 'Safe insertion and replacement of nasogastric tubes for patients unable to swallow orally or requiring gastric aspiration.', 1299.00, 1299.00, 399.00, TRUE, '30 - 45 mins', 'FileText', NULL, '/images/services/ryles-tube.jpg'),
('suture-removal', 'Suture / Staple Removal', 'Removal according to the treating clinician instructions', 'Save elderly or recovering patients a stressful hospital visit. Certified nurses evaluate incision healing before removing non-absorbable sutures.', 1000.00, 1000.00, 399.00, TRUE, '20 - 30 mins', 'Scissors', 'Quick Service', '/images/services/suture-removal.jpg'),
('injection-administration', 'Injection & Vitals Monitoring', 'Administration of prescribed injections by qualified RNs', 'Intramuscular (IM), Subcutaneous (SC), or IV push injections administered with vitals monitoring and sterile needle handling.', 699.00, 699.00, 399.00, TRUE, '15 - 20 mins', 'Activity', NULL, '/images/services/lab-diagnostics.jpg'),
('doctor-consult', 'Online Doctor Consultation', 'Connect with verified general physicians within 15 minutes', 'Valid digital prescription issued on WhatsApp. Direct coordination with Xpress Nurse visiting team across Hyderabad.', 299.00, 299.00, 0.00, FALSE, '15 - 20 mins', 'Stethoscope', 'Instant Prescription', '/images/services/doctor-consult.jpg'),
('lab-diagnostics', 'Lab Sample Collection at Home', 'Home blood & urine sample collection with NABL reports', 'Complete blood count, lipid profile, HbA1c, liver/kidney function tests collected at home with digital WhatsApp report delivery.', 399.00, 399.00, 0.00, FALSE, '15 - 25 mins', 'TestTube2', NULL, '/images/services/lab-diagnostics.jpg')
ON CONFLICT (id) DO UPDATE SET 
    single_visit_price = EXCLUDED.single_visit_price,
    multi_visit_price = EXCLUDED.multi_visit_price;

-- ----------------------------------------------------------------------------
-- SEED DATA: REGISTERED NURSES FLEET (ACROSS HYDERABAD ZONES)
-- ----------------------------------------------------------------------------
INSERT INTO public.nurses (id, name, phone, email, experience_years, qualification, service_area, status, total_leads, converted_leads, total_referrals, points_earned, referral_earnings_rupees, rating, avatar_url, certificate_verified)
VALUES
('nurse-101', 'Nurse Priya Sharma', '98490 12345', 'priya.nursing@xpressnurse.in', 6, 'B.Sc Nursing (Registered Nurse)', 'Gachibowli', 'Active', 18, 15, 12, 1650, 3800.00, 4.90, 'https://images.unsplash.com/photo-1594824813589-9a25b42d768a?w=150&auto=format&fit=crop&q=80', TRUE),
('nurse-102', 'Nurse Rajesh Kumar', '98490 67890', 'rajesh.nursing@xpressnurse.in', 8, 'General Nursing & Midwifery (GNM)', 'LB Nagar', 'Active', 24, 21, 19, 2200, 5400.00, 4.95, 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80', TRUE),
('nurse-103', 'Nurse Anjali Rao', '98490 45678', 'anjali.rao@xpressnurse.in', 5, 'B.Sc Nursing (Critical Care)', 'Madhapur', 'Active', 14, 11, 9, 1250, 2900.00, 4.88, 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80', TRUE),
('nurse-104', 'Nurse Sunita Reddy', '98490 89123', 'sunita.reddy@xpressnurse.in', 7, 'GNM & Geriatric Care Specialist', 'Banjara Hills', 'Active', 29, 26, 22, 2800, 6700.00, 5.00, 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&auto=format&fit=crop&q=80', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- SEED DATA: SAMPLE CROSS-AREA REFERRAL BOOKINGS
-- e.g. Nurse Priya (Gachibowli) referred LB Nagar patient -> Assigned to Nurse Rajesh (LB Nagar)
-- ----------------------------------------------------------------------------
INSERT INTO public.bookings (id, created_at, patient_name, patient_phone, patient_age, patient_gender, service_id, service_title, area, full_address, preferred_date, preferred_time, has_prescription, prescription_file_name, status, assigned_nurse_id, assigned_nurse_name, referring_nurse_id, referring_nurse_name, estimated_fee, referral_bonus_rupees, notes)
VALUES
('BK-8901', NOW() - INTERVAL '2 hours', 'K. Venkatesh Rao (68 yrs)', '98765 43210', 68, 'Male', 'saline-infusion', 'IV Infusions & Antibiotics Infusion', 'Gachibowli', 'Flat 402, Aditya Empress Towers, Gachibowli, Hyderabad', 'Today', '11:00 AM - 12:30 PM', TRUE, 'Dr_Reddy_IV_Prescription.pdf', 'Assigned', 'nurse-101', 'Nurse Priya Sharma (Gachibowli Area Match)', NULL, NULL, 899.00, 0.00, 'Normal Saline 500ml post gastroenteritis.'),
('BK-8902', NOW() - INTERVAL '1 hour', 'Smt. Lakshmi Devi (74 yrs)', '97654 32109', 74, 'Female', 'foleys-catheter', 'Foley Catheter Replacement', 'LB Nagar', 'H.No 3-4-12, Near Kamineni Hospital, LB Nagar, Hyderabad', 'Today', '02:00 PM - 03:00 PM', TRUE, 'Urology_Catheter_Order.pdf', 'Assigned', 'nurse-102', 'Nurse Rajesh Kumar (LB Nagar Area Match)', 'nurse-101', 'Nurse Priya Sharma (Gachibowli - 10% Referral)', 1299.00, 129.90, 'Referred by Nurse Priya from Gachibowli for LB Nagar resident. 10% bonus credited to Priya.'),
('BK-8903', NOW() - INTERVAL '30 mins', 'Arun Kumar (45 yrs)', '96543 21098', 45, 'Male', 'wound-dressing', 'Wound Dressing', 'LB Nagar', 'Villa 18, Golf View, LB Nagar, Hyderabad', 'Tomorrow', '09:00 AM - 10:00 AM', TRUE, 'PostOp_Dressing.pdf', 'Assigned', 'nurse-102', 'Nurse Rajesh Kumar (LB Nagar Area Match)', 'nurse-101', 'Nurse Priya Sharma (Gachibowli - 10% Referral)', 800.00, 80.00, 'Post knee arthroscopy dressing change. Referred by Nurse Priya.')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. APP USERS / 4-DIGIT PIN AUTHENTICATION TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_users (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL, -- 'patient', 'nurse', 'doctor', 'admin'
    identifier TEXT UNIQUE NOT NULL, -- staff email or 10-digit mobile number
    name TEXT NOT NULL,
    pin VARCHAR(4) NOT NULL, -- 4-digit numeric PIN
    phone TEXT,
    email TEXT,
    designation TEXT,
    service_area TEXT, -- e.g. 'Gachibowli', 'LB Nagar'
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on app_users" ON public.app_users FOR SELECT USING (true);
CREATE POLICY "Allow public insert on app_users" ON public.app_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on app_users" ON public.app_users FOR UPDATE USING (true);

-- Seed app users with 4-digit PINs
INSERT INTO public.app_users (id, role, identifier, name, pin, phone, email, designation, service_area)
VALUES
  -- Admin (PIN: 2026)
  ('user-admin-1', 'admin', 'admin@xpressnurse.in', 'Operations Dispatcher', '2026', '7569657371', 'admin@xpressnurse.in', 'Fleet Supervisor & Dispatch Head', 'Hyderabad HQ'),
  
  -- Doctor (PIN: 4321)
  ('user-doc-1', 'doctor', 'dr.reddy@xpressnurse.in', 'Dr. K. V. Reddy (MD Gen Med)', '4321', '9848011223', 'dr.reddy@xpressnurse.in', 'Senior Physician', 'Hyderabad Tele-Care'),

  -- Nurses (PIN: 1001, 1002, 1003, 1004)
  ('user-nurse-101', 'nurse', 'priya.nursing@xpressnurse.in', 'Nurse Priya Sharma', '1001', '9849012345', 'priya.nursing@xpressnurse.in', 'Registered Nurse (B.Sc Nursing)', 'Gachibowli'),
  ('user-nurse-102', 'nurse', 'rajesh.nursing@xpressnurse.in', 'Nurse Rajesh Kumar', '1002', '9849067890', 'rajesh.nursing@xpressnurse.in', 'General Nursing & Midwifery (GNM)', 'LB Nagar'),
  ('user-nurse-103', 'nurse', 'anjali.rao@xpressnurse.in', 'Nurse Anjali Rao', '1003', '9849045678', 'anjali.rao@xpressnurse.in', 'Critical Care Nurse', 'Madhapur'),
  ('user-nurse-104', 'nurse', 'sunita.reddy@xpressnurse.in', 'Nurse Sunita Reddy', '1004', '9849089123', 'sunita.reddy@xpressnurse.in', 'Geriatric Care Specialist', 'Banjara Hills'),

  -- Patients (PIN: 7569, 8899, 1234)
  ('user-pat-1', 'patient', '9876543210', 'K. Venkatesh Rao', '7569', '9876543210', 'venkatesh.rao@example.com', 'Patient / Caregiver', 'Gachibowli'),
  ('user-pat-2', 'patient', '9765432109', 'Smt. Lakshmi Devi', '8899', '9765432109', 'lakshmi.care@example.com', 'Patient / Caregiver', 'LB Nagar'),
  ('user-pat-3', 'patient', '9654321098', 'Arun Kumar', '1234', '9654321098', 'arun.k@example.com', 'Patient', 'LB Nagar')
ON CONFLICT (id) DO UPDATE SET
  pin = EXCLUDED.pin,
  identifier = EXCLUDED.identifier,
  name = EXCLUDED.name,
  role = EXCLUDED.role;

-- ----------------------------------------------------------------------------
-- 7. COUPONS & PROMO CODES ENGINE TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
    id TEXT PRIMARY KEY DEFAULT ('CPN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6))),
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('flat', 'percent')),
    discount_value NUMERIC(10, 2) NOT NULL,
    max_discount NUMERIC(10, 2),
    min_order_amount NUMERIC(10, 2) DEFAULT 0,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Expired')),
    usage_limit INTEGER,
    times_used INTEGER DEFAULT 0,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on coupons" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Allow public insert on coupons" ON public.coupons FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on coupons" ON public.coupons FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on coupons" ON public.coupons FOR DELETE USING (true);

-- Seed default coupons
INSERT INTO public.coupons (id, code, discount_type, discount_value, max_discount, min_order_amount, description, status, usage_limit, times_used, valid_until)
VALUES
('CPN-FIRST100', 'FIRST100', 'flat', 100.00, NULL, 500.00, 'Flat ₹100 instant off on your first home visit in Hyderabad', 'Active', 1000, 38, NOW() + INTERVAL '90 days'),
('CPN-CARE15', 'CARE15', 'percent', 15.00, 200.00, 600.00, '15% off up to ₹200 on all clinical nursing procedures', 'Active', 500, 24, NOW() + INTERVAL '60 days'),
('CPN-SENIOR20', 'SENIOR20', 'percent', 20.00, 250.00, 700.00, '20% off up to ₹250 dedicated to senior citizen care', 'Active', 500, 19, NOW() + INTERVAL '120 days'),
('CPN-HYD50', 'HYD50', 'flat', 50.00, NULL, 300.00, 'Flat ₹50 quick discount across all Hyderabad zones', 'Active', 2000, 85, NOW() + INTERVAL '30 days'),
('CPN-HYDCARE150', 'HYDCARE150', 'flat', 150.00, NULL, 1000.00, 'Special ₹150 off on critical procedures & catheter/tube care', 'Active', 200, 12, NOW() + INTERVAL '45 days'),
('CPN-WELCOME50', 'WELCOME50', 'percent', 10.00, 100.00, 400.00, '10% welcome bonus for all new patient registrations', 'Active', 1000, 42, NOW() + INTERVAL '180 days')
ON CONFLICT (code) DO UPDATE SET
    discount_value = EXCLUDED.discount_value,
    max_discount = EXCLUDED.max_discount,
    min_order_amount = EXCLUDED.min_order_amount,
    description = EXCLUDED.description,
    status = EXCLUDED.status;

