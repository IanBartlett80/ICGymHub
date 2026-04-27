import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/apiAuth';
import { verifyPassword } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

// POST - Immediately and permanently delete a club and all its data
export async function POST(request: NextRequest) {
  try {
    const { user, club } = await authenticateRequest(request);

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { password, confirmationText } = body;

    if (!password || !confirmationText) {
      return NextResponse.json({ error: 'Password and confirmation text are required' }, { status: 400 });
    }

    // Verify confirmation text matches club name
    if (confirmationText !== club.name) {
      return NextResponse.json({ error: 'Confirmation text does not match club name' }, { status: 400 });
    }

    // Verify password
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    if (!fullUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const passwordValid = await verifyPassword(password, fullUser.passwordHash);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Capture club details for the notification email before deletion
    const clubDetails = {
      id: club.id,
      name: club.name,
      domain: club.domain,
      abn: club.abn,
      address: club.address,
      city: club.city,
      state: club.state,
      postalCode: club.postalCode,
      phone: club.phone,
      createdAt: club.createdAt,
    };
    const adminDetails = {
      fullName: user.fullName,
      email: user.email,
      username: user.username,
    };

    // Permanently delete the club — all related records cascade-delete automatically
    await prisma.club.delete({
      where: { id: club.id },
    });

    // Send deletion notification email to GymHub admin
    try {
      const deletionDate = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' });
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
          <table role="presentation" style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:40px 0;text-align:center;">
                <table role="presentation" style="width:600px;margin:0 auto;background-color:#ffffff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="padding:30px;text-align:center;background-color:#dc2626;border-radius:8px 8px 0 0;">
                      <h1 style="margin:0;color:#ffffff;font-size:24px;">Club Account Deleted</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:30px;">
                      <p style="margin:0 0 20px;font-size:14px;color:#666;">Deleted: ${deletionDate} (AEST)</p>

                      <h2 style="margin:0 0 10px;font-size:18px;color:#333;border-bottom:1px solid #eee;padding-bottom:8px;">Club Details</h2>
                      <table style="width:100%;margin-bottom:20px;font-size:14px;">
                        <tr><td style="padding:4px 8px;color:#666;width:40%;">Club Name</td><td style="padding:4px 8px;color:#333;font-weight:600;">${clubDetails.name}</td></tr>
                        <tr><td style="padding:4px 8px;color:#666;">Domain</td><td style="padding:4px 8px;color:#333;">${clubDetails.domain}</td></tr>
                        <tr><td style="padding:4px 8px;color:#666;">ABN</td><td style="padding:4px 8px;color:#333;">${clubDetails.abn || 'Not provided'}</td></tr>
                        <tr><td style="padding:4px 8px;color:#666;">Club ID</td><td style="padding:4px 8px;color:#333;font-family:monospace;font-size:12px;">${clubDetails.id}</td></tr>
                      </table>

                      <h2 style="margin:0 0 10px;font-size:18px;color:#333;border-bottom:1px solid #eee;padding-bottom:8px;">Location</h2>
                      <table style="width:100%;margin-bottom:20px;font-size:14px;">
                        <tr><td style="padding:4px 8px;color:#666;width:40%;">Address</td><td style="padding:4px 8px;color:#333;">${clubDetails.address || 'N/A'}</td></tr>
                        <tr><td style="padding:4px 8px;color:#666;">City</td><td style="padding:4px 8px;color:#333;">${clubDetails.city || 'N/A'}</td></tr>
                        <tr><td style="padding:4px 8px;color:#666;">State</td><td style="padding:4px 8px;color:#333;">${clubDetails.state || 'N/A'}</td></tr>
                        <tr><td style="padding:4px 8px;color:#666;">Postal Code</td><td style="padding:4px 8px;color:#333;">${clubDetails.postalCode || 'N/A'}</td></tr>
                        <tr><td style="padding:4px 8px;color:#666;">Phone</td><td style="padding:4px 8px;color:#333;">${clubDetails.phone || 'N/A'}</td></tr>
                      </table>

                      <h2 style="margin:0 0 10px;font-size:18px;color:#333;border-bottom:1px solid #eee;padding-bottom:8px;">Deleted By</h2>
                      <table style="width:100%;margin-bottom:20px;font-size:14px;">
                        <tr><td style="padding:4px 8px;color:#666;width:40%;">Admin Name</td><td style="padding:4px 8px;color:#333;">${adminDetails.fullName}</td></tr>
                        <tr><td style="padding:4px 8px;color:#666;">Email</td><td style="padding:4px 8px;color:#333;">${adminDetails.email}</td></tr>
                        <tr><td style="padding:4px 8px;color:#666;">Username</td><td style="padding:4px 8px;color:#333;">${adminDetails.username}</td></tr>
                      </table>

                      <h2 style="margin:0 0 10px;font-size:18px;color:#333;border-bottom:1px solid #eee;padding-bottom:8px;">Billing</h2>
                      <table style="width:100%;margin-bottom:20px;font-size:14px;">
                        <tr><td style="padding:4px 8px;color:#666;">Registered</td><td style="padding:4px 8px;color:#333;">${new Date(clubDetails.createdAt).toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney' })}</td></tr>
                      </table>

                      <div style="margin-top:20px;padding:12px;background-color:#fef2f2;border:1px solid #ef4444;border-radius:6px;">
                        <p style="margin:0;font-size:13px;color:#991b1b;"><strong>Action Required:</strong> Please cancel the recurring invoice and remove the contact if applicable.</p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px;background-color:#f9fafb;border-radius:0 0 8px 8px;text-align:center;">
                      <p style="margin:0;font-size:12px;color:#666;">© ${new Date().getFullYear()} GymHub. Automated deletion notification.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      await sendEmail({
        to: 'GymHub@icb.solutions',
        subject: 'GymHub Club Deletion',
        htmlContent,
      });
      console.log(`✅ Club deletion notification email sent for ${clubDetails.name}`);
    } catch (emailError) {
      console.error('Failed to send deletion notification email:', emailError);
    }

    return NextResponse.json({
      message: 'Club has been permanently deleted',
    });
  } catch (error: any) {
    console.error('Delete club error:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to delete club' }, { status: 500 });
  }
}
