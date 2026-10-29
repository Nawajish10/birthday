import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_GOOGLE_PHOTOS_ALBUM_URL,
  DEFAULT_PHOTO_STORAGE_PROVIDER,
  GOOGLE_PHOTOS_IMAGE_REGEX,
  resolveAlbumUrl,
  resolveStorageProvider,
  resolveAssetBaseUrl,
  computeStableHash,
  generatePhotoId,
  extractGooglePhotosUrls,
  buildPhotoDerivatives,
  extractGooglePhotosMetadata,
  fetchGooglePhotosAlbum,
  getGooglePhotos,
  resetInMemoryCache,
  getCacheMetadata,
  readLocalManifest,
  writeLocalManifest,
} from "../src/lib/google-photos/google-photos-service.ts";
import {
  loadPhotos,
  loadPhotosWithGooglePhotos,
  mergePhotoAssets,
  INITIAL_PRELOADED_PHOTOS,
} from "../src/lib/media-service.ts";
import { GET, POST } from "../src/app/api/photos/google/route.ts";
import type { PhotoAsset } from "../src/types/media-contracts.ts";

test("Google Photos Pipeline: Album URL resolution with strict precedence", () => {
  const origEnv = process.env.GOOGLE_PHOTOS_ALBUM_URL;

  try {
    // 1. Explicit override takes highest precedence
    delete process.env.GOOGLE_PHOTOS_ALBUM_URL;
    const explicit = resolveAlbumUrl("https://photos.app.goo.gl/custom-override");
    assert.equal(explicit, "https://photos.app.goo.gl/custom-override");

    // 2. Env variable takes precedence over default when no param
    process.env.GOOGLE_PHOTOS_ALBUM_URL = "https://photos.app.goo.gl/env-album-id";
    const fromEnv = resolveAlbumUrl();
    assert.equal(fromEnv, "https://photos.app.goo.gl/env-album-id");

    // Explicit override still wins over env variable
    const explicitOverEnv = resolveAlbumUrl("https://photos.app.goo.gl/another-override");
    assert.equal(explicitOverEnv, "https://photos.app.goo.gl/another-override");

    // 3. Fallback to default when neither is provided
    delete process.env.GOOGLE_PHOTOS_ALBUM_URL;
    const fallbackDefault = resolveAlbumUrl();
    assert.equal(fallbackDefault, DEFAULT_GOOGLE_PHOTOS_ALBUM_URL);
    assert.equal(fallbackDefault, "https://photos.app.goo.gl/AMwLcQS5GN7dWf819");

    // Empty/whitespace string falls back
    const whitespaceFallback = resolveAlbumUrl("   ");
    assert.equal(whitespaceFallback, DEFAULT_GOOGLE_PHOTOS_ALBUM_URL);
  } finally {
    if (origEnv !== undefined) {
      process.env.GOOGLE_PHOTOS_ALBUM_URL = origEnv;
    } else {
      delete process.env.GOOGLE_PHOTOS_ALBUM_URL;
    }
  }
});

test("Google Photos Pipeline: Regex extraction and deduplication of Google Photos URLs", () => {
  const sampleHtml = `
    <html>
      <head>
        <meta property="og:image" content="https://lh3.googleusercontent.com/pw/AP1GczSampleImageKeyOne123456=w600-h315-p-k">
      </head>
      <body>
        <img src="https://lh3.googleusercontent.com/pw/AP1GczSampleImageKeyOne123456=w400-h400-c">
        <img src="https://lh3.googleusercontent.com/pw/AP1GczSampleImageKeyTwo789012=w1200-h800">
        <img src="https://lh3.googleusercontent.com/pw/AP1GczSampleImageKeyOne123456">
        <a href="https://example.com/other-image.jpg">External link</a>
        <img src="https://lh3.googleusercontent.com/other/not-pw-image">
      </body>
    </html>
  `;

  const extracted = extractGooglePhotosUrls(sampleHtml);

  // Exactly 2 unique base URLs should be extracted, order preserved, suffixes stripped
  assert.equal(extracted.length, 2);
  assert.equal(
    extracted[0],
    "https://lh3.googleusercontent.com/pw/AP1GczSampleImageKeyOne123456"
  );
  assert.equal(
    extracted[1],
    "https://lh3.googleusercontent.com/pw/AP1GczSampleImageKeyTwo789012"
  );

  // Empty or invalid inputs return empty array
  assert.deepEqual(extractGooglePhotosUrls(""), []);
  assert.deepEqual(extractGooglePhotosUrls("<div>No images here</div>"), []);
});

test("Google Photos Pipeline: Responsive derivative URL generation", () => {
  const baseUrl = "https://lh3.googleusercontent.com/pw/AP1GczTestKey123";

  // Standard derivatives on Google CDN
  const derivatives = buildPhotoDerivatives(baseUrl);
  assert.equal(derivatives.originalUrl, `${baseUrl}=s0`);
  assert.equal(derivatives.fullDisplayUrl, `${baseUrl}=w1600-h1600-no`);
  assert.equal(derivatives.thumbnailUrl, `${baseUrl}=w400-h400-c`);
  assert.equal(derivatives.url, `${baseUrl}=w1200-h1200-no`);

  // Strips any pre-existing suffixes before formatting
  const dirtyUrl = `${baseUrl}=w600-h315-p-k`;
  const cleanDerivatives = buildPhotoDerivatives(dirtyUrl);
  assert.equal(cleanDerivatives.originalUrl, `${baseUrl}=s0`);
  assert.equal(cleanDerivatives.thumbnailUrl, `${baseUrl}=w400-h400-c`);

  // Custom PHOTO_ASSET_BASE_URL override support
  const customProxyBase = "https://cdn.birthday-meerah.com/photos";
  const proxyDerivatives = buildPhotoDerivatives(baseUrl, customProxyBase);
  assert.equal(
    proxyDerivatives.originalUrl,
    `https://cdn.birthday-meerah.com/photos/pw/AP1GczTestKey123=s0`
  );
  assert.equal(
    proxyDerivatives.thumbnailUrl,
    `https://cdn.birthday-meerah.com/photos/pw/AP1GczTestKey123=w400-h400-c`
  );
});

test("Google Photos Pipeline: Deduplication and stable ID hashing", () => {
  const urlA = "https://lh3.googleusercontent.com/pw/AP1GczAlphabetAlpha";
  const urlB = "https://lh3.googleusercontent.com/pw/AP1GczAlphabetBeta";

  const idA1 = generatePhotoId(urlA);
  const idA2 = generatePhotoId(urlA);
  const idB = generatePhotoId(urlB);

  // Stability: identical input yields exact same ID
  assert.equal(idA1, idA2);
  assert.ok(idA1.startsWith("gphoto_"));
  assert.equal(idA1.length, 23); // "gphoto_" + 16 hex chars

  // Collision avoidance: distinct inputs yield distinct IDs
  assert.notEqual(idA1, idB);

  // Hash helper matches deterministic hash
  const hashA = computeStableHash(urlA);
  assert.equal(hashA.slice(0, 16), idA1.replace("gphoto_", ""));
});

test("Google Photos Pipeline: Strict date honesty & metadata extraction", () => {
  const fakeHtmlWithMetadata = `
    <script>
      AF_initDataCallback({key: 'ds:1', hash: '2', data:[null,[
        ["key1",["https://lh3.googleusercontent.com/pw/AP1GczWithTimestamp",1920,1080],1730160000000],
        ["key2",["https://lh3.googleusercontent.com/pw/AP1GczWithoutTimestamp",800,600],null]
      ]], sideChannel: {}});
    </script>
  `;

  const meta = extractGooglePhotosMetadata(fakeHtmlWithMetadata);
  assert.equal(meta.size, 2);

  // Item with valid timestamp ms -> hasKnownCaptureDate: true
  const item1 = meta.get("https://lh3.googleusercontent.com/pw/AP1GczWithTimestamp");
  assert.ok(item1);
  assert.equal(item1?.hasKnownCaptureDate, true);
  assert.equal(item1?.captureDate, new Date(1730160000000).toISOString());
  assert.equal(item1?.width, 1920);
  assert.equal(item1?.height, 1080);

  // Item with null timestamp -> do NOT fabricate dates! hasKnownCaptureDate: false
  const item2 = meta.get("https://lh3.googleusercontent.com/pw/AP1GczWithoutTimestamp");
  assert.ok(item2);
  assert.equal(item2?.hasKnownCaptureDate, false);
  assert.equal(item2?.captureDate, undefined);
  assert.equal(item2?.width, 800);
  assert.equal(item2?.height, 600);
});

test("Google Photos Pipeline: Graceful fallback when network fails or offline", async () => {
  // Simulate network failure
  const failingFetch = async () => {
    throw new Error("Network unreachable (offline mode)");
  };

  const photos = await fetchGooglePhotosAlbum("https://photos.app.goo.gl/offline-album", failingFetch as any);

  // Does not throw, returns fallback photos so application never crashes
  assert.ok(Array.isArray(photos));
  assert.ok(photos.length > 0);
  // Either from local manifest or initial preloaded
  assert.ok(photos.some((p) => p.id.startsWith("gphoto_") || p.id.startsWith("photo-mem-")));
});

test("Google Photos Pipeline: In-memory caching and cache invalidation", async () => {
  resetInMemoryCache();
  assert.equal(getCacheMetadata().isCached, false);

  let fetchCallCount = 0;
  const mockFetch = async () => {
    fetchCallCount++;
    return new Response(
      `<html><body><img src="https://lh3.googleusercontent.com/pw/AP1GczMockPhotoOne"></body></html>`,
      { status: 200 }
    );
  };

  // First call: executes fetch
  const first = await getGooglePhotos({ fetchFn: mockFetch as any });
  assert.equal(fetchCallCount, 1);
  assert.equal(first.length, 1);
  assert.equal(getCacheMetadata().isCached, true);

  // Second call without refresh: serves from memory cache without new fetch
  const second = await getGooglePhotos({ fetchFn: mockFetch as any });
  assert.equal(fetchCallCount, 1);
  assert.equal(second.length, 1);

  // Third call with refresh: true: forces new fetch
  const third = await getGooglePhotos({ refresh: true, fetchFn: mockFetch as any });
  assert.equal(fetchCallCount, 2);
  assert.equal(third.length, 1);

  resetInMemoryCache();
  assert.equal(getCacheMetadata().isCached, false);
});

test("Google Photos Pipeline: API Route GET and POST handlers", async () => {
  // 1. GET handler
  const getReq = new Request("http://localhost:3000/api/photos/google");
  const getRes = await GET(getReq);
  assert.equal(getRes.status, 200);

  const getBody = await getRes.json();
  assert.ok(Array.isArray(getBody.photos));
  assert.ok(getBody.total >= 0);
  assert.ok(typeof getBody.source === "string");
  assert.ok(getBody.syncedAt);

  // 2. POST handler (trigger refresh)
  const postReq = new Request("http://localhost:3000/api/photos/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: true }),
  });
  const postRes = await POST(postReq);
  assert.equal(postRes.status, 200);

  const postBody = await postRes.json();
  assert.equal(postBody.success, true);
  assert.ok(Array.isArray(postBody.photos));
  assert.equal(postBody.source, "refresh");
});

test("Google Photos Pipeline: Media Service integration & seamless merging", () => {
  class MockStorage implements Storage {
    private store = new Map<string, string>();
    get length() { return this.store.size; }
    clear() { this.store.clear(); }
    getItem(k: string) { return this.store.get(k) ?? null; }
    key(i: number) { return Array.from(this.store.keys())[i] ?? null; }
    removeItem(k: string) { this.store.delete(k); }
    setItem(k: string, v: string) { this.store.set(k, String(v)); }
  }

  const storage = new MockStorage();

  const mockGooglePhoto: PhotoAsset = {
    id: "gphoto_custom123456",
    contentHash: "hash123456",
    url: "https://lh3.googleusercontent.com/pw/sample=w1200-h1200-no",
    originalUrl: "https://lh3.googleusercontent.com/pw/sample=s0",
    thumbnailUrl: "https://lh3.googleusercontent.com/pw/sample=w400-h400-c",
    fullDisplayUrl: "https://lh3.googleusercontent.com/pw/sample=w1600-h1600-no",
    mediaKind: "image",
    effectiveCaptureDate: "2024-10-29",
    hasKnownCaptureDate: true,
    uploadTimestamp: new Date().toISOString(),
  };

  // mergePhotoAssets deduplicates by id and contentHash
  const merged = mergePhotoAssets(INITIAL_PRELOADED_PHOTOS, [mockGooglePhoto]);
  assert.equal(merged.length, INITIAL_PRELOADED_PHOTOS.length + 1);
  assert.ok(merged.some((p) => p.id === "gphoto_custom123456"));

  // Duplicate addition is safely ignored
  const mergedTwice = mergePhotoAssets(merged, [mockGooglePhoto]);
  assert.equal(mergedTwice.length, merged.length);

  // loadPhotos with googlePhotos option merges seamlessly
  const loadedWithGoogle = loadPhotos(storage, { googlePhotos: [mockGooglePhoto] });
  assert.ok(loadedWithGoogle.some((p) => p.id === "gphoto_custom123456"));
  assert.ok(loadedWithGoogle.some((p) => p.id === "photo-mem-1"));

  // loadPhotosWithGooglePhotos helper works as expected
  const loadedViaHelper = loadPhotosWithGooglePhotos(storage, [mockGooglePhoto]);
  assert.ok(loadedViaHelper.some((p) => p.id === "gphoto_custom123456"));
});
