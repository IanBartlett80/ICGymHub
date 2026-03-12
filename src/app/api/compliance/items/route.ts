import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/apiAuth'
import { prisma } from '@/lib/prisma'
import {
  calculateNextReminderDate,
  getDerivedComplianceStatus,
  normalizeFileLinks,
  normalizeRecurringSchedule,
  normalizeReminderSchedule,
  parseJsonArray,
} from '@/lib/compliance'

// Force dynamic rendering (disable caching)
export const dynamic = 'force-dynamic'
export const revalidate = 0

function canManageCompliance(role: string): boolean {
  return role === 'ADMIN'
}

function buildDueWindowFilter(dueWithin: string | null): { gte?: Date; lte?: Date } | null {
  if (!dueWithin || dueWithin === 'all' || dueWithin === 'overdue') return null
  const days = Number(dueWithin)
  if (!Number.isInteger(days) || days < 1) return null

  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() + days)

  return {
    gte: now,
    lte: cutoff,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { club } = await authenticateRequest(request)

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const ownerId = searchParams.get('ownerId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const dueWithin = searchParams.get('dueWithin')
    const venueId = searchParams.get('venueId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: {
      clubId: string
      categoryId?: string
      ownerId?: string | null
      venueId?: string
      status?: string
      deadlineDate?: { gte?: Date; lte?: Date }
      OR?: Array<{ title?: { contains: string }; description?: { contains: string }; notes?: { contains: string } }>
    } = {
      clubId: club.id,
    }

    if (categoryId && categoryId !== 'all') where.categoryId = categoryId
    if (ownerId && ownerId !== 'all') {
      where.ownerId = ownerId === 'none' ? null : ownerId
    }
    
    // Venue filter: include items for specific venue OR items for "All Venues" (venueId = null)
    if (venueId && venueId !== 'all') {
      where.OR = [
        { venueId: venueId },
        { venueId: null }
      ]
    }

    if (status && !['all', 'OVERDUE'].includes(status)) {
      where.status = status
    }

    const dueWindow = buildDueWindowFilter(dueWithin)
    if (dueWindow) {
      where.deadlineDate = dueWindow
    }

    if (startDate || endDate) {
      where.deadlineDate = {
        ...(where.deadlineDate || {}),
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      }
    }

    if (search && search.trim()) {
      const searchConditions = [
        { title: { contains: search.trim() } },
        { description: { contains: search.trim() } },
        { notes: { contains: search.trim() } },
      ]
      
      // If we already have OR for venue filter, combine with AND
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions }
        ]
        delete where.OR
      } else {
        where.OR = searchConditions
      }
    }

    const records = await prisma.complianceItem.findMany({
      where,
      include: {
        category: true,
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
        completedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: [{ deadlineDate: 'asc' }, { createdAt: 'desc' }],
    })

    const withComputed = records.map((item) => {
      const computedStatus = getDerivedComplianceStatus(item.status, item.deadlineDate)
      return {
        ...item,
        computedStatus,
        reminderSchedule: parseJsonArray<number>(item.reminderSchedule, []),
        fileLinks: parseJsonArray<{ name: string; url: string }>(item.fileLinks, []),
        remindersSent: parseJsonArray<{ sentAt: string; daysBefore: number }>(item.remindersSent, []),
      }
    })

    const filtered = withComputed.filter((item) => {
      const { computedStatus } = item
      const overdueMatch = status === 'OVERDUE' ? computedStatus === 'OVERDUE' : true
      const dueWindowOverdueMatch = dueWithin === 'overdue' ? computedStatus === 'OVERDUE' : true
      return overdueMatch && dueWindowOverdueMatch
    })

    return NextResponse.json({ items: filtered })
  } catch (error) {
    console.error('Compliance items list error:', error)
    return NextResponse.json({ error: 'Failed to fetch compliance items' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, club } = await authenticateRequest(request)

    if (!canManageCompliance(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const categoryId = typeof body.categoryId === 'string' && body.categoryId !== 'none' ? body.categoryId : null
    const ownerId = typeof body.ownerId === 'string' && body.ownerId !== 'none' ? body.ownerId : null
    const ownerName = typeof body.ownerName === 'string' ? body.ownerName.trim() : ''
    const ownerEmail = typeof body.ownerEmail === 'string' ? body.ownerEmail.trim() : ''
    const notes = typeof body.notes === 'string' ? body.notes.trim() : ''
    const status = typeof body.status === 'string' ? body.status : 'OPEN'
    const recurringSchedule = normalizeRecurringSchedule(body.recurringSchedule)

    if (!title) {
      return NextResponse.json({ error: 'Item title is required' }, { status: 400 })
    }

    if (!body.deadlineDate) {
      return NextResponse.json({ error: 'Deadline date is required' }, { status: 400 })
    }

    const deadlineDate = new Date(body.deadlineDate)
    if (Number.isNaN(deadlineDate.getTime())) {
      return NextResponse.json({ error: 'Invalid deadline date' }, { status: 400 })
    }

    const validStatuses = ['OPEN', 'IN_PROGRESS', 'COMPLETED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (categoryId) {
      const category = await prisma.complianceCategory.findFirst({
        where: {
          id: categoryId,
          clubId: club.id,
        },
      })
      if (!category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      }
    }

    if (ownerId) {
      const owner = await prisma.user.findFirst({
        where: {
          id: ownerId,
          clubId: club.id,
          isActive: true,
        },
      })
      if (!owner) {
        return NextResponse.json({ error: 'Owner not found' }, { status: 404 })
      }
    }

    const reminderSchedule = normalizeReminderSchedule(body.reminderSchedule)
    const fileLinks = normalizeFileLinks(body.fileLinks)

    const nextReminderDate = status === 'COMPLETED'
      ? null
      : calculateNextReminderDate(deadlineDate, reminderSchedule)

    const item = await prisma.complianceItem.create({
      data: {
        clubId: club.id,
        categoryId,
        ownerId,
        ownerName: ownerName || null,
        ownerEmail: ownerEmail || null,
        createdById: user.id,
        title,
        description: description || null,
        deadlineDate,
        status,
        recurringSchedule,
        reminderSchedule: reminderSchedule.length ? JSON.stringify(reminderSchedule) : null,
        nextReminderDate,
        fileLinks: fileLinks.length ? JSON.stringify(fileLinks) : null,
        notes: notes || null,
        completedAt: status === 'COMPLETED' ? new Date() : null,
        completedById: status === 'COMPLETED' ? user.id : null,
      },
      include: {
        category: true,
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      item: {
        ...item,
        computedStatus: getDerivedComplianceStatus(item.status, item.deadlineDate),
        reminderSchedule,
        fileLinks,
        remindersSent: [],
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Compliance item create error:', error)
    return NextResponse.json({ error: 'Failed to create compliance item' }, { status: 500 })
  }
}
