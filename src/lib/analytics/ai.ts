/**
 * Server-side AI helpers for the Analytics hub.
 *
 * All functions degrade gracefully when OpenAI is not configured (returning a
 * null narrative / disabled flag) so analytics pages always render their
 * deterministic metrics. The model is only ever given pre-aggregated, club
 * scoped facts — never raw records or any personally identifiable information.
 */
import { generateChatCompletion, isOpenAIConfigured } from '@/lib/openai';

/**
 * Generates a short narrative briefing from already-computed facts. Returns
 * null when AI is unavailable or the request fails — callers should treat a
 * null narrative as "metrics only".
 */
export async function generateNarrative(
  system: string,
  facts: string,
  maxTokens = 450
): Promise<string | null> {
  if (!isOpenAIConfigured()) return null;
  try {
    return await generateChatCompletion({ system, user: facts, maxTokens, temperature: 0.4 });
  } catch (err) {
    console.error('Analytics narrative generation failed:', err);
    return null;
  }
}

/**
 * Answers a natural-language question about the club's analytics using only the
 * supplied, pre-aggregated context. The model is instructed to refuse to invent
 * data and to answer strictly from the provided facts.
 */
export async function answerDataQuestion(
  question: string,
  context: string
): Promise<{ answer: string | null; aiEnabled: boolean }> {
  if (!isOpenAIConfigured()) {
    return { answer: null, aiEnabled: false };
  }
  try {
    const answer = await generateChatCompletion({
      system:
        'You are the analytics assistant for a gymnastics club management platform. ' +
        'Answer the user\'s question using ONLY the structured club data provided below. ' +
        'The data is already aggregated and scoped to this club. ' +
        'Be concise and specific, lead with the direct answer, then add 1-2 supporting facts or a short recommendation. ' +
        'Use plain text with short bullet points where helpful (no markdown headings). ' +
        'If the provided data does not contain the answer, say so plainly and suggest which analytics section might help. ' +
        'Never invent numbers, names, or trends that are not in the data.',
      user: `CLUB DATA SNAPSHOT:\n${context}\n\nQUESTION: ${question}`,
      maxTokens: 500,
      temperature: 0.3,
    });
    return { answer, aiEnabled: true };
  } catch (err) {
    console.error('Analytics question answering failed:', err);
    return { answer: null, aiEnabled: true };
  }
}
