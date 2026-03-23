import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/apiAuth';
import { verifyPassword } from '@/lib/auth';

// POST - Restore club data from a JSON backup file
export async function POST(request: NextRequest) {
  try {
    const { user, club } = await authenticateRequest(request);

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const password = formData.get('password') as string | null;

    if (!file || !password) {
      return NextResponse.json({ error: 'Backup file and password are required' }, { status: 400 });
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

    // Parse backup file
    const fileContent = await file.text();
    let backupData: any;

    try {
      backupData = JSON.parse(fileContent);
    } catch {
      return NextResponse.json({ error: 'Invalid backup file format' }, { status: 400 });
    }

    // Validate backup structure
    if (!backupData.version || !backupData.data || !backupData.clubId) {
      return NextResponse.json({ error: 'Invalid backup file structure' }, { status: 400 });
    }

    // Security: Ensure backup belongs to this club
    if (backupData.clubDomain !== club.domain) {
      return NextResponse.json({ 
        error: 'This backup belongs to a different club and cannot be restored here' 
      }, { status: 403 });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        clubId: club.id,
        userId: user.id,
        action: 'CLUB_RESTORE_STARTED',
        entityType: 'Club',
        entityId: club.id,
        changes: JSON.stringify({ backupDate: backupData.exportedAt }),
      },
    });

    // Count records in backup
    const recordCount = Object.values(backupData.data).reduce(
      (sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0
    );

    // Log successful validation
    await prisma.auditLog.create({
      data: {
        clubId: club.id,
        userId: user.id,
        action: 'CLUB_RESTORE_VALIDATED',
        entityType: 'Club',
        entityId: club.id,
        changes: JSON.stringify({ recordCount, tables: Object.keys(backupData.data) }),
      },
    });

    return NextResponse.json({
      message: 'Backup validated successfully',
      summary: {
        exportedAt: backupData.exportedAt,
        clubName: backupData.clubName,
        recordCount,
        tables: Object.entries(backupData.data).map(([key, val]: [string, any]) => ({
          name: key,
          count: Array.isArray(val) ? val.length : 0,
        })),
      },
    });
  } catch (error: any) {
    console.error('Restore error:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to process backup file' }, { status: 500 });
  }
}
