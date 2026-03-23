import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import JSZip from 'jszip';

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

// POST - Create a backup of all club data
export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await getAuthenticatedUser(request);
    
    if (!tokenPayload?.clubId || !tokenPayload?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role to check admin status
    const user = await prisma.user.findUnique({
      where: { id: tokenPayload.userId },
      select: { id: true, role: true, clubId: true, fullName: true },
    });

    if (!user || user.role !== 'ADMIN') {
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

    try {
      // Fetch all club data
      const clubData = await prisma.club.findUnique({
        where: { id: clubId },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              username: true,
              fullName: true,
              role: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          venues: {
            include: {
              zones: true,
            },
          },
          gymsports: true,
          coaches: {
            include: {
              gymsports: true,
              availability: true,
            },
          },
          classTemplates: {
            include: {
              allowedZones: {
                include: {
                  zone: true,
                },
              },
              defaultCoaches: {
                include: {
                  coach: true,
                },
              },
            },
          },
          classSessions: {
            include: {
              allowedZones: {
                include: {
                  zone: true,
                },
              },
              coaches: {
                include: {
                  coach: true,
                },
              },
            },
          },
          rosters: {
            include: {
              slots: {
                include: {
                  zone: true,
                },
              },
            },
          },
          rosterTemplates: true,
          equipment: {
            include: {
              maintenanceLogs: true,
              maintenanceTasks: true,
              safetyIssues: {
                include: {
                  repairQuoteRequests: true,
                },
              },
            },
          },
          equipmentCategories: true,
          injuryFormTemplates: {
            include: {
              sections: {
                include: {
                  fields: true,
                },
              },
              fields: true,
              automations: true,
              submissions: {
                include: {
                  data: {
                    include: {
                      field: true,
                    },
                  },
                  comments: true,
                  auditLog: true,
                },
              },
            },
          },
          complianceCategories: true,
          complianceItems: true,
          auditLogs: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1000, // Limit audit logs to most recent 1000
          },
        },
      });

      if (!clubData) {
        throw new Error('Club not found');
      }

      // Calculate statistics
      const stats = {
        users: clubData.users.length,
        venues: clubData.venues.length,
        zones: clubData.venues.reduce((sum, v) => sum + v.zones.length, 0),
        gymsports: clubData.gymsports.length,
        coaches: clubData.coaches.length,
        classTemplates: clubData.classTemplates.length,
        classSessions: clubData.classSessions.length,
        rosters: clubData.rosters.length,
        equipment: clubData.equipment.length,
        injuryFormTemplates: clubData.injuryFormTemplates.length,
        injurySubmissions: clubData.injuryFormTemplates.reduce(
          (sum, t) => sum + t.submissions.length,
          0
        ),
        complianceItems: clubData.complianceItems.length,
        auditLogs: clubData.auditLogs.length,
      };

      // Prepare export data
      const exportData = {
        metadata: {
          version: '1.0',
          exportDate: new Date().toISOString(),
          clubId: clubData.id,
          clubName: clubData.name,
          exportedBy: user.fullName,
          backupId: backup.id,
          statistics: stats,
        },
        club: {
          name: clubData.name,
          slug: clubData.slug,
          abn: clubData.abn,
          domain: clubData.domain,
          timezone: clubData.timezone,
          address: clubData.address,
          city: clubData.city,
          state: clubData.state,
          postalCode: clubData.postalCode,
          phone: clubData.phone,
          website: clubData.website,
        },
        data: clubData,
      };

      // Create ZIP file with backup
      const zip = new JSZip();
      
      // Add main backup JSON
      zip.file('backup.json', JSON.stringify(exportData, null, 2));
      
      // Add README
      const readme = `# GymHub Club Backup
      
Club: ${clubData.name}
Exported: ${new Date().toISOString()}
Exported By: ${user.fullName}
Backup ID: ${backup.id}

## Statistics
- Users: ${stats.users}
- Venues: ${stats.venues}
- Zones: ${stats.zones}
- Gym Sports: ${stats.gymsports}
- Coaches: ${stats.coaches}
- Class Templates: ${stats.classTemplates}
- Class Sessions: ${stats.classSessions}
- Rosters: ${stats.rosters}
- Equipment: ${stats.equipment}
- Injury Form Templates: ${stats.injuryFormTemplates}
- Injury Submissions: ${stats.injurySubmissions}
- Compliance Items: ${stats.complianceItems}
- Audit Logs: ${stats.auditLogs}

## Important Notice
⚠️ **Australian WHS Compliance**: Injury reports must be retained for a minimum of 7 years as per SafeWork Australia regulations.

## Restoration
To restore this backup, use the GymHub backup restoration feature in Profile Settings.
This will overwrite all existing data for your club with the data from this backup.

⚠️ **Warning**: Restoration is irreversible and will replace all current data.
`;
      
      zip.file('README.md', readme);

      // Generate ZIP buffer
      const zipBuffer = await zip.generateAsync({ 
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
      });

      const totalRecords = Object.values(stats).reduce((sum, count) => sum + count, 0);

      // Update backup record
      await prisma.clubBackup.update({
        where: { id: backup.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          fileSize: zipBuffer.length,
          recordCount: totalRecords,
        },
      });

      // Log the backup action
      await prisma.auditLog.create({
        data: {
          clubId,
          userId: user.id,
          action: 'CLUB_BACKUP_CREATED',
          entityType: 'Club',
          entityId: clubId,
          changes: JSON.stringify({
            backupId: backup.id,
            recordCount: totalRecords,
            fileSize: zipBuffer.length,
          }),
        },
      });

      // Return the ZIP file
      return new NextResponse(zipBuffer as any, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="gymhub-backup-${clubData.slug}-${new Date().toISOString().split('T')[0]}.zip"`,
          'Content-Length': zipBuffer.length.toString(),
        },
      });

    } catch (error) {
      // Update backup record with error
      await prisma.clubBackup.update({
        where: { id: backup.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      });
      
      throw error;
    }

  } catch (error) {
    console.error('Failed to create backup:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create backup',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET - List all backups for the club
export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await getAuthenticatedUser(request);
    
    if (!tokenPayload?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const backups = await prisma.clubBackup.findMany({
      where: { clubId: tokenPayload.clubId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to 50 most recent backups
    });

    return NextResponse.json({ backups });

  } catch (error) {
    console.error('Failed to fetch backups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch backups' },
      { status: 500 }
    );
  }
}
