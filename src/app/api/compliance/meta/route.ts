import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/apiAuth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { club } = await authenticateRequest(request)

    const [categories, users, quickAddOwners] = await Promise.all([
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
      // Get unique quick-add owners from compliance items
      prisma.complianceItem.findMany({
        where: {
          clubId: club.id,
          ownerName: { not: null },
          ownerId: null, // Only get quick-add owners (no User relation)
        },
        select: {
          ownerName: true,
          ownerEmail: true,
        },
        distinct: ['ownerName'],
      }),
    ])

    // Combine users and quick-add owners into a single list
    // Quick-add owners use their name as ID prefixed with 'qa-'
    const quickAddOwnersList = quickAddOwners
      .filter(owner => owner.ownerName)
      .map(owner => ({
        id: `qa-${owner.ownerName}`,
        fullName: owner.ownerName!,
        email: owner.ownerEmail || '',
        role: 'QUICK_ADD',
      }))

    const owners = [...users, ...quickAddOwnersList]

    return NextResponse.json({ categories, owners })
  } catch (error) {
    console.error('Compliance meta fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch compliance metadata' }, { status: 500 })
  }
}
