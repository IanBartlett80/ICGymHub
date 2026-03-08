/**
 * Cleanup Script: Remove "Program" field from existing Injury Form Templates
 * 
 * This script removes the redundant "Program" field from the Athlete Details section
 * of existing injury forms, keeping only the more specific "Class" field.
 * 
 * Run with: npx tsx scripts/cleanup-injury-form-program-field.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting cleanup of Program fields from injury forms...\n')

  try {
    // Find all Athlete Details sections
    const athleteDetailsSections = await prisma.injuryFormSection.findMany({
      where: {
        title: 'Athlete Details',
      },
      include: {
        fields: {
          where: {
            label: 'Program',
          },
        },
        template: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    console.log(`Found ${athleteDetailsSections.length} Athlete Details sections\n`)

    let removedCount = 0

    for (const section of athleteDetailsSections) {
      const programFields = section.fields.filter(f => f.label === 'Program')
      
      if (programFields.length > 0) {
        console.log(`Form: "${section.template.name}"`)
        console.log(`  Section: ${section.title}`)
        console.log(`  Found ${programFields.length} Program field(s) to remove`)

        for (const programField of programFields) {
          // Delete the Program field
          await prisma.injuryFormField.delete({
            where: {
              id: programField.id,
            },
          })
          console.log(`  ✓ Removed Program field (ID: ${programField.id})`)
          removedCount++
        }

        // Re-order remaining fields in the section
        const remainingFields = await prisma.injuryFormField.findMany({
          where: {
            sectionId: section.id,
          },
          orderBy: {
            order: 'asc',
          },
        })

        console.log(`  Re-ordering ${remainingFields.length} remaining fields...`)
        
        for (let i = 0; i < remainingFields.length; i++) {
          await prisma.injuryFormField.update({
            where: {
              id: remainingFields[i].id,
            },
            data: {
              order: i,
            },
          })
        }
        
        console.log(`  ✓ Field order updated\n`)
      }
    }

    if (removedCount === 0) {
      console.log('✓ No Program fields found to remove. All forms are up to date!')
    } else {
      console.log(`\n✅ Successfully removed ${removedCount} Program field(s) from injury forms`)
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
