import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { sendEmail } from '@/lib/email'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// GET - List all repair quote requests for the club
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('accessToken')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; clubId: string }

    const { searchParams } = new URL(req.url);
    const venueId = searchParams.get('venueId');

    const where: any = {
      clubId: decoded.clubId,
    };

    // Venue filtering
    if (venueId && venueId !== 'all') {
      where.venueId = venueId;
    }

    const requests = await prisma.repairQuoteRequest.findMany({
      where,
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            category: true,
            serialNumber: true,
          },
        },
        safetyIssue: {
          select: {
            id: true,
            title: true,
            issueType: true,
            reportedBy: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error('Failed to fetch repair quote requests:', error)
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
  }
}

// POST - Create a new repair quote request
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('accessToken')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; clubId: string }
    const body = await req.json()

    const {
      equipmentId,
      safetyIssueId,
      issueDescription,
      urgency,
      preferredRepairDate,
      estimatedBudget,
      contactPerson,
      contactPhone,
      contactEmail,
      additionalNotes,
      specialRequirements,
      photos,
    } = body

    // Validate required fields
    if (!equipmentId || !issueDescription || !contactPerson) {
      return NextResponse.json(
        { error: 'Missing required fields: equipmentId, issueDescription, contactPerson' },
        { status: 400 }
      )
    }

    // Verify equipment exists and belongs to this club
    const equipment = await prisma.equipment.findFirst({
      where: {
        id: equipmentId,
        clubId: decoded.clubId,
      },
      include: {
        zone: true,
      },
    })

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    // Get safety issue if provided
    let safetyIssue = null
    if (safetyIssueId) {
      safetyIssue = await prisma.safetyIssue.findFirst({
        where: {
          id: safetyIssueId,
          clubId: decoded.clubId,
        },
      })
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        club: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Validate photos if provided
    if (photos && (!Array.isArray(photos) || photos.length > 10)) {
      return NextResponse.json(
        { error: 'Photos must be an array with maximum 10 images' },
        { status: 400 }
      )
    }

    // Create repair quote request
    const request = await prisma.repairQuoteRequest.create({
      data: {
        clubId: decoded.clubId,
        venueId: equipment.venueId,
        equipmentId,
        safetyIssueId: safetyIssueId || null,
        requestedById: decoded.userId,
        issueDescription,
        urgency: urgency || 'MEDIUM',
        preferredRepairDate: preferredRepairDate ? new Date(preferredRepairDate) : null,
        estimatedBudget,
        contactPerson,
        contactPhone,
        contactEmail,
        additionalNotes,
        specialRequirements,
        photos: photos && photos.length > 0 ? JSON.stringify(photos) : null,
        status: 'PENDING',
      },
      include: {
        equipment: true,
        safetyIssue: true,
      },
    })

    // Send email to Ian
    try {
      const emailBody = `
        <h2>New Repair Quote Request</h2>
        <p><strong>Request ID:</strong> ${request.id}</p>
        <p><strong>Club:</strong> ${user.club.name}</p>
        <p><strong>Requested by:</strong> ${user.fullName} (${user.email})</p>
        
        <h3>Equipment Details</h3>
        <p><strong>Name:</strong> ${equipment.name}</p>
        <p><strong>Category:</strong> ${equipment.category || 'N/A'}</p>
        <p><strong>Serial Number:</strong> ${equipment.serialNumber || 'N/A'}</p>
        <p><strong>Location:</strong> ${equipment.zone?.name || equipment.location || 'N/A'}</p>
        
        <h3>Issue Details</h3>
        <p><strong>Description:</strong> ${issueDescription}</p>
        <p><strong>Urgency:</strong> ${urgency || 'MEDIUM'}</p>
        ${safetyIssue ? `<p><strong>Related Safety Issue:</strong> ${safetyIssue.title} (${safetyIssue.issueType})</p>` : ''}
        ${preferredRepairDate ? `<p><strong>Preferred Repair Date:</strong> ${new Date(preferredRepairDate).toLocaleDateString()}</p>` : ''}
        ${estimatedBudget ? `<p><strong>Estimated Budget:</strong> $${estimatedBudget}</p>` : ''}
        
        <h3>Contact Information</h3>
        <p><strong>Contact Person:</strong> ${contactPerson}</p>
        ${contactPhone ? `<p><strong>Phone:</strong> ${contactPhone}</p>` : ''}
        ${contactEmail ? `<p><strong>Email:</strong> ${contactEmail}</p>` : ''}
        
        ${additionalNotes ? `<h3>Additional Notes</h3><p>${additionalNotes}</p>` : ''}
        ${specialRequirements ? `<h3>Special Requirements</h3><p>${specialRequirements}</p>` : ''}
        
        ${photos && photos.length > 0 ? `<h3>Photos Attached</h3><p>${photos.length} photo(s) included with this request.</p>` : ''}
        
        <p style="margin-top: 20px;"><em>This is an automated notification from ICGymHub.</em></p>
      `

      await sendEmail({
        to: 'IanBartlett@icb.solutions',
        subject: `Repair Quote Request - ${equipment.name} at ${user.club.name}`,
        htmlContent: emailBody,
      })

      // Update request as email sent
      await prisma.repairQuoteRequest.update({
        where: { id: request.id },
        data: {
          emailSent: true,
          emailSentAt: new Date(),
        },
      })
    } catch (emailError) {
      console.error('Failed to send email:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json(request, { status: 201 })
  } catch (error) {
    console.error('Failed to create repair quote request:', error)
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
  }
}
