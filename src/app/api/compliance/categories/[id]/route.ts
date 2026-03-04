import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/apiAuth'
import { prisma } from '@/lib/prisma'

function canManageCompliance(role: string): boolean {
  return role === 'ADMIN'
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, club } = await authenticateRequest(request)

    if (!canManageCompliance(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const categoryId = params.id
    const body = await request.json()

    // Verify category belongs to club
    const existingCategory = await prisma.complianceCategory.findFirst({
      where: {
        id: categoryId,
        clubId: club.id,
      },
    })

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const name = typeof body.name === 'string' ? body.name.trim() : existingCategory.name
    const description = typeof body.description === 'string' ? body.description.trim() : existingCategory.description

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    // Check for duplicate name (excluding current category)
    const duplicate = await prisma.complianceCategory.findFirst({
      where: {
        clubId: club.id,
        name,
        id: { not: categoryId },
      },
    })

    if (duplicate) {
      return NextResponse.json({ error: 'Category name already exists' }, { status: 400 })
    }

    const category = await prisma.complianceCategory.update({
      where: { id: categoryId },
      data: {
        name,
        description: description || null,
      },
    })

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Compliance category update error:', error)
    return NextResponse.json({ error: 'Failed to update compliance category' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, club } = await authenticateRequest(request)

    if (!canManageCompliance(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const categoryId = params.id

    // Verify category belongs to club
    const existingCategory = await prisma.complianceCategory.findFirst({
      where: {
        id: categoryId,
        clubId: club.id,
      },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
    })

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Check if category has items
    if (existingCategory._count.items > 0) {
      return NextResponse.json(
        { error: `Cannot delete category with ${existingCategory._count.items} assigned items` },
        { status: 400 }
      )
    }

    await prisma.complianceCategory.delete({
      where: { id: categoryId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Compliance category delete error:', error)
    return NextResponse.json({ error: 'Failed to delete compliance category' }, { status: 500 })
  }
}
