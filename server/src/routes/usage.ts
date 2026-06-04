import { Router } from "express";
import { config } from "../config.js";
import { cacheKey, getCached, setCached } from "../cache.js";
import { upstreamGet } from "../weatherClient.js";
import { getRateLimit, setAiRemaining } from "../rateState.js";
import { sendProxied } from "../respond.js";
import type { UsageResponse, TreeQuota } from "../../../shared/types.js";

export const usageRouter = Router();

/**
 * Account usage. Doubles as the source of truth for the AI degradation tracker:
 * every fetch refreshes how many AI requests remain this period.
 */
usageRouter.get("/usage", async (_req, res) => {
  const key = cacheKey("/v1/usage", {});
  const cached = getCached<UsageResponse>(key);
  if (cached) {
    return sendProxied(
      res,
      { status: 200, data: cached, rateLimit: getRateLimit(), retryAfter: null },
      { cached: true }
    );
  }
  try {
    const result = await upstreamGet<UsageResponse>("/v1/usage");
    if (result.ok) {
      setCached(key, result.data, config.ttl.usage);
      setAiRemaining(result.data?.remaining?.aiRequests);
    }
    sendProxied(res, result, { cached: false });
  } catch {
    res.status(502).json({ error: "Upstream usage lookup failed" });
  }
});

usageRouter.get("/trees/quota", async (_req, res) => {
  const key = cacheKey("/v1/trees/quota", {});
  const cached = getCached<TreeQuota>(key);
  if (cached) {
    return sendProxied(
      res,
      { status: 200, data: cached, rateLimit: getRateLimit(), retryAfter: null },
      { cached: true }
    );
  }
  try {
    const result = await upstreamGet<TreeQuota>("/v1/trees/quota");
    if (result.ok) setCached(key, result.data, config.ttl.usage);
    sendProxied(res, result, { cached: false });
  } catch {
    res.status(502).json({ error: "Upstream tree quota lookup failed" });
  }
});
