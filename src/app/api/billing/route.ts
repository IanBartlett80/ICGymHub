import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/apiAuth'
import { prisma } from '@/lib/prisma'
import { sendEmail, getLogoHeaderHtml } from '@/lib/email'

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
        domain: true,
        abn: true,
        address: true,
        city: true,
        state: true,
        postalCode: true,
        phone: true,
        paymentStatus: true,
        paymentAgreedAt: true,
        paymentCancelledAt: true,
        trialEndsAt: true,
        monthlyRateAud: true,
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
      // Fetch full club details for the cancellation email
      const club = await prisma.club.findUnique({
        where: { id: auth.user.clubId },
        select: {
          id: true,
          name: true,
          domain: true,
          abn: true,
          address: true,
          city: true,
          state: true,
          postalCode: true,
          phone: true,
          paymentStatus: true,
          paymentAgreedAt: true,
          trialEndsAt: true,
          monthlyRateAud: true,
          createdAt: true,
          users: {
            where: { role: 'ADMIN' },
            select: { fullName: true, email: true, username: true },
            take: 1,
          },
        },
      })

      if (!club) {
        return NextResponse.json({ error: 'Club not found' }, { status: 404 })
      }

      await prisma.club.update({
        where: { id: auth.user.clubId },
        data: {
          paymentStatus: 'CANCELLED',
          paymentCancelledAt: new Date(),
        },
      })

      // Send cancellation notification email
      try {
        const cancellationDate = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })
        const admin = club.users[0]
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
            <table role="presentation" style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:40px 0;text-align:center;">
                  <table role="presentation" style="width:600px;margin:0 auto;background-color:#ffffff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                    ${getLogoHeaderHtml()}
                    <tr>
                      <td style="padding:30px;text-align:center;background-color:#dc2626;">
                        <h1 style="margin:0;color:#ffffff;font-size:24px;">Subscription Cancellation Request</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:30px;">
                        <p style="margin:0 0 20px;font-size:14px;color:#666;">Cancelled: ${cancellationDate} (AEST)</p>

                        <h2 style="margin:0 0 10px;font-size:18px;color:#333;border-bottom:1px solid #eee;padding-bottom:8px;">Club Details</h2>
                        <table style="width:100%;margin-bottom:20px;font-size:14px;">
                          <tr><td style="padding:4px 8px;color:#666;width:40%;">Club Name</td><td style="padding:4px 8px;color:#333;font-weight:600;">${club.name}</td></tr>
                          <tr><td style="padding:4px 8px;color:#666;">Domain</td><td style="padding:4px 8px;color:#333;">${club.domain}</td></tr>
                          <tr><td style="padding:4px 8px;color:#666;">ABN</td><td style="padding:4px 8px;color:#333;">${club.abn || 'Not provided'}</td></tr>
                          <tr><td style="padding:4px 8px;color:#666;">Club ID</td><td style="padding:4px 8px;color:#333;font-family:monospace;font-size:12px;">${club.id}</td></tr>
                        </table>

                        <h2 style="margin:0 0 10px;font-size:18px;color:#333;border-bottom:1px solid #eee;padding-bottom:8px;">Location</h2>
                        <table style="width:100%;margin-bottom:20px;font-size:14px;">
                          <tr><td style="padding:4px 8px;color:#666;width:40%;">Address</td><td style="padding:4px 8px;color:#333;">${club.address || 'N/A'}</td></tr>
                          <tr><td style="padding:4px 8px;color:#666;">City</td><td style="padding:4px 8px;color:#333;">${club.city || 'N/A'}</td></tr>
                          <tr><td style="padding:4px 8px;color:#666;">State</td><td style="padding:4px 8px;color:#333;">${club.state || 'N/A'}</td></tr>
                          <tr><td style="padding:4px 8px;color:#666;">Postal Code</td><td style="padding:4px 8px;color:#333;">${club.postalCode || 'N/A'}</td></tr>
                          <tr><td style="padding:4px 8px;color:#666;">Phone</td><td style="padding:4px 8px;color:#333;">${club.phone || 'N/A'}</td></tr>
                        </table>

                        <h2 style="margin:0 0 10px;font-size:18px;color:#333;border-bottom:1px solid #eee;padding-bottom:8px;">Admin Account</h2>
                        <table style="width:100%;margin-bottom:20px;font-size:14px;">
                          <tr><td style="padding:4px 8px;color:#666;width:40%;">Full Name</td><td style="padding:4px 8px;color:#333;">${admin?.fullName || 'N/A'}</td></tr>
                          <tr><td style="padding:4px 8px;color:#666;">Email</td><td style="padding:4px 8px;color:#333;">${admin?.email || 'N/A'}</td></tr>
                          <tr><td style="padding:4px 8px;color:#666;">Username</td><td style="padding:4px 8px;color:#333;">${admin?.username || 'N/A'}</td></tr>
                        </table>

                        <h2 style="margin:0 0 10px;font-size:18px;color:#333;border-bottom:1px solid #eee;padding-bottom:8px;">Billing</h2>
                        <table style="width:100%;margin-bottom:20px;font-size:14px;">
                          <tr><td style="padding:4px 8px;color:#666;width:40%;">Monthly Rate</td><td style="padding:4px 8px;color:#333;">$${club.monthlyRateAud} AUD</td></tr>
                          <tr><td style="padding:4px 8px;color:#666;">Agreement Date</td><td style="padding:4px 8px;color:#333;">${club.paymentAgreedAt ? new Date(club.paymentAgreedAt).toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney' }) : 'N/A'}</td></tr>
                          <tr><td style="padding:4px 8px;color:#666;">Trial End Date</td><td style="padding:4px 8px;color:#333;">${club.trialEndsAt ? new Date(club.trialEndsAt).toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney' }) : 'N/A'}</td></tr>
                          <tr><td style="padding:4px 8px;color:#666;">Registered</td><td style="padding:4px 8px;color:#333;">${new Date(club.createdAt).toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney' })}</td></tr>
                        </table>

                        <div style="margin-top:20px;padding:12px;background-color:#fef2f2;border:1px solid #ef4444;border-radius:6px;">
                          <p style="margin:0;font-size:13px;color:#991b1b;"><strong>Action Required:</strong> Please cancel the recurring invoice for this club.</p>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:20px;background-color:#f9fafb;border-radius:0 0 8px 8px;text-align:center;">
                        <p style="margin:0;font-size:12px;color:#666;">© ${new Date().getFullYear()} GymHub. Automated cancellation notification.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `

        await sendEmail({
          to: 'GymHub@icb.solutions',
          subject: 'GymHub Cancellation Request',
          htmlContent,
        })
        console.log(`✅ Cancellation notification email sent for ${club.name}`)
      } catch (emailError) {
        // Don't fail the cancellation if the notification email fails
        console.error('Failed to send cancellation notification email:', emailError)
      }

      return NextResponse.json({
        message: 'Subscription cancelled successfully. Your data will be retained for 30 days. You can re-enable your subscription at any time during this period.',
      })
    }

    if (action === 'reactivate') {
      const club = await prisma.club.findUnique({
        where: { id: auth.user.clubId },
        select: {
          id: true,
          name: true,
          domain: true,
          abn: true,
          address: true,
          city: true,
          state: true,
          postalCode: true,
          phone: true,
          paymentStatus: true,
          monthlyRateAud: true,
          createdAt: true,
          users: {
            where: { role: 'ADMIN' },
            select: { fullName: true, email: true, username: true },
            take: 1,
          },
        },
      })

      if (!club) {
        return NextResponse.json({ error: 'Club not found' }, { status: 404 })
      }

      if (club.paymentStatus !== 'CANCELLED') {
        return NextResponse.json({ error: 'Subscription is not cancelled' }, { status: 400 })
      }

      await prisma.club.update({
        where: { id: auth.user.clubId },
        data: {
          paymentStatus: 'AGREED',
          paymentCancelledAt: null,
        },
      })

      // Send reactivation notification email
      try {
        const reactivationDate = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })
        const admin = club.users[0]
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
            <table role="presentation" style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:40px 0;text-align:center;">
                  <table role="presentation" style="width:600px;margin:0 auto;background-color:#ffffff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                    ${getLogoHeaderHtml()}
                    <tr>
                      <td style="padding:30px;text-align:center;background-color:#16a34a;">
                        <h1 style="margin:0;color:#ffffff;font-size:24px;">Subscription Re-Enabled</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:30px;">
                        <p style="margin:0 0 20px;font-size:14px;color:#666;">Re-enabled: ${reactivationDate} (AEST)</p>

                        <h2 style="margin:0 0 10px;font-size:18px;color:#333;border-bottom:1px solid #eee;padding-bottom:8px;">Club Details</h2>
                        <table style="width:100%;margin-bottom:20px;font-size:14px;">
                          <tr><td style="padding:4px 8px;color:#666;width:40%;">Club Name</td><td style="padding:4px 8px;color:#333;font-weight:600;">${club.name}</td></tr>
                          <tr><td style="padding:4px 8px;color:#666;">Domain</td><td style="padding:4px 8px;color:#333;">${club.domain}</td></tr>
                          <tr><td style="padding:4px 8px;color:#666;">ABN</td><td style="padding:4px 8px;color:#333;">${club.abn || 'Not provided'}</td></tr>
                          <tr><td style="padding:4px 8px;color:#666;">Club ID</td><td style="padding:4px 8px;color:#333;font-family:monospace;font-size:12px;">${club.id}</td></tr>
                        </table>

                        <h2 style="margin:0 0 10px;font-size:18px;color:#333;border-bottom:1px solid #eee;padding-bottom:8px;">Admin</h2>
                        <table style="width:100%;margin-bottom:20px;font-size:14px;">
                          <tr><td style="padding:4px 8px;color:#666;width:40%;">Full Name</td><td style="padding:4px 8px;color:#333;">${admin?.fullName || 'N/A'}</td></tr>
                          <tr><td style="padding:4px 8px;color:#666;">Email</td><td style="padding:4px 8px;color:#333;">${admin?.email || 'N/A'}</td></tr>
                        </table>

                        <div style="margin-top:20px;padding:12px;background-color:#f0fdf4;border:1px solid #22c55e;border-radius:6px;">
                          <p style="margin:0;font-size:13px;color:#166534;"><strong>Action Required:</strong> Please re-enable the recurring invoice for this club.</p>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:20px;background-color:#f9fafb;border-radius:0 0 8px 8px;text-align:center;">
                        <p style="margin:0;font-size:12px;color:#666;">© ${new Date().getFullYear()} GymHub. Automated reactivation notification.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `

        await sendEmail({
          to: 'GymHub@icb.solutions',
          subject: 'GYMHUB Subscription RENABLE Request',
          htmlContent,
        })
        console.log(`✅ Reactivation notification email sent for ${club.name}`)
      } catch (emailError) {
        console.error('Failed to send reactivation notification email:', emailError)
      }

      return NextResponse.json({
        message: 'Subscription re-enabled successfully. Welcome back!',
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
