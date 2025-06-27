const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const seedData = async () => {
  try {
    console.log('🌱 Seeding database with sample data...');

    // Sample users
    const users = [
      {
        uid: 'demo-donor-1',
        email: 'donor@example.com',
        name: 'Green Restaurant',
        role: 'donor',
        organization_name: 'Green Restaurant Chain'
      },
      {
        uid: 'demo-receiver-1',
        email: 'shelter@example.com',
        name: 'Community Shelter',
        role: 'receiver',
        organization_name: 'Downtown Community Shelter'
      },
      {
        uid: 'demo-admin-1',
        email: 'admin@foodbridge.ai',
        name: 'Admin User',
        role: 'admin',
        organization_name: 'FoodBridge AI'
      }
    ];

    // Insert users
    for (const user of users) {
      await pool.query(`
        INSERT INTO users (uid, email, name, role, organization_name, verified, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
        ON CONFLICT (uid) DO NOTHING
      `, [user.uid, user.email, user.name, user.role, user.organization_name]);
    }

    // Sample donations
    const donations = [
      {
        id: uuidv4(),
        donor_id: 'demo-donor-1',
        donor_name: 'Green Restaurant',
        food_type: 'fresh-produce',
        quantity: '50',
        unit: 'kg',
        description: 'Fresh vegetables from our daily prep',
        location: JSON.stringify({
          address: '123 Main St, Downtown',
          lat: 40.7128,
          lng: -74.0060
        }),
        pickup_time: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        status: 'pending'
      },
      {
        id: uuidv4(),
        donor_id: 'demo-donor-1',
        donor_name: 'Green Restaurant',
        food_type: 'cooked-meals',
        quantity: '100',
        unit: 'portions',
        description: 'Prepared meals from lunch service',
        location: JSON.stringify({
          address: '123 Main St, Downtown',
          lat: 40.7128,
          lng: -74.0060
        }),
        pickup_time: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour from now
        expiry_date: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
        status: 'pending'
      }
    ];

    // Insert donations
    for (const donation of donations) {
      await pool.query(`
        INSERT INTO donations (
          id, donor_id, donor_name, food_type, quantity, unit, description,
          location, pickup_time, expiry_date, status, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `, [
        donation.id, donation.donor_id, donation.donor_name, donation.food_type,
        donation.quantity, donation.unit, donation.description, donation.location,
        donation.pickup_time, donation.expiry_date, donation.status
      ]);
    }

    // Sample requirements
    const requirements = [
      {
        id: uuidv4(),
        receiver_id: 'demo-receiver-1',
        receiver_name: 'Community Shelter',
        organization_name: 'Downtown Community Shelter',
        title: 'Daily Meal Program',
        food_type: 'any',
        quantity: '80',
        unit: 'portions',
        urgency: 'high',
        description: 'Need food for our daily meal program serving homeless individuals',
        location: JSON.stringify({
          address: '456 Shelter Ave, Downtown',
          lat: 40.7150,
          lng: -74.0080
        }),
        needed_by: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
        serving_size: '80',
        status: 'active'
      },
      {
        id: uuidv4(),
        receiver_id: 'demo-receiver-1',
        receiver_name: 'Community Shelter',
        organization_name: 'Downtown Community Shelter',
        title: 'Fresh Produce for Families',
        food_type: 'fresh-produce',
        quantity: '30',
        unit: 'kg',
        urgency: 'medium',
        description: 'Fresh vegetables and fruits for families with children',
        location: JSON.stringify({
          address: '456 Shelter Ave, Downtown',
          lat: 40.7150,
          lng: -74.0080
        }),
        needed_by: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
        serving_size: '40',
        status: 'active'
      }
    ];

    // Insert requirements
    for (const requirement of requirements) {
      await pool.query(`
        INSERT INTO requirements (
          id, receiver_id, receiver_name, organization_name, title, food_type,
          quantity, unit, urgency, description, location, needed_by, serving_size,
          status, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `, [
        requirement.id, requirement.receiver_id, requirement.receiver_name,
        requirement.organization_name, requirement.title, requirement.food_type,
        requirement.quantity, requirement.unit, requirement.urgency, requirement.description,
        requirement.location, requirement.needed_by, requirement.serving_size, requirement.status
      ]);
    }

    console.log('✅ Database seeded successfully with sample data');
    console.log('📊 Sample data includes:');
    console.log('   - 3 users (donor, receiver, admin)');
    console.log('   - 2 food donations');
    console.log('   - 2 food requirements');
    console.log('');
    console.log('🔑 Demo credentials:');
    console.log('   Donor: donor@example.com');
    console.log('   Receiver: shelter@example.com');
    console.log('   Admin: admin@foodbridge.ai');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run seeding
seedData().then(() => {
  console.log('🎉 Seeding completed');
  process.exit(0);
});