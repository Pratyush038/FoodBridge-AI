import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseService } from '@/lib/supabase-service';

// GET /api/feedback - Get feedback
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get('transactionId');
    const forUserId = searchParams.get('forUserId');
    const byUserId = searchParams.get('byUserId');

    if (transactionId) {
      const feedback = await supabaseService.feedback.getByTransaction(transactionId);
      return NextResponse.json(feedback);
    }

    if (forUserId) {
      const feedback = await supabaseService.feedback.getForUser(forUserId);
      return NextResponse.json(feedback);
    }

    if (byUserId) {
      const feedback = await supabaseService.feedback.getByUser(byUserId);
      return NextResponse.json(feedback);
    }

    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in GET /api/feedback:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/feedback - Create feedback
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const feedback = await supabaseService.feedback.create(body);

    return NextResponse.json(feedback, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/feedback:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
