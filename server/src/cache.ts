/**
 * Module-level in-memory cache with a stale-fallback tier.
 *
 * Render web services are long-running processes (not serverless), so this Map
 * persists for the lifetime of the instance — easily long enough to keep dozens
 * of dev reloads and repeat client requests off the real WeatherAI quota
 * (1,000 req/mo, 200 AI/mo, 5 tree analyses/mo). Key on the route + sorted query.
 *
 * Entries are kept past their TTL so they can be served as STALE when upstream
 * fails (the weather backend 500s/times-out intermittently). `getCached` honours
 * the TTL; `getStale` ignores it.
 */

interface Entry<T> {
  expires: number;
  data: T;
}

const store = new Map<string, Entry<unknown>>();

/** Build a stable cache key from a path and its query params. */
export function cacheKey(path: string, params: Record<string, unknown>): string {
  const sorted = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
    .sort()
    .map((k) => `${k}=${String(params[k])}`)
    .join("&");
  return `${path}?${sorted}`;
}

/** Fresh hit only (within TTL). */
export function getCached<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expires) return undefined; // expired but retained for getStale
  return hit.data as T;
}

/** Last known value regardless of TTL — used as a fallback when upstream fails. */
export function getStale<T>(key: string): T | undefined {
  return store.get(key)?.data as T | undefined;
}

export function setCached<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expires: Date.now() + ttlMs });
}
