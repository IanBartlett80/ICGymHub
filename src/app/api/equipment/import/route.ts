import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parseCSV(content: string): Array<Record<string, string>> {
  const lines = content.split('\n').filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }

  return rows;
}

function getField(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const val = row[key];
    if (val && val.trim()) return val.trim();
    // Case-insensitive fallback
    const lower = key.toLowerCase();
    for (const [k, v] of Object.entries(row)) {
      if (k.toLowerCase() === lower && v && v.trim()) return v.trim();
    }
  }
  return '';
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d;
}

// POST /api/equipment/import - Import equipment from CSV
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 });
    }

    const content = await file.text();
    const rows = parseCSV(content);

    if (!rows.length) {
      return NextResponse.json({ error: 'CSV file is empty or contains no data rows' }, { status: 400 });
    }

    // Fetch venues for this club (for name-to-id lookup)
    const clubVenues = await prisma.venue.findMany({
      where: { clubId: auth.user.clubId },
    });
    const venueByName: Record<string, { id: string; name: string }> = {};
    for (const v of clubVenues) {
      venueByName[v.name.toLowerCase()] = { id: v.id, name: v.name };
      venueByName[v.slug.toLowerCase()] = { id: v.id, name: v.name };
    }

    const validConditions = ['Excellent', 'Good', 'Fair', 'Poor', 'Out of Service'];

    let imported = 0;
    const errors: string[] = [];

    for (const [index, row] of rows.entries()) {
      const rowNum = index + 2; // +2 because row 1 is header, array is 0-based

      // Required fields
      const name = getField(row, 'Equipment Name', 'Name', 'equipment name');
      const venueName = getField(row, 'Venue', 'venue');
      const supplier = getField(row, 'Supplier', 'supplier');

      if (!name) {
        errors.push(`Row ${rowNum}: Missing required field "Equipment Name"`);
        continue;
      }

      if (!venueName) {
        errors.push(`Row ${rowNum}: Missing required field "Venue"`);
        continue;
      }

      // Look up venue
      const venueMatch = venueByName[venueName.toLowerCase()];
      if (!venueMatch) {
        const availableVenues = clubVenues.map(v => v.name).join(', ');
        errors.push(`Row ${rowNum}: Venue "${venueName}" not found. Available venues: ${availableVenues}`);
        continue;
      }

      // Optional fields
      const category = getField(row, 'Category', 'category');
      const serialNumber = getField(row, 'Serial Number', 'serialNumber', 'serial number');
      const condition = getField(row, 'Condition', 'condition');
      const purchaseDateStr = getField(row, 'Purchase Date', 'purchaseDate', 'purchase date');
      const purchaseCost = getField(row, 'Purchase Cost', 'purchaseCost', 'purchase cost');
      const installationDateStr = getField(row, 'Installation Date', 'installationDate', 'installation date');
      const warrantyExpiryStr = getField(row, 'Warranty Expiry Date', 'warrantyExpiryDate', 'warranty expiry date');
      const endOfLifeStr = getField(row, 'End of Life Date', 'endOfLifeDate', 'end of life date');
      const location = getField(row, 'Location Notes', 'Location', 'location');
      const maintenanceNotes = getField(row, 'Maintenance Notes', 'maintenanceNotes', 'maintenance notes');

      // Validate condition if provided
      if (condition && !validConditions.includes(condition)) {
        errors.push(`Row ${rowNum}: Invalid condition "${condition}". Valid values: ${validConditions.join(', ')}`);
        continue;
      }

      // Validate dates if provided
      const purchaseDate = parseDate(purchaseDateStr);
      if (purchaseDateStr && !purchaseDate) {
        errors.push(`Row ${rowNum}: Invalid purchase date "${purchaseDateStr}". Use YYYY-MM-DD format`);
        continue;
      }

      const installationDate = parseDate(installationDateStr);
      if (installationDateStr && !installationDate) {
        errors.push(`Row ${rowNum}: Invalid installation date "${installationDateStr}". Use YYYY-MM-DD format`);
        continue;
      }

      const warrantyExpiryDate = parseDate(warrantyExpiryStr);
      if (warrantyExpiryStr && !warrantyExpiryDate) {
        errors.push(`Row ${rowNum}: Invalid warranty expiry date "${warrantyExpiryStr}". Use YYYY-MM-DD format`);
        continue;
      }

      const endOfLifeDate = parseDate(endOfLifeStr);
      if (endOfLifeStr && !endOfLifeDate) {
        errors.push(`Row ${rowNum}: Invalid end of life date "${endOfLifeStr}". Use YYYY-MM-DD format`);
        continue;
      }

      // Check for duplicate serial number
      if (serialNumber) {
        const existing = await prisma.equipment.findUnique({
          where: { serialNumber },
        });
        if (existing) {
          errors.push(`Row ${rowNum}: Serial number "${serialNumber}" already exists`);
          continue;
        }
      }

      try {
        await prisma.equipment.create({
          data: {
            clubId: auth.user.clubId,
            name,
            category: category || null,
            serialNumber: serialNumber || null,
            condition: condition || 'Good',
            purchaseDate,
            purchaseCost: purchaseCost || null,
            installationDate,
            warrantyExpiryDate,
            endOfLifeDate,
            location: location || null,
            maintenanceNotes: maintenanceNotes || null,
            supplier: supplier || null,
            venueId: venueMatch.id,
            active: true,
          },
        });

        imported += 1;
      } catch (error) {
        errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error creating equipment'}`);
      }
    }

    return NextResponse.json(
      {
        message: `Import completed. ${imported} of ${rows.length} equipment items imported.`,
        imported,
        total: rows.length,
        errors: errors.length ? errors : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to import equipment:', error);
    return NextResponse.json({ error: 'Failed to import equipment' }, { status: 500 });
  }
}
