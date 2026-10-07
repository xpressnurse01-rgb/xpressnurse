-- ============================================================================
-- XPRESS NURSE: DATABASE MIGRATION SCRIPT
-- Add 'currently_working_at' column to public.nurses and public.app_users
-- ============================================================================

-- 1. Alter public.nurses table to store where nurse is currently working
ALTER TABLE public.nurses 
ADD COLUMN IF NOT EXISTS currently_working_at text;

-- 2. Alter public.app_users table (optional mirror column for nurse profiles)
ALTER TABLE public.app_users 
ADD COLUMN IF NOT EXISTS currently_working_at text;

-- 3. Update existing records with default if null (optional)
-- UPDATE public.nurses SET currently_working_at = 'Registered Clinical Staff' WHERE currently_working_at IS NULL;

-- 4. Notify PostgREST schema cache to instantly recognize the new column
NOTIFY pgrst, 'reload schema';
