import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  CAMERA_FILTERS,
  validateCaptureFile,
  stopMediaTracks,
  dataUrlToBlob,
  createPhotoAsset,
  persistPhotoToMediaService,
  initialPhotoLifecycleState,
  photoLifecycleReducer,
} from "../src/components/camera/camera-pipeline.ts";
import {
  loadPhotos,
  savePhotos,
  addPhotoAsset,
  saveFavorites,
  createAlbum,
  deletePhotoAsset,
  INITIAL_PRELOADED_PHOTOS,
  STORAGE_KEYS,
} from "../src/lib/media-service.ts";
import {
  filterPhotosByCategory,
  getRecentMemories,
  groupPhotosOnThisDay,
} from "../src/components/memories/memories-helpers.ts";
import type { PhotoAsset } from "../src/types/media-contracts.ts";

// Mock localStorage implementation for simulated browser session & reload
class MockLocalStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

test("AUDIT 1: Camera layout tokens & viewport height clamping in camera.css", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "src/components/camera/camera.css"), "utf-8");

  // Viewport height clamping verification
  assert.match(
    css,
    /height:\s*clamp\(520px,\s*84vh,\s*880px\)/,
    "camera.css must define clamp(520px, 84vh, 880px) for .cameraVideoContainer"
  );
  assert.match(
    css,
    /height:\s*85vh/,
    "camera.css must define 85vh for mobile viewport under max-width: 640px"
  );
  assert.match(
    css,
    /min-height:\s*80vh/,
    "camera.css must define min-height: 80vh for mobile viewfinder"
  );

  // 72px Center Shutter Button with Love Theme pulse ring
  assert.match(css, /\.cameraShutterBtn\s*\{[^}]*width:\s*72px/, "Shutter button must specify width: 72px");
  assert.match(css, /\.cameraShutterBtn\s*\{[^}]*height:\s*72px/, "Shutter button must specify height: 72px");
  assert.match(css, /\.cameraPulseRing/, ".cameraPulseRing class must exist for pulse animation");
  assert.match(css, /@keyframes cameraLovePulse/, "cameraLovePulse keyframe animation must be declared");

  // Top floating bar
  assert.match(css, /\.cameraTopFloatingBar/, ".cameraTopFloatingBar must exist in camera.css");
  assert.match(css, /\.cameraFlashBtn/, ".cameraFlashBtn must exist in camera.css");
  assert.match(css, /\.cameraFlipBtn/, ".cameraFlipBtn must exist in camera.css");
  assert.match(css, /\.cameraNotifBtn/, ".cameraNotifBtn must exist in camera.css");
  assert.match(css, /\.cameraCloseBtn/, ".cameraCloseBtn must exist in camera.css");

  // Left gallery shortcut
  assert.match(css, /\.cameraGalleryShortcut/, ".cameraGalleryShortcut must exist in camera.css");
  assert.match(css, /\.cameraGalleryThumbWrap/, ".cameraGalleryThumbWrap must exist in camera.css");
});

test("AUDIT 2: 7-filter horizontal carousel specification", () => {
  assert.equal(CAMERA_FILTERS.length, 7, "Exactly 7 filters must be defined");

  const expectedFilters = [
    { id: "natural", name: "Natural", icon: "✨" },
    { id: "warm-sun", name: "Warm Sun", icon: "☀️" },
    { id: "soft-rose", name: "Soft Rose", icon: "🌸" },
    { id: "vintage-film", name: "Vintage Film", icon: "🎞️" },
    { id: "cinematic-plum", name: "Cinematic Plum", icon: "🎬" },
    { id: "golden-hour", name: "Golden Hour", icon: "🌅" },
    { id: "bw", name: "B&W", icon: "🖤" },
  ];

  expectedFilters.forEach((exp, idx) => {
    const act = CAMERA_FILTERS[idx];
    assert.equal(act.id, exp.id, `Filter ${idx} id mismatch`);
    assert.equal(act.name, exp.name, `Filter ${idx} name mismatch`);
    assert.equal(act.icon, exp.icon, `Filter ${idx} icon mismatch`);
    assert.ok(typeof act.cssFilter === "string", `Filter ${idx} must have cssFilter string`);
  });
});

test("AUDIT 3: Capture lifecycle state machine, explicit consent, and persistence across simulated reload", () => {
  const mockStorage = new MockLocalStorage();

  // 1. Initial State
  let state = { ...initialPhotoLifecycleState };
  assert.equal(state.status, "idle");
  assert.equal(state.captureUrl, null);

  // 2. Start Camera
  state = photoLifecycleReducer(state, { type: "START_CAMERA" });
  assert.equal(state.isInitializing, true);
  state = photoLifecycleReducer(state, { type: "CAMERA_INITIALIZED" });
  assert.equal(state.cameraActive, true);
  assert.equal(state.isInitializing, false);

  // 3. Take Photo (Data URL) -> Transition to Preview (NEVER automatically uploads)
  const sampleDataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
  state = photoLifecycleReducer(state, { type: "CAPTURE_PHOTO", captureUrl: sampleDataUrl });
  assert.equal(state.status, "preview", "Status MUST transition to preview awaiting user action");
  assert.equal(state.cameraActive, false, "Camera stream must be deactivated upon snapshot");
  assert.equal(state.captureUrl, sampleDataUrl);

  // 4. Caption & Date customization
  state = photoLifecycleReducer(state, { type: "UPDATE_CAPTION", caption: "Audited Birthday Snapshot ✿" });
  assert.equal(state.caption, "Audited Birthday Snapshot ✿");

  // 5. Attempt Upload WITHOUT Explicit Consent -> MUST FAIL
  const rejectedState = photoLifecycleReducer(state, { type: "REQUEST_UPLOAD", hasExplicitConsent: false });
  assert.equal(rejectedState.status, "preview", "Status must remain preview when consent is missing");
  assert.ok(rejectedState.errorMessage?.includes("Explicit consent is required"));

  // 6. Upload WITH Explicit Consent -> Status changes to uploading
  state = photoLifecycleReducer(state, { type: "REQUEST_UPLOAD", hasExplicitConsent: true });
  assert.equal(state.status, "uploading");

  // 7. Data URL to Blob & Validation check
  const blob = dataUrlToBlob(sampleDataUrl);
  const val = validateCaptureFile({ size: blob.size, type: blob.type });
  assert.equal(val.valid, true, "Captured blob must pass format & size validation");

  // 8. PhotoAsset creation & Persistence
  const asset = createPhotoAsset({
    url: sampleDataUrl,
    caption: state.caption,
    effectiveCaptureDate: "2026-10-29",
  });
  persistPhotoToMediaService(asset, mockStorage);

  state = photoLifecycleReducer(state, { type: "UPLOAD_SUCCESS", photoAsset: asset });
  assert.equal(state.status, "success");
  assert.equal(state.photoAsset?.id, asset.id);

  // 9. Simulated Browser Reload Verification:
  // Re-instantiate a fresh session reading from the persisted mock storage
  const reloadedPhotos = loadPhotos(mockStorage);
  assert.ok(reloadedPhotos.length > 0, "Reloaded photos list must not be empty");
  assert.equal(reloadedPhotos[0].id, asset.id, "The newly saved photo must be the first item");
  assert.equal(reloadedPhotos[0].caption, "Audited Birthday Snapshot ✿");
  assert.equal(reloadedPhotos[0].url, sampleDataUrl);
});

test("AUDIT 4: Camera hardware track cleanup (stopMediaTracks)", () => {
  let stopCalledCount = 0;
  const mockTrack1 = { stop: () => { stopCalledCount++; } };
  const mockTrack2 = {
    stop: () => {
      stopCalledCount++;
      throw new Error("Hardware release glitch simulation");
    },
  };

  const mockStream = {
    getTracks: () => [mockTrack1, mockTrack2],
  };

  // stopMediaTracks should invoke stop on both tracks and swallow exceptions cleanly
  assert.doesNotThrow(() => {
    stopMediaTracks(mockStream as any);
  });
  assert.equal(stopCalledCount, 2, "Both tracks must have stop() invoked");

  // Null/undefined safety
  assert.doesNotThrow(() => stopMediaTracks(null));
  assert.doesNotThrow(() => stopMediaTracks(undefined));
});

test("AUDIT 5: Missing assets audit (sample images in media-service vs filesystem)", () => {
  const missingAssets: string[] = [];
  for (const photo of INITIAL_PRELOADED_PHOTOS) {
    if (photo.url.startsWith("/")) {
      const publicPath = path.resolve(process.cwd(), "public", photo.url.replace(/^\//, ""));
      if (!fs.existsSync(publicPath)) {
        missingAssets.push(photo.url);
      }
    }
  }

  // All initial preloaded photos must exist in the public directory
  assert.equal(
    missingAssets.length,
    0,
    `All preloaded photo assets must exist on disk. Missing: ${missingAssets.join(", ")}`
  );
});

test("AUDIT 6: Photo safe deletion & reference cleanup across albums and collections without collateral damage", () => {
  const mockStorage = new MockLocalStorage();
  const testPhotos: PhotoAsset[] = [
    createPhotoAsset({ url: "/photos/p1.jpg", caption: "Photo 1", effectiveCaptureDate: "2024-10-28" }),
    createPhotoAsset({ url: "/photos/p2.jpg", caption: "Photo 2", effectiveCaptureDate: "2023-10-28" }),
    createPhotoAsset({ url: "/photos/p3.jpg", caption: "Photo 3", effectiveCaptureDate: "2022-10-28" }),
  ];
  savePhotos(testPhotos, mockStorage);
  saveFavorites([testPhotos[0].id, testPhotos[1].id], mockStorage);
  createAlbum("Birthday Album", "Album with photos 1 and 2", [testPhotos[0].id, testPhotos[1].id], mockStorage);

  // Delete Photo 1
  const deleteResult = deletePhotoAsset(testPhotos[0].id, mockStorage);

  // Photo 1 must be deleted
  assert.equal(deleteResult.photos.some((p) => p.id === testPhotos[0].id), false);
  // Unrelated photos Photo 2 and Photo 3 must remain completely intact
  assert.equal(deleteResult.photos.length, 2);
  assert.ok(deleteResult.photos.find((p) => p.id === testPhotos[1].id));
  assert.ok(deleteResult.photos.find((p) => p.id === testPhotos[2].id));

  // Favorites must remove Photo 1, but retain Photo 2
  assert.deepEqual(deleteResult.favorites, [testPhotos[1].id]);

  // Album must have Photo 1 removed from photoIds, but retain Photo 2
  const updatedAlbum = deleteResult.albums[0];
  assert.ok(updatedAlbum);
  assert.deepEqual(updatedAlbum.photoIds, [testPhotos[1].id]);
});

test("AUDIT 7: Recent memories and Category filtering in Memories", () => {
  const p1 = createPhotoAsset({ url: "/p1.jpg", caption: "Recent Photo", effectiveCaptureDate: "2026-10-25" });
  p1.uploadTimestamp = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  p1.hasKnownCaptureDate = true;

  const p2 = createPhotoAsset({ url: "/p2.jpg", caption: "Older Photo", effectiveCaptureDate: "2021-05-10" });
  p2.uploadTimestamp = "2021-05-10T00:00:00Z";
  p2.hasKnownCaptureDate = true;

  const p3 = createPhotoAsset({ url: "/p3.jpg", caption: "Undated Photo", effectiveCaptureDate: "" });
  p3.uploadTimestamp = "2020-01-01T00:00:00Z";
  p3.hasKnownCaptureDate = false;

  const samplePhotos = [p1, p2, p3];
  const favIds = [p2.id];

  // 1. Category: All
  assert.equal(filterPhotosByCategory(samplePhotos, "all", favIds).length, 3);

  // 2. Category: Favorites
  const favFiltered = filterPhotosByCategory(samplePhotos, "favorites", favIds);
  assert.equal(favFiltered.length, 1);
  assert.equal(favFiltered[0].id, p2.id);

  // 3. Category: Dated
  const datedFiltered = filterPhotosByCategory(samplePhotos, "dated", favIds);
  assert.equal(datedFiltered.length, 2);
  assert.ok(!datedFiltered.some((p) => p.id === p3.id));

  // 4. Category: Cherished
  const cherishedFiltered = filterPhotosByCategory(samplePhotos, "cherished", favIds);
  assert.equal(cherishedFiltered.length, 1);
  assert.equal(cherishedFiltered[0].id, p3.id);

  // 5. Recent memories ordering
  const recent = getRecentMemories(samplePhotos, 2);
  assert.equal(recent.length, 2);
  assert.equal(recent[0].id, p1.id, "Most recently uploaded photo must appear first in recent memories");
});

test("AUDIT 8: On This Day multi-year strict date matching & boundary enforcement", () => {
  const refDate = "2026-10-28T12:00:00Z";

  // Photo 1: Matches Oct 28 in past year 2024 (2 years ago)
  const match2024 = createPhotoAsset({ url: "/m1.jpg", caption: "2024 Birthday", effectiveCaptureDate: "2024-10-28" });
  match2024.hasKnownCaptureDate = true;

  // Photo 2: Matches Oct 28 in past year 2022 (4 years ago)
  const match2022 = createPhotoAsset({ url: "/m2.jpg", caption: "2022 Birthday", effectiveCaptureDate: "2022-10-28" });
  match2022.hasKnownCaptureDate = true;

  // Photo 3: Same year (2026-10-28) -> MUST BE EXCLUDED
  const sameYear2026 = createPhotoAsset({ url: "/s1.jpg", caption: "Today", effectiveCaptureDate: "2026-10-28" });
  sameYear2026.hasKnownCaptureDate = true;

  // Photo 4: Unknown date with matching string -> MUST BE EXCLUDED
  const unknownDate = createPhotoAsset({ url: "/u1.jpg", caption: "Unknown", effectiveCaptureDate: "2024-10-28" });
  unknownDate.hasKnownCaptureDate = false;

  // Photo 5: Different date (2024-10-29) -> MUST BE EXCLUDED
  const diffDate = createPhotoAsset({ url: "/d1.jpg", caption: "Oct 29", effectiveCaptureDate: "2024-10-29" });
  diffDate.hasKnownCaptureDate = true;

  const testCollection = [match2024, match2022, sameYear2026, unknownDate, diffDate];
  const groups = groupPhotosOnThisDay(testCollection, refDate);

  assert.equal(groups.length, 2, "Only past year exact matches (2024 and 2022) must be grouped");
  assert.equal(groups[0].year, 2024);
  assert.equal(groups[0].yearsAgo, 2);
  assert.equal(groups[0].label, "2 Years Ago Today ✨");
  assert.equal(groups[0].photos[0].id, match2024.id);

  assert.equal(groups[1].year, 2022);
  assert.equal(groups[1].yearsAgo, 4);
  assert.equal(groups[1].label, "4 Years Ago Today 🎂");
  assert.equal(groups[1].photos[0].id, match2022.id);

  const allIds = groups.flatMap((g) => g.photos.map((p) => p.id));
  assert.ok(!allIds.includes(sameYear2026.id), "Same year photo must NOT match On This Day");
  assert.ok(!allIds.includes(unknownDate.id), "Photo with unknown date must NOT match On This Day");
  assert.ok(!allIds.includes(diffDate.id), "Photo on different day must NOT match On This Day");
});

test("AUDIT 9: Camera preview controls: Cancel, Retake, and Replace", () => {
  const cameraTsxPath = path.resolve(process.cwd(), "src/components/camera/CameraPanel.tsx");
  const cameraTsx = fs.readFileSync(cameraTsxPath, "utf-8");

  // Verify Cancel, Retake, Replace controls are declared in JSX
  assert.match(cameraTsx, /cameraRetakeBtn|↺ Retake/, "CameraPanel must provide Retake control");
  assert.match(cameraTsx, /cameraReplaceBtn|🔄 Replace/, "CameraPanel must provide Replace control");
  assert.match(cameraTsx, /cameraCancelBtn|✕ Cancel/, "CameraPanel must provide Cancel control");

  // Verify explicit consent button is prominent
  assert.match(cameraTsx, /Save to Memories ✿/, "CameraPanel must feature explicit Save to Memories action");
});
