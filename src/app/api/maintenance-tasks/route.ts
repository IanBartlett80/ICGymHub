import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/apiAuth';

// GET /api/maintenance-tasks - List maintenance tasks with filtering
export async function GET(request: NextRequest) {
  try {
    const { user, club } = await authenticateRequest(request);

    const { searchParams } = new URL(request.url);
    const equipmentId = searchParams.get('equipmentId');
    const zoneId = searchParams.get('zoneId');
    const status = searchParams.get('status');
    const taskType = searchParams.get('taskType');
    const priority = searchParams.get('priority');
    const overdue = searchParams.get('overdue') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {
      clubId: club.id,
    };

    if (equipmentId) {
      where.equipmentId = equipmentId;
    }

    if (zoneId) {
      where.equipment = {
        zoneId: zoneId,
      };
    }

    if (status) {
      where.status = status;
    }

    if (taskType) {
      where.taskType = taskType;
    }

    if (priority) {
      where.priority = priority;
    }

    if (overdue) {
      where.dueDate = {
        lt: new Date(),
      };
      where.status = {
        in: ['PENDING', 'IN_PROGRESS'],
      };
    }

    const [tasks, total] = await Promise.all([
      prisma.maintenanceTask.findMany({
        where,
        include: {
          equipment: {
            include: {
              zone: true,
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.maintenanceTask.count({ where }),
    ]);

    // Parse photos JSON for each task
    const tasksWithPhotos = tasks.map(task => ({
      ...task,
      photos: task.photos ? JSON.parse(task.photos) : [],
    }));

    return NextResponse.json({
      tasks: tasksWithPhotos,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Maintenance tasks list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance tasks' },
      { status: 500 }
    );
  }
}

// POST /api/maintenance-tasks - Create new maintenance task
export async function POST(request: NextRequest) {
  try {
    const { user, club } = await authenticateRequest(request);

    const body = await request.json();
    const {
      equipmentId,
      taskType,
      title,
      description,
      scheduledDate,
      dueDate,
      assignedTo,
      priority,
      notes,
      photos,
    } = body;

    // Validation
    if (!equipmentId) {
      return NextResponse.json(
        { error: 'Equipment ID is required' },
        { status: 400 }
      );
    }

    if (!taskType) {
      return NextResponse.json(
        { error: 'Task type is required' },
        { status: 400 }
      );
    }

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    // Validate task type
    const validTaskTypes = ['ROUTINE', 'INSPECTION', 'REPAIR', 'REPLACEMENT', 'CLEANING'];
    if (!validTaskTypes.includes(taskType)) {
      return NextResponse.json(
        { error: 'Invalid task type' },
        { status: 400 }
      );
    }

    // Verify equipment exists and belongs to club
    const equipment = await prisma.equipment.findFirst({
      where: {
        id: equipmentId,
        clubId: club.id,
      },
    });

    if (!equipment) {
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      );
    }

    // Create maintenance task
    const task = await prisma.maintenanceTask.create({
      data: {
        clubId: club.id,
        equipmentId,
        taskType,
        title: title.trim(),
        description: description.trim(),
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedTo: assignedTo?.trim() || null,
        priority: priority || 'MEDIUM',
        notes: notes?.trim() || null,
        photos: photos && photos.length > 0 ? JSON.stringify(photos) : null,
        status: 'PENDING',
      },
      include: {
        equipment: {
          include: {
            zone: true,
          },
        },
      },
    });

    return NextResponse.json({
      ...task,
      photos: task.photos ? JSON.parse(task.photos) : [],
    }, { status: 201 });
  } catch (error) {
    console.error('Maintenance task create error:', error);
    return NextResponse.json(
      { error: 'Failed to create maintenance task' },
      { status: 500 }
    );
  }
}
