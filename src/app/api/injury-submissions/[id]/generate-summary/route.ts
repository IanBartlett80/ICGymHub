import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuth';
import { isOpenAIConfigured } from '@/lib/openai';
import { ensureInjurySummary } from '@/lib/injurySummary';

// POST /api/injury-submissions/[id]/generate-summary
// Generates (and caches) an AI summary of an injury/incident submission.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isOpenAIConfigured()) {
      return NextResponse.json(
        { error: 'AI summaries are not enabled. An OpenAI API key has not been configured.' },
        { status: 503 }
      );
    }

    const { id } = await params;

    let result;
    try {
      // Always regenerate when the user explicitly requests a summary.
      result = await ensureInjurySummary(id, authResult.user.clubId, { force: true });
    } catch (err) {
      console.error('Failed to generate AI summary:', err);
      return NextResponse.json(
        { error: 'Failed to generate summary. Please try again.' },
        { status: 502 }
      );
    }

    if (!result) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating injury submission summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
