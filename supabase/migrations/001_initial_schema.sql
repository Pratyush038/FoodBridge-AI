-- FoodBridge AI Database Schema
-- This migration creates all tables, triggers, views, and stored procedures

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For geospatial queries

-- Create ENUM types
CREATE TYPE donor_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');
CREATE TYPE food_item_status AS ENUM ('available', 'reserved', 'collected', 'expired', 'cancelled');
CREATE TYPE request_status AS ENUM ('active', 'matched', 'fulfilled', 'cancelled');
CREATE TYPE transaction_status AS ENUM ('pending', 'confirmed', 'in_transit', 'completed', 'cancelled');
CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE feedback_type AS ENUM ('donor_to_ngo', 'ngo_to_donor');

-- =====================================================
-- TABLES
-- =====================================================

-- Donors Table
CREATE TABLE donors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL UNIQUE, -- Links to NextAuth user
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    organization_name TEXT,
    organization_type TEXT,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    total_donations INTEGER DEFAULT 0,
    tier donor_tier DEFAULT 'bronze',
    reliability_score DOUBLE PRECISION DEFAULT 0.5 CHECK (reliability_score >= 0 AND reliability_score <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NGOs Table
CREATE TABLE ngos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL UNIQUE, -- Links to NextAuth user
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    registration_number TEXT NOT NULL UNIQUE,
    organization_type TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    serving_capacity INTEGER NOT NULL,
    total_requests INTEGER DEFAULT 0,
    rating DOUBLE PRECISION DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Food Items Table
CREATE TABLE food_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donor_id UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
    food_type TEXT NOT NULL,
    quantity DOUBLE PRECISION NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL,
    description TEXT NOT NULL,
    pickup_address TEXT NOT NULL,
    pickup_latitude DOUBLE PRECISION NOT NULL,
    pickup_longitude DOUBLE PRECISION NOT NULL,
    pickup_time TIMESTAMP WITH TIME ZONE NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    image_url TEXT,
    status food_item_status DEFAULT 'available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_expiry CHECK (expiry_date > created_at)
);

-- Requests Table
CREATE TABLE requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ngo_id UUID NOT NULL REFERENCES ngos(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    food_type TEXT NOT NULL,
    quantity DOUBLE PRECISION NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL,
    urgency urgency_level DEFAULT 'medium',
    description TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_latitude DOUBLE PRECISION NOT NULL,
    delivery_longitude DOUBLE PRECISION NOT NULL,
    needed_by TIMESTAMP WITH TIME ZONE NOT NULL,
    serving_size INTEGER NOT NULL,
    status request_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions Table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    food_item_id UUID NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    donor_id UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
    ngo_id UUID NOT NULL REFERENCES ngos(id) ON DELETE CASCADE,
    quantity_transferred DOUBLE PRECISION NOT NULL CHECK (quantity_transferred > 0),
    match_score DOUBLE PRECISION DEFAULT 0.0 CHECK (match_score >= 0 AND match_score <= 1),
    status transaction_status DEFAULT 'pending',
    pickup_time TIMESTAMP WITH TIME ZONE,
    delivery_time TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback Table
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    feedback_type feedback_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES for Performance
-- =====================================================

CREATE INDEX idx_donors_user_id ON donors(user_id);
CREATE INDEX idx_donors_location ON donors(latitude, longitude);
CREATE INDEX idx_ngos_user_id ON ngos(user_id);
CREATE INDEX idx_ngos_location ON ngos(latitude, longitude);
CREATE INDEX idx_food_items_donor ON food_items(donor_id);
CREATE INDEX idx_food_items_status ON food_items(status);
CREATE INDEX idx_food_items_expiry ON food_items(expiry_date);
CREATE INDEX idx_requests_ngo ON requests(ngo_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_urgency ON requests(urgency);
CREATE INDEX idx_transactions_food_item ON transactions(food_item_id);
CREATE INDEX idx_transactions_request ON transactions(request_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_feedback_transaction ON feedback(transaction_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at trigger to all relevant tables
CREATE TRIGGER update_donors_updated_at BEFORE UPDATE ON donors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ngos_updated_at BEFORE UPDATE ON ngos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_food_items_updated_at BEFORE UPDATE ON food_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update food item status when transaction is completed
CREATE OR REPLACE FUNCTION auto_update_food_item_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE food_items 
        SET status = 'collected' 
        WHERE id = NEW.food_item_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transaction_complete_updates AFTER UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION auto_update_food_item_status();

-- Trigger to auto-update request status when transaction is completed
CREATE OR REPLACE FUNCTION auto_update_request_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE requests 
        SET status = 'fulfilled' 
        WHERE id = NEW.request_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transaction_fulfills_request AFTER UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION auto_update_request_status();

-- Trigger to update donor total_donations count
CREATE OR REPLACE FUNCTION update_donor_donation_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE donors 
        SET total_donations = total_donations + 1
        WHERE id = NEW.donor_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_donor_donations AFTER UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_donor_donation_count();

-- Trigger to update NGO total_requests count
CREATE OR REPLACE FUNCTION update_ngo_request_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ngos 
    SET total_requests = total_requests + 1
    WHERE id = NEW.ngo_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_ngo_requests AFTER INSERT ON requests
    FOR EACH ROW EXECUTE FUNCTION update_ngo_request_count();

-- Trigger to auto-expire food items past expiry date
CREATE OR REPLACE FUNCTION auto_expire_food_items()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expiry_date < NOW() AND NEW.status = 'available' THEN
        NEW.status = 'expired';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_food_expiry BEFORE UPDATE ON food_items
    FOR EACH ROW EXECUTE FUNCTION auto_expire_food_items();

-- =====================================================
-- STORED PROCEDURES / FUNCTIONS
-- =====================================================

-- Function to calculate and update donor tier based on donations and reliability
CREATE OR REPLACE FUNCTION update_donor_tier(donor_id UUID)
RETURNS VOID AS $$
DECLARE
    donor_donations INTEGER;
    donor_reliability DOUBLE PRECISION;
    calculated_tier donor_tier;
    score DOUBLE PRECISION;
BEGIN
    -- Get donor stats
    SELECT total_donations, reliability_score 
    INTO donor_donations, donor_reliability
    FROM donors 
    WHERE id = donor_id;

    -- Calculate tier score (weighted combination)
    score := (donor_donations * 0.7) + (donor_reliability * 100 * 0.3);

    -- Determine tier
    IF score >= 80 THEN
        calculated_tier := 'platinum';
    ELSIF score >= 60 THEN
        calculated_tier := 'gold';
    ELSIF score >= 30 THEN
        calculated_tier := 'silver';
    ELSE
        calculated_tier := 'bronze';
    END IF;

    -- Update donor tier
    UPDATE donors 
    SET tier = calculated_tier 
    WHERE id = donor_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate match score between food item and request
CREATE OR REPLACE FUNCTION calculate_match_score(
    food_item_id UUID,
    request_id UUID
)
RETURNS DOUBLE PRECISION AS $$
DECLARE
    food_record RECORD;
    request_record RECORD;
    food_type_match DOUBLE PRECISION := 0;
    quantity_match DOUBLE PRECISION := 0;
    distance_score DOUBLE PRECISION := 0;
    urgency_multiplier DOUBLE PRECISION := 1.0;
    distance_km DOUBLE PRECISION;
    final_score DOUBLE PRECISION;
BEGIN
    -- Get food item and request details
    SELECT * INTO food_record FROM food_items WHERE id = food_item_id;
    SELECT * INTO request_record FROM requests WHERE id = request_id;

    -- Food type matching (1.0 for exact match, 0.3 for different)
    IF food_record.food_type = request_record.food_type OR request_record.food_type = 'any' THEN
        food_type_match := 1.0;
    ELSE
        food_type_match := 0.3;
    END IF;

    -- Quantity matching
    quantity_match := LEAST(food_record.quantity, request_record.quantity) / 
                     GREATEST(food_record.quantity, request_record.quantity);

    -- Calculate distance using Haversine formula
    distance_km := (
        6371 * acos(
            cos(radians(food_record.pickup_latitude)) * 
            cos(radians(request_record.delivery_latitude)) * 
            cos(radians(request_record.delivery_longitude) - radians(food_record.pickup_longitude)) +
            sin(radians(food_record.pickup_latitude)) * 
            sin(radians(request_record.delivery_latitude))
        )
    );

    -- Distance scoring (closer is better)
    IF distance_km <= 5 THEN
        distance_score := 1.0;
    ELSIF distance_km <= 10 THEN
        distance_score := 0.8;
    ELSIF distance_km <= 20 THEN
        distance_score := 0.6;
    ELSIF distance_km <= 50 THEN
        distance_score := 0.4;
    ELSE
        distance_score := 0.2;
    END IF;

    -- Urgency multiplier
    CASE request_record.urgency
        WHEN 'high' THEN urgency_multiplier := 1.5;
        WHEN 'medium' THEN urgency_multiplier := 1.2;
        WHEN 'low' THEN urgency_multiplier := 1.0;
    END CASE;

    -- Calculate weighted final score
    final_score := (
        (food_type_match * 0.25) +
        (distance_score * 0.30) +
        (quantity_match * 0.20) +
        (0.25) -- Placeholder for donor/ngo history (can be enhanced)
    ) * urgency_multiplier;

    RETURN LEAST(final_score, 1.0); -- Cap at 1.0
END;
$$ LANGUAGE plpgsql;

-- Function to get nearby requests for a donor location
CREATE OR REPLACE FUNCTION get_nearby_requests(
    donor_lat DOUBLE PRECISION,
    donor_lng DOUBLE PRECISION,
    max_distance_km DOUBLE PRECISION DEFAULT 50
)
RETURNS TABLE (
    request_id UUID,
    ngo_name TEXT,
    food_type TEXT,
    quantity DOUBLE PRECISION,
    urgency urgency_level,
    distance_km DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        n.name,
        r.food_type,
        r.quantity,
        r.urgency,
        (
            6371 * acos(
                cos(radians(donor_lat)) * 
                cos(radians(r.delivery_latitude)) * 
                cos(radians(r.delivery_longitude) - radians(donor_lng)) +
                sin(radians(donor_lat)) * 
                sin(radians(r.delivery_latitude))
            )
        ) AS distance_km
    FROM requests r
    JOIN ngos n ON r.ngo_id = n.id
    WHERE r.status = 'active'
        AND (
            6371 * acos(
                cos(radians(donor_lat)) * 
                cos(radians(r.delivery_latitude)) * 
                cos(radians(r.delivery_longitude) - radians(donor_lng)) +
                sin(radians(donor_lat)) * 
                sin(radians(r.delivery_latitude))
            )
        ) <= max_distance_km
    ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS for Reporting and Analytics
-- =====================================================

-- Weekly Donation Report View
CREATE OR REPLACE VIEW weekly_donation_report AS
SELECT 
    DATE_TRUNC('week', t.created_at) AS week_start,
    COUNT(DISTINCT t.id) AS total_donations,
    SUM(t.quantity_transferred) AS total_quantity,
    COUNT(DISTINCT t.donor_id) AS total_donors,
    COUNT(DISTINCT t.ngo_id) AS total_ngos,
    ROUND(
        (COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::NUMERIC / 
         NULLIF(COUNT(*), 0) * 100), 2
    ) AS completion_rate
FROM transactions t
GROUP BY DATE_TRUNC('week', t.created_at)
ORDER BY week_start DESC;

-- Donor Performance View
CREATE OR REPLACE VIEW donor_performance AS
SELECT 
    d.id AS donor_id,
    d.name AS donor_name,
    d.total_donations,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) AS completed_donations,
    COALESCE(AVG(f.rating), 0) AS average_rating,
    d.tier::TEXT AS tier
FROM donors d
LEFT JOIN transactions t ON d.id = t.donor_id
LEFT JOIN feedback f ON t.id = f.transaction_id AND f.feedback_type = 'ngo_to_donor'
GROUP BY d.id, d.name, d.total_donations, d.tier
ORDER BY d.total_donations DESC;

-- NGO Activity View
CREATE OR REPLACE VIEW ngo_activity AS
SELECT 
    n.id AS ngo_id,
    n.name AS ngo_name,
    n.total_requests,
    COUNT(CASE WHEN r.status = 'fulfilled' THEN 1 END) AS fulfilled_requests,
    COALESCE(AVG(f.rating), 0) AS average_rating,
    SUM(CASE WHEN t.status = 'completed' THEN t.quantity_transferred ELSE 0 END) AS total_served
FROM ngos n
LEFT JOIN requests r ON n.id = r.ngo_id
LEFT JOIN transactions t ON n.id = t.ngo_id
LEFT JOIN feedback f ON t.id = f.transaction_id AND f.feedback_type = 'donor_to_ngo'
GROUP BY n.id, n.name, n.total_requests
ORDER BY n.total_requests DESC;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ngos ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Donors Policies
CREATE POLICY "Donors can view their own data" ON donors
    FOR SELECT USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Donors can update their own data" ON donors
    FOR UPDATE USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Anyone can create donor profile" ON donors
    FOR INSERT WITH CHECK (true);

-- NGOs Policies
CREATE POLICY "NGOs can view their own data" ON ngos
    FOR SELECT USING (auth.uid()::TEXT = user_id);

CREATE POLICY "NGOs can update their own data" ON ngos
    FOR UPDATE USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Anyone can create NGO profile" ON ngos
    FOR INSERT WITH CHECK (true);

-- Food Items Policies
CREATE POLICY "Anyone can view available food items" ON food_items
    FOR SELECT USING (status = 'available');

CREATE POLICY "Donors can manage their own food items" ON food_items
    FOR ALL USING (donor_id IN (SELECT id FROM donors WHERE user_id = auth.uid()::TEXT));

-- Requests Policies
CREATE POLICY "Anyone can view active requests" ON requests
    FOR SELECT USING (status = 'active');

CREATE POLICY "NGOs can manage their own requests" ON requests
    FOR ALL USING (ngo_id IN (SELECT id FROM ngos WHERE user_id = auth.uid()::TEXT));

-- Transactions Policies
CREATE POLICY "Users can view their own transactions" ON transactions
    FOR SELECT USING (
        donor_id IN (SELECT id FROM donors WHERE user_id = auth.uid()::TEXT) OR
        ngo_id IN (SELECT id FROM ngos WHERE user_id = auth.uid()::TEXT)
    );

CREATE POLICY "Users can create transactions" ON transactions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their transactions" ON transactions
    FOR UPDATE USING (
        donor_id IN (SELECT id FROM donors WHERE user_id = auth.uid()::TEXT) OR
        ngo_id IN (SELECT id FROM ngos WHERE user_id = auth.uid()::TEXT)
    );

-- Feedback Policies
CREATE POLICY "Users can view feedback about themselves" ON feedback
    FOR SELECT USING (to_user_id = auth.uid()::TEXT);

CREATE POLICY "Users can create feedback" ON feedback
    FOR INSERT WITH CHECK (from_user_id = auth.uid()::TEXT);

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Note: Sample data would be inserted here for testing purposes
-- Commented out for production deployment
