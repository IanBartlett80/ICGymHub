/**
 * Lightweight OpenAI helper used for GymHub AI features.
 *
 * Uses the OpenAI Chat Completions REST API directly via `fetch` so we do not
 * add a new npm dependency to the production build. All calls are server-side
 * only — the API key must never be exposed to the browser.
 *
 * Configuration (environment variables):
 *   OPENAI_API_KEY  (required to enable AI features)
 *   OPENAI_MODEL    (optional, defaults to "gpt-4o-mini")
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

export class OpenAINotConfiguredError extends Error {
  constructor() {
    super('OpenAI is not configured. Set OPENAI_API_KEY to enable AI features.');
    this.name = 'OpenAINotConfiguredError';
  }
}

/** Returns true when an OpenAI API key is available. */
export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

interface ChatCompletionOptions {
  system: string;
  user: string;
  /** Maximum tokens for the completion. Defaults to 600. */
  maxTokens?: number;
  /** Sampling temperature. Defaults to 0.3 for consistent, factual output. */
  temperature?: number;
}

/**
 * Sends a single system + user prompt to the OpenAI Chat Completions API and
 * returns the assistant's text response.
 *
 * @throws {OpenAINotConfiguredError} when no API key is configured.
 * @throws {Error} when the OpenAI request fails.
 */
export async function generateChatCompletion({
  system,
  user,
  maxTokens = 600,
  temperature = 0.3,
}: ChatCompletionOptions): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OpenAINotConfiguredError();
  }

  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `OpenAI request failed (${response.status} ${response.statusText}): ${errorBody.slice(0, 500)}`
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('OpenAI returned an empty response.');
  }

  return content;
}
