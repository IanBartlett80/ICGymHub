/**
 * Migration script to add Gym Sport field to existing Injury Form Templates
 * 
 * This adds the Gym Sport field to Section 2 (Athlete Details) of templates
 * that don't already have it, placing it between Athlete Name and Class.
 * 
 * Usage: npx tsx scripts/add-gymsport-to-injury-forms.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addGymSportField() {
  console.log('🔍 Checking injury form templates for missing Gym Sport field...\n');

  try {
    // Get all injury form templates with their sections and fields
    const templates = await prisma.injuryFormTemplate.findMany({
      include: {
        sections: {
          include: {
            fields: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    console.log(`Found ${templates.length} injury form template(s)\n`);

    let updatedCount = 0;

    for (const template of templates) {
      // Find Section 2 (Athlete Details) - order = 1 (0-indexed)
      const athleteSection = template.sections.find(s => s.order === 1);
      
      if (!athleteSection) {
        console.log(`⚠️  Template "${template.name}" (${template.id}) doesn't have Section 2 (Athlete Details). Skipping.`);
        continue;
      }

      // Check if Gym Sport field already exists
      const hasGymSportField = athleteSection.fields.some(f => 
        f.label === 'Gym Sport' || f.label.toLowerCase().includes('gym sport')
      );

      if (hasGymSportField) {
        console.log(`✓ Template "${template.name}" already has Gym Sport field. Skipping.`);
        continue;
      }

      console.log(`📝 Adding Gym Sport field to template "${template.name}" (${template.id})...`);

      // Fetch gym sports for this club
      const gymsports = await prisma.gymsport.findMany({
        where: { clubId: template.clubId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });

      // Find Class field to determine correct ordering
      const classField = athleteSection.fields.find(f => 
        f.label === 'Class' || f.label.toLowerCase().includes('class')
      );

      // Update Class field order to 2 if it exists and is currently at order 1
      if (classField && classField.order === 1) {
        await prisma.injuryFormField.update({
          where: { id: classField.id },
          data: { order: 2 },
        });
        console.log(`  ↳ Updated Class field order to 2`);
      }

      // Shift any fields with order >= 1 up by 1
      await prisma.$executeRaw`
        UPDATE "InjuryFormField" 
        SET "order" = "order" + 1 
        WHERE "sectionId" = ${athleteSection.id}
        AND "order" >= 1
        AND "label" != 'Gym Sport'
      `;

      // Create the Gym Sport field at order 1 (between Athlete Name and Class)
      const gymSportField = await prisma.injuryFormField.create({
        data: {
          templateId: template.id,
          sectionId: athleteSection.id,
          fieldType: 'DROPDOWN',
          label: 'Gym Sport',
          description: 'Select the gym sport',
          placeholder: 'Choose a gym sport...',
          required: true,
          order: 1,
          options: gymsports.length > 0 
            ? JSON.stringify(gymsports.map(g => ({ id: g.id, name: g.name })))
            : JSON.stringify([]),
        },
      });

      console.log(`  ✓ Created Gym Sport field with ${gymsports.length} option(s)`);

      // Update Class field options to include gymsportId if it exists
      if (classField) {
        const classTemplates = await prisma.classTemplate.findMany({
          where: { clubId: template.clubId },
          select: { id: true, name: true, gymsportId: true },
          orderBy: { name: 'asc' },
        });

        if (classTemplates.length > 0) {
          await prisma.injuryFormField.update({
            where: { id: classField.id },
            data: {
              options: JSON.stringify(classTemplates.map(c => ({ 
                id: c.id, 
                name: c.name, 
                gymsportId: c.gymsportId 
              }))),
            },
          });
          console.log(`  ✓ Updated Class field options to include gymsportId`);
        }
      }

      updatedCount++;
      console.log(`  ✅ Successfully updated template "${template.name}"\n`);
    }

    console.log(`\n✅ Migration complete! Updated ${updatedCount} template(s).`);

    if (updatedCount === 0) {
      console.log('ℹ️  All templates already have the Gym Sport field.');
    }

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
addGymSportField()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
