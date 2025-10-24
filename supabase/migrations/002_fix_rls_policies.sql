-- FIX: Disable RLS or make it more permissive for NextAuth
-- Run this in Supabase SQL Editor to fix the RLS policy issues

-- Option 1: Temporarily DISABLE RLS (Quick Fix - Use for Development)
-- Uncomment these lines to completely disable RLS:

ALTER TABLE donors DISABLE ROW LEVEL SECURITY;
ALTER TABLE ngos DISABLE ROW LEVEL SECURITY;
ALTER TABLE food_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE feedback DISABLE ROW LEVEL SECURITY;

-- Drop existing policies that rely on auth.uid()
DROP POLICY IF EXISTS "Donors can view their own data" ON donors;
DROP POLICY IF EXISTS "Donors can update their own data" ON donors;
DROP POLICY IF EXISTS "Anyone can create donor profile" ON donors;
DROP POLICY IF EXISTS "NGOs can view their own data" ON ngos;
DROP POLICY IF EXISTS "NGOs can update their own data" ON ngos;
DROP POLICY IF EXISTS "Anyone can create NGO profile" ON ngos;
DROP POLICY IF EXISTS "Anyone can view available food items" ON food_items;
DROP POLICY IF EXISTS "Donors can view their own food items" ON food_items;
DROP POLICY IF EXISTS "Donors can create food items" ON food_items;
DROP POLICY IF EXISTS "Donors can update their own food items" ON food_items;
DROP POLICY IF EXISTS "NGOs can view active requests" ON requests;
DROP POLICY IF EXISTS "NGOs can view their own requests" ON requests;
DROP POLICY IF EXISTS "NGOs can create requests" ON requests;
DROP POLICY IF EXISTS "NGOs can update their own requests" ON requests;
DROP POLICY IF EXISTS "Anyone can view their transactions" ON transactions;
DROP POLICY IF EXISTS "Service role can create transactions" ON transactions;
DROP POLICY IF EXISTS "Anyone can view feedback" ON feedback;
DROP POLICY IF EXISTS "Anyone can create feedback" ON feedback;

-- =====================================================
-- OPTION 2: Permissive Policies (Better for Development)
-- These policies allow all operations for development
-- You can tighten them later for production
-- =====================================================

-- Re-enable RLS with permissive policies
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ngos ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Donors: Allow all operations
CREATE POLICY "Allow all donor operations" ON donors
    FOR ALL USING (true) WITH CHECK (true);

-- NGOs: Allow all operations
CREATE POLICY "Allow all ngo operations" ON ngos
    FOR ALL USING (true) WITH CHECK (true);

-- Food Items: Allow all operations
CREATE POLICY "Allow all food_items operations" ON food_items
    FOR ALL USING (true) WITH CHECK (true);

-- Requests: Allow all operations
CREATE POLICY "Allow all requests operations" ON requests
    FOR ALL USING (true) WITH CHECK (true);

-- Transactions: Allow all operations
CREATE POLICY "Allow all transactions operations" ON transactions
    FOR ALL USING (true) WITH CHECK (true);

-- Feedback: Allow all operations
CREATE POLICY "Allow all feedback operations" ON feedback
    FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Grant necessary permissions
-- =====================================================

-- Grant permissions to the authenticated role
GRANT ALL ON donors TO authenticated;
GRANT ALL ON ngos TO authenticated;
GRANT ALL ON food_items TO authenticated;
GRANT ALL ON requests TO authenticated;
GRANT ALL ON transactions TO authenticated;
GRANT ALL ON feedback TO authenticated;

-- Grant permissions to the anon role (for unauthenticated users)
GRANT ALL ON donors TO anon;
GRANT ALL ON ngos TO anon;
GRANT ALL ON food_items TO anon;
GRANT ALL ON requests TO anon;
GRANT ALL ON transactions TO anon;
GRANT ALL ON feedback TO anon;

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
