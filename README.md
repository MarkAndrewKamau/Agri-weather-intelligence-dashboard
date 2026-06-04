# 🌿 Agri-Weather Intelligence Dashboard

A weather, AI-insight, and tree-canopy-analysis dashboard for East-African farms,
built on the [WeatherAI API](https://weather-ai.co/docs).

It consumes all three meaningful API families — **weather/forecast**, **AI insights**
(with graceful degradation + Swahili), and **agroforestry tree analysis** — through a
backend proxy that keeps the API key off the browser entirely.

> **🌍 Live demo:** **https://agri-weather-intelligence-dashboard.onrender.com**
> **🔌 API proxy:** https://agri-weather-server.onrender.com
>
> ⏳ _Hosted on Render's free tier, so the backend **sleeps after ~15 min of
> inactivity** — the first request may take ~50s to cold-start, then it's fast.
> If a panel errors on first load, hit **Retry** once._

---

## Screenshots

 <img width="1920" height="1080" alt="weather-page-1" src="https://github.com/user-attachments/assets/c79281cd-308d-4b23-9bda-ea00935daf67" />
  <img width="1920" height="1080" alt="Screenshot From 2026-06-04 19-45-55" src="https://github.com/user-attachments/assets/81180064-2ab6-4815-a354-c634c2f98462" />
 <img width="1920" height="1080" alt="tree-page" src="https://github.com/user-attachments/assets/2f4d7ec0-bfd6-42ae-8a0a-97b8f430a470" />

 <img width="1920" height="1080" alt="Screenshot From 2026-06-04 19-06-40" src="https://github.com/user-attachments/assets/3d0af410-1f70-45d2-9034-35ea35f1b211" />


## Architecture

```
                    ┌──────────────────────────┐         ┌────────────────────────┐
   Browser  ──────▶ │  client (Vite + React)   │         │  server (Express + TS) │
   (no key)         │  Render Static Site       │  /api/* │  Render Web Service     │
                    │  VITE_API_BASE_URL ───────┼────────▶│  injects Bearer wai_…   │
                    └──────────────────────────┘         │  cache · rate tracking  │
                                                          └───────────┬────────────┘
                                                                      │ Authorization: Bearer
                                                                      ▼
                                                          https://api.weather-ai.co
```

The browser **never** holds the API key. It calls our proxy (`/api/...`); the Express
server injects `Authorization: Bearer wai_…` from a server-side env var and returns the
upstream response. The key never appears in the JS bundle or the network tab. This split —
a static frontend and a thin proxy backend — is the one architectural decision everything
else hangs off.

## Features

- **Current conditions + 7-day forecast** with a **daily/hourly toggle** (hourly is fetched
  lazily, only when opened).
- **Opt-in AI insight** (`/v1/insights`): **off by default** to protect the scarce 200/mo AI
  budget — the user clicks "Generate AI insight" to spend one. On the free plan the endpoint
  is Pro/Scale-gated and returns `403`, which the card renders as a clean notice rather than a
  broken state. The button also disables itself when the AI budget is exhausted.
- **Swahili 🇰🇪 (`lang=sw`) toggle** — passed to the API for AI summaries *and* applied to the
  UI chrome. WeatherAI is an East-African company; its highest-value users read Swahili.
- **Live quota widget** — request / AI / tree budgets from `/v1/usage`, plus the live
  `X-RateLimit-*` snapshot from the last call.
- **Tree canopy analysis** — drag-and-drop image upload (20MB), side-by-side original vs.
  annotated overlay, a healthy/needs-care/replace health bar, observations + AI
  recommendations, and recent-analysis history.
- **Metric/Imperial** + unit/language preferences persisted in `localStorage`.
- **Loading skeletons**, an **error boundary**, and **429 handling** with a `Retry-After`
  countdown.
- **City search** via Open-Meteo's free, keyless geocoder + quick East-African presets.
- **Geo auto-detect** on load that forwards the real client IP (`X-Forwarded-For`) so we
  locate the *user*, not the datacenter.

## Design decisions

> For the deeper rationale — why in-memory cache instead of Redis, the resilience
> strategy, and what would change at scale — see **[DESIGN.md](DESIGN.md)**.


- **Proxy pattern (key isolation).** All WeatherAI calls go through `server/`. The key lives
  only in `WEATHER_AI_KEY` and is attached in exactly one place
  ([`weatherClient.ts`](server/src/weatherClient.ts)).
- **In-memory caching.** A module-level `Map` ([`cache.ts`](server/src/cache.ts)) keyed on
  `path + sorted query` caches weather for 5 min (usage/quota 60 s). A Render web service is
  a long-running process, so the cache survives across requests and keeps dozens of dev
  reloads off the real quota (1,000 req/mo, **200 AI/mo**, **5 tree analyses/mo**). Cache
  hits are flagged with an `X-Cache: HIT` header.
- **Proactive rate-limit modelling.** Every upstream response's `ratelimit-*` headers are
  parsed ([`rateState.ts`](server/src/rateState.ts)) and re-exposed to the browser via CORS,
  and `/v1/usage` feeds an AI-remaining tracker. AI is opt-in (default off); when an `ai=true`
  request is made with a low budget the proxy auto-suppresses it (`ai=false`).
- **Resilience to a flaky upstream.** WeatherAI's weather endpoints intermittently `500` /
  time out. The proxy wraps every upstream GET in an abort-timeout with retry-on-`5xx`
  ([`weatherClient.ts`](server/src/weatherClient.ts)), and on failure serves the **last good
  response from cache as `STALE`** ([`cache.ts`](server/src/cache.ts)) instead of erroring —
  flagged with `X-Cache: STALE` / `X-Stale` headers. Note also that `/v1/current` and
  `/v1/hourly` currently `500` upstream, so the UI reads `current`/`hourly`/`daily` from the
  single working `/v1/weather` payload (which also saves requests).
- **Multipart forwarding done right.** The browser upload is buffered by `multer`
  (memory, 20MB cap) and rebuilt into a fresh `FormData` with Node's global `FormData`/`Blob`,
  letting `fetch` set the multipart boundary — no manual boundary parsing
  ([`trees.ts`](server/src/routes/trees.ts)). GCS-hosted result image URLs are passed straight
  through, never re-proxied.
- **Typed end-to-end.** Response shapes live in [`shared/types.ts`](shared/types.ts) and are
  imported by both sides.
- **No redundant endpoints.** `/v1/forecast` is just an alias of `/v1/weather` (same params,
  same shape), so we consume `/v1/weather` only rather than wiring both.
- **Deliberately out of scope:** **webhooks** (Pro-only, needs a live receiver — untestable
  pre-deploy) and **SMS** (Scale-only, needs compliance approval — a time sink). Pro/Scale-gated
  endpoints (`forecast14`, `insights`, `ip-lookup`) degrade gracefully on `403`. Depth over breadth.

## Project structure

```
.
├── shared/types.ts          # API response interfaces (imported by client + server)
├── server/                  # Express + TS proxy  → Render Web Service
│   └── src/
│       ├── index.ts         # app: trust proxy, CORS allowlist, routes
│       ├── config.ts        # env + constants (fails fast if key missing)
│       ├── cache.ts         # module-level TTL cache
│       ├── weatherClient.ts # the ONLY place the Bearer key is attached
│       ├── rateState.ts     # rate-limit snapshot + AI-degradation tracker
│       └── routes/          # weather · usage · trees (multipart)
├── client/                  # Vite + React + TS  → Render Static Site
│   └── src/
│       ├── api.ts           # typed fetch wrapper (reads proxy meta headers)
│       ├── hooks/           # useWeather · useUsage · useTreeAnalysis
│       ├── components/      # cards, forecast, quota widget, tree UI, …
│       └── lib/             # formatting + i18n (en/sw)
└── render.yaml              # Render Blueprint for both services
```

## Getting started (local)

Requires Node 18+ (developed on Node 24).

```bash
# 1. Backend proxy
cd server
cp .env.example .env          # then set WEATHER_AI_KEY=wai_your_key
npm install
npm run dev                   # → http://localhost:8787  (GET /api/health)

# 2. Frontend (second terminal)
cd client
cp .env.example .env          # leave VITE_API_BASE_URL blank for local dev
npm install
npm run dev                   # → http://localhost:5173
```

In dev the Vite server proxies `/api` to `localhost:8787`, so the browser and proxy share an
origin and there are no CORS surprises.

## Environment variables

**`server/.env`**

| Variable | Description |
| --- | --- |
| `WEATHER_AI_KEY` | Your WeatherAI API key (`wai_…`). **Server-side only — never exposed.** |
| `PORT` | Port the proxy listens on (Render injects its own). Default `8787`. |
| `ALLOWED_ORIGIN` | Comma-separated CORS allowlist. Local = `http://localhost:5173`; prod = your Static Site URL. |
| `AI_DEGRADE_THRESHOLD` | AI requests-remaining below which the proxy forces `ai=false`. Default `15`. |

**`client/.env`**

| Variable | Description |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL of the backend proxy. Blank locally (uses Vite dev proxy); set to the Render Web Service URL in production. |

## Deployment (Render — two services)

This repo ships a [`render.yaml`](render.yaml) Blueprint. Because the two services reference
each other's URLs, set the cross-referencing vars after the first deploy:

1. **New → Blueprint**, point at this repo. Render creates `agri-weather-server` (web) and
   `agri-weather-client` (static).
2. On **agri-weather-server** set `WEATHER_AI_KEY` (your `wai_…` key) and `ALLOWED_ORIGIN`
   to the client URL (e.g. `https://agri-weather-client.onrender.com`).
3. On **agri-weather-client** set `VITE_API_BASE_URL` to the server URL (e.g.
   `https://agri-weather-server.onrender.com`) and trigger a redeploy (Vite bakes env at build).
4. Smoke-test: open the client URL; confirm the quota widget populates and (in DevTools →
   Network) that no request carries the `wai_` key.

## Quota discipline

The free plan is tight — **1,000 req/mo, 200 AI/mo, 5 tree analyses/mo**. The 5-minute cache
absorbs reload storms; AI is **opt-in (off by default)** so a page load never spends an AI
request; and the stale-cache fallback means upstream hiccups don't trigger client retries that
would burn quota. Tree analyses are the scarcest resource: spend them sparingly (a couple in
dev, the rest for the live demo).
