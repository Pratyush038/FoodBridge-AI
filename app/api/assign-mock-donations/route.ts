import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST /api/assign-mock-donations - Assign mock donations to a specific donor
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
    
    // Get the donor ID from the request body or query params
    const body = await req.json().catch(() => ({}));
    const donorId = body.donorId;
    
    if (!donorId) {
      return NextResponse.json(
        { error: 'donorId is required in request body' },
        { status: 400 }
      );
    }
    
    const now = new Date();
    const hoursFromNow = (hours: number) => new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
    const daysFromNow = (days: number, hours: number = 0) => new Date(now.getTime() + (days * 24 + hours) * 60 * 60 * 1000).toISOString();
    
    // Create multiple donations for this donor with today's dates
    const donations = [
      {
        donor_id: donorId,
        food_type: 'Cooked Meals',
        quantity: 150,
        unit: 'portions',
        description: 'Fresh home-cooked South Indian meals - rice, sambar, rasam, vegetables, and papad',
        pickup_address: 'MG Road, Bangalore, Karnataka 560001',
        pickup_latitude: 12.9758,
        pickup_longitude: 77.6063,
        pickup_time: hoursFromNow(2),
        expiry_date: hoursFromNow(8),
        status: 'available',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      {
        donor_id: donorId,
        food_type: 'Baked Goods',
        quantity: 75,
        unit: 'items',
        description: 'Fresh pastries, bread loaves, and cookies from morning batch',
        pickup_address: 'Indiranagar, Bangalore, Karnataka 560038',
        pickup_latitude: 12.9784,
        pickup_longitude: 77.6408,
        pickup_time: hoursFromNow(1),
        expiry_date: hoursFromNow(6),
        status: 'available',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      {
        donor_id: donorId,
        food_type: 'Fresh Produce',
        quantity: 50,
        unit: 'kg',
        description: 'Fresh vegetables - tomatoes, onions, potatoes, carrots, spinach',
        pickup_address: 'Koramangala, Bangalore, Karnataka 560034',
        pickup_latitude: 12.9352,
        pickup_longitude: 77.6245,
        pickup_time: hoursFromNow(3),
        expiry_date: daysFromNow(1, 12),
        status: 'available',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      {
        donor_id: donorId,
        food_type: 'Packaged Food',
        quantity: 200,
        unit: 'items',
        description: 'Wedding event surplus - packed biryani boxes, sweets, snacks',
        pickup_address: 'Jayanagar, Bangalore, Karnataka 560041',
        pickup_latitude: 12.9250,
        pickup_longitude: 77.5833,
        pickup_time: hoursFromNow(1.5),
        expiry_date: hoursFromNow(10),
        status: 'available',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      {
        donor_id: donorId,
        food_type: 'Dairy Products',
        quantity: 100,
        unit: 'liters',
        description: 'Fresh milk, curd, and buttermilk from morning delivery',
        pickup_address: 'HSR Layout, Bangalore, Karnataka 560102',
        pickup_latitude: 12.9121,
        pickup_longitude: 77.6446,
        pickup_time: hoursFromNow(0.5),
        expiry_date: hoursFromNow(5),
        status: 'available',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      // Add some that are expiring soon (within 24 hours)
      {
        donor_id: donorId,
        food_type: 'Cooked Meals',
        quantity: 80,
        unit: 'portions',
        description: 'Lunch buffet surplus - EXPIRING SOON - please pickup immediately',
        pickup_address: 'Whitefield, Bangalore, Karnataka 560066',
        pickup_latitude: 12.9698,
        pickup_longitude: 77.7499,
        pickup_time: hoursFromNow(0.5),
        expiry_date: hoursFromNow(3), // Expiring in 3 hours
        status: 'available',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      {
        donor_id: donorId,
        food_type: 'Fresh Produce',
        quantity: 30,
        unit: 'kg',
        description: 'Fresh fruits - bananas, apples, oranges - EXPIRING TODAY',
        pickup_address: 'Electronic City, Bangalore, Karnataka 560100',
        pickup_latitude: 12.8456,
        pickup_longitude: 77.6603,
        pickup_time: hoursFromNow(1),
        expiry_date: hoursFromNow(4), // Expiring in 4 hours
        status: 'available',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      // Some completed donations for history
      {
        donor_id: donorId,
        food_type: 'Cooked Meals',
        quantity: 120,
        unit: 'portions',
        description: 'Corporate event surplus - successfully delivered to Akshaya Patra',
        pickup_address: 'Manyata Tech Park, Bangalore, Karnataka 560045',
        pickup_latitude: 13.0358,
        pickup_longitude: 77.6143,
        pickup_time: daysFromNow(-1, 2),
        expiry_date: daysFromNow(-1, 8),
        status: 'completed',
        created_at: daysFromNow(-1),
        updated_at: daysFromNow(-1, 4),
      },
      {
        donor_id: donorId,
        food_type: 'Packaged Food',
        quantity: 90,
        unit: 'items',
        description: 'Birthday party leftovers - delivered to Robin Hood Army',
        pickup_address: 'Banashankari, Bangalore, Karnataka 560070',
        pickup_latitude: 12.9250,
        pickup_longitude: 77.5480,
        pickup_time: daysFromNow(-2, 3),
        expiry_date: daysFromNow(-2, 12),
        status: 'completed',
        created_at: daysFromNow(-2),
        updated_at: daysFromNow(-2, 5),
      },
      {
        donor_id: donorId,
        food_type: 'Baked Goods',
        quantity: 60,
        unit: 'items',
        description: 'Bakery surplus - delivered to Feeding India',
        pickup_address: 'Malleswaram, Bangalore, Karnataka 560003',
        pickup_latitude: 13.0067,
        pickup_longitude: 77.5703,
        pickup_time: daysFromNow(-1, 1),
        expiry_date: daysFromNow(-1, 6),
        status: 'completed',
        created_at: daysFromNow(-1, -2),
        updated_at: daysFromNow(-1, 3),
      },
    ];
    
    // Insert all donations
    let inserted = 0;
    for (const donation of donations) {
      const { error } = await supabase
        .from('food_items')
        .insert(donation);
      
      if (!error) inserted++;
      else console.error('Error inserting donation:', error);
    }

    return NextResponse.json({
      message: 'Mock donations assigned successfully',
      donorId,
      donationsInserted: inserted,
      totalDonations: donations.length,
      activeCount: donations.filter(d => d.status === 'available').length,
      completedCount: donations.filter(d => d.status === 'completed').length,
      expiringCount: donations.filter(d => {
        const expiry = new Date(d.expiry_date);
        const hoursUntil = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursUntil > 0 && hoursUntil <= 24 && d.status === 'available';
      }).length,
    });
    
  } catch (error: any) {
    console.error('Error assigning mock donations:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
