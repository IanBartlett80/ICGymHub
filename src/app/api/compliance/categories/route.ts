import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/apiAuth'
import { prisma } from '@/lib/prisma'

function canManageCompliance(role: string): boolean {
  return role === 'ADMIN'
}

export async function GET(request: NextRequest) {
  try {
    const { club } = await authenticateRequest(request)

    const { searchParams } = new URL(request.url)
    const venueId = searchParams.get('venueId')

    const where: any = { clubId: club.id }
    if (venueId && venueId !== 'all') where.venueId = venueId

    const categories = await prisma.complianceCategory.findMany({
      where,
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Compliance categories list error:', error)
    return NextResponse.json({ error: 'Failed to fetch compliance categories' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, club } = await authenticateRequest(request)

    if (!canManageCompliance(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    const existing = await prisma.complianceCategory.findFirst({
      where: {
        clubId: club.id,
        name,
      },
    })

    if (existing) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 400 })
    }

    const category = await prisma.complianceCategory.create({
      data: {
        clubId: club.id,
        name,
        description: description || null,
      },
    })

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error('Compliance category create error:', error)
    return NextResponse.json({ error: 'Failed to create compliance category' }, { status: 500 })
  }
}
