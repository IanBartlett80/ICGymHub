import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

// Helper to append to status history
function appendStatusHistory(existing: string | null, status: string, actor: string, notes?: string) {
  const history = existing ? JSON.parse(existing) : []
  history.push({
    status,
    timestamp: new Date().toISOString(),
    actor,
    notes: notes || '',
  })
  return JSON.stringify(history)
}

// GET - Fetch repair quote request by secure token (no auth required - token IS the auth)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token || token.length < 32) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    const quoteRequest = await prisma.repairQuoteRequest.findUnique({
      where: { secureToken: token },
      include: {
        equipment: {
          include: {
            zone: true,
          },
        },
        safetyIssue: {
          select: {
            id: true,
            title: true,
            issueType: true,
            priority: true,
            description: true,
            photos: true,
          },
        },
        requestedBy: {
          select: {
            fullName: true,
            email: true,
          },
        },
        club: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!quoteRequest) {
      return NextResponse.json({ error: 'Quote request not found' }, { status: 404 })
    }

    // Parse JSON fields for the client
    const response = {
      ...quoteRequest,
      statusHistory: quoteRequest.statusHistory ? JSON.parse(quoteRequest.statusHistory) : [],
      photos: quoteRequest.photos ? JSON.parse(quoteRequest.photos) : [],
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Quote manage GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch quote request' }, { status: 500 })
  }
}

// PUT - ICB Solutions updates the quote request (acknowledge, upload quote, add notes)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token || token.length < 32) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    const existing = await prisma.repairQuoteRequest.findUnique({
      where: { secureToken: token },
      include: {
        equipment: true,
        club: { select: { name: true } },
        requestedBy: { select: { fullName: true, email: true } },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Quote request not found' }, { status: 404 })
    }

    const body = await request.json()
    const { action } = body

    let updateData: any = {}
    let emailToClub: { subject: string; htmlContent: string } | null = null

    switch (action) {
      case 'acknowledge': {
        // ICB acknowledges receipt of the request
        if (existing.status !== 'PENDING') {
          return NextResponse.json({ error: 'Request has already been acknowledged' }, { status: 400 })
        }
        const { acknowledgedBy, notes } = body
        if (!acknowledgedBy) {
          return NextResponse.json({ error: 'acknowledgedBy is required' }, { status: 400 })
        }
        updateData = {
          status: 'ACKNOWLEDGED',
          icbAcknowledgedAt: new Date(),
          icbAcknowledgedBy: acknowledgedBy,
          icbNotes: notes || null,
          statusHistory: appendStatusHistory(
            existing.statusHistory,
            'ACKNOWLEDGED',
            `ICB Solutions (${acknowledgedBy})`,
            notes || 'Request acknowledged by ICB Solutions'
          ),
        }

        // Notify club
        emailToClub = {
          subject: `[${existing.requestReference}] Your Repair Quote Request Has Been Acknowledged`,
          htmlContent: buildClubNotificationEmail(
            existing.requestReference || existing.id,
            existing.club.name,
            existing.equipment.name,
            'Acknowledged',
            `ICB Solutions has acknowledged your repair quote request and is now sourcing quotes for the repair of <strong>${existing.equipment.name}</strong>.${notes ? `<br><br><strong>ICB Notes:</strong> ${notes}` : ''}`,
            '#2563eb'
          ),
        }
        break
      }

      case 'submit_quote': {
        // ICB uploads a quote for the club to review
        const { quoteAmount, quoteNotes, quoteDocuments, repairCompanyName, icbNotes } = body
        if (!quoteAmount) {
          return NextResponse.json({ error: 'quoteAmount is required' }, { status: 400 })
        }
        updateData = {
          status: 'QUOTE_RECEIVED',
          quoteAmount,
          quoteReceivedAt: new Date(),
          quoteReceivedFrom: repairCompanyName || 'ICB Solutions',
          quoteNotes: quoteNotes || null,
          quoteDocuments: quoteDocuments ? JSON.stringify(quoteDocuments) : null,
          repairCompanyName: repairCompanyName || null,
          icbNotes: icbNotes || existing.icbNotes,
          statusHistory: appendStatusHistory(
            existing.statusHistory,
            'QUOTE_RECEIVED',
            'ICB Solutions',
            `Quote of $${quoteAmount} submitted${repairCompanyName ? ` from ${repairCompanyName}` : ''}`
          ),
        }

        // Notify club that a quote is ready for review
        emailToClub = {
          subject: `[${existing.requestReference}] Repair Quote Ready for Review - $${quoteAmount}`,
          htmlContent: buildClubNotificationEmail(
            existing.requestReference || existing.id,
            existing.club.name,
            existing.equipment.name,
            'Quote Ready for Review',
            `ICB Solutions has sourced a repair quote for <strong>${existing.equipment.name}</strong>.<br><br>
            <strong>Quote Amount:</strong> $${quoteAmount}<br>
            ${repairCompanyName ? `<strong>Repair Company:</strong> ${repairCompanyName}<br>` : ''}
            ${quoteNotes ? `<strong>Notes:</strong> ${quoteNotes}<br>` : ''}
            <br>Please log in to your GymHub portal to review and approve or reject this quote.`,
            '#059669'
          ),
        }
        break
      }

      case 'add_notes': {
        // ICB adds internal notes
        const { icbNotes: notes } = body
        updateData = {
          icbNotes: notes || null,
          statusHistory: appendStatusHistory(
            existing.statusHistory,
            existing.status,
            'ICB Solutions',
            `Notes updated: ${notes}`
          ),
        }
        break
      }

      case 'update_quote': {
        // ICB revises a quote (e.g., after club rejection and re-quote)
        const { quoteAmount, quoteNotes, quoteDocuments, repairCompanyName } = body
        if (!quoteAmount) {
          return NextResponse.json({ error: 'quoteAmount is required' }, { status: 400 })
        }
        updateData = {
          status: 'QUOTE_RECEIVED',
          quoteAmount,
          quoteReceivedAt: new Date(),
          quoteReceivedFrom: repairCompanyName || existing.quoteReceivedFrom || 'ICB Solutions',
          quoteNotes: quoteNotes || null,
          quoteDocuments: quoteDocuments ? JSON.stringify(quoteDocuments) : null,
          repairCompanyName: repairCompanyName || existing.repairCompanyName,
          // Clear previous rejection
          rejectedBy: null,
          rejectedByName: null,
          rejectedAt: null,
          rejectionReason: null,
          statusHistory: appendStatusHistory(
            existing.statusHistory,
            'QUOTE_RECEIVED',
            'ICB Solutions',
            `Revised quote of $${quoteAmount} submitted${repairCompanyName ? ` from ${repairCompanyName}` : ''}`
          ),
        }

        emailToClub = {
          subject: `[${existing.requestReference}] Revised Repair Quote - $${quoteAmount}`,
          htmlContent: buildClubNotificationEmail(
            existing.requestReference || existing.id,
            existing.club.name,
            existing.equipment.name,
            'Revised Quote Ready',
            `ICB Solutions has submitted a revised repair quote for <strong>${existing.equipment.name}</strong>.<br><br>
            <strong>New Quote Amount:</strong> $${quoteAmount}<br>
            ${repairCompanyName ? `<strong>Repair Company:</strong> ${repairCompanyName}<br>` : ''}
            ${quoteNotes ? `<strong>Notes:</strong> ${quoteNotes}<br>` : ''}
            <br>Please log in to your GymHub portal to review this updated quote.`,
            '#0891b2'
          ),
        }
        break
      }

      case 'mark_completed': {
        // ICB marks the repair as completed
        const { finalCost, completionNotes, warrantyInfo } = body
        updateData = {
          status: 'COMPLETED',
          repairCompletedAt: new Date(),
          repairCompletedBy: 'ICB Solutions',
          finalCost: finalCost || existing.quoteAmount,
          completionNotes: completionNotes || null,
          warrantyInfo: warrantyInfo || null,
          statusHistory: appendStatusHistory(
            existing.statusHistory,
            'COMPLETED',
            'ICB Solutions',
            `Repair completed${finalCost ? `. Final cost: $${finalCost}` : ''}`
          ),
        }

        emailToClub = {
          subject: `[${existing.requestReference}] Repair Completed - ${existing.equipment.name}`,
          htmlContent: buildClubNotificationEmail(
            existing.requestReference || existing.id,
            existing.club.name,
            existing.equipment.name,
            'Repair Completed',
            `The repair for <strong>${existing.equipment.name}</strong> has been completed.<br><br>
            ${finalCost ? `<strong>Final Cost:</strong> $${finalCost}<br>` : ''}
            ${completionNotes ? `<strong>Notes:</strong> ${completionNotes}<br>` : ''}
            ${warrantyInfo ? `<strong>Warranty:</strong> ${warrantyInfo}<br>` : ''}
            <br>Please log in to your GymHub portal to view the full details.`,
            '#7c3aed'
          ),
        }
        break
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    const updated = await prisma.repairQuoteRequest.update({
      where: { secureToken: token },
      data: updateData,
      include: {
        equipment: { include: { zone: true } },
        club: { select: { name: true } },
        requestedBy: { select: { fullName: true, email: true } },
      },
    })

    // Send email notification to the club contact
    if (emailToClub && existing.contactEmail) {
      try {
        await sendEmail({
          to: existing.contactEmail,
          subject: emailToClub.subject,
          htmlContent: emailToClub.htmlContent,
        })
      } catch (emailErr) {
        console.error('Failed to send club notification email:', emailErr)
      }
    }

    // Also notify the original requester if different from contact email
    if (emailToClub && existing.requestedBy.email && existing.requestedBy.email !== existing.contactEmail) {
      try {
        await sendEmail({
          to: existing.requestedBy.email,
          subject: emailToClub.subject,
          htmlContent: emailToClub.htmlContent,
        })
      } catch (emailErr) {
        console.error('Failed to send requester notification email:', emailErr)
      }
    }

    return NextResponse.json({
      ...updated,
      photos: updated.photos ? JSON.parse(updated.photos) : [],
      statusHistory: updated.statusHistory ? JSON.parse(updated.statusHistory) : [],
    })
  } catch (error) {
    console.error('Quote manage PUT error:', error)
    return NextResponse.json({ error: 'Failed to update quote request' }, { status: 500 })
  }
}

// Build a professional HTML email for club notifications
function buildClubNotificationEmail(
  reference: string,
  _clubName: string,
  equipmentName: string,
  statusLabel: string,
  bodyHtml: string,
  accentColor: string
): string {
  return `
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
    <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:40px 0;text-align:center;">
    <table role="presentation" style="width:600px;margin:0 auto;background:#ffffff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
      <tr>
        <td style="padding:24px 30px;background:${accentColor};border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;">Repair Quote Update</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Reference: ${reference}</p>
        </td>
      </tr>
      <tr><td style="padding:30px;">
        <div style="background:#f0fdf4;border:1px solid ${accentColor};border-radius:6px;padding:12px 16px;margin-bottom:20px;text-align:center;">
          <strong style="color:${accentColor};font-size:16px;">Status: ${statusLabel}</strong>
        </div>
        <p><strong>Equipment:</strong> ${equipmentName}</p>
        <p>${bodyHtml}</p>
      </td></tr>
      <tr>
        <td style="padding:20px 30px;background:#f9fafb;border-radius:0 0 8px 8px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#6b7280;">
            ICGymHub &bull; ${new Date().getFullYear()} ICB Solutions
          </p>
        </td>
      </tr>
    </table>
    </td></tr></table>
    </body></html>
  `
}
