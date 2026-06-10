import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/apiAuth';

// POST - Create a JSON backup of all club data
export async function POST(request: NextRequest) {
  try {
    const { user, club } = await authenticateRequest(request);

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const clubId = user.clubId;

    // Create backup record (non-blocking - don't fail the export if tracking fails)
    let backupId: string | null = null;
    try {
      const backup = await prisma.clubBackup.create({
        data: {
          clubId,
          backupType: 'MANUAL',
          status: 'IN_PROGRESS',
          createdBy: user.fullName,
        },
      });
      backupId = backup.id;
    } catch (e) {
      console.warn('Could not create backup record:', e);
    }

    // Gather all club data.
    // NOTE: queries run SEQUENTIALLY (not Promise.all) on purpose. A parallel
    // fan-out opened ~18 DB connections at once, which made this the first
    // endpoint to fail whenever the database pool was under pressure
    // ("remaining connection slots are reserved"). Sequential gathering uses a
    // single connection at a time — slightly slower but reliable, and backup is
    // not latency-sensitive.
    const coaches = await prisma.coach.findMany({ where: { clubId } });
    const gymsports = await prisma.gymsport.findMany({ where: { clubId } });
    const zones = await prisma.zone.findMany({ where: { clubId } });
    const venues = await prisma.venue.findMany({ where: { clubId } });
    const equipment = await prisma.equipment.findMany({ where: { clubId } });
    const equipmentCategories = await prisma.equipmentCategory.findMany({ where: { clubId } });
    const classTemplates = await prisma.classTemplate.findMany({ where: { clubId } });
    const classSessions = await prisma.classSession.findMany({ where: { clubId } });
    const rosters = await prisma.roster.findMany({ where: { clubId } });
    const rosterTemplates = await prisma.rosterTemplate.findMany({ where: { clubId } });
    const rosterSlots = await prisma.rosterSlot.findMany({ where: { clubId } });
    const injuryFormTemplates = await prisma.injuryFormTemplate.findMany({
      where: { clubId },
      include: { sections: { include: { fields: true } }, automations: true },
    });
    const injurySubmissions = await prisma.injurySubmission.findMany({
      where: { clubId },
      include: { data: true, comments: true },
    });
    const complianceCategories = await prisma.complianceCategory.findMany({ where: { clubId } });
    const complianceItems = await prisma.complianceItem.findMany({ where: { clubId } });
    const maintenanceTasks = await prisma.maintenanceTask.findMany({ where: { clubId } });
    const safetyIssues = await prisma.safetyIssue.findMany({ where: { clubId } });
    const users = await prisma.user.findMany({
      where: { clubId },
      select: { id: true, username: true, email: true, fullName: true, role: true, createdAt: true },
    });

    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      clubName: club.name,
      clubDomain: club.domain,
      clubId,
      data: {
        coaches,
        gymsports,
        zones,
        venues,
        equipment,
        equipmentCategories,
        classTemplates,
        classSessions,
        rosters,
        rosterTemplates,
        rosterSlots,
        injuryFormTemplates,
        injurySubmissions,
        complianceCategories,
        complianceItems,
        maintenanceTasks,
        safetyIssues,
        users,
      },
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const recordCount = Object.values(backupData.data).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);

    // Update backup record and create audit log (non-blocking)
    try {
      if (backupId) {
        await prisma.clubBackup.update({
          where: { id: backupId },
          data: {
            status: 'COMPLETED',
            fileSize: Buffer.byteLength(jsonString, 'utf8'),
            recordCount,
            completedAt: new Date(),
          },
        });
      }

      await prisma.auditLog.create({
        data: {
          clubId,
          userId: user.id,
          action: 'CLUB_BACKUP_CREATED',
          entityType: 'Club',
          entityId: clubId,
          changes: JSON.stringify({ recordCount, backupId }),
        },
      });
    } catch (e) {
      console.warn('Could not update backup record or create audit log:', e);
    }

    // Return JSON file as download
    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${club.domain}-backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error: any) {
    console.error('Backup error:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 });
  }
}

// GET - List backup history
export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticateRequest(request);

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const backups = await prisma.clubBackup.findMany({
      where: { clubId: user.clubId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ backups });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch backups' }, { status: 500 });
  }
}
