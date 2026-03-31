import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { sendEmail } from '@/lib/email'
import { randomBytes } from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Generate a human-readable reference like RQ-2026-0042
async function generateReference(clubId: string): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.repairQuoteRequest.count({
    where: { clubId },
  })
  return `RQ-${year}-${String(count + 1).padStart(4, '0')}`
}

// Generate a cryptographically secure token for ICB portal access
function generateSecureToken(): string {
  return randomBytes(32).toString('hex')
}

// Create initial status history entry
function createStatusEntry(status: string, actor: string, notes?: string) {
  return {
    status,
    timestamp: new Date().toISOString(),
    actor,
    notes: notes || `Request created`,
  }
}

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

    // Generate secure token and reference
    const secureToken = generateSecureToken()
    const requestReference = await generateReference(decoded.clubId)
    const statusHistory = [createStatusEntry('PENDING', user.fullName, 'Repair quote request submitted')]

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
        secureToken,
        requestReference,
        statusHistory: JSON.stringify(statusHistory),
      },
      include: {
        equipment: true,
        safetyIssue: true,
      },
    })

    // Send email to ICB Solutions
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://gymhub.club'
      const manageUrl = `${appUrl}/quote-manage/${secureToken}`

      const emailBody = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
        <table role="presentation" style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:40px 0;text-align:center;">
        <table role="presentation" style="width:640px;margin:0 auto;background:#ffffff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding:30px;background:#2563eb;border-radius:8px 8px 0 0;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;">New Repair Quote Request</h1>
              <p style="margin:8px 0 0;color:#bfdbfe;font-size:14px;">Reference: ${requestReference}</p>
            </td>
          </tr>
          <tr><td style="padding:30px;">
            <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:12px 16px;margin-bottom:20px;">
              <strong style="color:#92400e;">Urgency: ${urgency || 'MEDIUM'}</strong>
            </div>

            <h3 style="color:#1e40af;border-bottom:2px solid #dbeafe;padding-bottom:8px;">Club Details</h3>
            <p><strong>Club:</strong> ${user.club.name}</p>
            <p><strong>Requested by:</strong> ${user.fullName} (${user.email})</p>

            <h3 style="color:#1e40af;border-bottom:2px solid #dbeafe;padding-bottom:8px;">Equipment Details</h3>
            <p><strong>Name:</strong> ${equipment.name}</p>
            <p><strong>Category:</strong> ${equipment.category || 'N/A'}</p>
            <p><strong>Serial Number:</strong> ${equipment.serialNumber || 'N/A'}</p>
            <p><strong>Location:</strong> ${equipment.zone?.name || equipment.location || 'N/A'}</p>

            <h3 style="color:#1e40af;border-bottom:2px solid #dbeafe;padding-bottom:8px;">Issue Details</h3>
            <p>${issueDescription}</p>
            ${safetyIssue ? `<p><strong>Related Safety Issue:</strong> ${safetyIssue.title} (${safetyIssue.issueType})</p>` : ''}
            ${preferredRepairDate ? `<p><strong>Preferred Repair Date:</strong> ${new Date(preferredRepairDate).toLocaleDateString()}</p>` : ''}
            ${estimatedBudget ? `<p><strong>Budget Constraints:</strong> ${estimatedBudget}</p>` : ''}

            <h3 style="color:#1e40af;border-bottom:2px solid #dbeafe;padding-bottom:8px;">Club Contact for Repair</h3>
            <p><strong>Contact Person:</strong> ${contactPerson}</p>
            ${contactPhone ? `<p><strong>Phone:</strong> ${contactPhone}</p>` : ''}
            ${contactEmail ? `<p><strong>Email:</strong> ${contactEmail}</p>` : ''}

            ${additionalNotes ? `<h3 style="color:#1e40af;border-bottom:2px solid #dbeafe;padding-bottom:8px;">Additional Notes</h3><p>${additionalNotes}</p>` : ''}
            ${specialRequirements ? `<h3 style="color:#1e40af;border-bottom:2px solid #dbeafe;padding-bottom:8px;">Special Requirements</h3><p>${specialRequirements}</p>` : ''}

            ${photos && photos.length > 0 ? `<p style="color:#6b7280;font-style:italic;">${photos.length} photo(s) attached to this request.</p>` : ''}

            <div style="margin-top:30px;text-align:center;">
              <a href="${manageUrl}" style="display:inline-block;padding:14px 40px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-size:16px;font-weight:600;">
                Manage This Request
              </a>
            </div>
            <p style="margin-top:12px;text-align:center;font-size:12px;color:#9ca3af;">
              Or copy this link: ${manageUrl}
            </p>
          </td></tr>
          <tr>
            <td style="padding:20px 30px;background:#f9fafb;border-radius:0 0 8px 8px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#6b7280;">
                This is an automated notification from ICGymHub &bull; ${new Date().getFullYear()} ICB Solutions
              </p>
            </td>
          </tr>
        </table>
        </td></tr></table>
        </body></html>
      `

      await sendEmail({
        to: 'IanBartlett@icb.solutions',
        subject: `[${requestReference}] Repair Quote Request - ${equipment.name} at ${user.club.name} (${urgency || 'MEDIUM'})`,
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
