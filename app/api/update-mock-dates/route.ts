import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST /api/update-mock-dates - Update all dates in food_items and requests to recent dates
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
    
    const now = new Date();
    
    // Helper to create dates relative to now
    const hoursFromNow = (hours: number) => new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
    const daysFromNow = (days: number, hours: number = 0) => new Date(now.getTime() + (days * 24 + hours) * 60 * 60 * 1000).toISOString();
    
    // Update all food_items with recent dates
    const { data: foodItems, error: foodFetchError } = await supabase
      .from('food_items')
      .select('id, status');
    
    if (foodFetchError) {
      console.error('Error fetching food items:', foodFetchError);
      return NextResponse.json({ error: 'Failed to fetch food items' }, { status: 500 });
    }

    let foodUpdated = 0;
    for (let i = 0; i < (foodItems?.length || 0); i++) {
      const item = foodItems![i];
      let updateData: any = {};
      
      if (item.status === 'available') {
        // Available items: pickup today, expiry in next few hours/days
        updateData = {
          pickup_time: hoursFromNow(1 + (i % 4)), // 1-4 hours from now
          expiry_date: hoursFromNow(6 + (i % 12)), // 6-18 hours from now
          created_at: daysFromNow(0, -(i % 3)), // Created today or yesterday
          updated_at: now.toISOString(),
        };
      } else if (item.status === 'completed') {
        // Completed items: within last 1-3 days
        const daysAgo = 1 + (i % 3);
        updateData = {
          pickup_time: daysFromNow(-daysAgo, 2),
          expiry_date: daysFromNow(-daysAgo, 8),
          created_at: daysFromNow(-daysAgo - 1),
          updated_at: daysFromNow(-daysAgo, 4),
        };
      } else {
        // Other statuses (pending, picked_up, etc): today
        updateData = {
          pickup_time: hoursFromNow(2 + (i % 3)),
          expiry_date: hoursFromNow(8 + (i % 10)),
          created_at: daysFromNow(0, -(i % 5)),
          updated_at: now.toISOString(),
        };
      }
      
      const { error: updateError } = await supabase
        .from('food_items')
        .update(updateData)
        .eq('id', item.id);
      
      if (!updateError) foodUpdated++;
    }
    
    // Update all requests with recent dates
    const { data: requests, error: reqFetchError } = await supabase
      .from('requests')
      .select('id, status');
    
    if (reqFetchError) {
      console.error('Error fetching requests:', reqFetchError);
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }

    let reqUpdated = 0;
    for (let i = 0; i < (requests?.length || 0); i++) {
      const req = requests![i];
      let updateData: any = {};
      
      if (req.status === 'active') {
        // Active requirements: needed within next few hours/days
        updateData = {
          needed_by: hoursFromNow(3 + (i % 8)), // 3-11 hours from now
          created_at: daysFromNow(-(i % 3)), // Created in last 3 days
          updated_at: now.toISOString(),
        };
      } else if (req.status === 'fulfilled' || req.status === 'completed') {
        // Fulfilled: completed 1-3 days ago
        const daysAgo = 1 + (i % 3);
        updateData = {
          needed_by: daysFromNow(-daysAgo, 5),
          created_at: daysFromNow(-daysAgo - 2),
          updated_at: daysFromNow(-daysAgo),
        };
      } else {
        // Other statuses: today
        updateData = {
          needed_by: hoursFromNow(4 + (i % 6)),
          created_at: daysFromNow(0, -(i % 4)),
          updated_at: now.toISOString(),
        };
      }
      
      const { error: updateError } = await supabase
        .from('requests')
        .update(updateData)
        .eq('id', req.id);
      
      if (!updateError) reqUpdated++;
    }

    return NextResponse.json({
      message: 'Dates updated successfully',
      foodItemsUpdated: foodUpdated,
      requestsUpdated: reqUpdated,
      totalFoodItems: foodItems?.length || 0,
      totalRequests: requests?.length || 0,
      currentDate: now.toISOString(),
    });
    
  } catch (error: any) {
    console.error('Error updating dates:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
