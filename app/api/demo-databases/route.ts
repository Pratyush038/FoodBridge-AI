/**
 * Database Demo API
 * 
 * This endpoint demonstrates the use of both SQL (PostgreSQL/Supabase) 
 * and NoSQL (Firebase Realtime Database) in the same application.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { firebaseNoSQLService } from '@/lib/firebase-nosql-service';

export async function GET(request: NextRequest) {
  try {
    // ============================================
    // SQL DATABASE (PostgreSQL via Supabase)
    // ============================================
    console.log('📊 Fetching data from SQL database (PostgreSQL/Supabase)...');
    
    // Query structured relational data
    const { data: donors, error: donorsError } = await supabase
      .from('donors')
      .select('id, name, email, created_at')
      .limit(5);
    
    const { data: ngos, error: ngosError } = await supabase
      .from('ngos')
      .select('id, name, email, created_at')
      .limit(5);
    
    const { data: foodItems, error: foodError } = await supabase
      .from('food_items')
      .select('id, food_type, quantity, status, created_at')
      .limit(10);
    
    const { data: requests, error: requestsError } = await supabase
      .from('requests')
      .select('id, title, food_type, status, created_at')
      .limit(10);

    // ============================================
    // NoSQL DATABASE (Firebase Realtime Database)
    // ============================================
    console.log('🔥 Fetching data from NoSQL database (Firebase)...');
    
    // Get real-time activity feed
    const activities = await firebaseNoSQLService.activityFeed.getRecent(10);
    
    // Get analytics cache (fast, temporary data)
    const analyticsCache = await firebaseNoSQLService.analytics.get();
    
    // Get online users count
    const onlineCount = await firebaseNoSQLService.presence.getOnlineCount();

    // ============================================
    // RESPONSE WITH BOTH DATABASES
    // ============================================
    return NextResponse.json({
      success: true,
      message: 'Dual database demonstration',
      databases: {
        sql: {
          type: 'PostgreSQL (Relational)',
          provider: 'Supabase',
          description: 'Structured data with schemas, relationships, and ACID properties',
          data: {
            donors: donors || [],
            ngos: ngos || [],
            foodItems: foodItems || [],
            requests: requests || [],
          },
          totalRecords: {
            donors: donors?.length || 0,
            ngos: ngos?.length || 0,
            foodItems: foodItems?.length || 0,
            requests: requests?.length || 0,
          }
        },
        nosql: {
          type: 'Firebase Realtime Database (Document/JSON)',
          provider: 'Firebase',
          description: 'Flexible JSON documents, real-time sync, no fixed schema',
          data: {
            activityFeed: activities,
            analyticsCache: analyticsCache,
            onlineUsers: onlineCount,
          },
          totalRecords: {
            activities: activities.length,
            onlineUsers: onlineCount,
          }
        }
      },
      comparison: {
        sql_characteristics: [
          'Fixed schema with tables and columns',
          'ACID transactions (Atomicity, Consistency, Isolation, Durability)',
          'Complex JOINs and relationships',
          'Great for structured data',
          'Vertical scaling'
        ],
        nosql_characteristics: [
          'Flexible JSON structure',
          'Real-time data synchronization',
          'No schema required',
          'Great for rapid changes and real-time apps',
          'Horizontal scaling'
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ Error in database demo:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST endpoint to seed some demo data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { seedFirebase = false } = body;

    if (seedFirebase) {
      console.log('🌱 Seeding Firebase NoSQL database...');
      
      // Create activity feed entries
      await firebaseNoSQLService.activityFeed.create({
        type: 'donation_created',
        message: 'Demo: New food donation created',
        metadata: {
          foodType: 'Fresh Vegetables',
          quantity: '50kg'
        }
      });

      await firebaseNoSQLService.activityFeed.create({
        type: 'requirement_created',
        message: 'Demo: New food requirement posted',
        metadata: {
          foodType: 'Rice',
          quantity: '100kg'
        }
      });

      await firebaseNoSQLService.activityFeed.create({
        type: 'match_created',
        message: 'Demo: AI matched donation with requirement',
        metadata: {
          matchScore: 95,
          distance: 2.5
        }
      });

      // Update analytics cache
      await firebaseNoSQLService.analytics.update({
        totalDonations: 25,
        totalRequests: 18,
        totalMatches: 12,
        activeUsers: 8
      });

      // Set some demo users online
      await firebaseNoSQLService.presence.setOnline('demo-user-1', '/donor');
      await firebaseNoSQLService.presence.setOnline('demo-user-2', '/receiver');

      return NextResponse.json({
        success: true,
        message: 'Firebase NoSQL database seeded successfully',
        seeded: {
          activities: 3,
          analytics: 1,
          onlineUsers: 2
        }
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Please set seedFirebase=true to seed data'
    });

  } catch (error) {
    console.error('❌ Error seeding Firebase:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
