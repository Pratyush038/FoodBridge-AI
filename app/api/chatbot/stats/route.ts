import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { supabaseService } from '@/lib/supabase-service';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get dashboard statistics
    const dashboardStats = await supabaseService.analytics.getDashboardStats();

    // Get user-specific stats if available
    let userDonations = undefined;
    let userRequests = undefined;

    // Try to get user's donor profile
    try {
      const userId = session.user.email || '';
      const donor = await supabaseService.donor.getByUserId(userId);
      if (donor) {
        const foodItems = await supabaseService.foodItem.getByDonor(donor.id);
        userDonations = foodItems.length;
      }
    } catch (error) {
      console.log('No donor profile found');
    }

    // Try to get user's NGO profile
    try {
      const userId = session.user.email || '';
      const ngo = await supabaseService.ngo.getByUserId(userId);
      if (ngo) {
        const requests = await supabaseService.request.getByNGO(ngo.id);
        userRequests = requests.length;
      }
    } catch (error) {
      console.log('No NGO profile found');
    }

    const stats = {
      totalDonations: dashboardStats.totalDonors,
      activeRequests: dashboardStats.activeRequests,
      availableFoodItems: dashboardStats.totalFoodItems,
      completedTransactions: dashboardStats.completedTransactions,
      userDonations,
      userRequests
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
