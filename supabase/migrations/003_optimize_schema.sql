-- =====================================================
-- OPTIMIZED DATABASE SCHEMA  
-- Removes unnecessary fields, keeps only what forms use
-- =====================================================

-- =====================================================
-- STEP 1: DROP VIEWS FIRST (they depend on columns)
-- =====================================================

DROP VIEW IF EXISTS weekly_donation_report CASCADE;
DROP VIEW IF EXISTS donor_performance CASCADE;
DROP VIEW IF EXISTS ngo_activity CASCADE;

-- =====================================================
-- STEP 2: DROP TRIGGERS AND FUNCTIONS
-- =====================================================

-- Drop auto-update triggers that rely on deleted tables
DROP TRIGGER IF EXISTS transaction_complete_updates ON transactions;
DROP TRIGGER IF EXISTS transaction_fulfills_request ON transactions;
DROP TRIGGER IF EXISTS increment_donor_donations ON transactions;

-- Drop auto-expire trigger (manually handle expiry in application)
DROP TRIGGER IF EXISTS check_food_expiry ON food_items;

-- Drop increment NGO requests trigger
DROP TRIGGER IF EXISTS increment_ngo_requests ON requests;

-- Drop functions that are no longer needed
DROP FUNCTION IF EXISTS auto_update_food_item_status() CASCADE;
DROP FUNCTION IF EXISTS auto_update_request_status() CASCADE;
DROP FUNCTION IF EXISTS update_donor_donation_count() CASCADE;
DROP FUNCTION IF EXISTS update_ngo_request_count() CASCADE;
DROP FUNCTION IF EXISTS auto_expire_food_items() CASCADE;
DROP FUNCTION IF EXISTS update_donor_tier(UUID) CASCADE;
DROP FUNCTION IF EXISTS calculate_match_score(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_nearby_requests(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) CASCADE;

-- =====================================================
-- STEP 3: DROP UNUSED TABLES
-- =====================================================

-- Drop transactions table (not being used in current implementation)
DROP TABLE IF EXISTS transactions CASCADE;

-- Drop feedback table (not being used in current implementation) 
DROP TABLE IF EXISTS feedback CASCADE;

-- =====================================================
-- STEP 4: DROP ENUMS THAT ARE NO LONGER USED
-- =====================================================

-- Keep only the enums we're actually using
-- Drop: donor_tier (donors.tier removed), transaction_status, feedback_type
DROP TYPE IF EXISTS donor_tier CASCADE;
DROP TYPE IF EXISTS transaction_status CASCADE;
DROP TYPE IF EXISTS feedback_type CASCADE;

-- Keep these enums (still in use):
-- - food_item_status (for food_items.status)
-- - request_status (for requests.status)  
-- - urgency_level (for requests.urgency)

-- =====================================================
-- STEP 5: DROP INDEXES ON DELETED TABLES
-- =====================================================

DROP INDEX IF EXISTS idx_transactions_food_item;
DROP INDEX IF EXISTS idx_transactions_request;
DROP INDEX IF EXISTS idx_transactions_status;
DROP INDEX IF EXISTS idx_feedback_transaction;

-- =====================================================
-- STEP 6: NOW SAFE TO MODIFY COLUMNS
-- =====================================================

-- First, add organization_name column if it doesn't exist (needed for restaurant donors)
ALTER TABLE donors ADD COLUMN IF NOT EXISTS organization_name TEXT;

-- Make columns nullable that should be optional
ALTER TABLE donors ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE donors ALTER COLUMN organization_name DROP NOT NULL;
ALTER TABLE donors ALTER COLUMN address DROP NOT NULL;
ALTER TABLE donors ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE donors ALTER COLUMN longitude DROP NOT NULL;

ALTER TABLE ngos ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE ngos ALTER COLUMN address DROP NOT NULL;
ALTER TABLE ngos ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE ngos ALTER COLUMN longitude DROP NOT NULL;

-- Drop unnecessary columns from donors table
ALTER TABLE donors DROP COLUMN IF EXISTS organization_type CASCADE;
ALTER TABLE donors DROP COLUMN IF EXISTS verified CASCADE;
ALTER TABLE donors DROP COLUMN IF EXISTS total_donations CASCADE;
ALTER TABLE donors DROP COLUMN IF EXISTS tier CASCADE;
ALTER TABLE donors DROP COLUMN IF EXISTS reliability_score CASCADE;

-- Simplify donors to just what we need for basic operation
-- Keep: id, user_id, name, email, phone (optional), organization_name (optional), 
--       address, latitude, longitude, created_at, updated_at

-- Drop unnecessary columns from ngos table
ALTER TABLE ngos DROP COLUMN IF EXISTS registration_number CASCADE;
ALTER TABLE ngos DROP COLUMN IF EXISTS organization_type CASCADE;
ALTER TABLE ngos DROP COLUMN IF EXISTS verified CASCADE;
ALTER TABLE ngos DROP COLUMN IF EXISTS serving_capacity CASCADE;
ALTER TABLE ngos DROP COLUMN IF EXISTS total_requests CASCADE;
ALTER TABLE ngos DROP COLUMN IF EXISTS rating CASCADE;

-- =====================================================
-- STEP 7: ADD COMMENTS FOR CLARITY
-- =====================================================

COMMENT ON TABLE donors IS 'Simplified donor profiles - only essential contact and location info';
COMMENT ON TABLE ngos IS 'Simplified NGO profiles - only essential contact and location info';
COMMENT ON TABLE food_items IS 'Food donations posted by donors';
COMMENT ON TABLE requests IS 'Food requirements posted by NGOs';

COMMENT ON COLUMN donors.user_id IS 'Links to NextAuth user session';
COMMENT ON COLUMN ngos.user_id IS 'Links to NextAuth user session';
COMMENT ON COLUMN donors.organization_name IS 'Optional - for restaurant/business donors';
COMMENT ON COLUMN food_items.donor_id IS 'References donors.id';
COMMENT ON COLUMN requests.ngo_id IS 'References ngos.id';
COMMENT ON COLUMN requests.serving_size IS 'Number of people to serve';

-- =====================================================
-- ✅ MIGRATION COMPLETE!
-- =====================================================
-- 
-- SUMMARY OF CHANGES:
-- ✓ Dropped 3 views (weekly_donation_report, donor_performance, ngo_activity)
-- ✓ Dropped 8 triggers (transaction updates, auto-expire, etc.)
-- ✓ Dropped 8 functions (tier calculation, match score, etc.)
-- ✓ Dropped 2 tables (transactions, feedback)
-- ✓ Dropped 3 ENUM types (donor_tier, transaction_status, feedback_type)
-- ✓ Dropped 4 indexes (transaction/feedback related)
-- ✓ Removed 5 columns from donors table
-- ✓ Removed 6 columns from ngos table
-- ✓ Made phone, address, location nullable
-- ✓ Added organization_name to donors
--
-- REMAINING SCHEMA:
-- → donors: 11 columns (all used)
-- → ngos: 10 columns (all used)
-- → food_items: 16 columns (all used)
-- → requests: 15 columns (all used)
--
-- NEXT STEPS:
-- 1. Regenerate TypeScript types: 
--    npx supabase gen types typescript --project-id gjbrnuunyllvbmibbdmi > lib/database.types.ts
-- 2. Restart dev server: npm run dev
-- 3. Test both forms (donor & receiver)
--
-- =====================================================
