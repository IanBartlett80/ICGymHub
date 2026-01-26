import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { z } from 'zod'

function getAccessToken(req: NextRequest): string | null {
  const headerToken = req.headers.get('authorization')
  if (headerToken?.startsWith('Bearer ')) {
    return headerToken.replace('Bearer ', '').trim()
  }
  const cookieToken = req.cookies.get('accessToken')?.value
  return cookieToken || null
}

async function getAuthenticatedUser(req: NextRequest) {
  const token = getAccessToken(req)
  const payload = token ? verifyAccessToken(token) : null
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { club: true },
  })

  if (!user || !user.club || user.clubId !== payload.clubId) return null
  return user
}

const updateGymsportSchema = z.object({
  name: z.string().min(1).optional(),
  active: z.boolean().optional(),
})

// PATCH /api/gymsports/[id] - Update a gymsport
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = updateGymsportSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.errors },
        { status: 400 }
      )
    }

    const { id } = await params
    const updateData = parsed.data

    // Check if gymsport exists and belongs to club
    const existing = await prisma.gymsport.findUnique({
      where: { id },
    })

    if (!existing || existing.clubId !== user.clubId) {
      return NextResponse.json({ error: 'Gymsport not found' }, { status: 404 })
    }

    // If updating name, check for duplicates
    if (updateData.name && updateData.name !== existing.name) {
      const duplicate = await prisma.gymsport.findUnique({
        where: { clubId_name: { clubId: user.clubId, name: updateData.name } },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'A gymsport with this name already exists' },
          { status: 400 }
        )
      }
    }

    const gymsport = await prisma.gymsport.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ gymsport }, { status: 200 })
  } catch (error) {
    console.error('Failed to update gymsport', error)
    return NextResponse.json({ error: 'Failed to update gymsport' }, { status: 500 })
  }
}

// DELETE /api/gymsports/[id] - Delete a custom gymsport
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if gymsport exists and belongs to club
    const existing = await prisma.gymsport.findUnique({
      where: { id },
      include: {
        coachGymsports: true,
        classTemplates: true,
      },
    })

    if (!existing || existing.clubId !== user.clubId) {
      return NextResponse.json({ error: 'Gymsport not found' }, { status: 404 })
    }

    // Don't allow deleting predefined gymsports
    if (existing.isPredefined) {
      return NextResponse.json(
        { error: 'Cannot delete predefined gymsports. You can deactivate them instead.' },
        { status: 400 }
      )
    }

    // Check if gymsport is in use
    if (existing.coachGymsports.length > 0 || existing.classTemplates.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete gymsport that is assigned to coaches or classes. Deactivate it instead or remove all associations first.',
        },
        { status: 400 }
      )
    }

    await prisma.gymsport.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Gymsport deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('Failed to delete gymsport', error)
    return NextResponse.json({ error: 'Failed to delete gymsport' }, { status: 500 })
  }
}
