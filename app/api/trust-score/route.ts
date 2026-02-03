/**
 * Food Trust Score API Route
 * 
 * Exposes the Food Trust Scoring Engine via a REST API.
 * This is a NEW, non-breaking API endpoint.
 * 
 * GET /api/trust-score?foodItemId=xxx - Get score for a specific food item
 * POST /api/trust-score - Calculate scores for multiple items (batch)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  calculateFoodTrustScore,
  calculateBatchTrustScores,
  getQuickTrustIndicator,
  FoodItemInput,
} from '@/lib/food-trust-engine';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * GET /api/trust-score?foodItemId=xxx
 * 
 * Calculate trust score for a specific food item
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const foodItemId = searchParams.get('foodItemId');
    const quick = searchParams.get('quick') === 'true';

    if (!foodItemId) {
      return NextResponse.json(
        { error: 'Missing required parameter: foodItemId' },
        { status: 400 }
      );
    }

    // Fetch food item from Supabase (READ-ONLY)
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    // @ts-ignore - Supabase type inference issue with environment variables
    const { data: foodItem, error } = await supabase
      .from('food_items')
      .select('id, donor_id, food_type, pickup_time, expiry_date, pickup_address, pickup_latitude, pickup_longitude, created_at')
      .eq('id', foodItemId)
      .single();

    if (error || !foodItem) {
      return NextResponse.json(
        { error: 'Food item not found' },
        { status: 404 }
      );
    }

    // Map to engine input format
    const item = foodItem as any;
    const input: FoodItemInput = {
      id: item.id,
      donor_id: item.donor_id,
      food_type: item.food_type,
      pickup_time: item.pickup_time,
      expiry_date: item.expiry_date,
      pickup_address: item.pickup_address,
      pickup_latitude: item.pickup_latitude,
      pickup_longitude: item.pickup_longitude,
      created_at: item.created_at,
    };

    // Calculate score
    if (quick) {
      const indicator = await getQuickTrustIndicator(input);
      return NextResponse.json({
        foodItemId,
        ...indicator,
      });
    }

    const trustScore = await calculateFoodTrustScore(input);
    
    return NextResponse.json({
      foodItemId,
      ...trustScore,
    });
  } catch (error) {
    console.error('[TrustScoreAPI] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trust-score
 * 
 * Calculate trust scores for multiple food items (batch)
 * 
 * Request body:
 * {
 *   foodItemIds: string[]
 * }
 * 
 * OR
 * 
 * {
 *   foodItems: FoodItemInput[]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { foodItemIds, foodItems } = body;

    if (!foodItemIds && !foodItems) {
      return NextResponse.json(
        { error: 'Request body must contain foodItemIds or foodItems' },
        { status: 400 }
      );
    }

    let inputs: FoodItemInput[] = [];

    // If IDs provided, fetch from database
    if (foodItemIds && Array.isArray(foodItemIds)) {
      if (!isSupabaseConfigured()) {
        return NextResponse.json(
          { error: 'Database not configured' },
          { status: 503 }
        );
      }

      // @ts-ignore - Supabase type inference issue with environment variables
      const { data, error } = await supabase
        .from('food_items')
        .select('id, donor_id, food_type, pickup_time, expiry_date, pickup_address, pickup_latitude, pickup_longitude, created_at')
        .in('id', foodItemIds);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch food items' },
          { status: 500 }
        );
      }

      const itemList = (data || []) as any[];
      inputs = itemList.map(item => ({
        id: item.id,
        donor_id: item.donor_id,
        food_type: item.food_type,
        pickup_time: item.pickup_time,
        expiry_date: item.expiry_date,
        pickup_address: item.pickup_address,
        pickup_latitude: item.pickup_latitude,
        pickup_longitude: item.pickup_longitude,
        created_at: item.created_at,
      }));
    } else if (foodItems && Array.isArray(foodItems)) {
      // Direct food item data provided
      inputs = foodItems;
    }

    if (inputs.length === 0) {
      return NextResponse.json({
        scores: {},
        count: 0,
      });
    }

    // Calculate batch scores
    const scoresMap = await calculateBatchTrustScores(inputs);
    
    // Convert Map to object for JSON response
    const scores: Record<string, any> = {};
    scoresMap.forEach((score, id) => {
      scores[id] = score;
    });

    return NextResponse.json({
      scores,
      count: Object.keys(scores).length,
    });
  } catch (error) {
    console.error('[TrustScoreAPI] Batch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
