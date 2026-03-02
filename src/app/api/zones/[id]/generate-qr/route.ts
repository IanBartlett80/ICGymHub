import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

// POST /api/zones/[id]/generate-qr - Generate QR code for zone
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify the zone belongs to the user's club
    const zone = await prisma.zone.findFirst({
      where: {
        id,
        clubId: auth.user.clubId,
      },
    });

    if (!zone) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
    }

    // Generate or use existing publicId
    const publicId = zone.publicId || nanoid(16);

    // Update zone with publicId if it didn't have one
    if (!zone.publicId) {
      await prisma.zone.update({
        where: { id },
        data: { publicId },
      });
    }

    // Generate public URL
    const forwardedProto = req.headers.get('x-forwarded-proto');
    const forwardedHost = req.headers.get('x-forwarded-host');
    const host = req.headers.get('host');
    const requestOrigin = forwardedHost
      ? `${forwardedProto || 'https'}://${forwardedHost}`
      : host
      ? `${forwardedProto || 'https'}://${host}`
      : req.headers.get('origin');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || requestOrigin;

    if (!baseUrl) {
      return NextResponse.json(
        { error: 'Application base URL is not configured' },
        { status: 500 }
      );
    }

    const publicUrl = `${baseUrl}/zone/${publicId}`;

    // Generate QR code data URL (using a simple text representation for now)
    // In production, you'd use a library like qrcode to generate an actual QR image
    const QRCode = require('qrcode');
    const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 500,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return NextResponse.json({
      publicId,
      publicUrl,
      qrCodeDataUrl,
    });
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
