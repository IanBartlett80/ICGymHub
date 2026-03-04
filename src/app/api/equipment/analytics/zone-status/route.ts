import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/apiAuth';

// GET /api/equipment/analytics/zone-status - Calculate status for each zone
export async function GET(request: NextRequest) {
  try {
    const { club } = await authenticateRequest(request);

    console.log('[zone-status] Fetching zones for clubId:', club.id);

    // Try the full query first
    let zones;
    try {
      zones = await prisma.zone.findMany({
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
              safetyIssues: true,
              maintenanceTasks: true,
            },
          },
        },
      });
      console.log('[zone-status] Full query successful');
    } catch (queryError) {
      console.error('[zone-status] Full query failed, trying simplified query:', queryError);
      // Fallback to simpler query without nested includes
      zones = await prisma.zone.findMany({
        where: {
          clubId: club.id,
          active: true,
        },
        include: {
          equipment: {
            where: {
              active: true,
            },
          },
        },
      });
      console.log('[zone-status] Simplified query successful');
    }

    console.log('[zone-status] Found zones:', zones.length);
    console.log('[zone-status] Zone equipment counts:', zones.map(z => ({ name: z.name, equipmentCount: z.equipment.length })));

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
        if (equipment.safetyIssues && Array.isArray(equipment.safetyIssues)) {
          equipment.safetyIssues.forEach(issue => {
            // Only count open/in-progress issues
            if (issue.status !== 'OPEN' && issue.status !== 'IN_PROGRESS') {
              return;
            }
            
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
        }

        // Check maintenance tasks
        if (equipment.maintenanceTasks && Array.isArray(equipment.maintenanceTasks)) {
          equipment.maintenanceTasks.forEach(task => {
          // Only count pending/in-progress tasks
          if (task.status !== 'PENDING' && task.status !== 'IN_PROGRESS') {
            return;
          }
          
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
        }
    });
    return NextResponse.json(
      { 
        error: 'Failed to calculate zone statuses',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
