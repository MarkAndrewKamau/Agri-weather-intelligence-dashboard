import type { RateLimit } from "../../shared/types.js";

/**
 * Tracks the operational reality of using a metered API.
 *
 * 1. Keeps the latest `X-RateLimit-*` snapshot so the UI quota widget can show
 *    live request budget without an extra call.
 * 2. Tracks AI requests remaining (refreshed from `/v1/usage`) so weather routes
 *    can pre-emptively switch to `ai=false` when the 200/mo AI budget runs low —
 *    protecting the demo from a mid-presentation quota death.
 */

let latest: RateLimit = { limit: null, remaining: null, reset: null };
let aiRemaining: number | null = null;

/** Parse rate-limit headers from an upstream response (WeatherAI uses `ratelimit-*`). */
export function parseRateLimit(headers: Headers): RateLimit {
  const num = (v: string | null) => (v != null && v !== "" ? Number(v) : null);
  const rl: RateLimit = {
    limit: num(headers.get("ratelimit-limit")),
    remaining: num(headers.get("ratelimit-remaining")),
    reset: headers.get("ratelimit-reset"),
  };
  if (rl.limit !== null || rl.remaining !== null) latest = rl;
  return rl;
}

export function getRateLimit(): RateLimit {
  return latest;
}

/** Update AI remaining from a parsed `/v1/usage` body. */
export function setAiRemaining(remaining: number | null | undefined): void {
  if (typeof remaining === "number" && Number.isFinite(remaining)) {
    aiRemaining = remaining;
  }
}

export function getAiRemaining(): number | null {
  return aiRemaining;
}

/**
 * Whether AI enrichment should be suppressed. We degrade when we KNOW the AI
 * budget is below threshold; if we've never seen usage data we allow AI through.
 */
export function shouldDegradeAi(threshold: number): boolean {
  return aiRemaining !== null && aiRemaining < threshold;
}
