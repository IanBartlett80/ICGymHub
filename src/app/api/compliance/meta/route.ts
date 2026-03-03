import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/apiAuth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { club } = await authenticateRequest(request)

    const [categories, owners] = await Promise.all([
      prisma.complianceCategory.findMany({
        where: {
          clubId: club.id,
          isActive: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.user.findMany({
        where: {
          clubId: club.id,
          isActive: true,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
        orderBy: { fullName: 'asc' },
      }),
    ])

    return NextResponse.json({ categories, owners })
  } catch (error) {
    console.error('Compliance meta fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch compliance metadata' }, { status: 500 })
  }
}
