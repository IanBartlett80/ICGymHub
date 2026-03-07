import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

// POST /api/venues/generate-qr - Generate QR codes for all club venues
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active venues for the club
    const venues = await prisma.venue.findMany({
      where: {
        clubId: auth.user.clubId,
        active: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    if (venues.length === 0) {
      return NextResponse.json({ error: 'No venues found' }, { status: 404 });
    }

    // Generate public URL base
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

    const QRCode = require('qrcode');
    const venueQRCodes = [];

    // Generate QR code for each venue
    for (const venue of venues) {
      // Generate or use existing publicId
      const publicId = venue.publicId || nanoid(16);

      // Update venue with publicId if it didn't have one
      if (!venue.publicId) {
        await prisma.venue.update({
          where: { id: venue.id },
          data: { publicId },
        });
      }

      // Also ensure all zones in this venue have publicIds
      const zones = await prisma.zone.findMany({
        where: {
          venueId: venue.id,
          active: true,
        },
      });

      for (const zone of zones) {
        if (!zone.publicId) {
          await prisma.zone.update({
            where: { id: zone.id },
            data: { publicId: nanoid(16) },
          });
        }
      }

      const publicUrl = `${baseUrl}/venue/${publicId}`;

      // Generate QR code data URL
      const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
        width: 500,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      venueQRCodes.push({
        venueId: venue.id,
        venueName: venue.name,
        publicId,
        publicUrl,
        qrCodeDataUrl,
      });
    }

    return NextResponse.json({ venueQRCodes });
  } catch (error) {
    console.error('Failed to generate venue QR codes:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR codes' },
      { status: 500 }
    );
  }
}

// GET /api/venues/generate-qr - Get existing QR codes for all club venues
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active venues with publicId
    const venues = await prisma.venue.findMany({
      where: {
        clubId: auth.user.clubId,
        active: true,
        publicId: { not: null },
      },
      orderBy: {
        name: 'asc',
      },
    });

    if (venues.length === 0) {
      return NextResponse.json({ venueQRCodes: [] });
    }

    // Generate public URL base
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

    const QRCode = require('qrcode');
    const venueQRCodes = [];

    // Generate QR code for each venue that has a publicId
    for (const venue of venues) {
      if (!venue.publicId) continue;

      const publicUrl = `${baseUrl}/venue/${venue.publicId}`;

      // Generate QR code data URL
      const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
        width: 500,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      venueQRCodes.push({
        venueId: venue.id,
        venueName: venue.name,
        publicId: venue.publicId,
        publicUrl,
        qrCodeDataUrl,
      });
    }

    return NextResponse.json({ venueQRCodes });
  } catch (error) {
    console.error('Failed to fetch venue QR codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch QR codes' },
      { status: 500 }
    );
  }
}
