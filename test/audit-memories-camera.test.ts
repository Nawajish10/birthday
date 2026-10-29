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
  INITIAL_PRELOADED_PHOTOS,
  STORAGE_KEYS,
} from "../src/lib/media-service.ts";

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
