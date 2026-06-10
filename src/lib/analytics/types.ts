/**
 * Shared types for the Analytics hub. Pure types only (safe to import from both
 * client components and server routes).
 */

export type Tone = 'red' | 'amber' | 'green' | 'neutral';

/** A headline metric card shown at the top of an analytics page. */
export interface Kpi {
  key: string;
  label: string;
  value: string | number;
  tone: Tone;
  /** Optional supporting context, e.g. "3 critical". */
  hint?: string;
}

/** A single prioritised action the user should consider taking. */
export interface InsightAction {
  /** Severity drives ordering and colour in the UI. */
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail?: string;
  /** Optional in-app link to act on the item. */
  href?: string;
}

/** Standard AI insight block returned by analytics routes. */
export interface AnalyticsInsight {
  /** Short narrative briefing (plain text, may contain newlines). Null when AI is off or failed. */
  narrative: string | null;
  /** Deterministic, code-computed prioritised actions (never invented by AI). */
  actions: InsightAction[];
  aiEnabled: boolean;
  generatedAt: string;
}

/** A named numeric series point for trend charts. */
export interface SeriesPoint {
  period: string;
  [key: string]: string | number;
}

/** A simple labelled breakdown bucket. */
export interface Bucket {
  label: string;
  value: number;
  tone?: Tone;
}
