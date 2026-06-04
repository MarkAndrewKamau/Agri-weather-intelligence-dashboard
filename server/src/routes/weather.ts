import { Router, type Request } from "express";
import { config } from "../config.js";
import { cacheKey, getCached, getStale, setCached } from "../cache.js";
import { upstreamGet, type UpstreamResult } from "../weatherClient.js";
import { getRateLimit, shouldDegradeAi } from "../rateState.js";
import { sendProxied } from "../respond.js";
import type { WeatherResponse } from "../../../shared/types.js";

export const weatherRouter = Router();

/** Pull the real client IP from proxy headers (Render/localhost both work). */
function clientIp(req: Request): string | undefined {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length) return xff.split(",")[0]!.trim();
  return req.ip || undefined;
}

function parseBool(v: unknown, dflt: boolean): boolean {
  if (v === undefined) return dflt;
  return v === "true" || v === "1" || v === true;
}

/**
 * Shared handler for the forecast-family endpoints. Validates lat/lon, applies
 * AI degradation, serves from cache when possible, and proxies otherwise.
 */
function forecastHandler(upstreamPath: string, opts: { allowDays: boolean; allowLang: boolean }) {
  return async (req: Request, res: import("express").Response) => {
    const { lat, lon, units = "metric", lang = "en", days } = req.query as Record<string, string>;
    if (!lat || !lon) {
      return res.status(400).json({ error: "lat and lon query params are required" });
    }

    // AI is OFF by default to protect the scarce AI budget (200/mo): the
    // forecast endpoints return no narrative anyway, so AI is opted into
    // explicitly elsewhere. When requested it is still auto-suppressed if low.
    const wantsAi = parseBool(req.query.ai, false);
    const degraded = wantsAi && shouldDegradeAi(config.aiDegradeThreshold);
    const ai = wantsAi && !degraded;

    const params: Record<string, string | number | boolean> = { lat, lon, units, ai };
    if (opts.allowDays && days) params.days = days;
    if (opts.allowLang) params.lang = lang;

    const key = cacheKey(upstreamPath, params);
    const cached = getCached<WeatherResponse>(key);
    if (cached) {
      return sendProxied(
        res,
        { status: 200, data: cached, rateLimit: getRateLimit(), retryAfter: null },
        { cached: true, aiDegraded: degraded }
      );
    }

    let result: UpstreamResult<WeatherResponse> | null = null;
    try {
      result = await upstreamGet<WeatherResponse>(upstreamPath, params);
    } catch {
      result = null; // network/timeout after retries
    }
    if (result?.ok) {
      setCached(key, result.data, config.ttl.weather);
      return sendProxied(res, result, { cached: false, aiDegraded: degraded });
    }

    // Upstream failed (5xx / timeout). The weather backend is flaky, so serve the
    // last good response if we have one rather than showing the user an error.
    const stale = getStale<WeatherResponse>(key);
    if (stale) {
      return sendProxied(
        res,
        { status: 200, data: stale, rateLimit: getRateLimit(), retryAfter: null },
        { cached: true, stale: true, aiDegraded: degraded }
      );
    }
    if (result) return sendProxied(res, result, { cached: false, aiDegraded: degraded });
    return res.status(502).json({ error: "Upstream weather request failed" });
  };
}

weatherRouter.get("/weather", forecastHandler("/v1/weather", { allowDays: true, allowLang: true }));
weatherRouter.get("/current", forecastHandler("/v1/current", { allowDays: false, allowLang: true }));
weatherRouter.get("/daily", forecastHandler("/v1/daily", { allowDays: true, allowLang: false }));
weatherRouter.get("/hourly", forecastHandler("/v1/hourly", { allowDays: true, allowLang: false }));

/**
 * AI insight (opt-in). Proxies `/v1/insights` — the real AI endpoint — only when
 * the user explicitly asks, so we never spend an AI request (200/mo) on a page
 * load. Cached 5 min to avoid re-spending on repeat clicks. On free plan this
 * returns 403 with an upgrade message, which the UI renders gracefully.
 */
weatherRouter.get("/insights", async (req, res) => {
  const { lat, lon, units = "metric", lang = "en", days } = req.query as Record<string, string>;
  if (!lat || !lon) {
    return res.status(400).json({ error: "lat and lon query params are required" });
  }
  const params: Record<string, string> = { lat, lon, units, lang };
  if (days) params.days = days;

  const key = cacheKey("/v1/insights", params);
  const cached = getCached<unknown>(key);
  if (cached) {
    return sendProxied(
      res,
      { status: 200, data: cached, rateLimit: getRateLimit(), retryAfter: null },
      { cached: true }
    );
  }
  try {
    const result = await upstreamGet<unknown>("/v1/insights", params);
    if (result.ok) setCached(key, result.data, config.ttl.weather);
    sendProxied(res, result, { cached: false });
  } catch {
    res.status(502).json({ error: "Upstream insights request failed" });
  }
});

/**
 * Geo auto-detection. Forwards the REAL client IP to upstream so we resolve the
 * user's location, not the Render datacenter's. Falls back to ip=auto.
 */
weatherRouter.get("/geo", async (req, res) => {
  const ip = (req.query.ip as string) || clientIp(req) || "auto";
  const ai = parseBool(req.query.ai, false);
  const params: Record<string, string | boolean> = { ip, ai };
  if (req.query.days) params.days = String(req.query.days);

  const key = cacheKey("/v1/weather-geo", params);
  const cached = getCached<WeatherResponse>(key);
  if (cached) {
    return sendProxied(
      res,
      { status: 200, data: cached, rateLimit: getRateLimit(), retryAfter: null },
      { cached: true }
    );
  }

  try {
    const result = await upstreamGet<WeatherResponse>("/v1/weather-geo", params, {
      // Pass the client IP along in case upstream honours XFF over the ?ip param.
      "X-Forwarded-For": ip,
    });
    if (result.ok) {
      setCached(key, result.data, config.ttl.geo);
      return sendProxied(res, result, { cached: false });
    }
    const stale = getStale<WeatherResponse>(key);
    if (stale) {
      return sendProxied(
        res,
        { status: 200, data: stale, rateLimit: getRateLimit(), retryAfter: null },
        { cached: true, stale: true }
      );
    }
    return sendProxied(res, result, { cached: false });
  } catch {
    res.status(502).json({ error: "Upstream geo lookup failed" });
  }
});
