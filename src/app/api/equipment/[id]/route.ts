import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

// GET /api/equipment/[id] - Get single equipment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const equipment = await prisma.equipment.findFirst({
      where: {
        id,
        clubId: auth.user.clubId,
      },
    });

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    return NextResponse.json(equipment);
  } catch (error) {
    console.error('Equipment get error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}

// PUT /api/equipment/[id] - Update equipment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, category, active } = body;

    // Verify ownership
    const existing = await prisma.equipment.findFirst({
      where: {
        id,
        clubId: auth.user.clubId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    const equipment = await prisma.equipment.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category: category || null }),
        ...(active !== undefined && { active }),
      },
    });

    return NextResponse.json(equipment);
  } catch (error) {
    console.error('Equipment update error:', error);
    return NextResponse.json(
      { error: 'Failed to update equipment' },
      { status: 500 }
    );
  }
}

// DELETE /api/equipment/[id] - Delete equipment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.equipment.findFirst({
      where: {
        id,
        clubId: auth.user.clubId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    await prisma.equipment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Equipment delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete equipment' },
      { status: 500 }
    );
  }
}
