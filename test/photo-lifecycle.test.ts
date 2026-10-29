import test from "node:test";
import assert from "node:assert/strict";

import {
  validateCaptureFile,
  stopMediaTracks,
  photoLifecycleReducer,
  initialPhotoLifecycleState,
  createPhotoAsset,
  persistPhotoToMediaService,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  getTodayDateString,
  type PhotoLifecycleState,
} from "../src/components/camera/camera-pipeline.ts";
import type { PhotoAsset } from "../src/types/media-contracts.ts";

// Simple in-memory storage mock for node testing
class MockStorage implements Storage {
  private store: Record<string, string> = {};
  get length() {
    return Object.keys(this.store).length;
  }
  clear(): void {
    this.store = {};
  }
  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }
  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null;
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
}

// ==========================================
// 1. FILE VALIDATION TESTS
// ==========================================

test("File validation accepts valid images within size limit", () => {
  const validFiles = [
    { size: 1024, type: "image/jpeg" },
    { size: 500 * 1024, type: "image/png" },
    { size: 4 * 1024 * 1024, type: "image/webp" },
    { size: 12 * 1024 * 1024, type: "image/avif" }, // Exact 12 MB boundary
  ];

  for (const file of validFiles) {
    const res = validateCaptureFile(file);
    assert.equal(res.valid, true, `File ${file.type} with size ${file.size} should be valid`);
    assert.equal(res.error, undefined);
  }
});

test("File validation rejects images exceeding 12 MB limit", () => {
  const overLimitFile = {
    size: MAX_FILE_SIZE_BYTES + 1,
    type: "image/jpeg",
  };
  const res = validateCaptureFile(overLimitFile);
  assert.equal(res.valid, false);
  assert.match(res.error || "", /12 MB/i);
});

test("File validation rejects empty files (0 bytes)", () => {
  const emptyFiles = [
    { size: 0, type: "image/jpeg" },
    { size: 0, type: "image/png" },
  ];
  for (const file of emptyFiles) {
    const res = validateCaptureFile(file);
    assert.equal(res.valid, false);
    assert.match(res.error || "", /empty/i);
  }
});

test("File validation rejects unsupported MIME types", () => {
  const unsupported = [
    "image/gif",
    "image/bmp",
    "image/svg+xml",
    "video/mp4",
    "application/pdf",
    "text/plain",
    "image/tiff",
  ];

  for (const type of unsupported) {
    const res = validateCaptureFile({ size: 1024, type });
    assert.equal(res.valid, false, `MIME type ${type} must be rejected`);
    assert.match(res.error || "", /Unsupported image format/i);
  }
});

test("File validation rejects malformed file objects", () => {
  assert.equal(validateCaptureFile(null).valid, false);
  assert.equal(validateCaptureFile(undefined).valid, false);
  assert.equal(validateCaptureFile({} as any).valid, false);
  assert.equal(validateCaptureFile({ size: -10, type: "image/jpeg" }).valid, false);
});

// ==========================================
// 2. EXPLICIT CONSENT GUARDRAIL TESTS
// ==========================================

test("Explicit consent guardrail: capturing or selecting a photo NEVER uploads automatically", () => {
  const state = { ...initialPhotoLifecycleState };

  // Case A: User captures a photo via live camera
  const stateAfterCapture = photoLifecycleReducer(state, {
    type: "CAPTURE_PHOTO",
    captureUrl: "data:image/jpeg;base64,sample-capture-data",
  });

  assert.equal(stateAfterCapture.status, "preview", "Status must transition to preview, never uploading");
  assert.equal(stateAfterCapture.captureUrl, "data:image/jpeg;base64,sample-capture-data");
  assert.equal(stateAfterCapture.cameraActive, false, "Camera must stop immediately upon capture");

  // Case B: User selects a photo file via file picker
  const stateAfterFile = photoLifecycleReducer(state, {
    type: "SELECT_FILE",
    captureUrl: "data:image/png;base64,sample-file-data",
  });

  assert.equal(stateAfterFile.status, "preview", "File selection must enter preview state without uploading");
  assert.equal(stateAfterFile.captureUrl, "data:image/png;base64,sample-file-data");
});

test("Explicit consent guardrail: saving without explicit consent is blocked", () => {
  const previewState = photoLifecycleReducer(initialPhotoLifecycleState, {
    type: "CAPTURE_PHOTO",
    captureUrl: "data:image/jpeg;base64,preview-image",
  });

  // Attempt upload without explicit consent
  const blockedState = photoLifecycleReducer(previewState, {
    type: "REQUEST_UPLOAD",
    hasExplicitConsent: false,
  });

  assert.equal(blockedState.status, "preview", "Status must remain in preview when consent is absent");
  assert.match(blockedState.errorMessage || "", /Explicit consent is required/i);
});

test("Explicit consent guardrail: saving with explicit consent transitions to uploading", () => {
  const previewState = photoLifecycleReducer(initialPhotoLifecycleState, {
    type: "CAPTURE_PHOTO",
    captureUrl: "data:image/jpeg;base64,preview-image",
  });

  const uploadState = photoLifecycleReducer(previewState, {
    type: "REQUEST_UPLOAD",
    hasExplicitConsent: true,
  });

  assert.equal(uploadState.status, "uploading");
  assert.equal(uploadState.errorMessage, null);
});

// ==========================================
// 3. STATE MACHINE TRANSITIONS
// ==========================================

test("State machine: idle -> preview -> uploading -> success", () => {
  let state = { ...initialPhotoLifecycleState };
  assert.equal(state.status, "idle");

  // Capture
  state = photoLifecycleReducer(state, {
    type: "CAPTURE_PHOTO",
    captureUrl: "data:image/jpeg;base64,test-image-data",
  });
  assert.equal(state.status, "preview");

  // Customize metadata
  state = photoLifecycleReducer(state, {
    type: "UPDATE_CAPTION",
    caption: "Birthday smiles and laughter ✿",
  });
  assert.equal(state.caption, "Birthday smiles and laughter ✿");

  // Request upload with explicit consent
  state = photoLifecycleReducer(state, {
    type: "REQUEST_UPLOAD",
    hasExplicitConsent: true,
  });
  assert.equal(state.status, "uploading");

  // Server/storage responds with success
  const asset: PhotoAsset = {
    id: "photo-1234",
    storagePath: "memories/photo-1234.jpg",
    url: "/images/meerah-1234.jpg",
    mediaKind: "image",
    effectiveCaptureDate: "2024-10-29",
    hasKnownCaptureDate: true,
    uploadTimestamp: new Date().toISOString(),
    caption: "Birthday smiles and laughter ✿",
  };

  state = photoLifecycleReducer(state, {
    type: "UPLOAD_SUCCESS",
    photoAsset: asset,
  });

  assert.equal(state.status, "success");
  assert.deepEqual(state.photoAsset, asset);
  assert.equal(state.errorMessage, null);
});

test("State machine: idle -> preview -> uploading -> error (photo preserved)", () => {
  let state = photoLifecycleReducer(initialPhotoLifecycleState, {
    type: "SELECT_FILE",
    captureUrl: "data:image/jpeg;base64,precious-memory-data",
  });
  assert.equal(state.status, "preview");

  state = photoLifecycleReducer(state, {
    type: "REQUEST_UPLOAD",
    hasExplicitConsent: true,
  });
  assert.equal(state.status, "uploading");

  // Simulate network/storage error
  state = photoLifecycleReducer(state, {
    type: "UPLOAD_ERROR",
    error: "Network connection lost. Please retry.",
  });

  assert.equal(state.status, "error");
  assert.equal(state.errorMessage, "Network connection lost. Please retry.");
  // Guardrail: captured image must NOT be dropped on error
  assert.equal(state.captureUrl, "data:image/jpeg;base64,precious-memory-data");

  // User retries with explicit consent
  state = photoLifecycleReducer(state, {
    type: "REQUEST_UPLOAD",
    hasExplicitConsent: true,
  });
  assert.equal(state.status, "uploading");
});

test("State machine: retake resets preview to idle and clears image", () => {
  let state = photoLifecycleReducer(initialPhotoLifecycleState, {
    type: "CAPTURE_PHOTO",
    captureUrl: "data:image/jpeg;base64,discard-me",
  });
  assert.equal(state.status, "preview");

  state = photoLifecycleReducer(state, { type: "RETAKE" });
  assert.equal(state.status, "idle");
  assert.equal(state.captureUrl, null);
  assert.equal(state.caption, "");
});

// ==========================================
// 4. EFFECTIVE CAPTURE DATE & UNKNOWN DATE HANDLING
// ==========================================

test("Effective capture date assignment with known date", () => {
  const asset = createPhotoAsset({
    url: "https://example.com/photo.jpg",
    effectiveCaptureDate: "2023-10-29",
    hasKnownCaptureDate: true,
    caption: "Meerah's birthday trip",
  });

  assert.equal(asset.effectiveCaptureDate, "2023-10-29");
  assert.equal(asset.hasKnownCaptureDate, true);
  assert.equal(asset.caption, "Meerah's birthday trip");
  assert.equal(asset.mediaKind, "image");
});

test("Effective capture date assignment with unknown date handling", () => {
  const asset = createPhotoAsset({
    url: "https://example.com/vintage-photo.jpg",
    effectiveCaptureDate: "2020-05-15",
    hasKnownCaptureDate: false,
    caption: "A vintage polaroid memory",
  });

  assert.equal(asset.hasKnownCaptureDate, false, "hasKnownCaptureDate must be false");
  assert.ok(asset.effectiveCaptureDate.length >= 10, "Effective capture date must still provide a valid fallback string");
  assert.equal(asset.caption, "A vintage polaroid memory");
});

test("Date state machine actions toggle unknown date correctly", () => {
  let state = { ...initialPhotoLifecycleState };
  assert.equal(state.hasKnownCaptureDate, true);

  // Set specific date
  state = photoLifecycleReducer(state, {
    type: "SET_CAPTURE_DATE",
    date: "2021-08-14",
  });
  assert.equal(state.effectiveCaptureDate, "2021-08-14");
  assert.equal(state.hasKnownCaptureDate, true);

  // Mark date as unknown
  state = photoLifecycleReducer(state, {
    type: "SET_DATE_UNKNOWN",
    isUnknown: true,
  });
  assert.equal(state.hasKnownCaptureDate, false);

  // Unmark date as unknown
  state = photoLifecycleReducer(state, {
    type: "SET_DATE_UNKNOWN",
    isUnknown: false,
  });
  assert.equal(state.hasKnownCaptureDate, true);
});

test("Photo asset persistence integrates with media service", () => {
  const storage = new MockStorage();
  const newAsset = createPhotoAsset({
    id: "test-photo-persistent-1",
    url: "https://example.com/captured.jpg",
    effectiveCaptureDate: "2024-10-29",
    hasKnownCaptureDate: true,
    caption: "Persisted memory test",
  });

  const updatedList = persistPhotoToMediaService(newAsset, storage);
  assert.ok(updatedList.length > 0);
  assert.equal(updatedList[0].id, "test-photo-persistent-1");
  assert.equal(updatedList[0].caption, "Persisted memory test");
});

// ==========================================
// 5. HARDWARE STREAM TRACK CLEANUP TESTS
// ==========================================

test("Media stream track cleanup stops all tracks immediately", () => {
  let videoTrackStopped = false;
  let audioTrackStopped = false;

  const mockStream = {
    getTracks: () => [
      {
        kind: "video",
        stop: () => {
          videoTrackStopped = true;
        },
      },
      {
        kind: "audio",
        stop: () => {
          audioTrackStopped = true;
        },
      },
    ],
  };

  stopMediaTracks(mockStream);
  assert.equal(videoTrackStopped, true, "Camera video track must be stopped immediately");
  assert.equal(audioTrackStopped, true, "Audio track must be stopped immediately");
});

test("Media stream track cleanup safely handles null, undefined, or throwing tracks", () => {
  assert.doesNotThrow(() => stopMediaTracks(null));
  assert.doesNotThrow(() => stopMediaTracks(undefined));
  assert.doesNotThrow(() => stopMediaTracks({}));

  let secondTrackStopped = false;
  const mockBuggyStream = {
    getTracks: () => [
      {
        kind: "video",
        stop: () => {
          throw new Error("Hardware access locked");
        },
      },
      {
        kind: "video",
        stop: () => {
          secondTrackStopped = true;
        },
      },
    ],
  };

  assert.doesNotThrow(() => stopMediaTracks(mockBuggyStream));
  assert.equal(secondTrackStopped, true, "Remaining tracks must still be stopped even if previous one throws");
});
