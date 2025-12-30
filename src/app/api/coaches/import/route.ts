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

  const headers = lines[0].split(',').map((h) => h.trim())
  const rows: Array<Record<string, string>> = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim())
    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] || ''
    })
    rows.push(row)
  }

  return rows
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

    for (const [index, row] of rows.entries()) {
      const name = row['Name'] || row['name']
      const accreditationLevel = row['Accreditation Level'] || row['accreditation level'] || row['accreditationLevel']
      const membershipNumber = row['Membership Number'] || row['membership number'] || row['membershipNumber']
      const email = row['Email'] || row['email']

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

        await prisma.coach.create({
          data: {
            clubId: user.clubId,
            name,
            accreditationLevel: accreditationLevel || null,
            membershipNumber: membershipNumber || null,
            email: email || null,
            importedFromCsv: true,
          },
        })

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
