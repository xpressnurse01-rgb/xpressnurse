-- ============================================================================
-- XPRESS NURSE - COUPONS & PROMO ENGINE SCHEMA
-- Table: public.coupons
-- Project: https://ncgugriphhrhvdunluiz.supabase.co
-- ============================================================================

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

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access for web demo & admin panel
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow public read on coupons" ON public.coupons;
    DROP POLICY IF EXISTS "Allow public insert on coupons" ON public.coupons;
    DROP POLICY IF EXISTS "Allow public update on coupons" ON public.coupons;
    DROP POLICY IF EXISTS "Allow public delete on coupons" ON public.coupons;
END
$$;

CREATE POLICY "Allow public read on coupons" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Allow public insert on coupons" ON public.coupons FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on coupons" ON public.coupons FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on coupons" ON public.coupons FOR DELETE USING (true);

-- Enable Supabase Realtime for instant live updates across all sessions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'coupons'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.coupons;
    END IF;
END
$$;

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
