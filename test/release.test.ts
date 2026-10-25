import test from "node:test";
import assert from "node:assert/strict";
import { getReleaseState, BIRTHDAY_TARGET_ISO, BIRTHDAY_TARGET_TIMESTAMP } from "../src/lib/release.ts";

test("Release target corresponds exactly to October 30, 2026 00:00:00 IST / 18:30:00 UTC", () => {
  assert.equal(BIRTHDAY_TARGET_ISO, "2026-10-30T00:00:00+05:30");
  assert.equal(BIRTHDAY_TARGET_TIMESTAMP, 1793298600000);
  assert.equal(new Date(BIRTHDAY_TARGET_TIMESTAMP).toISOString(), "2026-10-29T18:30:00.000Z");
});

test("Release state before midnight IST", () => {
  // 1 millisecond before midnight IST
  const state = getReleaseState(BIRTHDAY_TARGET_TIMESTAMP - 1);
  assert.equal(state.isReleased, false);
  assert.equal(state.remainingMs, 1);
  assert.equal(state.timezone, "Asia/Kolkata");
});

test("Release state exactly at midnight IST", () => {
  const state = getReleaseState(BIRTHDAY_TARGET_TIMESTAMP);
  assert.equal(state.isReleased, true);
  assert.equal(state.remainingMs, 0);
  assert.equal(state.timezone, "Asia/Kolkata");
});

test("Release state after midnight IST", () => {
  // 1 hour after midnight IST
  const state = getReleaseState(BIRTHDAY_TARGET_TIMESTAMP + 3600 * 1000);
  assert.equal(state.isReleased, true);
  assert.equal(state.remainingMs, 0);
  assert.equal(state.timezone, "Asia/Kolkata");
});
