import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { seedMockData } from '@/lib/mock-data';

// POST /api/seed-mock-data - Seed mock data for Bangalore
export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const result = await seedMockData(supabase);

    if (result.success) {
      return NextResponse.json({
        message: 'Mock data seeded successfully',
        donorsCount: result.donorsCount,
        ngosCount: result.ngosCount,
        foodDonationsCount: result.foodDonationsCount,
        requirementsCount: result.requirementsCount,
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to seed mock data', details: result.error },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in POST /api/seed-mock-data:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/seed-mock-data - Check if mock data exists
export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check donors count
    const { count: donorsCount } = await supabase
      .from('donors')
      .select('*', { count: 'exact', head: true });

    // Check NGOs count
    const { count: ngosCount } = await supabase
      .from('ngos')
      .select('*', { count: 'exact', head: true });

    // Check food donations count
    const { count: foodDonationsCount } = await supabase
      .from('food_items')
      .select('*', { count: 'exact', head: true });

    // Check requirements count
    const { count: requirementsCount } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      donorsCount: donorsCount || 0,
      ngosCount: ngosCount || 0,
      foodDonationsCount: foodDonationsCount || 0,
      requirementsCount: requirementsCount || 0,
      hasData: (donorsCount || 0) > 0 && (ngosCount || 0) > 0,
    });
  } catch (error: any) {
    console.error('Error in GET /api/seed-mock-data:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
