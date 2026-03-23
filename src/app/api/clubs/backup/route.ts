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

    // Create backup record
    const backup = await prisma.clubBackup.create({
      data: {
        clubId,
        backupType: 'MANUAL',
        status: 'IN_PROGRESS',
        createdBy: user.fullName,
      },
    });

    // Gather all club data
    const [
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
    ] = await Promise.all([
      prisma.coach.findMany({ where: { clubId } }),
      prisma.gymsport.findMany({ where: { clubId } }),
      prisma.zone.findMany({ where: { clubId } }),
      prisma.venue.findMany({ where: { clubId } }),
      prisma.equipment.findMany({ where: { clubId } }),
      prisma.equipmentCategory.findMany({ where: { clubId } }),
      prisma.classTemplate.findMany({ where: { clubId } }),
      prisma.classSession.findMany({ where: { clubId } }),
      prisma.roster.findMany({ where: { clubId } }),
      prisma.rosterTemplate.findMany({ where: { clubId } }),
      prisma.rosterSlot.findMany({ where: { clubId } }),
      prisma.injuryFormTemplate.findMany({ where: { clubId }, include: { sections: { include: { fields: true } }, automations: true } }),
      prisma.injurySubmission.findMany({ where: { clubId }, include: { data: true, comments: true } }),
      prisma.complianceCategory.findMany({ where: { clubId } }),
      prisma.complianceItem.findMany({ where: { clubId } }),
      prisma.maintenanceTask.findMany({ where: { clubId } }),
      prisma.safetyIssue.findMany({ where: { clubId } }),
      prisma.user.findMany({ where: { clubId }, select: { id: true, username: true, email: true, fullName: true, role: true, createdAt: true } }),
    ]);

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

    // Update backup record
    await prisma.clubBackup.update({
      where: { id: backup.id },
      data: {
        status: 'COMPLETED',
        fileSize: Buffer.byteLength(jsonString, 'utf8'),
        recordCount,
        completedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        clubId,
        userId: user.id,
        action: 'CLUB_BACKUP_CREATED',
        entityType: 'Club',
        entityId: clubId,
        changes: JSON.stringify({ recordCount, backupId: backup.id }),
      },
    });

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
