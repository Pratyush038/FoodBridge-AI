import { supabase } from './supabase';
import { donorService, ngoService } from './supabase-service';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'donor' | 'receiver';
  organizationName?: string;
  phone?: string;
  address?: string;
}

/**
 * Ensures a user exists in Supabase (donor or NGO table based on role)
 * This should be called when a user logs in or when creating donations/requirements
 */
export async function ensureUserInSupabase(user: {
  id: string;
  email: string;
  name: string;
  role?: 'donor' | 'receiver';
  organizationName?: string;
}): Promise<{ donorId?: string; ngoId?: string; role: 'donor' | 'receiver' }> {
  console.log('🔍 Checking if user exists in Supabase:', user.email);
  
  const role = user.role || 'donor'; // Default to donor if not specified
  
  try {
    if (role === 'donor') {
      // Check if donor exists
      let donor = await donorService.getByUserId(user.id);
      
      if (!donor) {
        console.log('➕ Creating new donor in Supabase...');
        try {
          donor = await donorService.create({
            user_id: user.id,
            email: user.email,
            name: user.name || 'Anonymous Donor',
            phone: '', // Will be updated when user adds profile info
            organization_name: user.organizationName || '',
            address: '', // Will be updated when user adds profile info  
            latitude: 0, // Default, will be updated with address
            longitude: 0, // Default, will be updated with address
          });
        } catch (createError: any) {
          // If duplicate key error, try to fetch the existing donor
          if (createError.message?.includes('duplicate key') || 
              createError.message?.includes('donors_user_id_key')) {
            console.log('⚠️ Donor already exists, fetching existing record...');
            donor = await donorService.getByUserId(user.id);
          } else {
            throw createError;
          }
        }
        
        if (!donor) {
          throw new Error('Failed to create or fetch donor in Supabase');
        }
        
        console.log('✅ Created/Found donor with ID:', donor.id);
      } else {
        console.log('✅ Found existing donor with ID:', donor.id);
      }
      
      return { donorId: donor.id, role: 'donor' };
    } else {
      // Check if NGO exists
      let ngo = await ngoService.getByUserId(user.id);
      
      if (!ngo) {
        console.log('➕ Creating new NGO in Supabase...');
        try {
          // Generate a unique registration number for new NGOs
          const registrationNumber = `NGO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          // Try creating with all required fields
          try {
            ngo = await ngoService.create({
              user_id: user.id,
              email: user.email,
              name: user.organizationName || user.name || 'Anonymous Organization',
              phone: 'Not provided',
              registration_number: registrationNumber,
              organization_type: 'NGO',
              address: 'Not provided',
              latitude: 0,
              longitude: 0,
              serving_capacity: 100,
              verified: false,
            });
          } catch (fullCreateError: any) {
            // If the full creation fails due to missing columns, try with minimal fields
            if (fullCreateError.message?.includes('column') || 
                fullCreateError.message?.includes('schema cache')) {
              console.log('⚠️ Some columns not found, trying with minimal fields...');
              ngo = await ngoService.create({
                user_id: user.id,
                email: user.email,
                name: user.organizationName || user.name || 'Anonymous Organization',
                phone: 'Not provided',
                address: 'Not provided',
                latitude: 0,
                longitude: 0,
              } as any); // Use 'as any' to bypass TypeScript checks
            } else {
              throw fullCreateError;
            }
          }
        } catch (createError: any) {
          // If duplicate key error, try to fetch the existing NGO
          if (createError.message?.includes('duplicate key') || 
              createError.message?.includes('ngos_user_id_key')) {
            console.log('⚠️ NGO already exists, fetching existing record...');
            ngo = await ngoService.getByUserId(user.id);
          } else {
            throw createError;
          }
        }
        
        if (!ngo) {
          throw new Error('Failed to create or fetch NGO in Supabase');
        }
        
        console.log('✅ Created/Found NGO with ID:', ngo.id);
      } else {
        console.log('✅ Found existing NGO with ID:', ngo.id);
      }
      
      return { ngoId: ngo.id, role: 'receiver' };
    }
  } catch (error) {
    console.error('❌ CRITICAL ERROR ensuring user in Supabase:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if it's a duplicate key error (race condition or concurrent requests)
    if (errorMessage.includes('duplicate key') || 
        errorMessage.includes('user_id_key') ||
        errorMessage.includes('unique constraint')) {
      console.log('⚠️ Duplicate key detected - user likely already exists. Retrying fetch...');
      
      // Try one more time to fetch the existing user
      try {
        if (role === 'donor') {
          const existingDonor = await donorService.getByUserId(user.id);
          if (existingDonor) {
            console.log('✅ Successfully fetched existing donor after duplicate key error');
            return { donorId: existingDonor.id, role: 'donor' };
          }
        } else {
          const existingNgo = await ngoService.getByUserId(user.id);
          if (existingNgo) {
            console.log('✅ Successfully fetched existing NGO after duplicate key error');
            return { ngoId: existingNgo.id, role: 'receiver' };
          }
        }
      } catch (retryError) {
        console.error('Failed to fetch existing user after duplicate key error:', retryError);
      }
      
      throw new Error(
        'User record exists but could not be retrieved. Please refresh the page and try again.'
      );
    }
    
    // Check if it's a "table not found" error
    if (errorMessage.includes('Could not find the table') || 
        errorMessage.includes('relation') || 
        errorMessage.includes('does not exist')) {
      console.error('');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('🚨 DATABASE TABLES NOT FOUND!');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('');
      console.error('You need to run the database migration first:');
      console.error('');
      console.error('1. Go to: https://gjbrnuunyllvbmibbdmi.supabase.co/project/gjbrnuunyllvbmibbdmi/sql');
      console.error('2. Click "New Query"');
      console.error('3. Copy ALL contents from: supabase/migrations/001_initial_schema.sql');
      console.error('4. Paste and click "Run"');
      console.error('5. Restart your app: npm run dev');
      console.error('');
      console.error('📄 See RUN_MIGRATION_NOW.md for detailed instructions');
      console.error('');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('');
      
      throw new Error(
        'Database tables not found. Please run the database migration first. ' +
        'See RUN_MIGRATION_NOW.md for instructions or open the browser console for details.'
      );
    }
    
    // Check if it's a Row Level Security (RLS) policy error
    if (errorMessage.includes('row-level security policy') || 
        errorMessage.includes('violates row-level security') ||
        errorMessage.includes('new row violates')) {
      console.error('');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('🚨 ROW LEVEL SECURITY (RLS) POLICY VIOLATION!');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('');
      console.error('The RLS policies are blocking data insertion.');
      console.error('This happens because the app uses NextAuth instead of Supabase Auth.');
      console.error('');
      console.error('FIX: Run the RLS policy fix migration:');
      console.error('');
      console.error('1. Go to: https://gjbrnuunyllvbmibbdmi.supabase.co/project/gjbrnuunyllvbmibbdmi/sql');
      console.error('2. Click "New Query"');
      console.error('3. Copy ALL contents from: supabase/migrations/002_fix_rls_policies.sql');
      console.error('4. Paste and click "Run"');
      console.error('5. Refresh your browser');
      console.error('');
      console.error('📄 See FIX_RLS_ERROR.md for detailed instructions');
      console.error('');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('');
      
      throw new Error(
        'Row Level Security policy is blocking the operation. ' +
        'Run the RLS fix migration (002_fix_rls_policies.sql). ' +
        'See FIX_RLS_ERROR.md for instructions.'
      );
    }
    
    // For other errors, throw with the original message
    throw new Error(`Failed to ensure user in Supabase: ${errorMessage}`);
  }
}

/**
 * Get user profile from Supabase
 */
export async function getUserProfile(userId: string, role: 'donor' | 'receiver'): Promise<UserProfile | null> {
  try {
    if (role === 'donor') {
      const donor = await donorService.getByUserId(userId);
      if (donor) {
        return {
          id: donor.id,
          email: donor.email,
          name: donor.name,
          role: 'donor',
          phone: donor.phone || undefined,
          address: donor.address || undefined,
        };
      }
    } else {
      const ngo = await ngoService.getByUserId(userId);
      if (ngo) {
        return {
          id: ngo.id,
          email: ngo.email,
          name: ngo.name,
          role: 'receiver',
          organizationName: ngo.name,
          phone: ngo.phone || undefined,
          address: ngo.address || undefined,
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}
