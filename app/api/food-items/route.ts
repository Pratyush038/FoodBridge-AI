import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseService } from '@/lib/supabase-service';

// GET /api/food-items - Get food items
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const donorId = searchParams.get('donorId');
    const available = searchParams.get('available');

    if (id) {
      const foodItem = await supabaseService.foodItem.getById(id);
      return NextResponse.json(foodItem);
    }

    if (donorId) {
      const foodItems = await supabaseService.foodItem.getByDonor(donorId);
      return NextResponse.json(foodItems);
    }

    if (available === 'true') {
      const foodItems = await supabaseService.foodItem.getAvailable();
      return NextResponse.json(foodItems);
    }

    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in GET /api/food-items:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/food-items - Create a new food item
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const foodItem = await supabaseService.foodItem.create(body);

    return NextResponse.json(foodItem, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/food-items:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/food-items - Update a food item
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
        { error: 'Food item ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const foodItem = await supabaseService.foodItem.update(id, body);

    return NextResponse.json(foodItem);
  } catch (error: any) {
    console.error('Error in PUT /api/food-items:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/food-items - Delete a food item
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
        { error: 'Food item ID is required' },
        { status: 400 }
      );
    }

    const success = await supabaseService.foodItem.delete(id);

    return NextResponse.json({ success });
  } catch (error: any) {
    console.error('Error in DELETE /api/food-items:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
