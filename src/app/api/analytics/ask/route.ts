import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuth';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { isOpenAIConfigured } from '@/lib/openai';
import { buildClubSnapshot } from '@/lib/analytics/snapshot';
import { answerDataQuestion } from '@/lib/analytics/ai';

// POST /api/analytics/ask  { question: string }
// Natural-language analytics assistant. Grounded ONLY on a PII-free, club-scoped
// aggregate snapshot. Rate limited per club + IP to bound cost and abuse.
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const clubId = auth.user.clubId;

    if (!isOpenAIConfigured()) {
      return NextResponse.json(
        { aiEnabled: false, answer: null, error: 'AI insights are not enabled for this workspace.' },
        { status: 200 }
      );
    }

    const ip = getClientIp(req);
    const limit = rateLimit(`analytics-ask:${clubId}:${ip}`, 20, 5 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many questions. Please wait a moment and try again.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const question = typeof body?.question === 'string' ? body.question.trim() : '';
    if (!question) {
      return NextResponse.json({ error: 'A question is required.' }, { status: 400 });
    }
    if (question.length > 500) {
      return NextResponse.json({ error: 'Question is too long (max 500 characters).' }, { status: 400 });
    }

    const context = await buildClubSnapshot(clubId);
    const { answer, aiEnabled } = await answerDataQuestion(question, context);

    return NextResponse.json({ answer, aiEnabled, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Analytics ask failed:', err);
    return NextResponse.json({ error: 'Failed to answer question' }, { status: 500 });
  }
}
