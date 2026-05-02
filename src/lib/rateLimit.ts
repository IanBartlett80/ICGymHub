/**
 * Lightweight in-process rate limiter.
 *
 * Uses a sliding-window counter keyed by an arbitrary string (e.g. IP address).
 * Suitable for a single-process deployment. For multi-instance deployments,
 * replace the Map with a shared Redis store (Upstash recommended).
 */

interface Entry {
  count: number
  resetAt: number
}

const store = new Map<string, Entry>()

// Periodically purge expired entries to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) store.delete(key)
  }
}, 60_000)

/**
 * Check whether a key has exceeded the allowed rate.
 *
 * @param key       Unique identifier (e.g. IP address + route)
 * @param limit     Max requests allowed in the window
 * @param windowMs  Window duration in milliseconds
 * @returns `{ allowed: boolean, remaining: number, resetAt: number }`
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt <= now) {
    // Start a fresh window
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  entry.count += 1
  const remaining = Math.max(0, limit - entry.count)
  return { allowed: entry.count <= limit, remaining, resetAt: entry.resetAt }
}

/** Extract the best available client IP from a Next.js request. */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}
