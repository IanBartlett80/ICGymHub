import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/apiAuth'
import { prisma } from '@/lib/prisma'
import {
  calculateNextDeadline,
  calculateNextReminderDate,
  getDerivedComplianceStatus,
  normalizeFileLinks,
  normalizeRecurringSchedule,
  normalizeReminderSchedule,
  normalizeUploadedFiles,
  parseJsonArray,
} from '@/lib/compliance'

// Force dynamic rendering (disable caching)
export const dynamic = 'force-dynamic'
export const revalidate = 0

function canManageCompliance(role: string): boolean {
  return role === 'ADMIN'
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { club } = await authenticateRequest(request)

    const item = await prisma.complianceItem.findFirst({
      where: {
        id: params.id,
        clubId: club.id,
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
        parentItem: {
          select: {
            id: true,
            title: true,
            recurringSchedule: true,
          },
        },
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Compliance item not found' }, { status: 404 })
    }

    return NextResponse.json({
      item: {
        ...item,
        computedStatus: getDerivedComplianceStatus(item.status, item.deadlineDate),
        reminderSchedule: parseJsonArray<number>(item.reminderSchedule, []),
        fileLinks: parseJsonArray<{ name: string; url: string }>(item.fileLinks, []),
        uploadedFiles: parseJsonArray<{ name: string; data: string; type: string; size: number }>(item.uploadedFiles, []),
        remindersSent: parseJsonArray<{ sentAt: string; daysBefore: number }>(item.remindersSent, []),
      },
    })
  } catch (error) {
    console.error('Compliance item fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch compliance item' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, club } = await authenticateRequest(request)

    if (!canManageCompliance(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await prisma.complianceItem.findFirst({
      where: {
        id: params.id,
        clubId: club.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Compliance item not found' }, { status: 404 })
    }

    const body = await request.json()
    const updateData: {
      title?: string
      description?: string | null
      categoryId?: string | null
      venueId?: string | null
      ownerId?: string | null
      ownerName?: string | null
      ownerEmail?: string | null
      deadlineDate?: Date
      status?: string
      recurringSchedule?: string
      reminderSchedule?: string | null
      nextReminderDate?: Date | null
      fileLinks?: string | null
      uploadedFiles?: string | null
      notes?: string | null
      completedAt?: Date | null
      completedById?: string | null
      lastReminderSent?: null
      remindersSent?: null
    } = {}

    if (body.title !== undefined) {
      const title = typeof body.title === 'string' ? body.title.trim() : ''
      if (!title) return NextResponse.json({ error: 'Item title is required' }, { status: 400 })
      updateData.title = title
    }

    if (body.description !== undefined) {
      const description = typeof body.description === 'string' ? body.description.trim() : ''
      updateData.description = description || null
    }

    if (body.notes !== undefined) {
      const notes = typeof body.notes === 'string' ? body.notes.trim() : ''
      updateData.notes = notes || null
    }

    if (body.categoryId !== undefined) {
      const categoryId = typeof body.categoryId === 'string' && body.categoryId !== 'none' ? body.categoryId : null
      if (categoryId) {
        const category = await prisma.complianceCategory.findFirst({
          where: { id: categoryId, clubId: club.id },
        })
        if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      }
      updateData.categoryId = categoryId
    }

    if (body.venueId !== undefined) {
      const venueId = typeof body.venueId === 'string' && body.venueId !== '' ? body.venueId : null
      if (venueId) {
        const venue = await prisma.venue.findFirst({
          where: { id: venueId, clubId: club.id },
        })
        if (!venue) return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
      }
      updateData.venueId = venueId
    }

    if (body.ownerId !== undefined) {
      const ownerId = typeof body.ownerId === 'string' && body.ownerId !== 'none' ? body.ownerId : null
      if (ownerId) {
        const owner = await prisma.user.findFirst({
          where: { id: ownerId, clubId: club.id, isActive: true },
        })
        if (!owner) return NextResponse.json({ error: 'Owner not found' }, { status: 404 })
      }
      updateData.ownerId = ownerId
    }

    if (body.ownerName !== undefined) {
      const ownerName = typeof body.ownerName === 'string' ? body.ownerName.trim() : ''
      updateData.ownerName = ownerName || null
    }

    if (body.ownerEmail !== undefined) {
      const ownerEmail = typeof body.ownerEmail === 'string' ? body.ownerEmail.trim() : ''
      updateData.ownerEmail = ownerEmail || null
    }

    if (body.recurringSchedule !== undefined) {
      updateData.recurringSchedule = normalizeRecurringSchedule(body.recurringSchedule)
    }

    const nextStatus = body.status !== undefined ? body.status : existing.status
    const validStatuses = ['OPEN', 'IN_PROGRESS', 'COMPLETED']
    if (!validStatuses.includes(nextStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    updateData.status = nextStatus

    const nextDeadlineDate = body.deadlineDate ? new Date(body.deadlineDate) : existing.deadlineDate
    if (Number.isNaN(nextDeadlineDate.getTime())) {
      return NextResponse.json({ error: 'Invalid deadline date' }, { status: 400 })
    }
    if (body.deadlineDate !== undefined) {
      updateData.deadlineDate = nextDeadlineDate
    }

    const reminderSchedule = body.reminderSchedule !== undefined
      ? normalizeReminderSchedule(body.reminderSchedule)
      : parseJsonArray<number>(existing.reminderSchedule, [])

    if (body.reminderSchedule !== undefined) {
      updateData.reminderSchedule = reminderSchedule.length ? JSON.stringify(reminderSchedule) : null
      updateData.lastReminderSent = null
      updateData.remindersSent = null
    }

    if (body.fileLinks !== undefined) {
      const fileLinks = normalizeFileLinks(body.fileLinks)
      updateData.fileLinks = fileLinks.length ? JSON.stringify(fileLinks) : null
    }

    if (body.uploadedFiles !== undefined) {
      const uploadedFiles = normalizeUploadedFiles(body.uploadedFiles)
      updateData.uploadedFiles = uploadedFiles.length ? JSON.stringify(uploadedFiles) : null
    }

    if (nextStatus === 'COMPLETED') {
      // Handle recurring items: create separate instances to preserve history
      const recurringSchedule = normalizeRecurringSchedule(
        body.recurringSchedule !== undefined 
          ? body.recurringSchedule
          : existing.recurringSchedule || 'NONE'
      )
      
      if (recurringSchedule !== 'NONE' && !existing.isTemplate) {
        // Recurring item instance: mark THIS instance as completed (preserves history)
        updateData.completedAt = new Date()
        updateData.completedById = user.id
        updateData.nextReminderDate = null
        // Status stays as COMPLETED (don't reset to OPEN)
        
        // Generate next instance for the recurring item
        const newDeadline = calculateNextDeadline(nextDeadlineDate, recurringSchedule)
        const nextInstanceNumber = (existing.instanceNumber || 1) + 1
        
        try {
          await prisma.complianceItem.create({
            data: {
              clubId: club.id,
              title: existing.title,
              description: existing.description,
              categoryId: existing.categoryId,
              venueId: existing.venueId,
              ownerId: existing.ownerId,
              ownerName: existing.ownerName,
              ownerEmail: existing.ownerEmail,
              createdById: existing.createdById,
              deadlineDate: newDeadline,
              status: 'OPEN',
              recurringSchedule: existing.recurringSchedule,
              reminderSchedule: existing.reminderSchedule,
              nextReminderDate: calculateNextReminderDate(newDeadline, reminderSchedule),
              fileLinks: existing.fileLinks,
              notes: existing.notes,
              parentItemId: existing.parentItemId || existing.id, // Link to parent or self if first
              isTemplate: false,
              instanceNumber: nextInstanceNumber,
            },
          })
          console.log(`✅ Auto-generated next recurring instance #${nextInstanceNumber} for "${existing.title}"`)
        } catch (createError) {
          console.error('Failed to create next recurring instance:', createError)
          // Don't fail the completion if instance creation fails
        }
      } else {
        // Non-recurring item or template: mark as completed permanently
        updateData.completedAt = body.completedAt ? new Date(body.completedAt) : new Date()
        updateData.completedById = user.id
        updateData.nextReminderDate = null
      }
    } else {
      updateData.completedAt = null
      updateData.completedById = null
      updateData.nextReminderDate = calculateNextReminderDate(nextDeadlineDate, reminderSchedule)
    }

    const updated = await prisma.complianceItem.update({
      where: { id: params.id },
      data: updateData,
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
        parentItem: {
          select: {
            id: true,
            title: true,
            recurringSchedule: true,
          },
        },
      },
    })

    return NextResponse.json({
      item: {
        ...updated,
        computedStatus: getDerivedComplianceStatus(updated.status, updated.deadlineDate),
        reminderSchedule: parseJsonArray<number>(updated.reminderSchedule, []),
        fileLinks: parseJsonArray<{ name: string; url: string }>(updated.fileLinks, []),
        uploadedFiles: parseJsonArray<{ name: string; data: string; type: string; size: number }>(updated.uploadedFiles, []),
        remindersSent: parseJsonArray<{ sentAt: string; daysBefore: number }>(updated.remindersSent, []),
      },
    })
  } catch (error) {
    console.error('Compliance item update error:', error)
    return NextResponse.json({ error: 'Failed to update compliance item' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, club } = await authenticateRequest(request)

    if (!canManageCompliance(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await prisma.complianceItem.findFirst({
      where: {
        id: params.id,
        clubId: club.id,
      },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Compliance item not found' }, { status: 404 })
    }

    await prisma.complianceItem.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Compliance item delete error:', error)
    return NextResponse.json({ error: 'Failed to delete compliance item' }, { status: 500 })
  }
}
