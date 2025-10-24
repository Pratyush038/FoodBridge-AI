#!/usr/bin/env node

/**
 * Direct Seed Script - Seeds data directly to Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🌱 Direct Seed Script for Bangalore Mock Data\n');
console.log('='.repeat(60));

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found!');
  console.error('   Make sure .env.local has:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Mock data
const mockDonors = [
  {
    id: 'donor-1',
    user_id: 'user-donor-1',
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@gmail.com',
    phone: '+91 98450 12345',
    organization_name: 'Kumar Catering Services',
    organization_type: 'Restaurant',
    address: 'MG Road, Bangalore, Karnataka 560001',
    latitude: 12.9758,
    longitude: 77.6063,
    verified: true,
    total_donations: 45,
    tier: 'gold',
    reliability_score: 4.8,
  },
  {
    id: 'donor-2',
    user_id: 'user-donor-2',
    name: 'Priya Sharma',
    email: 'priya.sharma@outlook.com',
    phone: '+91 99800 23456',
    organization_name: 'Sharma Hotel & Restaurant',
    organization_type: 'Hotel',
    address: 'Indiranagar, Bangalore, Karnataka 560038',
    latitude: 12.9784,
    longitude: 77.6408,
    verified: true,
    total_donations: 78,
    tier: 'platinum',
    reliability_score: 4.9,
  },
];

const mockNGOs = [
  {
    id: 'ngo-1',
    user_id: 'user-ngo-1',
    name: 'Akshaya Patra Foundation',
    email: 'bangalore@akshayapatra.org',
    phone: '+91 80 3046 4730',
    registration_number: 'KAR/2000/0123',
    organization_type: 'Food Distribution',
    address: 'Rajajinagar, Bangalore, Karnataka 560010',
    latitude: 12.9917,
    longitude: 77.5543,
    verified: true,
    serving_capacity: 5000,
    total_requests: 156,
    rating: 4.9,
  },
  {
    id: 'ngo-2',
    user_id: 'user-ngo-2',
    name: 'Feeding India - Bangalore',
    email: 'bangalore@feedingindia.org',
    phone: '+91 98450 11111',
    registration_number: 'KAR/2015/0456',
    organization_type: 'Hunger Relief',
    address: 'Yelahanka, Bangalore, Karnataka 560064',
    latitude: 13.1007,
    longitude: 77.5963,
    verified: true,
    serving_capacity: 3000,
    total_requests: 234,
    rating: 4.8,
  },
];

async function checkColumns(tableName) {
  console.log(`\n🔍 Checking columns in '${tableName}' table...`);
  
  // Try to get one row to see what columns exist
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);
  
  if (error) {
    console.log(`❌ Error reading ${tableName}:`, error.message);
    return null;
  }
  
  if (data && data.length > 0) {
    const columns = Object.keys(data[0]);
    console.log(`✅ Columns found:`, columns.join(', '));
    return columns;
  } else {
    console.log(`⚠️  Table is empty, will try to insert...`);
    return [];
  }
}

async function seedData() {
  console.log('\n📊 STEP 1: Checking database schema...\n');
  
  const donorColumns = await checkColumns('donors');
  const ngoColumns = await checkColumns('ngos');
  
  if (donorColumns === null || ngoColumns === null) {
    console.error('\n❌ Cannot access tables. Make sure migrations are run!');
    console.error('   Go to Supabase SQL Editor and run 001_initial_schema.sql');
    return;
  }
  
  console.log('\n📊 STEP 2: Seeding donors...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const donor of mockDonors) {
    console.log(`\nSeeding: ${donor.name}...`);
    
    const { data, error } = await supabase
      .from('donors')
      .upsert({
        ...donor,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      })
      .select();
    
    if (error) {
      console.log(`❌ Failed:`, error.message);
      console.log(`   Code:`, error.code);
      console.log(`   Details:`, error.details || 'none');
      failCount++;
    } else {
      console.log(`✅ Success!`);
      successCount++;
    }
  }
  
  console.log(`\n📊 Donors: ${successCount} succeeded, ${failCount} failed\n`);
  
  console.log('\n📊 STEP 3: Seeding NGOs...\n');
  
  successCount = 0;
  failCount = 0;
  
  for (const ngo of mockNGOs) {
    console.log(`\nSeeding: ${ngo.name}...`);
    
    const { data, error } = await supabase
      .from('ngos')
      .upsert({
        ...ngo,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      })
      .select();
    
    if (error) {
      console.log(`❌ Failed:`, error.message);
      console.log(`   Code:`, error.code);
      console.log(`   Details:`, error.details || 'none');
      failCount++;
    } else {
      console.log(`✅ Success!`);
      successCount++;
    }
  }
  
  console.log(`\n📊 NGOs: ${successCount} succeeded, ${failCount} failed\n`);
  
  // Verify data
  console.log('\n📊 STEP 4: Verifying seeded data...\n');
  
  const { count: donorCount } = await supabase
    .from('donors')
    .select('*', { count: 'exact', head: true });
  
  const { count: ngoCount } = await supabase
    .from('ngos')
    .select('*', { count: 'exact', head: true });
  
  console.log(`✅ Total donors in database: ${donorCount}`);
  console.log(`✅ Total NGOs in database: ${ngoCount}\n`);
  
  if (donorCount > 0 && ngoCount > 0) {
    console.log('🎉 SUCCESS! Data seeded successfully!');
    console.log('\n📍 Next steps:');
    console.log('   1. Visit: http://localhost:3001/donor');
    console.log('   2. Visit: http://localhost:3001/receiver');
    console.log('   3. You should see markers on the map!\n');
  } else {
    console.log('⚠️  Data seeding had issues. Check errors above.\n');
  }
  
  console.log('='.repeat(60));
}

seedData().catch(err => {
  console.error('\n❌ FATAL ERROR:', err);
  console.error('\nMake sure:');
  console.error('1. Supabase is accessible');
  console.error('2. Service role key is correct');
  console.error('3. Tables exist (run migrations)\n');
  process.exit(1);
});
