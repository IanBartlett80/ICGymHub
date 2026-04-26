import { PrismaClient } from '@prisma/client'
import bcryptjs from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')
  // Base seed data
  const services = [
    { key: 'roster', name: 'Class Rostering', description: 'Manage class schedules, instructors, and student enrollment' },
    { key: 'incident', name: 'Injury / Incident Management', description: 'Track incidents, create reports, and maintain compliance records' },
    { key: 'equipment', name: 'Equipment Safety Management', description: 'Schedule equipment inspections and maintain safety logs' },
    { key: 'icscore', name: 'ICScore Competition Management', description: 'Manage competitions, scores, and athlete competition tracking' },
    { key: 'maintenance', name: 'ICMaintenance', description: 'Track facility and equipment maintenance tasks and schedules' },
  ]

  const zones = [
    { name: 'Floor', description: 'Spring floor area' },
    { name: 'Vault', description: 'Vault runway and table' },
    { name: 'Bars', description: 'Uneven bars' },
    { name: 'Beam', description: 'Balance beams' },
    { name: 'Tumble Track', description: 'Tumble track and pit' },
  ]

  const predefinedGymsports = [
    'Artistic Gymnastics (Men\'s)',
    'Artistic Gymnastics (Women\'s)',
    'Rhythmic',
    'Trampoline & Tumbling',
    'Acrobatics',
    'Recreation Gymnastics',
    'KinderGym',
    'School',
  ]

  const coaches = [
    { name: 'Emma Coach', accreditationLevel: 'Advanced', membershipNumber: 'MEM-001', email: 'emma.coach@elitegymnastics.com.au' },
    { name: 'Liam Coach', accreditationLevel: 'Intermediate', membershipNumber: 'MEM-002', email: 'liam.coach@elitegymnastics.com.au' },
    { name: 'Sofia Coach', accreditationLevel: 'Beginner', membershipNumber: 'MEM-003', email: 'sofia.coach@elitegymnastics.com.au' },
  ]

  const classTemplates = [
    {
      name: 'Recreation Level 1',
      level: 'REC',
      lengthMinutes: 60,
      defaultRotationMinutes: 15,
      allowOverlap: false,
      activeDays: 'MON,WED',
      startTimeLocal: '16:00',
      endTimeLocal: '17:00',
      allowedZoneNames: ['Floor', 'Beam', 'Tumble Track'],
      defaultCoachEmails: ['emma.coach@elitegymnastics.com.au'],
    },
    {
      name: 'Senior Competition',
      level: 'SNR',
      lengthMinutes: 240,
      defaultRotationMinutes: 45,
      allowOverlap: false,
      activeDays: 'TUE,THU',
      startTimeLocal: '17:00',
      endTimeLocal: '21:00',
      allowedZoneNames: ['Floor', 'Vault', 'Bars', 'Beam', 'Tumble Track'],
      defaultCoachEmails: ['emma.coach@elitegymnastics.com.au', 'liam.coach@elitegymnastics.com.au'],
    },
    {
      name: 'Adult Conditioning',
      level: 'ADULT',
      lengthMinutes: 90,
      defaultRotationMinutes: 30,
      allowOverlap: false,
      activeDays: 'SAT',
      startTimeLocal: '09:00',
      endTimeLocal: '10:30',
      allowedZoneNames: ['Floor', 'Vault', 'Tumble Track'],
      defaultCoachEmails: ['sofia.coach@elitegymnastics.com.au'],
    },
  ]

  // Upsert services
  for (const service of services) {
    await prisma.service.upsert({
      where: { key: service.key },
      update: service,
      create: service,
    })
    console.log(`✓ Ensured service: ${service.name}`)
  }

  // Upsert test club
  const testClub = await prisma.club.upsert({
    where: { slug: 'elite-gymnastics-club' },
    update: {
      name: 'Elite Gymnastics Club',
      abn: '12345678901',
      domain: 'elitegymnastics.com.au',
      address: '123 Gymnastics Lane',
      city: 'Sydney',
      state: 'NSW',
      postalCode: '2000',
      phone: '+61 2 9000 0000',
      status: 'ACTIVE',
      timezone: 'Australia/Sydney',
    },
    create: {
      name: 'Elite Gymnastics Club',
      slug: 'elite-gymnastics-club',
      abn: '12345678901',
      domain: 'elitegymnastics.com.au',
      address: '123 Gymnastics Lane',
      city: 'Sydney',
      state: 'NSW',
      postalCode: '2000',
      phone: '+61 2 9000 0000',
      status: 'ACTIVE',
      timezone: 'Australia/Sydney',
    },
  })

  console.log(`✓ Ensured test club: ${testClub.name}`)

  // Upsert test user
  const hashedPassword = await bcryptjs.hash('TestPassword123', 12)
  const testUser = await prisma.user.upsert({
    where: { clubId_email: { clubId: testClub.id, email: 'admin@elitegymnastics.com.au' } },
    update: {},
    create: {
      clubId: testClub.id,
      email: 'admin@elitegymnastics.com.au',
      username: 'admin',
      passwordHash: hashedPassword,
      fullName: 'John Smith',
      role: 'ADMIN',
    },
  })

  console.log(`✓ Ensured test user: ${testUser.username} (password: TestPassword123)`) 

  // Link services to test club
  for (const service of services) {
    const serviceRecord = await prisma.service.findUnique({ where: { key: service.key } })
    if (!serviceRecord) continue
    await prisma.clubService.upsert({
      where: { clubId_serviceId: { clubId: testClub.id, serviceId: serviceRecord.id } },
      update: { enabled: true },
      create: {
        clubId: testClub.id,
        serviceId: serviceRecord.id,
        enabled: true,
        plan: 'basic',
      },
    })
  }

  console.log('✓ Linked all services to test club')

  // Zones
  for (const zone of zones) {
    await prisma.zone.upsert({
      where: { clubId_name: { clubId: testClub.id, name: zone.name } },
      update: { description: zone.description, active: true },
      create: {
        clubId: testClub.id,
        name: zone.name,
        description: zone.description,
        allowOverlap: false,
      },
    })
  }
  console.log('✓ Seeded zones')

  const zoneRecords = await prisma.zone.findMany({ where: { clubId: testClub.id } })
  const zoneByName = Object.fromEntries(zoneRecords.map((z) => [z.name, z]))

  // Gymsports
  for (const gymsportName of predefinedGymsports) {
    await prisma.gymsport.upsert({
      where: { clubId_name: { clubId: testClub.id, name: gymsportName } },
      update: { isPredefined: true, active: true },
      create: {
        clubId: testClub.id,
        name: gymsportName,
        isPredefined: true,
        active: true,
      },
    })
  }
  console.log('✓ Seeded gymsports')

  const gymsportRecords = await prisma.gymsport.findMany({ where: { clubId: testClub.id } })
  const gymsportByName = Object.fromEntries(gymsportRecords.map((g) => [g.name, g]))

  // Coaches
  for (const coach of coaches) {
    await prisma.coach.upsert({
      where: { clubId_email: { clubId: testClub.id, email: coach.email } },
      update: {
        name: coach.name,
        accreditationLevel: coach.accreditationLevel,
        membershipNumber: coach.membershipNumber,
        importedFromCsv: false,
      },
      create: {
        clubId: testClub.id,
        name: coach.name,
        accreditationLevel: coach.accreditationLevel,
        membershipNumber: coach.membershipNumber,
        email: coach.email,
        importedFromCsv: false,
      },
    })
  }
  console.log('✓ Seeded coaches')

  const coachRecords = await prisma.coach.findMany({ where: { clubId: testClub.id } })
  const coachByEmail = Object.fromEntries(coachRecords.map((c) => [c.email, c]))

  // Class templates
  for (const tmpl of classTemplates) {
    const template = await prisma.classTemplate.upsert({
      where: { clubId_name: { clubId: testClub.id, name: tmpl.name } },
      update: {
        level: tmpl.level,
        lengthMinutes: tmpl.lengthMinutes,
        defaultRotationMinutes: tmpl.defaultRotationMinutes,
        allowOverlap: tmpl.allowOverlap,
        activeDays: tmpl.activeDays,
        startTimeLocal: tmpl.startTimeLocal,
        endTimeLocal: tmpl.endTimeLocal,
        notes: tmpl.notes || null,
      },
      create: {
        clubId: testClub.id,
        name: tmpl.name,
        level: tmpl.level,
        lengthMinutes: tmpl.lengthMinutes,
        defaultRotationMinutes: tmpl.defaultRotationMinutes,
        allowOverlap: tmpl.allowOverlap,
        activeDays: tmpl.activeDays,
        startTimeLocal: tmpl.startTimeLocal,
        endTimeLocal: tmpl.endTimeLocal,
        notes: tmpl.notes || null,
      },
    })

    // Allowed zones for template
    if (tmpl.allowedZoneNames?.length) {
      for (const zoneName of tmpl.allowedZoneNames) {
        const zone = zoneByName[zoneName]
        if (!zone) continue
        await prisma.templateAllowedZone.upsert({
          where: { templateId_zoneId: { templateId: template.id, zoneId: zone.id } },
          update: {},
          create: { templateId: template.id, zoneId: zone.id },
        })
      }
    }

    // Default coaches for template
    if (tmpl.defaultCoachEmails?.length) {
      for (const coachEmail of tmpl.defaultCoachEmails) {
        const coach = coachByEmail[coachEmail]
        if (!coach) continue
        await prisma.templateCoach.upsert({
          where: { templateId_coachId: { templateId: template.id, coachId: coach.id } },
          update: {},
          create: { templateId: template.id, coachId: coach.id },
        })
      }
    }
  }
  console.log('✓ Seeded class templates with allowed zones and default coaches')

  // Sample analytics data (only when club has no operational records yet)
  const existingSessionCount = await prisma.classSession.count({ where: { clubId: testClub.id } })
  if (existingSessionCount === 0) {
    const recreationTemplate = await prisma.classTemplate.findUnique({
      where: { clubId_name: { clubId: testClub.id, name: 'Recreation Level 1' } },
    })

    const primaryZone = zoneByName['Floor'] || zoneRecords[0]
    const secondaryZone = zoneByName['Beam'] || zoneRecords[1] || zoneRecords[0]
    const assignedZoneSequence = JSON.stringify(
      [primaryZone?.id, secondaryZone?.id].filter(Boolean)
    )

    const createdSessions = []
    for (let i = 9; i >= 0; i--) {
      const sessionDate = new Date()
      sessionDate.setHours(0, 0, 0, 0)
      sessionDate.setDate(sessionDate.getDate() - i)

      const session = await prisma.classSession.create({
        data: {
          clubId: testClub.id,
          templateId: recreationTemplate?.id,
          date: sessionDate,
          startTimeLocal: '16:00',
          endTimeLocal: '17:00',
          rotationMinutes: 15,
          allowOverlap: false,
          assignedZoneSequence,
          status: 'PUBLISHED',
          conflictFlag: i === 2,
          generatedById: testUser.id,
        },
      })
      createdSessions.push(session)
    }

    const emmaCoach = coachByEmail['emma.coach@elitegymnastics.com.au']
    const liamCoach = coachByEmail['liam.coach@elitegymnastics.com.au']
    if (emmaCoach || liamCoach) {
      for (let i = 0; i < createdSessions.length; i++) {
        const selectedCoach = i % 2 === 0 ? emmaCoach : (liamCoach || emmaCoach)
        if (!selectedCoach) continue
        await prisma.sessionCoach.create({
          data: {
            sessionId: createdSessions[i].id,
            coachId: selectedCoach.id,
          },
        })
      }
    }

    const rosterStart = new Date()
    rosterStart.setHours(0, 0, 0, 0)
    const rosterEnd = new Date(rosterStart)
    rosterEnd.setDate(rosterStart.getDate() + 6)

    const roster = await prisma.roster.create({
      data: {
        clubId: testClub.id,
        dayOfWeek: null,
        startDate: rosterStart,
        endDate: rosterEnd,
        status: 'PUBLISHED',
        generatedAt: new Date(),
        generatedById: testUser.id,
      },
    })

    for (let i = 0; i < Math.min(4, createdSessions.length); i++) {
      const session = createdSessions[createdSessions.length - 1 - i]
      const startsAt = new Date(session.date)
      startsAt.setHours(16, 0, 0, 0)
      const endsAt = new Date(session.date)
      endsAt.setHours(17, 0, 0, 0)

      await prisma.rosterSlot.create({
        data: {
          clubId: testClub.id,
          rosterId: roster.id,
          sessionId: session.id,
          zoneId: primaryZone.id,
          startsAt,
          endsAt,
          conflictFlag: i === 1,
          conflictType: i === 1 ? 'coach' : null,
          allowOverlap: false,
        },
      })
    }

    console.log('✓ Seeded sample class sessions, coaches, and roster slots')
  }

  const existingEquipmentCount = await prisma.equipment.count({ where: { clubId: testClub.id } })
  if (existingEquipmentCount === 0) {
    const floorZone = zoneByName['Floor'] || zoneRecords[0]
    const beamZone = zoneByName['Beam'] || zoneRecords[1] || zoneRecords[0]
    const vaultZone = zoneByName['Vault'] || zoneRecords[2] || zoneRecords[0]

    await prisma.equipment.createMany({
      data: [
        {
          clubId: testClub.id,
          name: 'Main Floor Mat',
          category: 'Gymnastics Apparatus',
          serialNumber: `EGC-FLOOR-${testClub.id.slice(-4)}`,
          condition: 'Good',
          location: 'Floor',
          zoneId: floorZone?.id,
          inUse: true,
          nextMaintenance: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          active: true,
        },
        {
          clubId: testClub.id,
          name: 'Competition Beam',
          category: 'Gymnastics Apparatus',
          serialNumber: `EGC-BEAM-${testClub.id.slice(-4)}`,
          condition: 'Fair',
          location: 'Beam',
          zoneId: beamZone?.id,
          inUse: false,
          nextMaintenance: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          active: true,
        },
        {
          clubId: testClub.id,
          name: 'Vault Table A',
          category: 'Gymnastics Apparatus',
          serialNumber: `EGC-VAULT-${testClub.id.slice(-4)}`,
          condition: 'Excellent',
          location: 'Vault',
          zoneId: vaultZone?.id,
          inUse: true,
          nextMaintenance: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
          active: true,
        },
      ],
    })

    console.log('✓ Seeded sample equipment')
  }

  const equipmentRecords = await prisma.equipment.findMany({ where: { clubId: testClub.id, active: true } })
  const primaryEquipment = equipmentRecords[0]

  const existingSafetyIssueCount = await prisma.safetyIssue.count({ where: { clubId: testClub.id } })
  if (existingSafetyIssueCount === 0 && primaryEquipment) {
    await prisma.safetyIssue.createMany({
      data: [
        {
          clubId: testClub.id,
          equipmentId: primaryEquipment.id,
          issueType: 'CRITICAL',
          title: 'Mat edge separation',
          description: 'Edge seam has separated and exposes foam core.',
          reportedBy: 'Emma Coach',
          reportedByEmail: 'emma.coach@elitegymnastics.com.au',
          status: 'OPEN',
          priority: 'HIGH',
          createdAt: new Date(),
        },
        {
          clubId: testClub.id,
          equipmentId: primaryEquipment.id,
          issueType: 'NON_CRITICAL',
          title: 'Surface scuffing',
          description: 'Minor surface wear observed during inspection.',
          reportedBy: 'Liam Coach',
          reportedByEmail: 'liam.coach@elitegymnastics.com.au',
          status: 'IN_PROGRESS',
          priority: 'MEDIUM',
          createdAt: new Date(new Date().setMonth(new Date().getMonth() - 1)),
        },
      ],
    })

    console.log('✓ Seeded sample safety issues')
  }

  const existingMaintenanceTaskCount = await prisma.maintenanceTask.count({ where: { clubId: testClub.id } })
  if (existingMaintenanceTaskCount === 0 && primaryEquipment) {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    await prisma.maintenanceTask.createMany({
      data: [
        {
          clubId: testClub.id,
          equipmentId: primaryEquipment.id,
          taskType: 'INSPECTION',
          title: 'Monthly floor inspection',
          description: 'Routine monthly safety inspection.',
          scheduledDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          dueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          isRecurring: true,
          recurrencePattern: 'MONTHLY',
        },
        {
          clubId: testClub.id,
          equipmentId: primaryEquipment.id,
          taskType: 'REPAIR',
          title: 'Repair mat edge seam',
          description: 'Repair and reseal floor mat edge.',
          scheduledDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
          dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
          status: 'PENDING',
          priority: 'MEDIUM',
          isRecurring: false,
        },
        {
          clubId: testClub.id,
          equipmentId: primaryEquipment.id,
          taskType: 'CLEANING',
          title: 'Deep clean landing zones',
          description: 'Monthly deep clean completed by maintenance team.',
          scheduledDate: new Date(thisMonthStart.getTime() + 2 * 24 * 60 * 60 * 1000),
          dueDate: new Date(thisMonthStart.getTime() + 4 * 24 * 60 * 60 * 1000),
          completedDate: new Date(thisMonthStart.getTime() + 4 * 24 * 60 * 60 * 1000),
          status: 'COMPLETED',
          priority: 'LOW',
          isRecurring: true,
          recurrencePattern: 'MONTHLY',
        },
      ],
    })

    console.log('✓ Seeded sample maintenance tasks')
  }

  const existingInjuryCount = await prisma.injurySubmission.count({ where: { clubId: testClub.id } })
  if (existingInjuryCount === 0) {
    let criticalTemplate = await prisma.injuryFormTemplate.findFirst({
      where: {
        clubId: testClub.id,
        name: { contains: 'Critical' },
      },
    })

    if (!criticalTemplate) {
      criticalTemplate = await prisma.injuryFormTemplate.create({
        data: {
          clubId: testClub.id,
          name: 'Critical Injury Form',
          description: 'Template for high-severity incident reports',
          publicUrl: `${testClub.slug}-critical-injury-form`,
          isDefault: false,
          active: true,
        },
      })
    }

    for (let i = 0; i < 6; i++) {
      const submittedAt = new Date()
      submittedAt.setMonth(submittedAt.getMonth() - i)
      submittedAt.setDate(10)

      const status = i === 0 ? 'NEW' : i === 1 ? 'UNDER_REVIEW' : 'RESOLVED'
      const useCriticalTemplate = i % 2 === 0

      const submission = await prisma.injurySubmission.create({
        data: {
          clubId: testClub.id,
          templateId: useCriticalTemplate ? criticalTemplate.id : null,
          templateName: useCriticalTemplate ? criticalTemplate.name : 'General Injury Form',
          status,
          priority: useCriticalTemplate ? 'CRITICAL' : 'MEDIUM',
          submittedAt,
          zoneId: zoneByName['Floor']?.id || null,
          equipmentId: primaryEquipment?.id || null,
        },
      })

      if (status === 'RESOLVED') {
        await prisma.injurySubmission.update({
          where: { id: submission.id },
          data: {
            status: 'RESOLVED',
          },
        })
      }
    }

    console.log('✓ Seeded sample injury submissions')
  }

  console.log('')
  console.log('🎉 Database seed completed!')
  console.log('')
  console.log('Test credentials:')
  console.log(`  Username: admin`)
  console.log(`  Password: TestPassword123`)
  console.log('')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
