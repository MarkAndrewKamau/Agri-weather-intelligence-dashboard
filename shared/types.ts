/**
 * Shared API response types — imported by both `server/` and `client/`.
 *
 * These mirror the live WeatherAI API (https://api.weather-ai.co), tightened
 * from real smoke-test samples. Tree types remain partly loose pending a sample
 * from the (quota-limited) analyze endpoint.
 */

export type Units = "metric" | "imperial";
export type Lang = "en" | "sw";

/** Rate-limit snapshot parsed from upstream `ratelimit-*` headers (per-minute burst). */
export interface RateLimit {
  limit: number | null;
  remaining: number | null;
  reset: number | string | null;
}

export interface WeatherLocation {
  lat: number;
  lon: number;
  timezone?: string;
  requested_lat?: number;
  requested_lon?: number;
  country?: string;
}

export interface ClientGeo {
  country?: string;
  ip_hash?: string;
}

export interface CurrentConditions {
  time?: string;
  temperature?: number;
  feels_like?: number;
  humidity?: number;
  wind_speed?: number;
  wind_direction?: number;
  wind_gust?: number;
  uv_index?: number;
  condition_code?: string;
  icon?: string;
  icon_path?: string;
}

export interface DailyEntry {
  date?: string;
  temp_min?: number;
  temp_max?: number;
  precipitation_sum?: number;
  precipitation_probability?: number;
  wind_max?: number;
  sunrise?: string;
  sunset?: string;
  condition_code?: string;
  icon?: string;
  icon_path?: string;
}

export interface HourlyEntry {
  time?: string;
  temperature?: number;
  feels_like?: number;
  humidity?: number;
  wind_speed?: number;
  wind_gust?: number;
  uv_index?: number;
  precipitation_probability?: number;
  condition_code?: string;
  icon?: string;
  icon_path?: string;
}

/** Response from `/v1/weather` (also `/v1/hourly`, `/v1/daily`). */
export interface WeatherResponse {
  location?: WeatherLocation;
  current?: CurrentConditions;
  daily?: DailyEntry[];
  hourly?: HourlyEntry[];
  client_geo?: ClientGeo;
}

/** Response from `/v1/usage`. */
export interface UsageResponse {
  plan?: string;
  period?: {
    start?: string | null;
    end?: string | null;
    requestCount?: number;
    aiRequestCount?: number;
  };
  limits?: {
    requests?: number;
    aiRequests?: number;
    maxDays?: number;
    webhooks?: boolean;
    teamSeats?: number;
    sms?: boolean;
  };
  remaining?: {
    requests?: number;
    aiRequests?: number;
  };
}

/** Error body shape returned by plan-gated endpoints (e.g. /v1/insights on free). */
export interface ApiErrorBody {
  error?: string;
  plan?: string;
  upgrade?: string;
}

/** Tree quota from `/v1/trees/quota`. */
export interface TreeQuota {
  used?: number;
  limit?: number;
  remaining?: number;
  [k: string]: unknown;
}

export interface TreeHealthBreakdown {
  healthy?: number;
  needs_care?: number;
  replace?: number;
  [k: string]: unknown;
}

/** Response from `POST /v1/trees/analyze` (loose pending a live sample). */
export interface TreeAnalysisResponse {
  id?: string;
  tree_count?: number;
  health?: TreeHealthBreakdown;
  original_image_url?: string;
  overlay_image_url?: string;
  observations?: string[];
  recommendations?: string[];
  ai_recommendations?: string[];
  county?: string;
  created_at?: string;
  [k: string]: unknown;
}

export interface TreeHistoryResponse {
  analyses?: TreeAnalysisResponse[];
  items?: TreeAnalysisResponse[];
  results?: TreeAnalysisResponse[];
  next_cursor?: string | null;
  cursor?: string | null;
  [k: string]: unknown;
}
