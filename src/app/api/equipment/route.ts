import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

// GET /api/equipment - List all equipment for club with filtering
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const category = searchParams.get('category');
    const condition = searchParams.get('condition');
    const zoneId = searchParams.get('zoneId');
    const inUseParam = searchParams.get('inUse');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {
      clubId: auth.user.clubId,
    };

    if (activeOnly) where.active = true;
    if (category) where.category = category;
    if (condition) where.condition = condition;
    if (zoneId) where.zoneId = zoneId;
    if (inUseParam !== null) where.inUse = inUseParam === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { serialNumber: { contains: search } },
      ];
    }

    const [equipment, total] = await Promise.all([
      prisma.equipment.findMany({
        where,
        include: {
          _count: {
            select: {
              MaintenanceLog: true,
              EquipmentUsage: true,
            },
          },
        },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' }
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.equipment.count({ where }),
    ]);

    return NextResponse.json({
      equipment,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Equipment list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}

// POST /api/equipment - Create new equipment
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      category,
      serialNumber,
      purchaseDate,
      purchaseCost,
      condition,
      location,
      zoneId,
      lastMaintenance,
      nextMaintenance,
      maintenanceNotes,
    } = body;

    // Validation
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Equipment name is required' },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    const validConditions = ['Excellent', 'Good', 'Fair', 'Poor', 'Out of Service'];
    if (condition && !validConditions.includes(condition)) {
      return NextResponse.json(
        { error: 'Invalid condition value' },
        { status: 400 }
      );
    }

    // Check if zone exists if provided
    if (zoneId) {
      const zone = await prisma.zone.findFirst({
        where: {
          id: zoneId,
          clubId: auth.user.clubId,
        },
      });
      if (!zone) {
        return NextResponse.json(
          { error: 'Zone not found' },
          { status: 404 }
        );
      }
    }

    // Check for duplicate serial number (only if serialNumber is provided)
    if (serialNumber && serialNumber.trim().length > 0) {
      const existing = await prisma.equipment.findUnique({
        where: { serialNumber: serialNumber.trim() },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'Serial number already exists' },
          { status: 400 }
        );
      }
    }

    const equipment = await prisma.equipment.create({
      data: {
        clubId: auth.user.clubId,
        name: name.trim(),
        category,
        serialNumber: serialNumber && serialNumber.trim().length > 0 ? serialNumber.trim() : null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchaseCost: purchaseCost || null,
        condition: condition || 'Good',
        location: location || null,
        zoneId: zoneId || null,
        lastMaintenance: lastMaintenance ? new Date(lastMaintenance) : null,
        nextMaintenance: nextMaintenance ? new Date(nextMaintenance) : null,
        maintenanceNotes: maintenanceNotes || null,
        active: true,
      },
    });

    return NextResponse.json(equipment, { status: 201 });
  } catch (error) {
    console.error('Equipment create error:', error);
    
    // Log more details for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { error: 'Failed to create equipment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
