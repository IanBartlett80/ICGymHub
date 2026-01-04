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

function parseCSV(content: string): Array<Record<string, string>> {
  const lines = content.split('\n').filter((line) => line.trim())
  if (lines.length < 2) return []

  // Parse header line (handle quoted fields)
  const headers = parseCSVLine(lines[0])
  const rows: Array<Record<string, string>> = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] || ''
    })
    rows.push(row)
  }

  return rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++ // Skip next quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

// POST /api/coaches/import - Import coaches from CSV
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 })
    }

    const content = await file.text()
    const rows = parseCSV(content)

    if (!rows.length) {
      return NextResponse.json({ error: 'CSV file is empty or invalid' }, { status: 400 })
    }

    const job = await prisma.coachImportJob.create({
      data: {
        clubId: user.clubId,
        status: 'RUNNING',
        totalRows: rows.length,
        importedRows: 0,
      },
    })

    let imported = 0
    const errors: string[] = []

    // Get all gymsports for the club
    const clubGymsports = await prisma.gymsport.findMany({
      where: { clubId: user.clubId, active: true },
    })
    const gymsportByName = Object.fromEntries(clubGymsports.map((g) => [g.name.toLowerCase(), g]))

    const DAYS_MAP: Record<string, string> = {
      'monday': 'MON', 'mon': 'MON',
      'tuesday': 'TUE', 'tue': 'TUE',
      'wednesday': 'WED', 'wed': 'WED',
      'thursday': 'THU', 'thu': 'THU',
      'friday': 'FRI', 'fri': 'FRI',
      'saturday': 'SAT', 'sat': 'SAT',
      'sunday': 'SUN', 'sun': 'SUN',
    }

    for (const [index, row] of rows.entries()) {
      const name = row['Name'] || row['name']
      const accreditationLevel = row['Accreditation Level'] || row['accreditation level'] || row['accreditationLevel']
      const membershipNumber = row['Membership Number'] || row['membership number'] || row['membershipNumber']
      const email = row['Email'] || row['email']
      const phone = row['Phone Number'] || row['Phone'] || row['phone']
      const gymsportsStr = row['Gymsports (separated by |)'] || row['Gymsports'] || row['gymsports'] || ''
      const availDaysStr = row['Availability Days (separated by |)'] || row['Availability Days'] || row['days'] || ''
      const availStartStr = row['Availability Start Times (separated by |)'] || row['Start Times'] || row['startTimes'] || ''
      const availEndStr = row['Availability End Times (separated by |)'] || row['End Times'] || row['endTimes'] || ''

      if (!name) {
        errors.push(`Row ${index + 2}: Missing name`)
        continue
      }

      try {
        // Check for duplicate email
        if (email) {
          const existing = await prisma.coach.findUnique({
            where: { clubId_email: { clubId: user.clubId, email } },
          })

          if (existing) {
            errors.push(`Row ${index + 2}: Email ${email} already exists`)
            continue
          }
        }

        const coach = await prisma.coach.create({
          data: {
            clubId: user.clubId,
            name,
            accreditationLevel: accreditationLevel || null,
            membershipNumber: membershipNumber || null,
            email: email || null,
            phone: phone || null,
            importedFromCsv: true,
          },
        })

        // Parse and link gymsports
        if (gymsportsStr) {
          const gymsportNames = gymsportsStr.split('|').map(s => s.trim()).filter(s => s)
          for (const gymsportName of gymsportNames) {
            const gymsport = gymsportByName[gymsportName.toLowerCase()]
            if (gymsport) {
              await prisma.coachGymsport.create({
                data: {
                  coachId: coach.id,
                  gymsportId: gymsport.id,
                },
              })
            } else {
              errors.push(`Row ${index + 2}: Gymsport "${gymsportName}" not found`)
            }
          }
        }

        // Parse and create availability
        if (availDaysStr && availStartStr && availEndStr) {
          const days = availDaysStr.split('|').map(s => s.trim()).filter(s => s)
          const starts = availStartStr.split('|').map(s => s.trim()).filter(s => s)
          const ends = availEndStr.split('|').map(s => s.trim()).filter(s => s)

          if (days.length === starts.length && days.length === ends.length) {
            for (let i = 0; i < days.length; i++) {
              const dayOfWeek = DAYS_MAP[days[i].toLowerCase()] || days[i].toUpperCase()
              const validDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
              
              if (!validDays.includes(dayOfWeek)) {
                errors.push(`Row ${index + 2}: Invalid day "${days[i]}"`)
                continue
              }

              if (!/^\d{2}:\d{2}$/.test(starts[i]) || !/^\d{2}:\d{2}$/.test(ends[i])) {
                errors.push(`Row ${index + 2}: Invalid time format for ${days[i]}`)
                continue
              }

              await prisma.coachAvailability.create({
                data: {
                  coachId: coach.id,
                  dayOfWeek,
                  startTimeLocal: starts[i],
                  endTimeLocal: ends[i],
                },
              })
            }
          } else {
            errors.push(`Row ${index + 2}: Availability days, start times, and end times must have the same count`)
          }
        }

        imported += 1
      } catch (error) {
        errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    await prisma.coachImportJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        importedRows: imported,
        errorText: errors.length ? errors.join('\n') : null,
      },
    })

    return NextResponse.json(
      {
        message: `Import completed. ${imported} of ${rows.length} coaches imported.`,
        imported,
        total: rows.length,
        errors: errors.length ? errors : undefined,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to import coaches', error)
    return NextResponse.json({ error: 'Failed to import coaches' }, { status: 500 })
  }
}
