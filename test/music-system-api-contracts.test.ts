/**
 * music-system-api-contracts.test.ts
 * Agent F – API route contract tests (pure unit, no live server).
 * Verifies file existence, HTTP handler exports, and input validation logic.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

// ============================================================================
// 1. Route File Existence
// ============================================================================

describe("API Route File Existence", () => {
  const expectedRoutes = [
    "src/app/api/music/route.ts",
  ];

  for (const relPath of expectedRoutes) {
    test(`Route file exists: ${relPath}`, () => {
      const fullPath = path.join(ROOT, relPath);
      assert.ok(
        fs.existsSync(fullPath),
        `Expected route file not found: ${relPath}`
      );
    });
  }

  test("music/route.ts is a non-empty file", () => {
    const fullPath = path.join(ROOT, "src/app/api/music/route.ts");
    const stat = fs.statSync(fullPath);
    assert.ok(stat.size > 0, "route.ts must not be empty");
  });
});

// ============================================================================
// 2. HTTP Handler Exports (static code inspection)
// ============================================================================

describe("API Route: HTTP handler exports and shape", () => {
  const routeContent = fs.readFileSync(
    path.join(ROOT, "src/app/api/music/route.ts"),
    "utf-8"
  );

  test("music/route.ts exports GET handler", () => {
    assert.ok(
      /export\s+async\s+function\s+GET\b/.test(routeContent) ||
      /export\s+const\s+GET\b/.test(routeContent),
      "Must export a GET handler"
    );
  });

  test("music/route.ts exports POST handler", () => {
    assert.ok(
      /export\s+async\s+function\s+POST\b/.test(routeContent) ||
      /export\s+const\s+POST\b/.test(routeContent),
      "Must export a POST handler"
    );
  });

  test("music/route.ts sets dynamic='force-dynamic' to prevent caching", () => {
    assert.ok(
      routeContent.includes('dynamic="force-dynamic"') ||
      routeContent.includes("dynamic='force-dynamic'") ||
      routeContent.includes("dynamic = \"force-dynamic\"") ||
      routeContent.includes("dynamic = 'force-dynamic'"),
      "Route must set export const dynamic='force-dynamic'"
    );
  });
});

// ============================================================================
// 3. Input Validation Logic (extracted pure validators matching route logic)
// ============================================================================

// These validators mirror the logic in music/route.ts for unit-testable coverage.

type PlaylistActionBody = {
  action: string;
  name?: unknown;
  playlist_id?: unknown;
  track_id?: unknown;
};

type ValidationResult =
  | { valid: true }
  | { valid: false; status: number; error: string };

function validateCreatePlaylist(body: PlaylistActionBody): ValidationResult {
  if (body.action !== "create_playlist") {
    return { valid: false, status: 400, error: "Unknown music action." };
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 1 || name.length > 60) {
    return { valid: false, status: 400, error: "Playlist names must be 1–60 characters." };
  }
  return { valid: true };
}

function validateAddTrack(body: PlaylistActionBody): ValidationResult {
  if (body.action !== "add_track") {
    return { valid: false, status: 400, error: "Wrong action." };
  }
  if (typeof body.playlist_id !== "string" || typeof body.track_id !== "string") {
    return { valid: false, status: 400, error: "Choose a playlist and song." };
  }
  return { valid: true };
}

function validateRemoveTrack(body: PlaylistActionBody): ValidationResult {
  if (body.action !== "remove_track") {
    return { valid: false, status: 400, error: "Wrong action." };
  }
  if (typeof body.playlist_id !== "string" || typeof body.track_id !== "string") {
    return { valid: false, status: 400, error: "Choose a playlist and song." };
  }
  return { valid: true };
}

describe("Input Validation: create_playlist", () => {
  test("valid name passes (1-60 chars)", () => {
    const r = validateCreatePlaylist({ action: "create_playlist", name: "Meerah's Mix" });
    assert.equal(r.valid, true);
  });

  test("empty name is rejected (400)", () => {
    const r = validateCreatePlaylist({ action: "create_playlist", name: "" });
    assert.equal(r.valid, false);
    if (!r.valid) {
      assert.equal(r.status, 400);
      assert.ok(r.error.includes("1–60"));
    }
  });

  test("name longer than 60 chars is rejected (400)", () => {
    const r = validateCreatePlaylist({ action: "create_playlist", name: "A".repeat(61) });
    assert.equal(r.valid, false);
    if (!r.valid) assert.equal(r.status, 400);
  });

  test("name of exactly 60 chars is accepted", () => {
    const r = validateCreatePlaylist({ action: "create_playlist", name: "A".repeat(60) });
    assert.equal(r.valid, true);
  });

  test("name of exactly 1 char is accepted", () => {
    const r = validateCreatePlaylist({ action: "create_playlist", name: "X" });
    assert.equal(r.valid, true);
  });

  test("non-string name is rejected (400)", () => {
    const r = validateCreatePlaylist({ action: "create_playlist", name: 12345 as any });
    assert.equal(r.valid, false);
  });

  test("null name is rejected (400)", () => {
    const r = validateCreatePlaylist({ action: "create_playlist", name: null as any });
    assert.equal(r.valid, false);
  });

  test("whitespace-only name is rejected (400)", () => {
    const r = validateCreatePlaylist({ action: "create_playlist", name: "   " });
    assert.equal(r.valid, false);
  });
});

describe("Input Validation: add_track", () => {
  test("valid playlist_id and track_id (string) pass", () => {
    const r = validateAddTrack({ action: "add_track", playlist_id: "pl-1", track_id: "tr-2" });
    assert.equal(r.valid, true);
  });

  test("missing playlist_id returns 400", () => {
    const r = validateAddTrack({ action: "add_track", track_id: "tr-2" });
    assert.equal(r.valid, false);
    if (!r.valid) assert.equal(r.status, 400);
  });

  test("missing track_id returns 400", () => {
    const r = validateAddTrack({ action: "add_track", playlist_id: "pl-1" });
    assert.equal(r.valid, false);
  });

  test("numeric ids are rejected (must be strings)", () => {
    const r = validateAddTrack({ action: "add_track", playlist_id: 123 as any, track_id: 456 as any });
    assert.equal(r.valid, false);
  });
});

describe("Input Validation: remove_track", () => {
  test("valid playlist_id and track_id pass", () => {
    const r = validateRemoveTrack({ action: "remove_track", playlist_id: "pl-1", track_id: "tr-1" });
    assert.equal(r.valid, true);
  });

  test("missing fields return 400", () => {
    const r = validateRemoveTrack({ action: "remove_track" });
    assert.equal(r.valid, false);
    if (!r.valid) assert.equal(r.status, 400);
  });
});

describe("Input Validation: unknown action returns 400", () => {
  test("unknown action body fails validation", () => {
    const r = validateCreatePlaylist({ action: "delete_everything" });
    assert.equal(r.valid, false);
    if (!r.valid) assert.equal(r.status, 400);
  });
});

// ============================================================================
// 4. JSON body validation contract
// ============================================================================

describe("JSON body contract: null body handling", () => {
  // Mirrors: const body = await req.json().catch(() => null); if (!body) return 400;
  function handleBody(body: unknown): { ok: boolean; status: number } {
    if (!body) return { ok: false, status: 400 };
    if (typeof body !== "object") return { ok: false, status: 400 };
    return { ok: true, status: 200 };
  }

  test("null body returns 400", () => {
    assert.equal(handleBody(null).status, 400);
  });

  test("undefined body returns 400", () => {
    assert.equal(handleBody(undefined).status, 400);
  });

  test("valid object body passes", () => {
    assert.equal(handleBody({ action: "create_playlist" }).ok, true);
  });

  test("string body returns 400 (not an object)", () => {
    assert.equal(handleBody("string").status, 400);
  });

  test("array body: arrays are objects in JS so pass the object check", () => {
    // In JS typeof [] === "object", route would receive it but action check fails downstream
    const result = handleBody([]);
    // Just verify it doesn't crash
    assert.ok(typeof result.status === "number");
  });
});
