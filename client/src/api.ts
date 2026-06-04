import type { RateLimit } from "../../shared/types";

/**
 * Typed fetch wrapper. The client ONLY ever talks to our proxy — never to
 * WeatherAI directly — so the API key is never present in the browser.
 *
 * Base URL: in production (Render Static Site) this is the backend web-service
 * URL baked in via VITE_API_BASE_URL; in local dev it's empty and Vite's dev
 * proxy forwards /api to the Express server.
 */
const BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export interface ApiMeta {
  cached: boolean;
  aiDegraded: boolean;
  rateLimit: RateLimit;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfter: number | null = null
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiResult<T> {
  data: T;
  meta: ApiMeta;
}

function readMeta(headers: Headers): ApiMeta {
  const num = (v: string | null) => (v != null && v !== "" ? Number(v) : null);
  return {
    cached: headers.get("X-Cache") === "HIT",
    aiDegraded: headers.get("X-AI-Degraded") === "true",
    rateLimit: {
      limit: num(headers.get("X-RateLimit-Limit")),
      remaining: num(headers.get("X-RateLimit-Remaining")),
      reset: headers.get("X-RateLimit-Reset"),
    },
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, init);
  } catch {
    throw new ApiError(0, "Network error — could not reach the server.");
  }

  const meta = readMeta(res.headers);
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* empty / non-JSON body */
  }

  if (!res.ok) {
    const retryAfter = res.headers.get("Retry-After");
    const msg =
      (body as { error?: string; message?: string })?.error ||
      (body as { message?: string })?.message ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, msg, retryAfter ? Number(retryAfter) : null);
  }
  return { data: body as T, meta };
}

const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
};

export const api = {
  get: <T>(path: string, params: Record<string, string | number | boolean | undefined> = {}) =>
    request<T>(`${path}${qs(params)}`),
  postForm: <T>(path: string, form: FormData) =>
    request<T>(path, { method: "POST", body: form }),
};
