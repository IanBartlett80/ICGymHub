/**
 * Shared helper for the page-level AI summary panels (Rosters, Injury &
 * Incidents, Equipment, Compliance).
 *
 * Every summary follows the same contract: deterministic metrics are computed
 * in code (never invented by the model) and the AI is only asked to narrate
 * those facts into a short, useful briefing. When OpenAI is not configured the
 * panel still renders with the deterministic metrics and no narrative.
 */
import { generateChatCompletion, isOpenAIConfigured } from '@/lib/openai';

export type MetricTone = 'red' | 'amber' | 'green' | 'neutral';

export interface SummaryMetric {
  label: string;
  value: string | number;
  tone: MetricTone;
}

export interface AISummaryResponse {
  narrative: string | null;
  metrics: SummaryMetric[];
  aiEnabled: boolean;
  generatedAt: string;
}

interface BuildAISummaryArgs {
  /** System prompt describing the assistant's role for this domain. */
  system: string;
  /** Structured facts (already computed in code) the model should narrate. */
  facts: string;
  /** Deterministic metric chips rendered alongside the narrative. */
  metrics: SummaryMetric[];
  maxTokens?: number;
}

/**
 * Builds a standard AI summary response. The narrative is generated only when
 * OpenAI is configured; any generation failure degrades gracefully to a null
 * narrative so the panel never breaks the page.
 */
export async function buildAISummary({
  system,
  facts,
  metrics,
  maxTokens = 450,
}: BuildAISummaryArgs): Promise<AISummaryResponse> {
  const aiEnabled = isOpenAIConfigured();
  let narrative: string | null = null;

  if (aiEnabled) {
    try {
      narrative = await generateChatCompletion({
        system,
        user: facts,
        maxTokens,
        temperature: 0.4,
      });
    } catch (err) {
      console.error('AI summary narrative generation failed:', err);
      narrative = null;
    }
  }

  return {
    narrative,
    metrics,
    aiEnabled,
    generatedAt: new Date().toISOString(),
  };
}
