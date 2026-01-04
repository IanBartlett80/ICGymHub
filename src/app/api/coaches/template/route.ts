import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'

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

// GET /api/coaches/template - Download CSV template
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const csv = 'Name,Accreditation Level,Membership Number,Email,Phone Number,Gymsports (separated by |),Availability Days (separated by |),Availability Start Times (separated by |),Availability End Times (separated by |)\nJohn Doe,Advanced,MEM-001,john.doe@example.com,+61 400 000 000,"Artistic Gymnastics (Women\'s)|Recreation Gymnastics",MON|WED|FRI,16:00|16:00|16:00,20:00|20:00|20:00\nJane Smith,Intermediate,MEM-002,jane.smith@example.com,+61 400 000 001,Recreation Gymnastics,TUE|THU,17:00|17:00,21:00|21:00\n'

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="coach_import_template.csv"',
      },
    })
  } catch (error) {
    console.error('Failed to generate template', error)
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 })
  }
}
