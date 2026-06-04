import { config } from "./config.js";
import { parseRateLimit } from "./rateState.js";
import type { RateLimit } from "../../shared/types.js";

/**
 * Thin typed wrapper around the WeatherAI upstream API. This is the ONLY place
 * the Bearer key is attached — it is injected from server env and never returned
 * to callers, so it can never reach the browser.
 */

export interface UpstreamResult<T> {
  ok: boolean;
  status: number;
  data: T;
  rateLimit: RateLimit;
  /** `Retry-After` header value (seconds) for 429s, if present. */
  retryAfter: string | null;
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  return { Authorization: `Bearer ${config.apiKey}`, ...extra };
}

async function readBody<T>(res: Response): Promise<T> {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  // Non-JSON (e.g. an HTML error page) — surface as a message object.
  return { message: await res.text() } as unknown as T;
}

const TIMEOUT_MS = 12_000;
const MAX_ATTEMPTS = 3; // 1 try + 2 retries
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch with an AbortController timeout so a hung upstream can't hang our proxy. */
async function fetchWithTimeout(url: URL | string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GET an upstream path with query params. Retries on 5xx / network errors with
 * backoff, because the WeatherAI weather backend 500s and times out
 * intermittently. The caller adds a stale-cache fallback on top of this.
 */
export async function upstreamGet<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
  headers?: Record<string, string>
): Promise<UpstreamResult<T>> {
  const url = new URL(path, config.upstreamBase);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }

  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetchWithTimeout(url, { headers: authHeaders(headers) });
      // Retry transient server errors, but not 4xx (auth/quota/plan are terminal).
      if (res.status >= 500 && attempt < MAX_ATTEMPTS) {
        await sleep(300 * attempt);
        continue;
      }
      const rateLimit = parseRateLimit(res.headers);
      return {
        ok: res.ok,
        status: res.status,
        data: await readBody<T>(res),
        rateLimit,
        retryAfter: res.headers.get("retry-after"),
      };
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_ATTEMPTS) await sleep(300 * attempt);
    }
  }
  throw lastErr ?? new Error("upstream request failed");
}

/** POST a multipart FormData body upstream (used for tree image analysis). */
export async function upstreamPostForm<T>(
  path: string,
  form: FormData
): Promise<UpstreamResult<T>> {
  const url = new URL(path, config.upstreamBase);
  // NOTE: do not set Content-Type — fetch sets the multipart boundary itself.
  const res = await fetch(url, { method: "POST", headers: authHeaders(), body: form });
  const rateLimit = parseRateLimit(res.headers);
  return {
    ok: res.ok,
    status: res.status,
    data: await readBody<T>(res),
    rateLimit,
    retryAfter: res.headers.get("retry-after"),
  };
}
