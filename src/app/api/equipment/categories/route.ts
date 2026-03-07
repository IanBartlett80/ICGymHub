import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

// GET /api/equipment/categories - Get all equipment categories for the club
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categories = await prisma.equipmentCategory.findMany({
      where: {
        clubId: auth.user.clubId,
        active: true,
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Equipment categories list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment categories' },
      { status: 500 }
    );
  }
}

// POST /api/equipment/categories - Create new equipment category
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    // Validation
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Check for duplicate category name
    const existing = await prisma.equipmentCategory.findUnique({
      where: {
        clubId_name: {
          clubId: auth.user.clubId,
          name: name.trim(),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Category name already exists' },
        { status: 400 }
      );
    }

    const category = await prisma.equipmentCategory.create({
      data: {
        clubId: auth.user.clubId,
        name: name.trim(),
        isDefault: false,
        active: true,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Equipment category create error:', error);
    return NextResponse.json(
      { error: 'Failed to create equipment category' },
      { status: 500 }
    );
  }
}
