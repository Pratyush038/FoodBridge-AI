import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseService } from '@/lib/supabase-service';

// GET /api/transactions - Get transactions
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const donorId = searchParams.get('donorId');
    const ngoId = searchParams.get('ngoId');

    if (id) {
      const transaction = await supabaseService.transaction.getById(id);
      return NextResponse.json(transaction);
    }

    if (donorId) {
      const transactions = await supabaseService.transaction.getByDonor(donorId);
      return NextResponse.json(transactions);
    }

    if (ngoId) {
      const transactions = await supabaseService.transaction.getByNGO(ngoId);
      return NextResponse.json(transactions);
    }

    const transactions = await supabaseService.transaction.getAll();
    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error('Error in GET /api/transactions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/transactions - Create a new transaction
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    // Calculate match score if not provided
    if (!body.match_score && body.food_item_id && body.request_id) {
      body.match_score = await supabaseService.transaction.calculateMatchScore(
        body.food_item_id,
        body.request_id
      );
    }

    const transaction = await supabaseService.transaction.create(body);

    return NextResponse.json(transaction, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/transactions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/transactions - Update a transaction
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const transaction = await supabaseService.transaction.update(id, body);

    return NextResponse.json(transaction);
  } catch (error: any) {
    console.error('Error in PUT /api/transactions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
