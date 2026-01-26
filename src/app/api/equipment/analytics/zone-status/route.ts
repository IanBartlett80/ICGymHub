import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/apiAuth';

// GET /api/equipment/analytics/zone-status - Calculate status for each zone
export async function GET(request: NextRequest) {
  try {
    const { club } = await authenticateRequest(request);

    // Get all zones for the club
    const zones = await prisma.zone.findMany({
      where: {
        clubId: club.id,
        active: true,
      },
      include: {
        equipment: {
          where: {
            active: true,
          },
          include: {
            safetyIssues: {
              where: {
                status: {
                  in: ['OPEN', 'IN_PROGRESS'],
                },
              },
            },
            maintenanceTasks: {
              where: {
                status: {
                  in: ['PENDING', 'IN_PROGRESS'],
                },
              },
            },
          },
        },
      },
    });

    // Calculate status for each zone
    const zoneStatuses = zones.map(zone => {
      let status = 'NO_DEFECTS'; // Default
      let statusPriority = 0;
      
      const stats = {
        equipmentCount: zone.equipment.length,
        criticalIssues: 0,
        nonCriticalIssues: 0,
        recommendations: 0,
        overdueMaintenance: 0,
        upcomingMaintenance: 0,
        outOfServiceEquipment: 0,
        poorConditionEquipment: 0,
      };

      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Analyze each piece of equipment
      zone.equipment.forEach(equipment => {
        // Check equipment condition
        if (equipment.condition === 'Out of Service') {
          stats.outOfServiceEquipment++;
          if (statusPriority < 4) {
            status = 'CRITICAL_DEFECTS';
            statusPriority = 4;
          }
        } else if (equipment.condition === 'Poor') {
          stats.poorConditionEquipment++;
          if (statusPriority < 3) {
            status = 'REQUIRES_ATTENTION';
            statusPriority = 3;
          }
        } else if (equipment.condition === 'Fair') {
          if (statusPriority < 2) {
            status = 'NON_CRITICAL_ISSUES';
            statusPriority = 2;
          }
        }

        // Check safety issues
        equipment.safetyIssues.forEach(issue => {
          if (issue.issueType === 'CRITICAL') {
            stats.criticalIssues++;
            if (statusPriority < 4) {
              status = 'CRITICAL_DEFECTS';
              statusPriority = 4;
            }
          } else if (issue.issueType === 'NON_CRITICAL' || issue.issueType === 'NON_CONFORMANCE') {
            stats.nonCriticalIssues++;
            if (statusPriority < 3) {
              status = 'REQUIRES_ATTENTION';
              statusPriority = 3;
            }
          } else if (issue.issueType === 'RECOMMENDATION' || issue.issueType === 'INFORMATIONAL') {
            stats.recommendations++;
            if (statusPriority < 2) {
              status = 'NON_CRITICAL_ISSUES';
              statusPriority = 2;
            }
          }
        });

        // Check maintenance tasks
        equipment.maintenanceTasks.forEach(task => {
          if (task.dueDate) {
            if (task.dueDate < now) {
              // Overdue
              stats.overdueMaintenance++;
              if (task.priority === 'HIGH' && statusPriority < 4) {
                status = 'CRITICAL_DEFECTS';
                statusPriority = 4;
              } else if (statusPriority < 3) {
                status = 'REQUIRES_ATTENTION';
                statusPriority = 3;
              }
            } else if (task.dueDate <= sevenDaysFromNow) {
              // Due soon
              stats.upcomingMaintenance++;
              if (statusPriority < 2) {
                status = 'NON_CRITICAL_ISSUES';
                statusPriority = 2;
              }
            }
          }
        });
      });

      return {
        zoneId: zone.id,
        zoneName: zone.name,
        status,
        statusPriority,
        ...stats,
      };
    });

    return NextResponse.json({
      zones: zoneStatuses,
    });
  } catch (error) {
    console.error('Zone status calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate zone statuses' },
      { status: 500 }
    );
  }
}
