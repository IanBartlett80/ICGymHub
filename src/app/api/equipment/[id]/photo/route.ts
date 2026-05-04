import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

// GET /api/equipment/[id]/photo - Return only the photo for a single equipment item.
// Kept separate from the list endpoint so the grid can lazy-load photos without
// bloating the initial list payload.
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
      select: {
        photoUrl: true,
      },
    });

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    if (!equipment.photoUrl) {
      return NextResponse.json({ photoUrl: null });
    }

    return NextResponse.json({ photoUrl: equipment.photoUrl });
  } catch (error) {
    console.error('Equipment photo fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photo' },
      { status: 500 }
    );
  }
}
