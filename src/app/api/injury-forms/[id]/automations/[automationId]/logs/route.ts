import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuth';

// GET /api/injury-forms/[id]/automations/[automationId]/logs - Get automation execution logs
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; automationId: string }> }
) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { automationId } = await params;

    // For now, return instructions to view console logs
    // In the future, this could be enhanced to store logs in database
    const logs = `Automation Logs - Real-time Console Logging Active

This automation uses real-time console logging for detailed execution tracking.

To view detailed logs:
1. Open your browser Developer Console (F12 or Cmd+Option+I)
2. Navigate to the Console tab
3. Submit a new injury report form to trigger this automation
4. Look for logs with these prefixes:
   🤖 - Automation trigger events
   [Automation ${automationId}] - Specific automation execution steps
   ✅ - Successful operations
   ❌ - Failed operations
   ⚠️  - Warnings

Server-side logs:
- Check your terminal/server console for detailed email sending logs
- Email provider responses (SMTP/Microsoft Graph)
- Recipient resolution details
- Error stack traces

Recent execution stats are shown in the automation card above.

Note: Enhanced persistent logging with database storage is coming soon!`;

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching automation logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
