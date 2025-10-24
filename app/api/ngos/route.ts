import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseService } from '@/lib/supabase-service';

// GET /api/ngos - Get all NGOs or specific NGO
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const ngoId = searchParams.get('id');

    if (userId) {
      const ngo = await supabaseService.ngo.getByUserId(userId);
      return NextResponse.json(ngo);
    }

    if (ngoId) {
      const ngo = await supabaseService.ngo.getById(ngoId);
      return NextResponse.json(ngo);
    }

    const ngos = await supabaseService.ngo.getAll();
    return NextResponse.json(ngos);
  } catch (error: any) {
    console.error('Error in GET /api/ngos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/ngos - Create a new NGO
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const ngo = await supabaseService.ngo.create(body);

    return NextResponse.json(ngo, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/ngos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/ngos - Update an NGO
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'NGO ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const ngo = await supabaseService.ngo.update(id, body);

    return NextResponse.json(ngo);
  } catch (error: any) {
    console.error('Error in PUT /api/ngos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
