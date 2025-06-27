const pool = require('../config/database');

const createTables = async () => {
  try {
    console.log('🔄 Creating database tables...');

    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        uid VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('donor', 'receiver', 'admin')),
        organization_name VARCHAR(255),
        location JSONB,
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Donations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS donations (
        id UUID PRIMARY KEY,
        donor_id VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
        donor_name VARCHAR(255) NOT NULL,
        food_type VARCHAR(255) NOT NULL,
        quantity VARCHAR(100) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        description TEXT,
        location JSONB NOT NULL,
        pickup_time TIMESTAMP,
        expiry_date TIMESTAMP,
        image_url TEXT,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'completed', 'expired')),
        matched_with VARCHAR(255),
        matched_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Requirements table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS requirements (
        id UUID PRIMARY KEY,
        receiver_id VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
        receiver_name VARCHAR(255) NOT NULL,
        organization_name VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        food_type VARCHAR(255) NOT NULL,
        quantity VARCHAR(100) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        urgency VARCHAR(50) NOT NULL CHECK (urgency IN ('high', 'medium', 'low')),
        description TEXT,
        location JSONB NOT NULL,
        needed_by TIMESTAMP,
        serving_size VARCHAR(100),
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'matched', 'fulfilled')),
        matched_with VARCHAR(255),
        matched_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Matches table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id UUID PRIMARY KEY,
        donation_id UUID NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
        requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
        donor_id VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
        receiver_id VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
        distance DECIMAL(10, 2),
        match_score DECIMAL(5, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON donations(donor_id);
      CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
      CREATE INDEX IF NOT EXISTS idx_requirements_receiver_id ON requirements(receiver_id);
      CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status);
      CREATE INDEX IF NOT EXISTS idx_matches_donor_id ON matches(donor_id);
      CREATE INDEX IF NOT EXISTS idx_matches_receiver_id ON matches(receiver_id);
      CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
    `);

    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
};

// Run migration
createTables().then(() => {
  console.log('🎉 Migration completed');
  process.exit(0);
});