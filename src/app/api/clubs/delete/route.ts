import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/apiAuth';
import { verifyPassword } from '@/lib/auth';

// POST - Schedule club deletion (30-day soft delete)
export async function POST(request: NextRequest) {
  try {
    const { user, club } = await authenticateRequest(request);

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { password, confirmationText } = body;

    if (!password || !confirmationText) {
      return NextResponse.json({ error: 'Password and confirmation text are required' }, { status: 400 });
    }

    // Verify confirmation text matches club name
    if (confirmationText !== club.name) {
      return NextResponse.json({ error: 'Confirmation text does not match club name' }, { status: 400 });
    }

    // Verify password
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    if (!fullUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const passwordValid = await verifyPassword(password, fullUser.passwordHash);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Check if already scheduled for deletion
    if (club.deletionScheduledFor) {
      return NextResponse.json({ error: 'Club is already scheduled for deletion' }, { status: 400 });
    }

    // Schedule deletion for 30 days from now
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    await prisma.club.update({
      where: { id: club.id },
      data: {
        deletionScheduledFor: deletionDate,
        deletedBy: user.fullName,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        clubId: club.id,
        userId: user.id,
        action: 'CLUB_DELETION_SCHEDULED',
        entityType: 'Club',
        entityId: club.id,
        changes: JSON.stringify({ deletionDate: deletionDate.toISOString() }),
      },
    });

    return NextResponse.json({
      message: 'Club deletion scheduled',
      deletionScheduledFor: deletionDate,
    });
  } catch (error: any) {
    console.error('Delete schedule error:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to schedule deletion' }, { status: 500 });
  }
}

// DELETE - Cancel scheduled deletion
export async function DELETE(request: NextRequest) {
  try {
    const { user, club } = await authenticateRequest(request);

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (!club.deletionScheduledFor) {
      return NextResponse.json({ error: 'No deletion is scheduled' }, { status: 400 });
    }

    await prisma.club.update({
      where: { id: club.id },
      data: {
        deletionScheduledFor: null,
        deletedBy: null,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        clubId: club.id,
        userId: user.id,
        action: 'CLUB_DELETION_CANCELLED',
        entityType: 'Club',
        entityId: club.id,
        changes: JSON.stringify({ action: 'cancellation' }),
      },
    });

    return NextResponse.json({ message: 'Deletion cancelled' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to cancel deletion' }, { status: 500 });
  }
}

// GET - Check deletion status
export async function GET(request: NextRequest) {
  try {
    const { club } = await authenticateRequest(request);

    return NextResponse.json({
      deletionScheduledFor: club.deletionScheduledFor,
      deletedBy: club.deletedBy,
      deletedAt: club.deletedAt,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}
