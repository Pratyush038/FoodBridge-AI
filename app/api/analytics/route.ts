import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseService } from '@/lib/supabase-service';

// GET /api/analytics/dashboard - Get dashboard statistics
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    if (type === 'weekly-report') {
      const data = await supabaseService.analytics.getWeeklyReport();
      return NextResponse.json(data);
    }

    if (type === 'donor-performance') {
      const data = await supabaseService.analytics.getDonorPerformance();
      return NextResponse.json(data);
    }

    if (type === 'ngo-activity') {
      const data = await supabaseService.analytics.getNGOActivity();
      return NextResponse.json(data);
    }

    // Default: return dashboard stats
    const stats = await supabaseService.analytics.getDashboardStats();
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error in GET /api/analytics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
