import "server-only";

/**
 * Minimal in-memory fixed-window rate limiter — no dependencies.
 *
 * Scope: single-user deployment, so per-process/per-instance memory is
 * authoritative. When the app scales to multiple instances or heavy
 * traffic, swap this for a shared store (Redis, Upstash) with the same
 * call signature.
 */

interface WindowState {
  hits: number;
  resetAt: number;
}

/** Key → current window. Bounded so abuse cannot grow it unbounded. */
const windows = new Map<string, WindowState>();
const MAX_TRACKED_KEYS = 10_000;

/** True when the request is within the limit; false when it is exceeded. */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const state = windows.get(key);

  if (!state || state.resetAt <= now) {
    if (windows.size >= MAX_TRACKED_KEYS) windows.clear();
    windows.set(key, { hits: 1, resetAt: now + windowMs });
    return true;
  }

  state.hits += 1;
  return state.hits <= limit;
}

/** The client IP behind Next's proxy, or "local" when no proxy is present. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "local";
}
