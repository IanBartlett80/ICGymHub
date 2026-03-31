import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

// GET /api/equipment/import/template - Download CSV template for equipment bulk import
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const headers = [
      'Equipment Name',
      'Category',
      'Venue',
      'Supplier',
      'Serial Number',
      'Condition',
      'Purchase Date',
      'Purchase Cost',
      'Installation Date',
      'Warranty Expiry Date',
      'End of Life Date',
      'Location Notes',
      'Maintenance Notes',
    ];

    const sampleRows = [
      [
        'Competition Vault Table',
        'Vault',
        'Main Gymnasium',
        'Gymnova',
        'GYM-VT-001',
        'Excellent',
        '2024-01-15',
        '8500.00',
        '2024-02-01',
        '2029-01-15',
        '2034-01-15',
        'Competition floor area',
        'Annual servicing required',
      ],
      [
        'Practice Balance Beam',
        'Beam',
        'Main Gymnasium',
        'Spieth',
        '',
        'Good',
        '2023-06-10',
        '3200.00',
        '',
        '',
        '',
        '',
        '',
      ],
    ];

    const csvLines = [
      headers.join(','),
      ...sampleRows.map(row =>
        row.map(cell => (cell.includes(',') || cell.includes('"') ? `"${cell.replace(/"/g, '""')}"` : cell)).join(',')
      ),
    ];

    const csv = csvLines.join('\n') + '\n';

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="equipment_import_template.csv"',
      },
    });
  } catch (error) {
    console.error('Failed to generate equipment template:', error);
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
  }
}
