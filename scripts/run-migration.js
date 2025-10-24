/**
 * Script to run Supabase migrations
 * This will create all necessary tables in your Supabase database
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client (uses service role key to bypass RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Starting database migration...');
    console.log(`📍 Supabase URL: ${supabaseUrl}`);
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    console.log(`📏 SQL length: ${migrationSQL.length} characters`);
    
    // Split the SQL into individual statements
    // We need to execute them one by one because some statements depend on others
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    console.log('');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Skip comments
      if (statement.trim().startsWith('--')) {
        continue;
      }
      
      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        
        // Execute the SQL statement
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          // Check if it's a "already exists" error (which is okay)
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate key')) {
            console.log(`⚠️  Statement ${i + 1} skipped (already exists)`);
          } else {
            console.error(`❌ Error in statement ${i + 1}:`, error.message);
            errorCount++;
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Exception in statement ${i + 1}:`, err.message);
        errorCount++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (errorCount === 0) {
      console.log('🎉 Migration completed successfully!');
    } else {
      console.log('⚠️  Migration completed with some errors');
      console.log('💡 Tip: You can also run the migration manually:');
      console.log('   1. Go to Supabase Dashboard → SQL Editor');
      console.log('   2. Copy the contents of supabase/migrations/001_initial_schema.sql');
      console.log('   3. Paste and run it there');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('');
    console.log('💡 Manual migration instructions:');
    console.log('   1. Go to https://gjbrnuunyllvbmibbdmi.supabase.co/project/gjbrnuunyllvbmibbdmi/sql');
    console.log('   2. Click "New Query"');
    console.log('   3. Copy the entire contents of supabase/migrations/001_initial_schema.sql');
    console.log('   4. Paste it into the query editor');
    console.log('   5. Click "Run" to execute');
    process.exit(1);
  }
}

// Run the migration
runMigration();
