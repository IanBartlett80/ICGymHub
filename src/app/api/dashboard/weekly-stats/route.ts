import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('accessToken')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; clubId: string }

    const now = new Date()
    
    // Calculate Monday of current week
    const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1 // If Sunday, go back 6 days
    const monday = new Date(now)
    monday.setDate(now.getDate() - daysFromMonday)
    monday.setHours(0, 0, 0, 0)
    
    // Calculate Sunday of current week
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    // Count ClassSessions for the week (not Zone sessions)
    const weeklyClassCount = await prisma.classSession.count({
      where: {
        clubId: decoded.clubId,
        date: {
          gte: monday,
          lte: sunday
        }
      }
    })

    return NextResponse.json({ 
      weeklyClassCount,
      weekStart: monday.toISOString(),
      weekEnd: sunday.toISOString()
    })
  } catch (error) {
    console.error('Error fetching weekly stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
