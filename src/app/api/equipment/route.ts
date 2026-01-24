import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

// GET /api/equipment - List all equipment for club
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    const equipment = await prisma.equipment.findMany({
      where: {
        clubId: auth.user.clubId,
        ...(activeOnly && { active: true }),
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(equipment);
  } catch (error) {
    console.error('Equipment list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}

// POST /api/equipment - Create new equipment
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, category } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Equipment name is required' },
        { status: 400 }
      );
    }

    const equipment = await prisma.equipment.create({
      data: {
        clubId: auth.user.clubId,
        name,
        category: category || null,
        active: true,
      },
    });

    return NextResponse.json(equipment, { status: 201 });
  } catch (error) {
    console.error('Equipment create error:', error);
    return NextResponse.json(
      { error: 'Failed to create equipment' },
      { status: 500 }
    );
  }
}
