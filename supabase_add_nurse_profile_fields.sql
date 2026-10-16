-- ============================================================================
-- XPRESSNURSE DATABASE SCHEMA UPDATE: NURSE MARITAL STATUS, DISTRICT, MANDAL & SKILLS
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ============================================================================

-- 1. Add fields to 'nurses' table
DO $$
BEGIN
    -- Marital status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nurses' AND column_name = 'marital_status'
    ) THEN
        ALTER TABLE nurses ADD COLUMN marital_status text DEFAULT 'Single';
    END IF;

    -- City (Hyderabad or Non-Hyderabad)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nurses' AND column_name = 'city'
    ) THEN
        ALTER TABLE nurses ADD COLUMN city text DEFAULT 'Hyderabad';
    END IF;

    -- District
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nurses' AND column_name = 'district'
    ) THEN
        ALTER TABLE nurses ADD COLUMN district text DEFAULT 'Hyderabad';
    END IF;

    -- Mandal
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nurses' AND column_name = 'mandal'
    ) THEN
        ALTER TABLE nurses ADD COLUMN mandal text;
    END IF;

    -- Village
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nurses' AND column_name = 'village'
    ) THEN
        ALTER TABLE nurses ADD COLUMN village text;
    END IF;

    -- Clinical Skills / Procedures known
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nurses' AND column_name = 'skills'
    ) THEN
        ALTER TABLE nurses ADD COLUMN skills jsonb DEFAULT '["IV Cannulation", "Injections", "Foley Replacement", "Ryles Tube Replacement", "Suture Removal", "Enema", "Dressings"]'::jsonb;
    END IF;
END $$;

-- 2. Add fields to 'app_users' table
DO $$
BEGIN
    -- Marital status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_users' AND column_name = 'marital_status'
    ) THEN
        ALTER TABLE app_users ADD COLUMN marital_status text DEFAULT 'Single';
    END IF;

    -- City (Hyderabad or Non-Hyderabad)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_users' AND column_name = 'city'
    ) THEN
        ALTER TABLE app_users ADD COLUMN city text DEFAULT 'Hyderabad';
    END IF;

    -- District
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_users' AND column_name = 'district'
    ) THEN
        ALTER TABLE app_users ADD COLUMN district text DEFAULT 'Hyderabad';
    END IF;

    -- Mandal
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_users' AND column_name = 'mandal'
    ) THEN
        ALTER TABLE app_users ADD COLUMN mandal text;
    END IF;

    -- Village
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_users' AND column_name = 'village'
    ) THEN
        ALTER TABLE app_users ADD COLUMN village text;
    END IF;

    -- Clinical Skills / Procedures known
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_users' AND column_name = 'skills'
    ) THEN
        ALTER TABLE app_users ADD COLUMN skills jsonb DEFAULT '[]'::jsonb;
    END IF;

    -- Council registration number (optional for doctors)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_users' AND column_name = 'council_registration_number'
    ) THEN
        ALTER TABLE app_users ADD COLUMN council_registration_number text;
    END IF;

    -- Certificate URL (for doctors & nurses)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'app_users' AND column_name = 'certificate_url'
    ) THEN
        ALTER TABLE app_users ADD COLUMN certificate_url text;
    END IF;
END $$;

-- Verify columns
SELECT table_name, column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name IN ('nurses', 'app_users') 
  AND column_name IN ('marital_status', 'city', 'district', 'mandal', 'village', 'skills', 'council_registration_number', 'certificate_url')
ORDER BY table_name, column_name;
