import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseService } from '@/lib/supabase-service';

// GET /api/donors - Get all donors or specific donor
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const donorId = searchParams.get('id');

    if (userId) {
      const donor = await supabaseService.donor.getByUserId(userId);
      return NextResponse.json(donor);
    }

    if (donorId) {
      const donor = await supabaseService.donor.getById(donorId);
      return NextResponse.json(donor);
    }

    const donors = await supabaseService.donor.getAll();
    return NextResponse.json(donors);
  } catch (error: any) {
    console.error('Error in GET /api/donors:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/donors - Create a new donor
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const donor = await supabaseService.donor.create(body);

    return NextResponse.json(donor, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/donors:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/donors - Update a donor
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
        { error: 'Donor ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const donor = await supabaseService.donor.update(id, body);

    return NextResponse.json(donor);
  } catch (error: any) {
    console.error('Error in PUT /api/donors:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
