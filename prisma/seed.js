const { PrismaClient } = require('@prisma/client')
const bcryptjs = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create initial services
  const services = [
    {
      key: 'roster',
      name: 'Class Rostering',
      description: 'Manage class schedules, instructors, and student enrollment',
    },
    {
      key: 'incident',
      name: 'Injury / Incident Management',
      description: 'Track incidents, create reports, and maintain compliance records',
    },
    {
      key: 'equipment',
      name: 'Equipment Safety Management',
      description: 'Schedule equipment inspections and maintain safety logs',
    },
    {
      key: 'icscore',
      name: 'ICScore Competition Management',
      description: 'Manage competitions, scores, and athlete competition tracking',
    },
    {
      key: 'maintenance',
      name: 'ICMaintenance',
      description: 'Track facility and equipment maintenance tasks and schedules',
    },
  ]

  for (const service of services) {
    const existing = await prisma.service.findUnique({
      where: { key: service.key },
    })
    if (!existing) {
      await prisma.service.create({
        data: service,
      })
      console.log(`✓ Created service: ${service.name}`)
    }
  }

  // Create a test club
  const testClub = await prisma.club.create({
    data: {
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

  console.log(`✓ Created test club: ${testClub.name}`)

  // Create test user
  const hashedPassword = await bcryptjs.hash('TestPassword123', 12)
  const testUser = await prisma.user.create({
    data: {
      clubId: testClub.id,
      email: 'admin@elitegymnastics.com.au',
      username: 'admin',
      passwordHash: hashedPassword,
      fullName: 'John Smith',
      role: 'ADMIN',
    },
  })

  console.log(`✓ Created test user: ${testUser.username} (password: TestPassword123)`)

  // Link services to test club
  for (const service of services) {
    const serviceRecord = await prisma.service.findUnique({
      where: { key: service.key },
    })
    if (serviceRecord) {
      await prisma.clubService.create({
        data: {
          clubId: testClub.id,
          serviceId: serviceRecord.id,
          enabled: true,
        },
      })
    }
  }

  console.log('✓ Linked all services to test club')
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
