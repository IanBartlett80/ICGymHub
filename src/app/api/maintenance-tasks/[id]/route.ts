import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/apiAuth';

// GET /api/maintenance-tasks/[id] - Get single maintenance task
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, club } = await authenticateRequest(request);

    const task = await prisma.maintenanceTask.findFirst({
      where: {
        id: params.id,
        clubId: club.id,
      },
      include: {
        equipment: {
          include: {
            zone: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Maintenance task not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...task,
      photos: task.photos ? JSON.parse(task.photos) : [],
    });
  } catch (error) {
    console.error('Maintenance task get error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance task' },
      { status: 500 }
    );
  }
}

// PUT /api/maintenance-tasks/[id] - Update maintenance task
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, club } = await authenticateRequest(request);

    const body = await request.json();
    const {
      status,
      priority,
      title,
      description,
      scheduledDate,
      dueDate,
      assignedTo,
      completedBy,
      completedDate,
      cost,
      notes,
    } = body;

    // Verify task exists and belongs to club
    const existing = await prisma.maintenanceTask.findFirst({
      where: {
        id: params.id,
        clubId: club.id,
      },
      include: {
        equipment: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Maintenance task not found' }, { status: 404 });
    }

    const updateData: any = {};

    if (title !== undefined) {
      if (!title.trim()) {
        return NextResponse.json(
          { error: 'Title cannot be empty' },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      if (!description.trim()) {
        return NextResponse.json(
          { error: 'Description cannot be empty' },
          { status: 400 }
        );
      }
      updateData.description = description.trim();
    }

    if (status !== undefined) {
      const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        );
      }
      updateData.status = status;

      // If completing task, add timestamp and required fields
      if (status === 'COMPLETED' && existing.status !== 'COMPLETED') {
        if (!completedBy || !completedBy.trim()) {
          return NextResponse.json(
            { error: 'Completed by name is required when completing task' },
            { status: 400 }
          );
        }
        updateData.completedDate = completedDate ? new Date(completedDate) : new Date();
        updateData.completedBy = completedBy.trim();

        // Create maintenance log entry
        await prisma.maintenanceLog.create({
          data: {
            clubId: club.id,
            equipmentId: existing.equipmentId,
            maintenanceType: existing.taskType === 'ROUTINE' ? 'Routine' : 
                           existing.taskType === 'INSPECTION' ? 'Inspection' :
                           existing.taskType === 'REPAIR' ? 'Repair' : 
                           existing.taskType === 'REPLACEMENT' ? 'Replacement' : 'Routine',
            description: `${existing.title}\n${existing.description}${notes ? '\n\nNotes: ' + notes : ''}`,
            performedBy: completedBy.trim(),
            cost: cost || null,
            performedAt: updateData.completedDate,
          },
        });

        // Update equipment lastMaintenance date
        await prisma.equipment.update({
          where: { id: existing.equipmentId },
          data: { 
            lastMaintenance: updateData.completedDate,
          },
        });
      }
    }

    if (priority !== undefined) {
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
      if (!validPriorities.includes(priority)) {
        return NextResponse.json(
          { error: 'Invalid priority' },
          { status: 400 }
        );
      }
      updateData.priority = priority;
    }

    if (scheduledDate !== undefined) {
      updateData.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
    }

    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    if (assignedTo !== undefined) {
      updateData.assignedTo = assignedTo?.trim() || null;
    }

    if (completedBy !== undefined && completedBy) {
      updateData.completedBy = completedBy.trim();
    }

    if (cost !== undefined) {
      updateData.cost = cost || null;
    }

    if (notes !== undefined) {
      updateData.notes = notes?.trim() || null;
    }

    const task = await prisma.maintenanceTask.update({
      where: { id: params.id },
      data: updateData,
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
    });
  } catch (error) {
    console.error('Maintenance task update error:', error);
    return NextResponse.json(
      { error: 'Failed to update maintenance task' },
      { status: 500 }
    );
  }
}

// DELETE /api/maintenance-tasks/[id] - Delete maintenance task
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, club } = await authenticateRequest(request);

    // Verify task exists and belongs to club
    const existing = await prisma.maintenanceTask.findFirst({
      where: {
        id: params.id,
        clubId: club.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Maintenance task not found' }, { status: 404 });
    }

    await prisma.maintenanceTask.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Maintenance task delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete maintenance task' },
      { status: 500 }
    );
  }
}
