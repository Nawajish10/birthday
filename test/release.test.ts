import test from "node:test";
import assert from "node:assert/strict";
import { getReleaseState, BIRTHDAY_TARGET_TIMESTAMP } from "../src/lib/release.ts";

test("Release state before midnight IST", () => {
  // 1 millisecond before midnight IST
  const state = getReleaseState(BIRTHDAY_TARGET_TIMESTAMP - 1);
  assert.equal(state.isReleased, false);
  assert.equal(state.remainingMs, 1);
});

test("Release state exactly at midnight IST", () => {
  const state = getReleaseState(BIRTHDAY_TARGET_TIMESTAMP);
  assert.equal(state.isReleased, true);
  assert.equal(state.remainingMs, 0);
});

test("Release state after midnight IST", () => {
  // 1 hour after midnight IST
  const state = getReleaseState(BIRTHDAY_TARGET_TIMESTAMP + 3600 * 1000);
  assert.equal(state.isReleased, true);
  assert.equal(state.remainingMs, 0);
});
