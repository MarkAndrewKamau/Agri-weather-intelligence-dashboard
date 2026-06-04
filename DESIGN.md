# Design Decisions & Tradeoffs

This document explains *why* the system is built the way it is, the tradeoffs each
choice carries, and what would change if this had to serve real traffic at scale.
It assumes the context of the build: a 48-hour project on free-tier infrastructure,
consuming the WeatherAI API under tight quotas (1,000 req/mo, **200 AI/mo**,
**5 tree analyses/mo**) and a weather backend that is currently unreliable.

The guiding principle throughout: **spend complexity only where the constraints
demand it.** Most "scale" machinery (Redis, queues, circuit breakers) is wrong for
this size — but knowing *when* it becomes right is the point.

---

## 1. The proxy pattern (the decision everything hangs off)

**Decision:** A thin Express backend proxies every WeatherAI call; the browser only
ever talks to our `/api/*`. The key lives in one server-side env var and is attached
in exactly one place ([`weatherClient.ts`](server/src/weatherClient.ts)).

**Why:** The API key is a bearer credential. Any architecture that calls WeatherAI
from the browser leaks it in the network tab — an instant fail for a credentialed
product. The proxy also gives us a single choke point to add caching, rate-limit
accounting, retries, and response shaping.

**Tradeoff:** Two deployables instead of one, an extra network hop, and CORS to
manage. For this app that hop is cheap and worth it; the alternative (serverless
functions) is discussed in §7.

---

## 2. In-memory cache vs Redis

**Decision:** A module-level `Map` with per-key TTL and a stale tier
([`cache.ts`](server/src/cache.ts)), **not** Redis or any external store.

**Why in-memory is correct *here*:**
- **One long-running instance.** Render runs the server as a persistent process
  (not serverless), so a process-lifetime `Map` survives across requests — long
  enough to absorb reload storms and repeated client polls, which is the whole job:
  keep dev iteration and demo traffic off a 1,000-req/mo quota.
- **Zero operational surface.** No extra service to provision, secure, pay for, or
  monitor. Adding Redis to a single-instance app buys nothing but a new failure mode
  and a network round-trip on the hot path.
- **The data is tiny and ephemeral.** A handful of weather payloads keyed on
  `path + sorted query`. It does not need durability or cross-process sharing yet.

**Tradeoffs / where it breaks:**
- **Not shared across instances.** The moment we run >1 instance (horizontal scale),
  each has its own cache → lower hit rate and N× the upstream calls for the same key.
- **Lost on restart/redeploy.** A cold instance starts with an empty cache, so the
  first request after a deploy pays full latency (and, while WeatherAI is flaky, has
  no stale entry to fall back on — exactly the gap we hit during deploys).
- **No eviction policy beyond TTL.** Fine at this key-count; unbounded in theory.
  (Mitigated in practice because the keyspace is small and bounded by locations.)

**What changes at scale:** Introduce **Redis (managed, e.g. Render Key Value / Upstash)**
as a *shared* cache the instant we go multi-instance — so a cache fill by one instance
serves all of them, the hit rate stays high, and the cache survives deploys. Keep the
in-memory `Map` as an **L1** in front of Redis (L2) to avoid a network hop on the
hottest keys. Add an explicit eviction policy (LRU + max entries) and per-tier TTLs.

---

## 3. Resilience to a flaky upstream

**Decision:** Every upstream GET is wrapped in an abort-timeout (7s) with a retry on
fast `5xx` responses but **not** on timeouts; on failure the route serves the
**last good response from cache as `STALE`** rather than erroring
([`weatherClient.ts`](server/src/weatherClient.ts), [`cache.ts`](server/src/cache.ts)).

**Why:** WeatherAI's weather endpoints intermittently 500 and hang. Without this, a
single upstream hiccup becomes a user-facing error and — worse — long hung requests
tie up the tiny free instance and trip Render's health monitor into a restart loop
(we observed and fixed exactly this). Retrying a *timeout* just doubles the wait, so
we only retry the fast-failing `5xx` case.

**Tradeoffs:**
- **Stale data can be slightly old** (bounded by how long the upstream stays down).
  For weather/agriculture that's an acceptable, honest tradeoff vs. a blank screen.
- **Fixed retry/backoff** is crude — under sustained upstream failure we still send
  doomed requests (each costing latency and a slice of quota) instead of backing off
  globally.

**What changes at scale:** Add a **circuit breaker** — after N consecutive upstream
failures, open the circuit and serve stale/`503` immediately for a cooldown window
instead of hammering a downed dependency (protects both us and them). Pair it with
**jittered exponential backoff**, and emit metrics on upstream error rate so the
breaker state is observable. Consider a small **background refresher** that keeps
popular keys warm so users never hit a cold miss.

---

## 4. Rate-limit & quota modelling

**Decision:** Parse WeatherAI's `ratelimit-*` headers on every response, re-expose
them to the browser via CORS, and feed `/v1/usage` into an AI-remaining tracker
([`rateState.ts`](server/src/rateState.ts)); surface all of it in a live quota widget.

**Why:** The product *is* a metered API — showing the operator their remaining budget
is both a UX nicety and proof we understood the domain. The AI tracker lets the proxy
auto-suppress `ai=true` when the budget is nearly gone.

**Tradeoff:** The tracker is in-process and best-effort (same single-instance
assumption as the cache). Across instances the counts would diverge from truth.

**What changes at scale:** Track usage in the **shared store** (Redis counters) so
all instances see one number, and implement **our own per-API-key/per-user rate
limiting** at the proxy (token bucket in Redis) so one noisy client can't burn the
shared upstream quota for everyone.

---

## 5. AI insight: opt-in, not automatic

**Decision:** The AI insight is **off by default** and generated only when the user
clicks; it calls the dedicated `/v1/insights` endpoint and renders the free-plan
`403` as a clean "Pro/Scale feature" notice.

**Why:** AI is the scarcest budget (200/mo) and `/v1/weather?ai=true` charges an AI
request but returns no narrative on the free plan — so auto-running it would silently
drain quota for nothing. Opt-in is the quota-respecting choice and still demonstrates
correct endpoint discovery + graceful plan-gating.

**Tradeoff:** No AI text appears in the free-plan demo (by design). The alternative —
generating summaries with a *second* AI provider (e.g. Claude) — was rejected as
scope creep and a second credential to manage.

**What changes at scale:** On a paid plan, cache insights per location/day (they
change slowly) and pre-generate for popular regions off the request path.

---

## 6. Multipart image forwarding

**Decision:** Buffer the upload with `multer` (memory, 20MB cap) and rebuild a fresh
`FormData` using Node's global `FormData`/`Blob`, letting `fetch` set the boundary
([`trees.ts`](server/src/routes/trees.ts)). GCS-hosted result image URLs are passed
through, never re-proxied.

**Why:** It's the simplest correct way to forward multipart through a Node proxy — no
manual boundary parsing. Passing image URLs through avoids paying egress to proxy
large binaries we don't need to touch.

**Tradeoff:** Buffering in memory caps practical file size and holds the bytes in RAM
for the request. Fine at 20MB on one request at a time; risky under concurrency.

**What changes at scale:** **Stream** the upload straight through (or have the client
upload directly to object storage via a pre-signed URL and send us only the key),
move analysis to an **async job + webhook/poll** so slow CV work doesn't hold an HTTP
connection, and enforce per-user upload quotas.

---

## 7. Two services on Render free tier

**Decision:** Static site (Vite build) + Node web service, deployed as two Render
services; cache as in-memory; no Redis, no queue.

**Why:** Cleanest mapping of the proxy pattern to the platform: the static frontend
is CDN-served and cheap, the backend holds the secret and the logic. Free tier is
enough to demonstrate everything.

**Tradeoffs (free-tier realities we accept):**
- **Cold starts** — the web service sleeps after idle; first hit is slow.
- **Single small instance** — no redundancy; a restart = brief downtime (the
  `no-server` windows seen during deploys).
- **Build-time env baking** — `VITE_API_BASE_URL` is compiled into the client, so
  changing the backend URL requires a rebuild, not just a restart.

**What changes at scale:**
- **Don't sleep / multiple instances** behind a load balancer + shared Redis cache.
- **Serverless option:** the proxy could run as edge/serverless functions for
  auto-scaling and geo-proximity — at the cost of losing the in-memory cache (forcing
  Redis) and cold-start nuance. A deliberate tradeoff, not a free win.
- **Secrets** move from env vars to a managed secrets manager with rotation.
- **Observability:** structured logs, request tracing, upstream-error and cache-hit
  dashboards, and alerting — none of which a 48h build needs but all of which a real
  service does.
- **Runtime config** for the frontend (fetch `/config` at boot) so URLs change
  without a rebuild.

---

## 8. Summary of current tradeoffs (knowingly accepted)

| Area | Chosen (now) | Cost we accept | Scale answer |
|---|---|---|---|
| Cache | In-memory `Map` + stale | Not shared, lost on restart | Shared Redis (L2) + in-mem L1 |
| Resilience | Timeout + 5xx retry + stale | No global backoff | Circuit breaker + jittered backoff |
| Quota | In-process tracker | Diverges across instances | Redis counters + our own rate limiting |
| AI | Opt-in `/v1/insights` | No AI text on free plan | Cache/pre-generate on paid plan |
| Uploads | Buffer in memory | RAM-bound, holds connection | Stream / pre-signed + async jobs |
| Infra | 2× Render free | Cold starts, single instance | Multi-instance + LB + secrets mgr + observability |

The through-line: every "we didn't build X" is a conscious match of complexity to
constraints — and each row names the exact signal (multi-instance, paid plan,
concurrency, sustained upstream failure) that would flip the decision.
