import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

function getAccessToken(req: NextRequest): string | null {
  const headerToken = req.headers.get('authorization');
  if (headerToken?.startsWith('Bearer ')) {
    return headerToken.replace('Bearer ', '').trim();
  }
  const cookieToken = req.cookies.get('accessToken')?.value;
  return cookieToken || null;
}

async function getAuthenticatedUser(req: NextRequest) {
  const token = getAccessToken(req);
  if (!token) return null;
  return await verifyAccessToken(token);
}

// POST - Initiate soft delete (30-day cooling off period)
export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await getAuthenticatedUser(request);
    
    if (!tokenPayload?.clubId || !tokenPayload?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role and password to check admin status
    const user = await prisma.user.findUnique({
      where: { id: tokenPayload.userId },
      select: { 
        id: true, 
        role: true, 
        clubId: true, 
        fullName: true,
        email: true,
        passwordHash: true,
      },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const clubId = user.clubId;

    // Get password from request body
    const body = await request.json();
    const { password, confirmationText } = body;

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Get club information
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: {
        name: true,
        deletedAt: true,
        deletionScheduledFor: true,
      },
    });

    if (!club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    // Check if already marked for deletion
    if (club.deletedAt) {
      return NextResponse.json({ 
        error: 'Club is already scheduled for deletion',
        deletionDate: club.deletionScheduledFor,
      }, { status: 400 });
    }

    // Verify confirmation text matches club name (optional additional security)
    if (confirmationText && confirmationText !== club.name) {
      return NextResponse.json({ 
        error: 'Confirmation text does not match club name',
      }, { status: 400 });
    }

    // Calculate deletion date (30 days from now)
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    // Mark club for deletion
    await prisma.club.update({
      where: { id: clubId },
      data: {
        deletedAt: new Date(),
        deletionScheduledFor: deletionDate,
        deletedBy: user.fullName,
        status: 'PENDING_DELETION',
      },
    });

    // Log the deletion initiation
    await prisma.auditLog.create({
      data: {
        clubId,
        userId: user.id,
        action: 'CLUB_DELETION_REQUESTED',
        entityType: 'Club',
        entityId: clubId,
        changes: JSON.stringify({
          deletedBy: user.fullName,
          deletedByEmail: user.email,
          deletionScheduledFor: deletionDate.toISOString(),
          initiatedAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Club deletion has been scheduled',
      deletionDate: deletionDate.toISOString(),
      daysUntilDeletion: 30,
      warning: 'All club data will be permanently deleted after 30 days. You can cancel this deletion before then.',
    });

  } catch (error) {
    console.error('Failed to initiate club deletion:', error);
    return NextResponse.json(
      { 
        error: 'Failed to initiate club deletion',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE - Cancel scheduled deletion
export async function DELETE(request: NextRequest) {
  try {
    const tokenPayload = await getAuthenticatedUser(request);
    
    if (!tokenPayload?.clubId || !tokenPayload?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role to check admin status
    const user = await prisma.user.findUnique({
      where: { id: tokenPayload.userId },
      select: { 
        id: true, 
        role: true, 
        clubId: true, 
        fullName: true,
      },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const clubId = user.clubId;

    // Get club information
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: {
        deletedAt: true,
        deletionScheduledFor: true,
      },
    });

    if (!club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    // Check if scheduled for deletion
    if (!club.deletedAt) {
      return NextResponse.json({ 
        error: 'Club is not scheduled for deletion',
      }, { status: 400 });
    }

    // Cancel the deletion
    await prisma.club.update({
      where: { id: clubId },
      data: {
        deletedAt: null,
        deletionScheduledFor: null,
        deletedBy: null,
        status: 'ACTIVE',
      },
    });

    // Log the cancellation
    await prisma.auditLog.create({
      data: {
        clubId,
        userId: user.id,
        action: 'CLUB_DELETION_CANCELLED',
        entityType: 'Club',
        entityId: clubId,
        changes: JSON.stringify({
          cancelledBy: user.fullName,
          cancelledAt: new Date().toISOString(),
          previousDeletionDate: club.deletionScheduledFor?.toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Club deletion has been cancelled',
    });

  } catch (error) {
    console.error('Failed to cancel club deletion:', error);
    return NextResponse.json(
      { 
        error: 'Failed to cancel club deletion',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET - Check deletion status
export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await getAuthenticatedUser(request);
    
    if (!tokenPayload?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const club = await prisma.club.findUnique({
      where: { id: tokenPayload.clubId },
      select: {
        deletedAt: true,
        deletionScheduledFor: true,
        deletedBy: true,
        status: true,
      },
    });

    if (!club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    return NextResponse.json({
      isPendingDeletion: !!club.deletedAt,
      deletionScheduledFor: club.deletionScheduledFor,
      deletedBy: club.deletedBy,
      daysUntilDeletion: club.deletionScheduledFor 
        ? Math.ceil((club.deletionScheduledFor.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null,
    });

  } catch (error) {
    console.error('Failed to check deletion status:', error);
    return NextResponse.json(
      { error: 'Failed to check deletion status' },
      { status: 500 }
    );
  }
}
