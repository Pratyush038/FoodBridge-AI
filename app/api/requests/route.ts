import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseService } from '@/lib/supabase-service';

// GET /api/requests - Get requests
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const ngoId = searchParams.get('ngoId');
    const active = searchParams.get('active');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const maxDistance = searchParams.get('maxDistance');

    if (id) {
      const request = await supabaseService.request.getById(id);
      return NextResponse.json(request);
    }

    if (ngoId) {
      const requests = await supabaseService.request.getByNGO(ngoId);
      return NextResponse.json(requests);
    }

    if (active === 'true') {
      const requests = await supabaseService.request.getActive();
      return NextResponse.json(requests);
    }

    if (lat && lng) {
      const requests = await supabaseService.request.getNearby(
        parseFloat(lat),
        parseFloat(lng),
        maxDistance ? parseFloat(maxDistance) : 50
      );
      return NextResponse.json(requests);
    }

    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in GET /api/requests:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/requests - Create a new request
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const request = await supabaseService.request.create(body);

    return NextResponse.json(request, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/requests:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/requests - Update a request
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
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const request = await supabaseService.request.update(id, body);

    return NextResponse.json(request);
  } catch (error: any) {
    console.error('Error in PUT /api/requests:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/requests - Delete a request
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    const success = await supabaseService.request.delete(id);

    return NextResponse.json({ success });
  } catch (error: any) {
    console.error('Error in DELETE /api/requests:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
