import "dotenv/config";

/**
 * Central config. The API key is read once here and never leaves the server.
 * Fail fast at boot if it's missing so we never deploy a broken proxy.
 */

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(
      `Missing required env var ${name}. Copy server/.env.example to server/.env and fill it in.`
    );
  }
  return v.trim();
}

export const config = {
  apiKey: required("WEATHER_AI_KEY"),
  port: Number(process.env.PORT) || 8787,
  /** Allowed browser origins for CORS (comma-separated). */
  allowedOrigins: (process.env.ALLOWED_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  upstreamBase: process.env.UPSTREAM_BASE || "https://api.weather-ai.co",
  aiDegradeThreshold: Number(process.env.AI_DEGRADE_THRESHOLD) || 15,
  /** Cache TTLs in milliseconds. */
  ttl: {
    weather: 5 * 60_000,
    usage: 60_000,
    treeHistory: 5 * 60_000,
    geo: 10 * 60_000,
  },
} as const;
