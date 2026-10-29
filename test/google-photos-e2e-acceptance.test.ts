import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  parseGooglePhotosAlbumUrl,
  sanitizeAssetPath,
  redactSensitiveUrlParams,
  buildGooglePhotoDerivativeUrl,
  transformGooglePhotoToAsset,
  transformPhotosToProfilePosts,
  createAlbumFromIngestedPhotos,
  filterProfileMedia,
  getEmptyStateMessage,
  handleLightboxFocusTrap,
  validateDialogAccessibility,
  type GooglePhotoItemRaw,
} from "../src/lib/google-photos.ts";
import {
  groupPhotosChronologically,
  groupPhotosOnThisDay,
} from "../src/components/memories/memories-helpers.ts";
import type { PhotoAsset } from "../src/types/media-contracts.ts";

describe("Google Photos E2E Acceptance & Navigation Deduplication Suite", () => {
  // =========================================================================
  // 1. END-TO-END INTEGRATION: SHARED ALBUM PARSING & PHOTO PIPELINE
  // =========================================================================

  describe("Shared Album URL Parsing & Validation", () => {
    it("successfully parses photos.app.goo.gl short share links", () => {
      const url = "https://photos.app.goo.gl/ABcd1234XYZ";
      const result = parseGooglePhotosAlbumUrl(url);

      assert.equal(result.isValid, true);
      assert.equal(result.type, "short_link");
      assert.equal(result.albumKey, "ABcd1234XYZ");
      assert.equal(result.canonicalUrl, "https://photos.app.goo.gl/ABcd1234XYZ");
      assert.equal(result.error, undefined);
    });

    it("successfully parses photos.google.com/share full album URLs with key parameter", () => {
      const url = "https://photos.google.com/share/AF1QipNxyz123?key=SECRET_AUTH_KEY_456";
      const result = parseGooglePhotosAlbumUrl(url);

      assert.equal(result.isValid, true);
      assert.equal(result.type, "share_album");
      assert.equal(result.albumKey, "AF1QipNxyz123");
      assert.equal(result.authKey, "SECRET_AUTH_KEY_456");
      assert.ok(result.canonicalUrl?.includes("key=SECRET_AUTH_KEY_456"));
    });

    it("successfully parses direct photos.google.com/album URLs", () => {
      const url = "https://photos.google.com/album/AF1QipP_BirthdayAlbum999";
      const result = parseGooglePhotosAlbumUrl(url);

      assert.equal(result.isValid, true);
      assert.equal(result.type, "direct_album");
      assert.equal(result.albumKey, "AF1QipP_BirthdayAlbum999");
    });

    it("rejects non-Google hosts, non-HTTPS protocols, and malicious schemes", () => {
      const maliciousCases = [
        "http://photos.app.goo.gl/InsecureHttp",
        "javascript:alert(1)",
        "file:///etc/passwd",
        "https://evil-phishing-photos.com/share/123",
        "https://google.com.attacker.com/photos",
        "",
        "   ",
        "https://photos.app.goo.gl/path/with/multiple/slashes/bad",
      ];

      for (const badUrl of maliciousCases) {
        const res = parseGooglePhotosAlbumUrl(badUrl);
        assert.equal(res.isValid, false, `URL should be rejected: ${badUrl}`);
        assert.ok(res.error, "Rejection must specify an error message");
      }
    });
  });

  describe("Image Derivative Pipeline & Transformations", () => {
    const sampleRawPhoto: GooglePhotoItemRaw = {
      id: "media-abc-123",
      baseUrl: "https://lh3.googleusercontent.com/sample-photo-hash",
      filename: "birthday-cake-meerah.jpg",
      description: "Meerah blowing candles at midnight",
      mediaMetadata: {
        creationTime: "2026-10-30T00:00:00Z",
        width: 4000,
        height: 3000,
        photo: {
          cameraMake: "Sony",
          cameraModel: "A7IV",
        },
      },
    };

    it("builds correct Google Photos dynamic derivative parameters", () => {
      const base = "https://lh3.googleusercontent.com/xyz123";

      // Thumbnail crop
      const thumb = buildGooglePhotoDerivativeUrl(base, { width: 400, height: 400, crop: true });
      assert.equal(thumb, "https://lh3.googleusercontent.com/xyz123=w400-h400-c");

      // Full HD preview
      const full = buildGooglePhotoDerivativeUrl(base, { width: 1920, height: 1080 });
      assert.equal(full, "https://lh3.googleusercontent.com/xyz123=w1920-h1080");

      // Proportional max dimension
      const maxDim = buildGooglePhotoDerivativeUrl(base, { maxDimension: 1200 });
      assert.equal(maxDim, "https://lh3.googleusercontent.com/xyz123=s1200");

      // Direct download
      const dl = buildGooglePhotoDerivativeUrl(base, { download: true });
      assert.equal(dl, "https://lh3.googleusercontent.com/xyz123=d");
    });

    it("transforms raw Google Photo item to canonical PhotoAsset contract", () => {
      const asset = transformGooglePhotoToAsset(sampleRawPhoto, {
        albumTitle: "Meerah Birthday 2026",
      });

      assert.equal(asset.id, "gp-media-abc-123");
      assert.equal(asset.mediaKind, "image");
      assert.equal(asset.effectiveCaptureDate, "2026-10-30");
      assert.equal(asset.hasKnownCaptureDate, true);
      assert.equal(asset.caption, "Meerah blowing candles at midnight");
      assert.ok(asset.url.includes("=w1920-h1080"), "Must include optimized preview derivative");
      assert.ok(asset.thumbnailUrl?.includes("=w400-h400-c"), "Must include square crop thumbnail");
      assert.equal(asset.storagePath, "google-photos/birthday-cake-meerah.jpg");
    });

    it("transforms raw video item appropriately to video mediaKind", () => {
      const sampleVideo: GooglePhotoItemRaw = {
        id: "video-xyz-789",
        baseUrl: "https://lh3.googleusercontent.com/sample-video-hash",
        filename: "birthday-wishes.mp4",
        mimeType: "video/mp4",
        mediaMetadata: {
          creationTime: "2026-10-29T23:59:50Z",
          video: { fps: 60, status: "READY" },
        },
      };

      const asset = transformGooglePhotoToAsset(sampleVideo);
      assert.equal(asset.mediaKind, "video");
      assert.equal(asset.url, sampleVideo.baseUrl);
      assert.ok(asset.thumbnailUrl?.includes("=w400-h400-c"));
    });
  });

  // =========================================================================
  // 2. END-TO-END INTEGRATION: PROFILE GRID & MEMORIES COLLECTION RENDERING
  // =========================================================================

  describe("Profile Grid Display & Filtering Integration", () => {
    const photo1: PhotoAsset = {
      id: "gp-p1",
      storagePath: "google-photos/p1.jpg",
      url: "https://lh3.googleusercontent.com/p1=w1920-h1080",
      mediaKind: "image",
      effectiveCaptureDate: "2026-10-29",
      hasKnownCaptureDate: true,
      uploadTimestamp: "2026-10-29T12:00:00Z",
      caption: "Photo 1",
    };

    const photo2: PhotoAsset = {
      id: "gp-v2",
      storagePath: "google-photos/v2.mp4",
      url: "https://lh3.googleusercontent.com/v2",
      mediaKind: "video",
      effectiveCaptureDate: "2026-10-29",
      hasKnownCaptureDate: true,
      uploadTimestamp: "2026-10-29T12:01:00Z",
      caption: "Video 2",
    };

    it("transforms PhotoAssets to ProfilePostItems and correctly filters modes", () => {
      const posts = transformPhotosToProfilePosts([photo1, photo2]);
      assert.equal(posts.length, 2);

      // Posts mode: filters out videos
      const imagePosts = filterProfileMedia(posts, "posts", []);
      assert.equal(imagePosts.length, 1);
      assert.equal(imagePosts[0].id, "gp-p1");
      assert.equal(imagePosts[0].media_kind, "image");

      // Reels mode: returns only videos
      const reelPosts = filterProfileMedia(posts, "reels", []);
      assert.equal(reelPosts.length, 1);
      assert.equal(reelPosts[0].id, "gp-v2");
      assert.equal(reelPosts[0].media_kind, "video");

      // Favorites mode: returns items saved to favorites
      const favPosts = filterProfileMedia(posts, "favorites", ["gp-p1"]);
      assert.equal(favPosts.length, 1);
      assert.equal(favPosts[0].id, "gp-p1");

      const emptyFavs = filterProfileMedia(posts, "favorites", []);
      assert.equal(emptyFavs.length, 0);
    });

    it("provides clear, friendly empty state messages for each Profile mode", () => {
      assert.ok(getEmptyStateMessage("favorites").includes("Tap the heart"));
      assert.ok(getEmptyStateMessage("reels").includes("No reels yet"));
      assert.ok(getEmptyStateMessage("posts").includes("birthday photos will appear here"));
    });
  });

  describe("Memories Collection Rendering & Grouping Integration", () => {
    const photoBatch: PhotoAsset[] = [
      {
        id: "gp-oct29-2024",
        storagePath: "google-photos/2024.jpg",
        url: "https://lh3.googleusercontent.com/2024",
        mediaKind: "image",
        effectiveCaptureDate: "2024-10-29",
        hasKnownCaptureDate: true,
        uploadTimestamp: "2024-10-29T10:00:00Z",
        caption: "2024 birthday",
      },
      {
        id: "gp-oct29-2025",
        storagePath: "google-photos/2025.jpg",
        url: "https://lh3.googleusercontent.com/2025",
        mediaKind: "image",
        effectiveCaptureDate: "2025-10-29",
        hasKnownCaptureDate: true,
        uploadTimestamp: "2025-10-29T10:00:00Z",
        caption: "2025 birthday",
      },
      {
        id: "gp-may15-2026",
        storagePath: "google-photos/may.jpg",
        url: "https://lh3.googleusercontent.com/may",
        mediaKind: "image",
        effectiveCaptureDate: "2026-05-15",
        hasKnownCaptureDate: true,
        uploadTimestamp: "2026-05-15T10:00:00Z",
        caption: "Spring flower",
      },
    ];

    it("creates an AlbumCollection contract with valid cover and references", () => {
      const album = createAlbumFromIngestedPhotos(
        "album-google-birthday",
        "Meerah's Google Photos Album",
        photoBatch,
        "Curated Google Photos from shared album"
      );

      assert.equal(album.id, "album-google-birthday");
      assert.equal(album.title, "Meerah's Google Photos Album");
      assert.equal(album.photoIds.length, 3);
      assert.equal(album.coverPhotoId, "gp-oct29-2024");
      assert.ok(album.coverPhotoUrl);
    });

    it("groups ingested Google Photos chronologically into Year-Month buckets", () => {
      const grouped = groupPhotosChronologically(photoBatch);

      assert.ok(grouped.length >= 2, "Should create multiple year/month groups");
      assert.ok(grouped.some((g) => g.title.includes("2024") || g.title.includes("October")));
      assert.ok(grouped.some((g) => g.title.includes("2026") || g.title.includes("May")));
    });

    it("groups ingested Google Photos for 'On This Day' retrospective", () => {
      // Oct 29 photos should group by past years
      const onThisDay = groupPhotosOnThisDay(photoBatch, "2026-10-29");
      const pastYears = onThisDay.map((g) => g.year);

      assert.ok(pastYears.includes(2024), "Must include 2024 memory");
      assert.ok(pastYears.includes(2025), "Must include 2025 memory");
      assert.ok(!pastYears.includes(2026), "2026 May 15 should not be in Oct 29");
    });
  });

  // =========================================================================
  // 3. NAVIGATION DEDUPLICATION & SINGLE AUTHORITATIVE BOTTOMNAV
  // =========================================================================

  describe("Navigation Deduplication & Architecture Invariants", () => {
    const expSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/Experience.tsx"),
      "utf-8"
    );
    const bottomNavSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/shared/BottomNav.tsx"),
      "utf-8"
    );
    const bottomNavCss = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/shared/bottom-nav.css"),
      "utf-8"
    );

    it("authoritative BottomNav is rendered exactly once in Experience shell", () => {
      const bottomNavMatches = expSrc.match(/<BottomNav\b/g) || [];
      assert.equal(
        bottomNavMatches.length,
        1,
        "Experience.tsx must render exactly one BottomNav instance"
      );
    });

    it("BottomNav component includes all 7 canonical navigation destinations", () => {
      const requiredDestinations = [
        "home",
        "stories",
        "profile",
        "songs",
        "study",
        "games",
        "chat",
      ];

      for (const dest of requiredDestinations) {
        assert.ok(
          bottomNavSrc.includes(`id: "${dest}"`),
          `BottomNav must include destination '${dest}'`
        );
      }
    });

    it("BottomNav strictly enforces semantic accessibility roles", () => {
      assert.ok(bottomNavSrc.includes('role="navigation"'));
      assert.ok(bottomNavSrc.includes('aria-label="Application Navigation"'));
      assert.ok(bottomNavSrc.includes('role="menubar"'));
      assert.ok(bottomNavSrc.includes('role="menuitem"'));
      assert.ok(bottomNavSrc.includes('aria-current={isActive ? "page" : undefined}'));
    });

    it("BottomNav CSS implements fixed viewport pinning and safe-area insets", () => {
      assert.ok(bottomNavCss.includes("position: fixed"));
      assert.ok(bottomNavCss.includes("bottom: 0"));
      assert.ok(bottomNavCss.includes("env(safe-area-inset-bottom)"));
      assert.ok(bottomNavCss.includes("z-index: 999") || bottomNavCss.includes("z-index: 100"));
    });

    it("ambient duplicate heading has been completely eradicated from shared shell", () => {
      assert.ok(
        !expSrc.includes("Today is all <i>yours.</i>"),
        "Duplicated ambient header must not be rendered in Experience shell"
      );
      assert.ok(
        !expSrc.includes('<div className="ambient">'),
        "Shared ambient wrapper class must not exist"
      );
    });
  });

  // =========================================================================
  // 4. SECURITY & PRIVACY: PATH TRAVERSAL, SECRET SCANNING & LOG REDACTION
  // =========================================================================

  describe("Security & Privacy Protections", () => {
    it("strictly prevents path traversal attacks in asset paths", () => {
      const traversalAttacks = [
        "../../etc/passwd",
        "..\\..\\windows\\system32\\cmd.exe",
        "/etc/shadow",
        "\\root\\secret.txt",
        "C:\\Users\\Afreen\\.ssh\\id_rsa",
        "photos/../../../private-key.pem",
        "photos/null\0byte.jpg",
      ];

      for (const attack of traversalAttacks) {
        const { safePath, isSafe } = sanitizeAssetPath(attack);
        assert.equal(isSafe, false, `Traversal attack should be detected: ${attack}`);
        assert.ok(!safePath.includes(".."), "Cleaned path must not contain traversal dots");
        assert.ok(!safePath.startsWith("/"), "Cleaned path must not be root-relative");
        assert.ok(!safePath.includes("\0"), "Cleaned path must not contain null bytes");
      }
    });

    it("allows clean, safe relative photo paths", () => {
      const safeInputs = [
        "google-photos/birthday-1.jpg",
        "memories/2026/october-30.png",
        "album-covers/cover.webp",
      ];

      for (const input of safeInputs) {
        const { safePath, isSafe } = sanitizeAssetPath(input);
        assert.equal(isSafe, true);
        assert.equal(safePath, input);
      }
    });

    it("redacts sensitive query parameters before logging", () => {
      const sensitiveUrls = [
        "https://photos.google.com/share/XYZ?key=SECRET_KEY_12345",
        "https://api.example.com/v1/photos?token=MY_SECRET_TOKEN&auth=BEARER_999",
        "https://supabase.co/rest?apikey=SUPABASE_ANON_SECRET_TOKEN",
      ];

      for (const raw of sensitiveUrls) {
        const redacted = redactSensitiveUrlParams(raw);
        assert.ok(!redacted.includes("SECRET_KEY_12345"));
        assert.ok(!redacted.includes("MY_SECRET_TOKEN"));
        assert.ok(!redacted.includes("BEARER_999"));
        assert.ok(!redacted.includes("SUPABASE_ANON_SECRET_TOKEN"));
        assert.ok(redacted.includes("[REDACTED]"));
      }
    });

    it("verifies gitignore protects sensitive environment files and secrets", () => {
      const gitignorePath = path.resolve(process.cwd(), ".gitignore");
      assert.ok(fs.existsSync(gitignorePath), ".gitignore must exist");
      const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");

      assert.ok(gitignoreContent.includes(".env"), ".gitignore must contain .env rules");
      assert.ok(gitignoreContent.includes("node_modules"), ".gitignore must ignore node_modules");
    });

    it("verifies no secret keys, JWTs or credentials are leak-scanned into client code", () => {
      const rootDir = process.cwd();
      const filesToScan: string[] = [];

      function walk(dir: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (
            entry.name === ".git" ||
            entry.name === "node_modules" ||
            entry.name === ".next" ||
            entry.name === ".env.local"
          ) {
            continue;
          }
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else if (
            entry.isFile() &&
            /\.(ts|tsx|js|mjs)$/.test(entry.name) &&
            !entry.name.includes("package-lock.json") &&
            !entry.name.includes("secret-leak-scan.test.ts") &&
            !entry.name.includes("google-photos-e2e-acceptance.test.ts")
          ) {
            filesToScan.push(fullPath);
          }
        }
      }

      walk(rootDir);

      // Verify no raw Supabase service role JWTs or private RSA/EC keys
      const secretJwtPattern = /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_\-]{30,}\.[a-zA-Z0-9_\-]{30,}/;
      const rawPrivateKeyPattern = /-----BEGIN (RSA|EC|PRIVATE) KEY-----/;

      for (const filePath of filesToScan) {
        const content = fs.readFileSync(filePath, "utf-8");
        assert.ok(
          !secretJwtPattern.test(content),
          `Leaked JWT token found in ${path.relative(rootDir, filePath)}`
        );
        assert.ok(
          !rawPrivateKeyPattern.test(content),
          `Leaked private key found in ${path.relative(rootDir, filePath)}`
        );
      }
    });
  });

  // =========================================================================
  // 5. ACCESSIBILITY: FOCUS TRAP, ARIA DIALOGS & ALT TEXT
  // =========================================================================

  describe("Accessibility: Lightbox Focus Trap, ARIA Roles & Alt Text", () => {
    it("handles keyboard focus trap correctly cycling first and last elements", () => {
      // Mock container with two focusable elements
      let focusedElem: any = null;
      const btn1 = { focus: () => { focusedElem = btn1; } };
      const btn2 = { focus: () => { focusedElem = btn2; } };

      const mockContainer = {
        querySelectorAll: () => [btn1, btn2] as any,
      };

      let prevented = false;
      const eventForward = {
        key: "Tab",
        shiftKey: false,
        preventDefault: () => { prevented = true; },
      };

      // When active element is the last element and user presses Tab (forward):
      // Must wrap to first element
      const handledForward = handleLightboxFocusTrap(mockContainer, eventForward, btn2 as any);
      assert.equal(handledForward, true);
      assert.equal(prevented, true);
      assert.equal(focusedElem, btn1, "Forward tab on last item must cycle to first item");

      // Backward tab (Shift+Tab) on first element:
      // Must wrap to last element
      let preventedShift = false;
      const eventBackward = {
        key: "Tab",
        shiftKey: true,
        preventDefault: () => { preventedShift = true; },
      };

      const handledBackward = handleLightboxFocusTrap(mockContainer, eventBackward, btn1 as any);
      assert.equal(handledBackward, true);
      assert.equal(preventedShift, true);
      assert.equal(focusedElem, btn2, "Shift+Tab on first item must cycle to last item");
    });

    it("ignores non-Tab key events in focus trap handler", () => {
      const eventEscape = {
        key: "Escape",
        shiftKey: false,
        preventDefault: () => {},
      };

      const handled = handleLightboxFocusTrap(null, eventEscape, null);
      assert.equal(handled, false);
    });

    it("validates modal dialog ARIA accessibility contracts", () => {
      // Valid modal
      const validDialog = validateDialogAccessibility({
        role: "dialog",
        ariaModal: true,
        ariaLabel: "Photo viewer",
        hasCloseButton: true,
      });
      assert.equal(validDialog.isValid, true);
      assert.equal(validDialog.missingAttributes.length, 0);

      // Incomplete modal missing role and aria-modal
      const invalidDialog = validateDialogAccessibility({
        role: "div",
        ariaModal: false,
        hasCloseButton: false,
      });
      assert.equal(invalidDialog.isValid, false);
      assert.ok(invalidDialog.missingAttributes.includes('role="dialog"'));
      assert.ok(invalidDialog.missingAttributes.includes('aria-modal="true"'));
      assert.ok(invalidDialog.missingAttributes.includes("aria-label or aria-labelledby"));
    });

    it("verifies lightboxes and dialogs in codebase declare semantic ARIA attributes", () => {
      const expSrc = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/Experience.tsx"),
        "utf-8"
      );
      const memoriesSrc = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/memories/MemoriesPanel.tsx"),
        "utf-8"
      );
      const profileSrc = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/profile/ProfilePanel.tsx"),
        "utf-8"
      );

      // Experience lightbox
      assert.ok(expSrc.includes('role="dialog"'));
      assert.ok(expSrc.includes('aria-modal="true"'));

      // Memories lightbox & modals
      assert.ok(memoriesSrc.includes('role="dialog"'));
      assert.ok(memoriesSrc.includes('aria-modal="true"'));
      assert.ok(memoriesSrc.includes('aria-label="Photo viewer"'));

      // Profile edit modal
      assert.ok(profileSrc.includes('role="dialog"'));
      assert.ok(profileSrc.includes('aria-modal="true"'));
      assert.ok(profileSrc.includes('aria-labelledby="edit-profile-title"'));
      assert.ok(profileSrc.includes('aria-label="Close edit profile modal"'));
    });

    it("verifies that all transformed photos contain descriptive altText", () => {
      const raw: GooglePhotoItemRaw = {
        id: "img-test-alt",
        baseUrl: "https://lh3.googleusercontent.com/test",
        description: "Sunset over the lake with Meerah",
      };

      const asset = transformGooglePhotoToAsset(raw);
      assert.ok(asset.altText && asset.altText.length > 0);
      assert.equal(asset.altText, "Sunset over the lake with Meerah");

      // Fallback when description is omitted
      const rawNoDesc: GooglePhotoItemRaw = {
        id: "img-test-no-desc",
        baseUrl: "https://lh3.googleusercontent.com/test2",
      };

      const assetFallback = transformGooglePhotoToAsset(rawNoDesc);
      assert.ok(assetFallback.altText && assetFallback.altText.length > 0);
      assert.ok(assetFallback.altText.includes("Birthday photo memory"));
    });
  });
});
