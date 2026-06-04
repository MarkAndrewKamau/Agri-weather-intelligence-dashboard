import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseRateLimit,
  getRateLimit,
  setAiRemaining,
  getAiRemaining,
  shouldDegradeAi,
} from "./rateState.js";

test("parseRateLimit reads WeatherAI's ratelimit-* headers", () => {
  const h = new Headers({
    "ratelimit-limit": "120",
    "ratelimit-remaining": "118",
    "ratelimit-reset": "60",
  });
  const rl = parseRateLimit(h);
  assert.equal(rl.limit, 120);
  assert.equal(rl.remaining, 118);
  assert.equal(rl.reset, "60");
  // latest snapshot is retained for the quota widget
  assert.deepEqual(getRateLimit(), rl);
});

test("parseRateLimit returns nulls when headers are absent", () => {
  const rl = parseRateLimit(new Headers());
  assert.equal(rl.limit, null);
  assert.equal(rl.remaining, null);
  assert.equal(rl.reset, null);
});

test("AI degradation: tracks remaining and trips below the threshold", () => {
  setAiRemaining(100);
  assert.equal(getAiRemaining(), 100);
  assert.equal(shouldDegradeAi(15), false);

  setAiRemaining(10);
  assert.equal(shouldDegradeAi(15), true);
});

test("setAiRemaining ignores non-finite values", () => {
  setAiRemaining(42);
  setAiRemaining(undefined);
  setAiRemaining(NaN);
  assert.equal(getAiRemaining(), 42);
});
