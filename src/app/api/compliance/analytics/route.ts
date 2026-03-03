import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/apiAuth'
import { prisma } from '@/lib/prisma'
import { getDerivedComplianceStatus, parseJsonArray } from '@/lib/compliance'

interface MonthBucket {
  month: string
  created: number
  completed: number
  overdue: number
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })
}

export async function GET(request: NextRequest) {
  try {
    const { club } = await authenticateRequest(request)

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const ownerId = searchParams.get('ownerId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: {
      clubId: string
      categoryId?: string
      ownerId?: string | null
      OR?: Array<{ title?: { contains: string }; description?: { contains: string }; notes?: { contains: string } }>
    } = {
      clubId: club.id,
    }

    if (categoryId && categoryId !== 'all') where.categoryId = categoryId
    if (ownerId && ownerId !== 'all') where.ownerId = ownerId === 'none' ? null : ownerId

    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim() } },
        { description: { contains: search.trim() } },
        { notes: { contains: search.trim() } },
      ]
    }

    const items = await prisma.complianceItem.findMany({
      where,
      include: {
        category: true,
        owner: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { deadlineDate: 'asc' },
    })

    const withStatus = items.map((item) => ({
      ...item,
      computedStatus: getDerivedComplianceStatus(item.status, item.deadlineDate),
      reminderSchedule: parseJsonArray<number>(item.reminderSchedule, []),
      fileLinks: parseJsonArray<{ name: string; url: string }>(item.fileLinks, []),
    }))

    const filtered = withStatus.filter((item) => {
      if (!status || status === 'all') return true
      return item.computedStatus === status
    })

    const now = new Date()
    const in7Days = new Date(now)
    in7Days.setDate(in7Days.getDate() + 7)
    const in30Days = new Date(now)
    in30Days.setDate(in30Days.getDate() + 30)

    const totalItems = filtered.length
    const openItems = filtered.filter((item) => item.computedStatus === 'OPEN').length
    const inProgressItems = filtered.filter((item) => item.computedStatus === 'IN_PROGRESS').length
    const completedItems = filtered.filter((item) => item.computedStatus === 'COMPLETED').length
    const overdueItems = filtered.filter((item) => item.computedStatus === 'OVERDUE').length
    const dueIn7Days = filtered.filter((item) => item.deadlineDate >= now && item.deadlineDate <= in7Days && item.computedStatus !== 'COMPLETED').length
    const dueIn30Days = filtered.filter((item) => item.deadlineDate >= now && item.deadlineDate <= in30Days && item.computedStatus !== 'COMPLETED').length
    const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

    const byCategoryMap = new Map<string, { category: string; total: number; overdue: number; completed: number }>()
    const byOwnerMap = new Map<string, { owner: string; total: number; overdue: number; dueSoon: number }>()

    filtered.forEach((item) => {
      const categoryName = item.category?.name || 'Uncategorised'
      const categoryBucket = byCategoryMap.get(categoryName) || { category: categoryName, total: 0, overdue: 0, completed: 0 }
      categoryBucket.total += 1
      if (item.computedStatus === 'OVERDUE') categoryBucket.overdue += 1
      if (item.computedStatus === 'COMPLETED') categoryBucket.completed += 1
      byCategoryMap.set(categoryName, categoryBucket)

      const ownerName = item.owner?.fullName || 'Unassigned'
      const ownerBucket = byOwnerMap.get(ownerName) || { owner: ownerName, total: 0, overdue: 0, dueSoon: 0 }
      ownerBucket.total += 1
      if (item.computedStatus === 'OVERDUE') ownerBucket.overdue += 1
      if (item.deadlineDate >= now && item.deadlineDate <= in30Days && item.computedStatus !== 'COMPLETED') ownerBucket.dueSoon += 1
      byOwnerMap.set(ownerName, ownerBucket)
    })

    const byCategory = Array.from(byCategoryMap.values()).sort((a, b) => b.total - a.total)
    const byOwner = Array.from(byOwnerMap.values()).sort((a, b) => b.total - a.total)

    const monthBuckets = new Map<string, MonthBucket>()
    for (let offset = 5; offset >= 0; offset -= 1) {
      const month = new Date(now.getFullYear(), now.getMonth() - offset, 1)
      const label = monthLabel(month)
      monthBuckets.set(label, { month: label, created: 0, completed: 0, overdue: 0 })
    }

    filtered.forEach((item) => {
      const createdLabel = monthLabel(item.createdAt)
      const createdBucket = monthBuckets.get(createdLabel)
      if (createdBucket) createdBucket.created += 1

      if (item.completedAt) {
        const completedLabel = monthLabel(item.completedAt)
        const completedBucket = monthBuckets.get(completedLabel)
        if (completedBucket) completedBucket.completed += 1
      }

      if (item.computedStatus === 'OVERDUE') {
        const overdueLabel = monthLabel(item.deadlineDate)
        const overdueBucket = monthBuckets.get(overdueLabel)
        if (overdueBucket) overdueBucket.overdue += 1
      }
    })

    const trend = Array.from(monthBuckets.values())

    const upcomingDeadlines = filtered
      .filter((item) => item.computedStatus !== 'COMPLETED')
      .slice(0, 10)
      .map((item) => ({
        id: item.id,
        title: item.title,
        deadlineDate: item.deadlineDate,
        computedStatus: item.computedStatus,
        ownerName: item.owner?.fullName || 'Unassigned',
        categoryName: item.category?.name || 'Uncategorised',
      }))

    const configuredReminders = filtered.filter((item) => item.reminderSchedule.length > 0).length
    const withLinkedFiles = filtered.filter((item) => item.fileLinks.length > 0).length

    return NextResponse.json({
      totals: {
        totalItems,
        openItems,
        inProgressItems,
        completedItems,
        overdueItems,
        dueIn7Days,
        dueIn30Days,
        completionRate,
        configuredReminders,
        withLinkedFiles,
      },
      byCategory,
      byOwner,
      trend,
      upcomingDeadlines,
    })
  } catch (error) {
    console.error('Compliance analytics error:', error)
    return NextResponse.json({ error: 'Failed to load compliance analytics' }, { status: 500 })
  }
}
