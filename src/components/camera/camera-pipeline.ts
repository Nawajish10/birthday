import type { PhotoAsset, MediaKind } from "../../types/media-contracts.ts";
import { addPhotoAsset } from "../../lib/media-service.ts";

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024; // 12 MB
export const MAX_CAPTION_LENGTH = 280;

export interface CameraFilter {
  id: string;
  name: string;
  icon: string;
  cssFilter: string;
}

export const CAMERA_FILTERS: readonly CameraFilter[] = [
  { id: "natural", name: "Natural", icon: "✨", cssFilter: "none" },
  { id: "warm-sun", name: "Warm Sun", icon: "☀️", cssFilter: "sepia(0.25) saturate(1.2) brightness(1.05)" },
  { id: "soft-rose", name: "Soft Rose", icon: "🌸", cssFilter: "hue-rotate(-15deg) saturate(1.25) contrast(1.05)" },
  { id: "vintage-film", name: "Vintage Film", icon: "🎞️", cssFilter: "sepia(0.4) contrast(1.15) brightness(0.95)" },
  { id: "cinematic-plum", name: "Cinematic Plum", icon: "🎬", cssFilter: "hue-rotate(15deg) contrast(1.2) saturate(1.1)" },
  { id: "golden-hour", name: "Golden Hour", icon: "🌅", cssFilter: "sepia(0.35) saturate(1.3) hue-rotate(-10deg)" },
  { id: "bw", name: "B&W", icon: "🖤", cssFilter: "grayscale(1) contrast(1.15)" },
] as const;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates photo file size and MIME type according to memory capture rules:
 * - Size: > 0 bytes and <= 12 MB
 * - Type: image/jpeg, image/png, image/webp, image/avif
 */
export function validateCaptureFile(
  file: { size?: number; type?: string } | null | undefined
): FileValidationResult {
  if (!file || typeof file.size !== "number" || typeof file.type !== "string") {
    return { valid: false, error: "Invalid file object." };
  }

  if (file.size <= 0) {
    return { valid: false, error: "The selected file is empty." };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: "Image must be 12 MB or smaller." };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
    return {
      valid: false,
      error: "Unsupported image format. Please use JPEG, PNG, WebP, or AVIF.",
    };
  }

  return { valid: true };
}

/**
 * Safely stops all tracks in a MediaStream to ensure no hardware camera indicator is left active.
 * Handles null/undefined and swallows buggy hardware track exceptions safely.
 */
export function stopMediaTracks(
  stream: MediaStream | { getTracks?: () => { stop?: () => void }[] } | null | undefined
): void {
  if (!stream) return;
  try {
    const tracks = typeof stream.getTracks === "function" ? stream.getTracks() : [];
    if (Array.isArray(tracks)) {
      for (const track of tracks) {
        try {
          if (typeof track?.stop === "function") {
            track.stop();
          }
        } catch {
          // Swallow individual track release errors
        }
      }
    }
  } catch {
    // Stream getTracks error ignored
  }
}

/**
 * Converts a base64 Data URL to a binary Blob suitable for storage/upload.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  const mimeMatch = parts[0]?.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const bstr = atob(parts[1] || "");
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export type UploadStatus = "idle" | "preview" | "uploading" | "success" | "error";
export type CameraFacingMode = "user" | "environment";

export interface PhotoLifecycleState {
  status: UploadStatus;
  captureUrl: string | null;
  caption: string;
  effectiveCaptureDate: string;
  hasKnownCaptureDate: boolean;
  facingMode: CameraFacingMode;
  cameraActive: boolean;
  isInitializing: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  photoAsset: PhotoAsset | null;
}

export type PhotoLifecycleAction =
  | { type: "START_CAMERA" }
  | { type: "CAMERA_INITIALIZED" }
  | { type: "STOP_CAMERA" }
  | { type: "TOGGLE_FACING_MODE" }
  | { type: "SET_FACING_MODE"; facingMode: CameraFacingMode }
  | { type: "CAPTURE_PHOTO"; captureUrl: string }
  | { type: "SELECT_FILE"; captureUrl: string }
  | { type: "UPDATE_CAPTION"; caption: string }
  | { type: "SET_CAPTURE_DATE"; date: string }
  | { type: "SET_DATE_UNKNOWN"; isUnknown: boolean }
  | { type: "REQUEST_UPLOAD"; hasExplicitConsent: boolean }
  | { type: "UPLOAD_SUCCESS"; photoAsset: PhotoAsset; message?: string }
  | { type: "UPLOAD_ERROR"; error: string }
  | { type: "RETAKE" }
  | { type: "RESET" };

/**
 * Helper to get today's date formatted as YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const initialPhotoLifecycleState: PhotoLifecycleState = {
  status: "idle",
  captureUrl: null,
  caption: "",
  effectiveCaptureDate: getTodayDateString(),
  hasKnownCaptureDate: true,
  facingMode: "user",
  cameraActive: false,
  isInitializing: false,
  errorMessage: null,
  successMessage: null,
  photoAsset: null,
};

/**
 * State machine managing camera ingestion, preview metadata customization,
 * explicit consent guardrails, and upload persistence.
 */
export function photoLifecycleReducer(
  state: PhotoLifecycleState,
  action: PhotoLifecycleAction
): PhotoLifecycleState {
  switch (action.type) {
    case "START_CAMERA":
      return {
        ...state,
        isInitializing: true,
        errorMessage: null,
        successMessage: null,
      };

    case "CAMERA_INITIALIZED":
      return {
        ...state,
        cameraActive: true,
        isInitializing: false,
        errorMessage: null,
      };

    case "STOP_CAMERA":
      return {
        ...state,
        cameraActive: false,
        isInitializing: false,
      };

    case "TOGGLE_FACING_MODE":
      return {
        ...state,
        facingMode: state.facingMode === "user" ? "environment" : "user",
      };

    case "SET_FACING_MODE":
      return {
        ...state,
        facingMode: action.facingMode,
      };

    case "CAPTURE_PHOTO":
    case "SELECT_FILE":
      // Explicit consent guardrail: photo capture or file selection NEVER uploads automatically.
      // Transitions immediately to 'preview' state awaiting explicit user action.
      return {
        ...state,
        captureUrl: action.captureUrl,
        cameraActive: false,
        isInitializing: false,
        status: "preview",
        errorMessage: null,
        successMessage: null,
      };

    case "UPDATE_CAPTION":
      return {
        ...state,
        caption: action.caption.slice(0, MAX_CAPTION_LENGTH),
      };

    case "SET_CAPTURE_DATE":
      return {
        ...state,
        effectiveCaptureDate: action.date,
        hasKnownCaptureDate: true,
      };

    case "SET_DATE_UNKNOWN":
      return {
        ...state,
        hasKnownCaptureDate: !action.isUnknown,
      };

    case "REQUEST_UPLOAD":
      // Explicit Consent Guardrail: Must have explicit user confirmation
      if (!action.hasExplicitConsent) {
        return {
          ...state,
          errorMessage: "Explicit consent is required to save to memories.",
        };
      }
      if (!state.captureUrl) {
        return {
          ...state,
          errorMessage: "No photo captured to save.",
        };
      }
      if (state.status === "uploading") {
        return state;
      }
      return {
        ...state,
        status: "uploading",
        errorMessage: null,
        successMessage: null,
      };

    case "UPLOAD_SUCCESS":
      return {
        ...state,
        status: "success",
        photoAsset: action.photoAsset,
        successMessage: action.message || "Saved to Memories ✿",
        errorMessage: null,
      };

    case "UPLOAD_ERROR":
      // Photo preservation guardrail: Photo preview must NOT be discarded on error
      return {
        ...state,
        status: "error",
        errorMessage: action.error,
        // captureUrl is preserved!
      };

    case "RETAKE":
      return {
        ...state,
        status: "idle",
        captureUrl: null,
        caption: "",
        errorMessage: null,
        successMessage: null,
        photoAsset: null,
      };

    case "RESET":
      return {
        ...initialPhotoLifecycleState,
      };

    default:
      return state;
  }
}

export interface CreatePhotoAssetOptions {
  id?: string;
  url: string;
  storagePath?: string;
  mediaKind?: MediaKind;
  caption?: string;
  altText?: string;
  effectiveCaptureDate?: string;
  hasKnownCaptureDate?: boolean;
  uploadTimestamp?: string;
  width?: number;
  height?: number;
  ownerVisitorId?: string;
}

/**
 * Creates a PhotoAsset contract item with normalized effectiveCaptureDate and hasKnownCaptureDate.
 */
export function createPhotoAsset(options: CreatePhotoAssetOptions): PhotoAsset {
  const timestamp = options.uploadTimestamp || new Date().toISOString();
  const id = options.id || `photo-mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const hasKnown = options.hasKnownCaptureDate !== false;
  const effectiveDate = hasKnown
    ? options.effectiveCaptureDate || timestamp.slice(0, 10)
    : options.effectiveCaptureDate || timestamp.slice(0, 10);

  const cleanCaption = (options.caption || "").trim().slice(0, MAX_CAPTION_LENGTH);

  return {
    id,
    storagePath: options.storagePath || `memories/${id}.jpg`,
    url: options.url,
    mediaKind: options.mediaKind || "image",
    effectiveCaptureDate: effectiveDate,
    hasKnownCaptureDate: hasKnown,
    uploadTimestamp: timestamp,
    caption: cleanCaption || "A special birthday memory ✿",
    altText: (options.altText || cleanCaption || "Birthday photo memory").slice(0, MAX_CAPTION_LENGTH),
    width: options.width,
    height: options.height,
    ownerVisitorId: options.ownerVisitorId,
  };
}

/**
 * Saves photo asset to local media-service storage and returns the updated photo list.
 */
export function persistPhotoToMediaService(photo: PhotoAsset, storage?: Storage): PhotoAsset[] {
  return addPhotoAsset(photo, storage);
}
