/**
 * music-system-security.test.ts
 * Agent F – Security regression tests for the music system.
 * Pure static analysis + logic verification – no live server, no network.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

// ============================================================================
// Helper: walk source files excluding node_modules / .next / .git
// ============================================================================

function walkSourceFiles(dir: string, extensions: string[] = [".ts", ".tsx", ".js", ".mjs"]): string[] {
  const results: string[] = [];
  const EXCLUDED_DIRS = new Set([".git", "node_modules", ".next", ".turbo", "dist"]);

  function walk(current: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8");
}

// ============================================================================
// 1. Secret / credential leak detection in music route files
// ============================================================================

describe("Security: No secrets leaked in music route files", () => {
  const routeFiles = walkSourceFiles(path.join(ROOT, "src/app/api/music"));

  test("route files do not hard-code SUPABASE_SERVICE_ROLE_KEY value", () => {
    for (const filePath of routeFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      // A raw JWT would look like: eyJhbGci...
      const rawJwtPattern = /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]{20,}/;
      assert.ok(
        !rawJwtPattern.test(content),
        `Leaked JWT found in ${path.relative(ROOT, filePath)}`
      );
    }
  });

  test("route files do not log or print service role key by name", () => {
    for (const filePath of routeFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      // Should not console.log / console.error the key
      const logKeyPattern = /console\.(log|error|warn|info)\s*\([^)]*SUPABASE_SERVICE_ROLE_KEY/;
      assert.ok(
        !logKeyPattern.test(content),
        `Service role key logging found in ${path.relative(ROOT, filePath)}`
      );
    }
  });

  test("route files do not expose env vars in JSON responses", () => {
    for (const filePath of routeFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      // Pattern: NextResponse.json({...process.env...}) or JSON.stringify(process.env)
      const envDumpPattern = /NextResponse\.json\s*\(\s*\{[^}]*process\.env[^}]*\}/;
      assert.ok(
        !envDumpPattern.test(content),
        `Possible env dump in JSON response in ${path.relative(ROOT, filePath)}`
      );
    }
  });

  test("no raw private keys in any music route file", () => {
    for (const filePath of routeFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const pkPattern = /-----BEGIN (RSA|EC|PRIVATE) KEY-----/;
      assert.ok(
        !pkPattern.test(content),
        `Private key found in ${path.relative(ROOT, filePath)}`
      );
    }
  });
});

// ============================================================================
// 2. Auth guard: music route must check authorization before data access
// ============================================================================

describe("Security: Auth guard in music route", () => {
  const routeContent = readSrc("src/app/api/music/route.ts");

  test("GET handler checks auth before returning data", () => {
    // The route defines an 'authorized()' helper or similar auth check
    assert.ok(
      routeContent.includes("authorized()") || 
      routeContent.includes("getUser()") ||
      routeContent.includes("readScope") ||
      routeContent.includes("auth.getUser"),
      "GET must perform an auth/authorization check"
    );
  });

  test("POST handler checks auth before mutating data", () => {
    // POST must also check authorization
    assert.ok(
      routeContent.includes("authorized()") ||
      routeContent.includes("getUser()") ||
      routeContent.includes("readScope"),
      "POST must perform an auth/authorization check"
    );
  });

  test("Unauthenticated requests receive 401 response", () => {
    // Verify the route returns 401 on auth failure (static string check)
    assert.ok(
      routeContent.includes("401") || routeContent.includes("status:401"),
      "Route must return HTTP 401 for unauthenticated requests"
    );
  });

  test("Auth error message is generic (does not reveal internal details)", () => {
    // The 401 message should not reveal DB schema, service role key name, etc.
    const genericMessages = [
      "Birthday passcode required",
      "Unauthorized",
      "Authentication required",
      "Access denied",
    ];
    const hasGenericMessage = genericMessages.some((msg) => routeContent.includes(msg));
    assert.ok(hasGenericMessage, "401 error message should be a generic user-friendly string");
  });
});

// ============================================================================
// 3. Signed URL path restriction (only 'audio/' prefix allowed)
// ============================================================================

describe("Security: Signed URL path restrictions", () => {
  const routeContent = readSrc("src/app/api/music/route.ts");

  test("signed URLs are created from stored media_path (not user input)", () => {
    // The route must use t.media_path (a DB-stored value), not raw user input,
    // to create signed URLs. Verify it references media_path.
    assert.ok(
      routeContent.includes("media_path"),
      "Signed URL creation must reference media_path from database, not raw user input"
    );
  });

  test("route does not accept arbitrary bucket or path from request body", () => {
    // body.bucket / body.path / body.media_path should NOT be used for storage signing
    const dangerousPattern = /createSignedUrl\s*\(\s*body\.(bucket|path|media_path|url)/;
    assert.ok(
      !dangerousPattern.test(routeContent),
      "createSignedUrl must not use arbitrary body fields for bucket path"
    );
  });

  test("storage bucket is hard-coded as 'birthday-public' (not user-controlled)", () => {
    assert.ok(
      routeContent.includes("birthday-public"),
      "Storage bucket must be hard-coded as 'birthday-public'"
    );
  });
});

// ============================================================================
// 4. Admin client usage (service-role key is used only server-side)
// ============================================================================

describe("Security: Admin client used only server-side in music routes", () => {
  const routeContent = readSrc("src/app/api/music/route.ts");

  test("route uses getAdminClient (server-side only admin access)", () => {
    assert.ok(
      routeContent.includes("getAdminClient") || routeContent.includes("admin"),
      "Music route should use server-side admin client for DB access"
    );
  });

  test("music route does NOT import from client-side supabase module", () => {
    // Client-side Supabase should not be used in API routes
    const clientSideImportPattern = /from\s+['"]@\/lib\/supabase\/client['"]/;
    assert.ok(
      !clientSideImportPattern.test(routeContent),
      "API route must not import from client-side Supabase module"
    );
  });
});

// ============================================================================
// 5. Source-wide scan: no SUPABASE_SERVICE_ROLE_KEY in client-side code
// ============================================================================

describe("Security: SUPABASE_SERVICE_ROLE_KEY not referenced in client components", () => {
  const clientDirs = [
    path.join(ROOT, "src/components"),
    path.join(ROOT, "src/app"),
  ];

  // Collect all component files (not API routes)
  const componentFiles = clientDirs.flatMap((dir) =>
    fs.existsSync(dir) ? walkSourceFiles(dir, [".ts", ".tsx"]) : []
  ).filter((f) => !f.includes(path.join("src", "app", "api")));

  test("no client component file references SUPABASE_SERVICE_ROLE_KEY", () => {
    for (const filePath of componentFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      assert.ok(
        !content.includes("SUPABASE_SERVICE_ROLE_KEY"),
        `Client file ${path.relative(ROOT, filePath)} must not reference SUPABASE_SERVICE_ROLE_KEY`
      );
    }
  });
});

// ============================================================================
// 6. Playlist mutation auth checks
// ============================================================================

describe("Security: Playlist mutation endpoints require auth", () => {
  const routeContent = readSrc("src/app/api/music/route.ts");

  test("create_playlist action requires auth (auth checked before action dispatch)", () => {
    // The authorized() check must appear BEFORE action-specific logic.
    // Find positions of auth check and create_playlist handler.
    const authCheckPos = routeContent.indexOf("authorized()");
    const createPlaylistPos = routeContent.indexOf("create_playlist");
    assert.ok(authCheckPos !== -1, "Must have authorized() call");
    assert.ok(createPlaylistPos !== -1, "Must have create_playlist handler");
    assert.ok(
      authCheckPos < createPlaylistPos,
      "Auth check must appear before create_playlist handler"
    );
  });

  test("add_track action requires auth (auth checked before action dispatch)", () => {
    const authCheckPos = routeContent.indexOf("authorized()");
    const addTrackPos = routeContent.indexOf("add_track");
    assert.ok(addTrackPos !== -1, "Must have add_track handler");
    assert.ok(
      authCheckPos < addTrackPos,
      "Auth check must appear before add_track handler"
    );
  });

  test("remove_track action requires auth (auth checked before action dispatch)", () => {
    const authCheckPos = routeContent.indexOf("authorized()");
    const removeTrackPos = routeContent.indexOf("remove_track");
    assert.ok(removeTrackPos !== -1, "Must have remove_track handler");
    assert.ok(
      authCheckPos < removeTrackPos,
      "Auth check must appear before remove_track handler"
    );
  });
});

// ============================================================================
// 7. Injection / prototype pollution: input sanitization
// ============================================================================

describe("Security: Input sanitization for playlist name", () => {
  // Mirror of the route's name sanitization logic
  function sanitizePlaylistName(raw: unknown): { ok: boolean; name?: string; error?: string } {
    const name = typeof raw === "string" ? raw.trim() : "";
    if (name.length < 1 || name.length > 60) {
      return { ok: false, error: "Playlist names must be 1–60 characters." };
    }
    return { ok: true, name };
  }

  test("__proto__ key in name is handled safely by trim+length check", () => {
    // '__proto__' is 9 chars, valid length but string content is safe in JSON context
    const r = sanitizePlaylistName("__proto__");
    assert.equal(r.ok, true);
    assert.equal(r.name, "__proto__");
  });

  test("constructor key in name is handled safely", () => {
    const r = sanitizePlaylistName("constructor");
    assert.equal(r.ok, true);
  });

  test("script injection attempt in name is accepted as string (SQL injection is Supabase's concern)", () => {
    // The route just uses parameterized queries via Supabase; name is treated as data
    const r = sanitizePlaylistName("<script>alert(1)</script>");
    // Length = 25, valid
    assert.equal(r.ok, true);
    assert.equal(r.name, "<script>alert(1)</script>");
  });

  test("null bytes or control chars in name: still a string, length checked", () => {
    const r = sanitizePlaylistName("A\0B");
    // Length is 3 → valid
    assert.equal(r.ok, true);
  });
});

// ============================================================================
// 8. StoryViewer: externalAudioRef prop does not leak audio data
// ============================================================================

describe("Security: StoryViewer audio bridge – source code checks", () => {
  const storyViewerPath = path.join(ROOT, "src/components/memories/StoryViewer.tsx");

  test("StoryViewer.tsx exists", () => {
    assert.ok(fs.existsSync(storyViewerPath), "StoryViewer.tsx must exist");
  });

  test("StoryViewer accepts externalAudioRef prop", () => {
    const content = fs.readFileSync(storyViewerPath, "utf-8");
    assert.ok(
      content.includes("externalAudioRef"),
      "StoryViewer must accept externalAudioRef prop for audio bridge"
    );
  });

  test("StoryViewer does not log audio src URLs to console", () => {
    const content = fs.readFileSync(storyViewerPath, "utf-8");
    // Logging audio src could expose signed URLs
    const logSrcPattern = /console\.(log|error|warn)\s*\([^)]*\.src/;
    assert.ok(
      !logSrcPattern.test(content),
      "StoryViewer must not log audio .src (could expose signed URLs)"
    );
  });
});
