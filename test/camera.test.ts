import test from "node:test";
import assert from "node:assert/strict";

// Validation constants matching /api/captures specifications
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024; // 12 MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateCaptureFile(file: { size: number; type: string }): FileValidationResult {
  if (!file || typeof file.size !== "number" || typeof file.type !== "string") {
    return { valid: false, error: "Invalid file object." };
  }

  if (file.size <= 0) {
    return { valid: false, error: "The selected file is empty." };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: "Image must be 12 MB or smaller." };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: "Unsupported image format. Please use JPEG, PNG, WebP, or AVIF.",
    };
  }

  return { valid: true };
}

// Track cleanup logic
export function stopMediaTracks(stream: any): void {
  if (!stream) return;
  try {
    const tracks = stream.getTracks?.();
    if (Array.isArray(tracks)) {
      for (const track of tracks) {
        try {
          if (typeof track?.stop === "function") {
            track.stop();
          }
        } catch {
          // ignore individual track stop errors
        }
      }
    }
  } catch {
    // ignore getTracks errors
  }
}

// Data URL to Blob conversion logic
export function dataUrlToBlob(dataUrl: string): { type: string; size: number } {
  const parts = dataUrl.split(",");
  const mimeMatch = parts[0]?.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const bstr = atob(parts[1] || "");
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return { type: mime, size: u8arr.byteLength };
}

// Upload state machine with explicit consent guardrails
export type UploadState = "idle" | "uploading" | "success" | "error";

export interface CameraMachineState {
  status: UploadState;
  hasCapture: boolean;
  error: string | null;
  post: any | null;
}

export type MachineAction =
  | { type: "CAPTURE_PHOTO" }
  | { type: "CHOOSE_FILE" }
  | { type: "REQUEST_UPLOAD"; hasExplicitConsent: boolean }
  | { type: "UPLOAD_SUCCESS"; post: any }
  | { type: "UPLOAD_ERROR"; error: string }
  | { type: "RETAKE" }
  | { type: "RESET" };

export function cameraMachineReducer(
  state: CameraMachineState,
  action: MachineAction
): CameraMachineState {
  switch (action.type) {
    case "CAPTURE_PHOTO":
    case "CHOOSE_FILE":
      // Photo is captured locally; upload status MUST remain idle (no automatic upload)
      return {
        ...state,
        hasCapture: true,
        status: "idle",
        error: null,
      };

    case "REQUEST_UPLOAD":
      // Explicit consent guardrail: NEVER upload without explicit consent
      if (!action.hasExplicitConsent) {
        return {
          ...state,
          error: "Explicit consent is required to add capture to profile.",
        };
      }
      if (!state.hasCapture) {
        return {
          ...state,
          error: "No photo captured to upload.",
        };
      }
      if (state.status === "uploading") {
        return state; // Prevent duplicate concurrent uploads
      }
      return {
        ...state,
        status: "uploading",
        error: null,
      };

    case "UPLOAD_SUCCESS":
      if (state.status !== "uploading") return state;
      return {
        ...state,
        status: "success",
        post: action.post,
        error: null,
      };

    case "UPLOAD_ERROR":
      if (state.status !== "uploading") return state;
      // Guardrail: on error, photo must NOT be discarded
      return {
        ...state,
        status: "error",
        error: action.error,
        // hasCapture remains true!
      };

    case "RETAKE":
    case "RESET":
      return {
        status: "idle",
        hasCapture: false,
        error: null,
        post: null,
      };

    default:
      return state;
  }
}

// ==========================================
// TESTS
// ==========================================

test("File validation accepts valid images within size limit", () => {
  const validFiles = [
    { size: 1024, type: "image/jpeg" },
    { size: 500 * 1024, type: "image/png" },
    { size: 3 * 1024 * 1024, type: "image/webp" },
    { size: 12 * 1024 * 1024, type: "image/avif" }, // Exact boundary: 12 MB
  ];

  for (const file of validFiles) {
    const res = validateCaptureFile(file);
    assert.equal(res.valid, true, `File ${file.type} of size ${file.size} should be valid`);
    assert.equal(res.error, undefined);
  }
});

test("File validation rejects images exceeding 12 MB limit", () => {
  const overLimitFile = {
    size: 12 * 1024 * 1024 + 1, // 1 byte over 12 MB
    type: "image/jpeg",
  };
  const res = validateCaptureFile(overLimitFile);
  assert.equal(res.valid, false);
  assert.match(res.error || "", /12 MB/i);
});

test("File validation rejects empty files (0 bytes)", () => {
  const emptyFile = { size: 0, type: "image/png" };
  const res = validateCaptureFile(emptyFile);
  assert.equal(res.valid, false);
  assert.match(res.error || "", /empty/i);
});

test("File validation rejects unsupported MIME types", () => {
  const invalidTypes = [
    "image/gif",
    "image/bmp",
    "image/svg+xml",
    "video/mp4",
    "application/pdf",
    "text/plain",
    "",
  ];

  for (const type of invalidTypes) {
    const res = validateCaptureFile({ size: 1024, type });
    assert.equal(res.valid, false, `MIME type ${type} should be rejected`);
    assert.match(res.error || "", /Unsupported image format/i);
  }
});

test("Explicit consent guardrail: capture or selection NEVER uploads automatically", () => {
  const initialState: CameraMachineState = {
    status: "idle",
    hasCapture: false,
    error: null,
    post: null,
  };

  // User takes photo
  const stateAfterCapture = cameraMachineReducer(initialState, { type: "CAPTURE_PHOTO" });
  assert.equal(stateAfterCapture.hasCapture, true);
  assert.equal(
    stateAfterCapture.status,
    "idle",
    "Capturing photo must keep status idle until explicit user action"
  );

  // User chooses file
  const stateAfterFile = cameraMachineReducer(initialState, { type: "CHOOSE_FILE" });
  assert.equal(stateAfterFile.hasCapture, true);
  assert.equal(
    stateAfterFile.status,
    "idle",
    "Selecting file must keep status idle until explicit user action"
  );
});

test("Explicit consent guardrail: upload request without consent is rejected", () => {
  const capturedState: CameraMachineState = {
    status: "idle",
    hasCapture: true,
    error: null,
    post: null,
  };

  const attemptWithoutConsent = cameraMachineReducer(capturedState, {
    type: "REQUEST_UPLOAD",
    hasExplicitConsent: false,
  });

  assert.equal(attemptWithoutConsent.status, "idle");
  assert.match(attemptWithoutConsent.error || "", /Explicit consent is required/i);
});

test("Upload state machine transitions: idle -> uploading -> success", () => {
  const capturedState: CameraMachineState = {
    status: "idle",
    hasCapture: true,
    error: null,
    post: null,
  };

  // User explicitly clicks "Add to profile"
  const uploadingState = cameraMachineReducer(capturedState, {
    type: "REQUEST_UPLOAD",
    hasExplicitConsent: true,
  });
  assert.equal(uploadingState.status, "uploading");
  assert.equal(uploadingState.error, null);

  // Successful response from /api/captures
  const samplePost = {
    id: "sample-uuid-1234",
    media_path: "recipient/test/photo.jpg",
    caption: "A new birthday memory",
    media_kind: "image",
    url: "https://example.com/photo.jpg",
  };
  const successState = cameraMachineReducer(uploadingState, {
    type: "UPLOAD_SUCCESS",
    post: samplePost,
  });

  assert.equal(successState.status, "success");
  assert.deepEqual(successState.post, samplePost);
  assert.equal(successState.error, null);
});

test("Upload state machine transitions: idle -> uploading -> error (photo preserved)", () => {
  const capturedState: CameraMachineState = {
    status: "idle",
    hasCapture: true,
    error: null,
    post: null,
  };

  const uploadingState = cameraMachineReducer(capturedState, {
    type: "REQUEST_UPLOAD",
    hasExplicitConsent: true,
  });
  assert.equal(uploadingState.status, "uploading");

  // Server error
  const errorState = cameraMachineReducer(uploadingState, {
    type: "UPLOAD_ERROR",
    error: "Network timeout or storage failure",
  });

  assert.equal(errorState.status, "error");
  assert.equal(errorState.error, "Network timeout or storage failure");
  // CRITICAL REQUIREMENT: Captured photo is NOT discarded on error
  assert.equal(
    errorState.hasCapture,
    true,
    "Captured photo must be preserved so user can retry"
  );

  // User can retry upload
  const retryState = cameraMachineReducer(errorState, {
    type: "REQUEST_UPLOAD",
    hasExplicitConsent: true,
  });
  assert.equal(retryState.status, "uploading");
});

test("Retake action resets capture and upload state", () => {
  const activeState: CameraMachineState = {
    status: "error",
    hasCapture: true,
    error: "Some error",
    post: null,
  };

  const resetState = cameraMachineReducer(activeState, { type: "RETAKE" });
  assert.equal(resetState.status, "idle");
  assert.equal(resetState.hasCapture, false);
  assert.equal(resetState.error, null);
});

test("Track cleanup stops all tracks on a MediaStream without throwing", () => {
  // Test null & undefined handling
  assert.doesNotThrow(() => stopMediaTracks(null));
  assert.doesNotThrow(() => stopMediaTracks(undefined));

  // Test active mock tracks
  let track1Stopped = false;
  let track2Stopped = false;

  const mockStream = {
    getTracks: () => [
      {
        kind: "video",
        stop: () => {
          track1Stopped = true;
        },
      },
      {
        kind: "audio",
        stop: () => {
          track2Stopped = true;
        },
      },
    ],
  };

  stopMediaTracks(mockStream);
  assert.equal(track1Stopped, true, "Video track must be stopped");
  assert.equal(track2Stopped, true, "Audio track must be stopped");
});

test("Track cleanup safely handles buggy track.stop() exceptions", () => {
  let secondTrackStopped = false;

  const buggyStream = {
    getTracks: () => [
      {
        kind: "video",
        stop: () => {
          throw new Error("Track hardware failure");
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

  assert.doesNotThrow(() => stopMediaTracks(buggyStream));
  assert.equal(secondTrackStopped, true, "Subsequent tracks must still be stopped");
});

test("Data URL conversion extracts correct MIME type and byte size", () => {
  // Simple 1x1 transparent PNG data URL
  const sampleDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const result = dataUrlToBlob(sampleDataUrl);

  assert.equal(result.type, "image/png");
  assert.ok(result.size > 0, "Blob size must be positive");
});
