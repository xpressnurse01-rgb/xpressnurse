-- ============================================================================
-- MODULE 3 OF 3: ENTERPRISE ROW LEVEL SECURITY (RLS) POLICIES
-- Replaces open "USING (true)" policies with least-privilege, role-based controls
-- ============================================================================

-- 3.1 ENABLE RLS ON ALL TABLES
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nurses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3.2 SERVICES TABLE (Public catalog is read-only for public; mutations restricted to admin)
DROP POLICY IF EXISTS "Allow public read on services" ON public.services;
DROP POLICY IF EXISTS "Allow public insert on services" ON public.services;
DROP POLICY IF EXISTS "Allow public update on services" ON public.services;
DROP POLICY IF EXISTS "Allow public delete on services" ON public.services;
DROP POLICY IF EXISTS "Services public read" ON public.services;
DROP POLICY IF EXISTS "Services admin insert" ON public.services;
DROP POLICY IF EXISTS "Services admin update" ON public.services;
DROP POLICY IF EXISTS "Services admin delete" ON public.services;

CREATE POLICY "Services public read" ON public.services
  FOR SELECT USING (true);

CREATE POLICY "Services admin insert" ON public.services
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Services admin update" ON public.services
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Services admin delete" ON public.services
  FOR DELETE USING (public.is_admin());

-- 3.3 BOOKINGS TABLE (Role Isolation: Patient sees own, Nurse sees assigned, Admin sees all)
DROP POLICY IF EXISTS "Allow public read on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public insert on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public update on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public delete on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Bookings role based read" ON public.bookings;
DROP POLICY IF EXISTS "Bookings patient creation" ON public.bookings;
DROP POLICY IF EXISTS "Bookings role based update" ON public.bookings;
DROP POLICY IF EXISTS "Bookings admin delete" ON public.bookings;

CREATE POLICY "Bookings role based read" ON public.bookings
  FOR SELECT USING (
    public.is_admin()
    OR (assigned_nurse_id = auth.uid()::text)
    OR (referring_nurse_id = auth.uid()::text)
    OR (patient_phone = (auth.jwt() ->> 'phone'))
    OR (patient_phone = (auth.jwt() -> 'user_metadata' ->> 'phone'))
  );

CREATE POLICY "Bookings patient creation" ON public.bookings
  FOR INSERT WITH CHECK (
    status IN ('Pending', 'Assigned')
  );

CREATE POLICY "Bookings role based update" ON public.bookings
  FOR UPDATE USING (
    public.is_admin()
    OR (assigned_nurse_id = auth.uid()::text)
  );

CREATE POLICY "Bookings admin delete" ON public.bookings
  FOR DELETE USING (public.is_admin());

-- 3.4 NURSES TABLE (Directory visibility for active nurses; updates restricted to self/admin)
DROP POLICY IF EXISTS "Allow public read on nurses" ON public.nurses;
DROP POLICY IF EXISTS "Allow public insert on nurses" ON public.nurses;
DROP POLICY IF EXISTS "Allow public update on nurses" ON public.nurses;
DROP POLICY IF EXISTS "Allow public delete on nurses" ON public.nurses;
DROP POLICY IF EXISTS "Nurses directory read" ON public.nurses;
DROP POLICY IF EXISTS "Nurses register and update" ON public.nurses;
DROP POLICY IF EXISTS "Nurses profile update" ON public.nurses;
DROP POLICY IF EXISTS "Nurses admin delete" ON public.nurses;

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

-- 3.5 LEADS TABLE (Nurse CRM: Nurse sees own; Admin sees all)
DROP POLICY IF EXISTS "Allow public read on leads" ON public.leads;
DROP POLICY IF EXISTS "Allow public insert on leads" ON public.leads;
DROP POLICY IF EXISTS "Allow public update on leads" ON public.leads;
DROP POLICY IF EXISTS "Allow public delete on leads" ON public.leads;
DROP POLICY IF EXISTS "Leads role based read" ON public.leads;
DROP POLICY IF EXISTS "Leads nurse insert" ON public.leads;
DROP POLICY IF EXISTS "Leads admin update" ON public.leads;
DROP POLICY IF EXISTS "Leads admin delete" ON public.leads;

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

-- 3.6 CONSULTATIONS TABLE (Doctor & Patient privacy)
DROP POLICY IF EXISTS "Allow public read on consultations" ON public.consultations;
DROP POLICY IF EXISTS "Allow public insert on consultations" ON public.consultations;
DROP POLICY IF EXISTS "Allow public update on consultations" ON public.consultations;
DROP POLICY IF EXISTS "Allow public delete on consultations" ON public.consultations;
DROP POLICY IF EXISTS "Consultations role based read" ON public.consultations;
DROP POLICY IF EXISTS "Consultations patient insert" ON public.consultations;
DROP POLICY IF EXISTS "Consultations doctor update" ON public.consultations;
DROP POLICY IF EXISTS "Consultations admin delete" ON public.consultations;

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

-- 3.7 COUPONS TABLE (Public reads active coupons; mutations restricted to admin)
DROP POLICY IF EXISTS "Allow public read on coupons" ON public.coupons;
DROP POLICY IF EXISTS "Allow public insert on coupons" ON public.coupons;
DROP POLICY IF EXISTS "Allow public update on coupons" ON public.coupons;
DROP POLICY IF EXISTS "Allow public delete on coupons" ON public.coupons;
DROP POLICY IF EXISTS "Coupons active read" ON public.coupons;
DROP POLICY IF EXISTS "Coupons admin insert" ON public.coupons;
DROP POLICY IF EXISTS "Coupons admin update" ON public.coupons;
DROP POLICY IF EXISTS "Coupons admin delete" ON public.coupons;

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

-- 3.8 AUDIT LOGS TABLE (Admin read-only; immutable audit trail)
DROP POLICY IF EXISTS "Audit logs admin read" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs insert" ON public.audit_logs;

CREATE POLICY "Audit logs admin read" ON public.audit_logs
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Audit logs insert" ON public.audit_logs
  FOR INSERT WITH CHECK (true);
