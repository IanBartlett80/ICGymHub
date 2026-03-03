import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/apiAuth'

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = { clubId: authResult.user.clubId }

    const now = new Date()
    
    // Calculate Monday of current week
    const currentDay = now.getDay()
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - daysFromMonday)
    monday.setHours(0, 0, 0, 0)
    
    // Calculate Sunday of current week
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    // Previous week for comparison
    const previousMonday = new Date(monday)
    previousMonday.setDate(monday.getDate() - 7)
    const previousSunday = new Date(previousMonday)
    previousSunday.setDate(previousMonday.getDate() + 6)
    previousSunday.setHours(23, 59, 59, 999)

    // First day of current month
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    // Previous month for comparison
    const firstDayOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDayOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    
    // Last 6 months for trends
    const sixMonthsAgo = new Date(now)
    sixMonthsAgo.setMonth(now.getMonth() - 6)

    // ROSTER STATS
    const weeklyClasses = await prisma.classSession.count({
      where: {
        clubId: decoded.clubId,
        date: {
          gte: monday,
          lte: sunday
        }
      }
    })

    const previousWeekClasses = await prisma.classSession.count({
      where: {
        clubId: decoded.clubId,
        date: {
          gte: previousMonday,
          lte: previousSunday
        }
      }
    })

    const activeConflicts = await prisma.rosterSlot.count({
      where: {
        clubId: decoded.clubId,
        conflictFlag: true,
        session: {
          date: {
            gte: monday,
            lte: sunday
          }
        }
      }
    })

    const upcomingClasses = await prisma.classSession.count({
      where: {
        clubId: decoded.clubId,
        date: {
          gte: now
        }
      },
      take: 100
    })

    const totalCoaches = await prisma.coach.count({
      where: {
        clubId: decoded.clubId
      }
    })

    const totalGymsports = await prisma.gymsport.count({
      where: {
        clubId: decoded.clubId
      }
    })

    // SAFETY/INJURY STATS
    const openIncidents = await prisma.injurySubmission.count({
      where: {
        clubId: decoded.clubId,
        status: {
          in: ['NEW', 'UNDER_REVIEW']
        }
      }
    })

    const totalIncidentsThisMonth = await prisma.injurySubmission.count({
      where: {
        clubId: decoded.clubId,
        submittedAt: {
          gte: firstDayOfMonth
        }
      }
    })

    const totalIncidentsPreviousMonth = await prisma.injurySubmission.count({
      where: {
        clubId: decoded.clubId,
        submittedAt: {
          gte: firstDayOfPreviousMonth,
          lte: lastDayOfPreviousMonth
        }
      }
    })

    const criticalIncidents = await prisma.injurySubmission.count({
      where: {
        clubId: decoded.clubId,
        status: {
          in: ['NEW', 'UNDER_REVIEW']
        },
        template: {
          name: { contains: 'Critical' }
        }
      }
    })

    const resolvedThisMonth = await prisma.injurySubmission.count({
      where: {
        clubId: decoded.clubId,
        status: 'RESOLVED',
        updatedAt: {
          gte: firstDayOfMonth
        }
      }
    })

    // Calculate average response time (in hours)
    const resolvedSubmissions = await prisma.injurySubmission.findMany({
      where: {
        clubId: decoded.clubId,
        status: 'RESOLVED',
        updatedAt: {
          gte: sixMonthsAgo
        }
      },
      select: {
        submittedAt: true,
        updatedAt: true
      }
    })

    const avgResponseTime = resolvedSubmissions.length > 0
      ? resolvedSubmissions.reduce((sum, sub) => {
          const hours = (new Date(sub.updatedAt).getTime() - new Date(sub.submittedAt).getTime()) / (1000 * 60 * 60)
          return sum + hours
        }, 0) / resolvedSubmissions.length
      : 0

    // EQUIPMENT STATS
    const totalEquipment = await prisma.equipment.count({
      where: {
        clubId: decoded.clubId,
        active: true
      }
    })

    const maintenanceDue = await prisma.equipment.count({
      where: {
        clubId: decoded.clubId,
        active: true,
        nextMaintenance: {
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
        }
      }
    })

    const criticalEquipment = await prisma.safetyIssue.count({
      where: {
        clubId: decoded.clubId,
        status: 'OPEN',
        issueType: 'CRITICAL'
      }
    })

    const equipmentInUse = await prisma.equipment.count({
      where: {
        clubId: decoded.clubId,
        inUse: true
      }
    })

    const openSafetyIssues = await prisma.safetyIssue.count({
      where: {
        clubId: decoded.clubId,
        status: {
          in: ['OPEN', 'IN_PROGRESS']
        }
      }
    })

    // MAINTENANCE TASK STATS
    const pendingMaintenanceTasks = await prisma.maintenanceTask.count({
      where: {
        clubId: decoded.clubId,
        status: {
          in: ['PENDING', 'IN_PROGRESS']
        }
      }
    })

    const overdueTasks = await prisma.maintenanceTask.count({
      where: {
        clubId: decoded.clubId,
        status: {
          in: ['PENDING', 'IN_PROGRESS']
        },
        dueDate: {
          lt: now
        }
      }
    })

    const completedThisMonth = await prisma.maintenanceTask.count({
      where: {
        clubId: decoded.clubId,
        status: 'COMPLETED',
        completedDate: {
          gte: firstDayOfMonth
        }
      }
    })

    const recurringTasks = await prisma.maintenanceTask.count({
      where: {
        clubId: decoded.clubId,
        status: {
          not: 'CANCELLED'
        }
      }
    })

    // WEEKLY CLASS CHART DATA (last 7 days)
    const weeklyClassData = []
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(now.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDay = new Date(date)
      nextDay.setDate(date.getDate() + 1)

      const classes = await prisma.classSession.count({
        where: {
          clubId: decoded.clubId,
          date: {
            gte: date,
            lt: nextDay
          }
        }
      })

      const conflicts = await prisma.rosterSlot.count({
        where: {
          clubId: decoded.clubId,
          conflictFlag: true,
          session: {
            date: {
              gte: date,
              lt: nextDay
            }
          }
        }
      })

      weeklyClassData.push({
        day: dayNames[date.getDay()],
        classes,
        conflicts
      })
    }

    // INJURY TRENDS (last 6 months)
    const injuryTrends = []
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now)
      monthDate.setMonth(now.getMonth() - i)
      const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
      const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59)

      const incidents = await prisma.injurySubmission.count({
        where: {
          clubId: decoded.clubId,
          submittedAt: {
            gte: firstDay,
            lte: lastDay
          }
        }
      })

      const critical = await prisma.injurySubmission.count({
        where: {
          clubId: decoded.clubId,
          submittedAt: {
            gte: firstDay,
            lte: lastDay
          },
          template: {
            name: { contains: 'Critical' }
          }
        }
      })

      injuryTrends.push({
        month: monthNames[monthDate.getMonth()],
        incidents,
        critical
      })
    }

    // EQUIPMENT CONDITION DISTRIBUTION
    const equipmentByCondition = await prisma.equipment.groupBy({
      by: ['condition'],
      where: {
        clubId: decoded.clubId,
        active: true
      },
      _count: true
    })

    const equipmentStatusData = equipmentByCondition.map(item => ({
      name: item.condition,
      value: item._count,
      color: item.condition === 'Excellent' ? '#10b981' :
             item.condition === 'Good' ? '#3b82f6' :
             item.condition === 'Fair' ? '#f59e0b' : 
             item.condition === 'Poor' ? '#f97316' : '#ef4444'
    }))

    // MAINTENANCE TASK TRENDS (last 6 months)
    const maintenanceTrends = []
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now)
      monthDate.setMonth(now.getMonth() - i)
      const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
      const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59)

      const completed = await prisma.maintenanceTask.count({
        where: {
          clubId: decoded.clubId,
          status: 'COMPLETED',
          completedDate: {
            gte: firstDay,
            lte: lastDay
          }
        }
      })

      const pending = await prisma.maintenanceTask.count({
        where: {
          clubId: decoded.clubId,
          status: {
            in: ['PENDING', 'IN_PROGRESS']
          },
          dueDate: {
            gte: firstDay,
            lte: lastDay
          }
        }
      })

      maintenanceTrends.push({
        month: monthNames[monthDate.getMonth()],
        completed,
        pending
      })
    }

    // COACH UTILIZATION (classes per coach this week via SessionCoach)
    const coachUtilization = await prisma.sessionCoach.groupBy({
      by: ['coachId'],
      where: {
        session: {
          clubId: decoded.clubId,
          date: {
            gte: monday,
            lte: sunday
          }
        }
      },
      _count: true
    })

    const avgClassesPerCoach = totalCoaches > 0 
      ? Math.round((coachUtilization.reduce((sum, c) => sum + (c._count || 0), 0) / totalCoaches) * 10) / 10
      : 0

    // INJURY BY SEVERITY
    const injuryBySeverity = await prisma.injurySubmission.groupBy({
      by: ['status'],
      where: {
        clubId: decoded.clubId,
        submittedAt: {
          gte: firstDayOfMonth
        }
      },
      _count: true
    })

    const injurySeverityData = injuryBySeverity.map(item => ({
      name: item.status.replace('_', ' '),
      value: item._count,
      color: item.status === 'RESOLVED' ? '#10b981' :
             item.status === 'PENDING' ? '#f59e0b' :
             item.status === 'IN_REVIEW' ? '#3b82f6' : '#ef4444'
    }))

    // SAFETY ISSUE TRENDS
    const safetyIssueTrends = []
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now)
      monthDate.setMonth(now.getMonth() - i)
      const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
      const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59)

      const total = await prisma.safetyIssue.count({
        where: {
          clubId: decoded.clubId,
          createdAt: {
            gte: firstDay,
            lte: lastDay
          }
        }
      })

      const critical = await prisma.safetyIssue.count({
        where: {
          clubId: decoded.clubId,
          createdAt: {
            gte: firstDay,
            lte: lastDay
          },
          issueType: 'CRITICAL'
        }
      })

      safetyIssueTrends.push({
        month: monthNames[monthDate.getMonth()],
        total,
        critical
      })
    }

    // Calculate trends (% change from previous period)
    const classGrowth = previousWeekClasses > 0 
      ? ((weeklyClasses - previousWeekClasses) / previousWeekClasses * 100).toFixed(1)
      : '0'
    
    const injuryTrend = totalIncidentsPreviousMonth > 0
      ? ((totalIncidentsThisMonth - totalIncidentsPreviousMonth) / totalIncidentsPreviousMonth * 100).toFixed(1)
      : '0'

    // COMPLIANCE STATS
    const overdueCompliance = await prisma.complianceItem.count({
      where: {
        clubId: decoded.clubId,
        status: { not: 'COMPLETED' },
        deadlineDate: {
          lt: now
        }
      }
    })

    const thirtyDaysFromNow = new Date(now)
    thirtyDaysFromNow.setDate(now.getDate() + 30)

    const dueInThirtyDays = await prisma.complianceItem.count({
      where: {
        clubId: decoded.clubId,
        status: { not: 'COMPLETED' },
        deadlineDate: {
          gte: now,
          lte: thirtyDaysFromNow
        }
      }
    })

    const totalComplianceItems = await prisma.complianceItem.count({
      where: {
        clubId: decoded.clubId
      }
    })

    const completedComplianceItems = await prisma.complianceItem.count({
      where: {
        clubId: decoded.clubId,
        status: 'COMPLETED'
      }
    })

    const complianceCompletionRate = totalComplianceItems > 0
      ? Math.round((completedComplianceItems / totalComplianceItems) * 100)
      : 0

    return NextResponse.json({
      rosters: {
        weeklyClasses,
        activeConflicts,
        upcomingClasses,
        totalCoaches,
        totalGymsports,
        coachUtilization: Math.round(avgClassesPerCoach * 10) / 10,
        classGrowth: parseFloat(classGrowth)
      },
      safety: {
        openIncidents,
        totalThisMonth: totalIncidentsThisMonth,
        criticalIssues: criticalIncidents,
        resolvedThisMonth,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        injuryTrend: parseFloat(injuryTrend)
      },
      equipment: {
        totalItems: totalEquipment,
        maintenanceDue,
        criticalIssues: criticalEquipment,
        inUse: equipmentInUse,
        openSafetyIssues,
        utilizationRate: totalEquipment > 0 ? Math.round((equipmentInUse / totalEquipment) * 100) : 0
      },
      maintenance: {
        pendingTasks: pendingMaintenanceTasks,
        overdueTasks,
        completedThisMonth,
        recurringTasks,
        completionRate: (pendingMaintenanceTasks + completedThisMonth) > 0
          ? Math.round((completedThisMonth / (pendingMaintenanceTasks + completedThisMonth)) * 100)
          : 0
      },
      compliance: {
        overdueItems: overdueCompliance,
        dueInThirtyDays,
        completionRate: complianceCompletionRate,
        totalItems: totalComplianceItems
      },
      charts: {
        weeklyClasses: weeklyClassData,
        injuryTrends,
        equipmentStatus: equipmentStatusData,
        maintenanceTrends,
        injurySeverity: injurySeverityData,
        safetyIssueTrends
      }
    })

  } catch (error) {
    console.error('Failed to fetch dashboard analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}
