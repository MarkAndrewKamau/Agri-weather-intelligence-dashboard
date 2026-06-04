import { test } from "node:test";
import assert from "node:assert/strict";
import { cacheKey, getCached, getStale, setCached } from "./cache.js";

test("cacheKey is stable regardless of param order", () => {
  const a = cacheKey("/v1/weather", { lat: 1, lon: 2, units: "metric" });
  const b = cacheKey("/v1/weather", { units: "metric", lon: 2, lat: 1 });
  assert.equal(a, b);
});

test("cacheKey drops empty/undefined/null params", () => {
  const k = cacheKey("/v1/weather", { lat: 1, lon: undefined, days: "", ai: null });
  assert.equal(k, "/v1/weather?lat=1");
});

test("getCached returns a value within TTL", () => {
  setCached("k1", { v: 1 }, 1000);
  assert.deepEqual(getCached<{ v: number }>("k1"), { v: 1 });
});

test("getCached returns undefined once the TTL has expired", () => {
  setCached("k2", { v: 2 }, -1); // already expired
  assert.equal(getCached("k2"), undefined);
});

test("getStale returns the last value even after TTL expiry (resilience fallback)", () => {
  setCached("k3", { v: 3 }, -1); // expired
  assert.equal(getCached("k3"), undefined, "fresh read should miss");
  assert.deepEqual(getStale<{ v: number }>("k3"), { v: 3 }, "stale read should hit");
});

test("getStale returns undefined for an unknown key", () => {
  assert.equal(getStale("never-set"), undefined);
});
