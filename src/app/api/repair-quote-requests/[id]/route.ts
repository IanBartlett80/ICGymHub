import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// GET - Get a specific repair quote request
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get('accessToken')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; clubId: string }
    const { id } = params

    const request = await prisma.repairQuoteRequest.findFirst({
      where: {
        id,
        clubId: decoded.clubId,
      },
      include: {
        equipment: {
          include: {
            zone: true,
          },
        },
        safetyIssue: true,
        requestedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    })

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    return NextResponse.json(request)
  } catch (error) {
    console.error('Failed to fetch repair quote request:', error)
    return NextResponse.json({ error: 'Failed to fetch request' }, { status: 500 })
  }
}

// PATCH - Update a repair quote request
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get('accessToken')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; clubId: string }
    const { id } = params
    const body = await req.json()

    // Verify request exists and belongs to this club
    const existingRequest = await prisma.repairQuoteRequest.findFirst({
      where: {
        id,
        clubId: decoded.clubId,
      },
    })

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Update allowed fields
    const updateData: any = {}
    
    if (body.status !== undefined) updateData.status = body.status
    if (body.urgency !== undefined) updateData.urgency = body.urgency
    if (body.preferredRepairDate !== undefined) {
      updateData.preferredRepairDate = body.preferredRepairDate ? new Date(body.preferredRepairDate) : null
    }
    if (body.estimatedBudget !== undefined) updateData.estimatedBudget = body.estimatedBudget
    if (body.contactPerson !== undefined) updateData.contactPerson = body.contactPerson
    if (body.contactPhone !== undefined) updateData.contactPhone = body.contactPhone
    if (body.contactEmail !== undefined) updateData.contactEmail = body.contactEmail
    if (body.additionalNotes !== undefined) updateData.additionalNotes = body.additionalNotes
    if (body.specialRequirements !== undefined) updateData.specialRequirements = body.specialRequirements
    if (body.quoteAmount !== undefined) updateData.quoteAmount = body.quoteAmount
    if (body.quoteReceivedAt !== undefined) {
      updateData.quoteReceivedAt = body.quoteReceivedAt ? new Date(body.quoteReceivedAt) : null
    }
    if (body.quoteReceivedFrom !== undefined) updateData.quoteReceivedFrom = body.quoteReceivedFrom
    if (body.quoteNotes !== undefined) updateData.quoteNotes = body.quoteNotes
    if (body.repairCompletedAt !== undefined) {
      updateData.repairCompletedAt = body.repairCompletedAt ? new Date(body.repairCompletedAt) : null
    }
    if (body.repairCompletedBy !== undefined) updateData.repairCompletedBy = body.repairCompletedBy
    if (body.finalCost !== undefined) updateData.finalCost = body.finalCost
    if (body.completionNotes !== undefined) updateData.completionNotes = body.completionNotes

    const updatedRequest = await prisma.repairQuoteRequest.update({
      where: { id },
      data: updateData,
      include: {
        equipment: true,
        safetyIssue: true,
        requestedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(updatedRequest)
  } catch (error) {
    console.error('Failed to update repair quote request:', error)
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
  }
}
