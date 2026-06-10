import { prisma } from '@/lib/prisma';
import { generateChatCompletion, isOpenAIConfigured } from '@/lib/openai';

/**
 * Extracts a human-readable "Label: value" line for a submission data row.
 * Field values are stored as JSON strings like {"value": "...", "displayValue": "..."}
 * but may also be plain strings, so both cases are handled.
 */
function formatField(label: string, rawValue: string): string | null {
  let display: unknown = rawValue;
  try {
    const parsed = JSON.parse(rawValue);
    if (parsed && typeof parsed === 'object') {
      display = (parsed as any).displayValue ?? (parsed as any).value ?? '';
    }
  } catch {
    // Plain string value — use as-is.
  }

  if (Array.isArray(display)) {
    display = display.join(', ');
  }

  const text = String(display ?? '').trim();
  if (!text) return null;
  return `${label}: ${text}`;
}

export interface InjurySummaryResult {
  aiSummary: string;
  aiSummaryGeneratedAt: string;
}

/**
 * Ensures an AI-generated summary exists for an injury/incident submission.
 *
 * - When `force` is false (default), returns the cached summary if present;
 *   otherwise generates, caches, and returns a new one.
 * - When `force` is true, always regenerates and overwrites the cache.
 *
 * Returns `null` when OpenAI is not configured and no cached summary exists.
 * The lookup is club-scoped so callers cannot summarise other clubs' data.
 */
export async function ensureInjurySummary(
  submissionId: string,
  clubId: string,
  options: { force?: boolean } = {}
): Promise<InjurySummaryResult | null> {
  const { force = false } = options;

  const submission = await prisma.injurySubmission.findFirst({
    where: { id: submissionId, clubId },
    include: {
      template: { select: { name: true } },
      venue: { select: { name: true } },
      zone: { select: { name: true } },
      equipment: { select: { name: true } },
      data: { include: { field: { select: { label: true, order: true } } } },
    },
  });

  if (!submission) {
    return null;
  }

  // Use the cached summary unless a regeneration was explicitly requested.
  if (!force && submission.aiSummary) {
    return {
      aiSummary: submission.aiSummary,
      aiSummaryGeneratedAt: (submission.aiSummaryGeneratedAt ?? submission.updatedAt).toISOString(),
    };
  }

  if (!isOpenAIConfigured()) {
    // No key available — fall back to any cached value, otherwise nothing.
    if (submission.aiSummary) {
      return {
        aiSummary: submission.aiSummary,
        aiSummaryGeneratedAt: (submission.aiSummaryGeneratedAt ?? submission.updatedAt).toISOString(),
      };
    }
    return null;
  }

  // Build a structured, factual context for the model from the submitted fields.
  const fieldLines = submission.data
    .slice()
    .sort((a, b) => (a.field?.order ?? 0) - (b.field?.order ?? 0))
    .map((d) => formatField(d.field?.label ?? 'Field', d.value))
    .filter((line): line is string => line !== null);

  const contextParts: string[] = [
    `Report type: ${submission.template?.name ?? 'Injury/Incident Report'}`,
  ];
  if (submission.venue?.name) contextParts.push(`Venue: ${submission.venue.name}`);
  if (submission.zone?.name) contextParts.push(`Area/Zone: ${submission.zone.name}`);
  if (submission.equipment?.name) contextParts.push(`Equipment involved: ${submission.equipment.name}`);
  contextParts.push(`Submitted at: ${submission.submittedAt.toISOString()}`);
  contextParts.push('', 'Submitted details:', ...fieldLines);

  const userPrompt = contextParts.join('\n');

  const system = [
    'You are an assistant that writes clear, professional incident summaries for a gymnastics club safety management system.',
    'Rewrite the submitted injury/incident report details into a concise, well-structured narrative summary (2-4 short paragraphs).',
    'Use a neutral, factual, professional tone suitable for an official safety record.',
    'Only use information explicitly provided. Do NOT invent names, times, injuries, or outcomes that are not stated.',
    'If important details are missing, do not speculate. Do not include a heading or preamble — return only the summary text.',
  ].join(' ');

  const summary = await generateChatCompletion({
    system,
    user: userPrompt,
    maxTokens: 500,
    temperature: 0.3,
  });

  const generatedAt = new Date();
  await prisma.injurySubmission.update({
    where: { id: submission.id },
    data: { aiSummary: summary, aiSummaryGeneratedAt: generatedAt },
  });

  return {
    aiSummary: summary,
    aiSummaryGeneratedAt: generatedAt.toISOString(),
  };
}
