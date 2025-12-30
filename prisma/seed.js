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
