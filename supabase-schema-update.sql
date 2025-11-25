-- ============================================
-- DATABASE SCHEMA UPDATE
-- Add first_name, last_name, middle_name to user_profiles
-- ============================================

-- Step 1: Add new columns to user_profiles table
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS middle_name text;

-- Step 2: Migrate existing data (split 'name' into first_name and last_name)
-- This will try to split existing names - you may want to review this
UPDATE public.user_profiles
SET 
  first_name = CASE 
    WHEN name IS NOT NULL AND name != '' THEN
      CASE 
        WHEN array_length(string_to_array(name, ' '), 1) > 1 THEN
          (string_to_array(name, ' '))[1]
        ELSE name
      END
    ELSE NULL
  END,
  last_name = CASE 
    WHEN name IS NOT NULL AND name != '' AND array_length(string_to_array(name, ' '), 1) > 1 THEN
      array_to_string((string_to_array(name, ' '))[2:], ' ')
    ELSE NULL
  END
WHERE (first_name IS NULL OR last_name IS NULL) AND name IS NOT NULL AND name != '';

-- Step 3: Make first_name and last_name NOT NULL (after migration)
-- Uncomment these lines after verifying the migration worked:
-- ALTER TABLE public.user_profiles
--   ALTER COLUMN first_name SET NOT NULL,
--   ALTER COLUMN last_name SET NOT NULL;

-- Step 4: (Optional) Keep the old 'name' column for backward compatibility
-- Or remove it if you're sure all data has been migrated:
-- ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS name;

-- ============================================
-- VERIFICATION QUERY
-- Run this to check the migration
-- ============================================
-- SELECT id, name, first_name, last_name, middle_name, email 
-- FROM public.user_profiles 
-- LIMIT 10;
