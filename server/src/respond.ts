import type { Response } from "express";
import type { UpstreamResult } from "./weatherClient.js";

/**
 * Shared response helper. Mirrors the upstream status, passes the body through
 * unchanged (so the client sees the real API shape), and attaches operational
 * metadata as headers: live rate-limit budget, cache hit/miss, AI degradation,
 * and Retry-After on 429. These header names are exposed via CORS in index.ts.
 */
export function sendProxied(
  res: Response,
  result: Pick<UpstreamResult<unknown>, "status" | "data" | "rateLimit" | "retryAfter">,
  meta: { cached: boolean; aiDegraded?: boolean; stale?: boolean }
): void {
  const { rateLimit } = result;
  if (rateLimit.limit !== null) res.setHeader("X-RateLimit-Limit", String(rateLimit.limit));
  if (rateLimit.remaining !== null)
    res.setHeader("X-RateLimit-Remaining", String(rateLimit.remaining));
  if (rateLimit.reset !== null) res.setHeader("X-RateLimit-Reset", String(rateLimit.reset));
  res.setHeader("X-Cache", meta.stale ? "STALE" : meta.cached ? "HIT" : "MISS");
  if (meta.stale) res.setHeader("X-Stale", "true");
  if (meta.aiDegraded) res.setHeader("X-AI-Degraded", "true");
  if (result.retryAfter) res.setHeader("Retry-After", result.retryAfter);
  res.status(result.status).json(result.data);
}
