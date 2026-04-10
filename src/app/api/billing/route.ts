import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/apiAuth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/billing
 *
 * Returns the billing profile for the authenticated user's club.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const club = await prisma.club.findUnique({
      where: { id: auth.user.clubId },
      select: {
        id: true,
        name: true,
        paymentStatus: true,
        paymentAgreedAt: true,
        paymentCancelledAt: true,
        trialEndsAt: true,
        monthlyRateAud: true,
        xeroContactId: true,
        xeroRepeatingInvoiceId: true,
        createdAt: true,
      },
    })

    if (!club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    }

    // Calculate trial status
    const now = new Date()
    const trialEnd = club.trialEndsAt ? new Date(club.trialEndsAt) : null
    const isInTrial = trialEnd ? now < trialEnd : false
    const trialDaysRemaining = trialEnd
      ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null

    return NextResponse.json({
      billing: {
        paymentStatus: club.paymentStatus,
        paymentAgreedAt: club.paymentAgreedAt,
        paymentCancelledAt: club.paymentCancelledAt,
        trialEndsAt: club.trialEndsAt,
        monthlyRateAud: club.monthlyRateAud,
        isInTrial,
        trialDaysRemaining,
        hasXeroContact: !!club.xeroContactId,
        hasRecurringInvoice: !!club.xeroRepeatingInvoiceId,
        clubCreatedAt: club.createdAt,
      },
    })
  } catch (error) {
    console.error('Billing fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch billing information' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/billing/cancel
 *
 * Cancels the subscription. Sets paymentStatus to CANCELLED.
 * Only ADMIN users can cancel.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (auth.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can manage billing' }, { status: 403 })
    }

    const body = await req.json()
    const { action } = body

    if (action === 'cancel') {
      await prisma.club.update({
        where: { id: auth.user.clubId },
        data: {
          paymentStatus: 'CANCELLED',
          paymentCancelledAt: new Date(),
        },
      })

      return NextResponse.json({
        message: 'Subscription cancelled successfully. Your access will continue until the end of your current billing period.',
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Billing action error:', error)
    return NextResponse.json(
      { error: 'Failed to process billing action' },
      { status: 500 }
    )
  }
}
