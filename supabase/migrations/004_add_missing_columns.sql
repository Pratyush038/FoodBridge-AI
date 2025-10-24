-- Add missing columns to donors and ngos tables
-- Run this if you're getting "Could not find column" errors

-- Check if organization_type column exists in donors table, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'donors' AND column_name = 'organization_type'
    ) THEN
        ALTER TABLE donors ADD COLUMN organization_type TEXT;
        UPDATE donors SET organization_type = 'Restaurant' WHERE organization_type IS NULL;
    END IF;
END $$;

-- Check if organization_type column exists in ngos table, if not add it  
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ngos' AND column_name = 'organization_type'
    ) THEN
        ALTER TABLE ngos ADD COLUMN organization_type TEXT NOT NULL DEFAULT 'Food Distribution';
    END IF;
END $$;

-- Check if organization_name column exists in donors table, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'donors' AND column_name = 'organization_name'
    ) THEN
        ALTER TABLE donors ADD COLUMN organization_name TEXT;
    END IF;
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Verify columns exist
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('donors', 'ngos')
    AND column_name IN ('organization_type', 'organization_name')
ORDER BY table_name, column_name;
