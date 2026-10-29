/**
 * Google Photos Asset Pipeline & Shared Media Ingestion
 *
 * Implements:
 * - Shared album URL parsing and validation (photos.app.goo.gl & photos.google.com)
 * - Security & privacy guards (path traversal prevention, secret redaction, safe protocols)
 * - Image derivative pipeline (thumbnails, web-optimized previews, crops)
 * - Shared media contract transformations (PhotoAsset, AlbumCollection, ProfilePostItem)
 * - Accessibility helpers (focus trap, ARIA dialog validation)
 */

import type { PhotoAsset, AlbumCollection } from "../types/media-contracts.ts";

export interface ParsedGooglePhotosUrl {
  isValid: boolean;
  type?: "short_link" | "share_album" | "direct_album";
  canonicalUrl?: string;
  albumKey?: string;
  authKey?: string;
  error?: string;
}

export interface GooglePhotoItemRaw {
  id: string;
  baseUrl: string;
  filename?: string;
  mediaMetadata?: {
    creationTime?: string;
    width?: string | number;
    height?: string | number;
    photo?: {
      cameraMake?: string;
      cameraModel?: string;
      focalLength?: number;
      apertureFNumber?: number;
      isoEquivalent?: number;
    };
    video?: {
      cameraMake?: string;
      cameraModel?: string;
      fps?: number;
      status?: string;
    };
  };
  description?: string;
  mimeType?: string;
}

export interface DerivativeOptions {
  width?: number;
  height?: number;
  crop?: boolean;
  download?: boolean;
  maxDimension?: number;
}

export type ProfileMode = "posts" | "reels" | "favorites";

export interface ProfilePostItem {
  id: string;
  url: string;
  media_path?: string;
  media_kind: "image" | "video";
  caption?: string;
  alt_text?: string;
  sort_order?: number;
  is_published?: boolean;
}

/**
 * Filter profile media items according to the active tab mode.
 */
export function filterProfileMedia(
  items: ProfilePostItem[],
  mode: ProfileMode,
  favorites: string[]
): ProfilePostItem[] {
  if (!items || !Array.isArray(items)) return [];
  if (mode === "reels") {
    return items.filter((p) => p.media_kind === "video");
  }
  if (mode === "favorites") {
    const favSet = new Set(favorites || []);
    return items.filter((p) => favSet.has(p.id));
  }
  return items.filter((p) => p.media_kind !== "video");
}

/**
 * Empty state guidance messages for Profile modes.
 */
export function getEmptyStateMessage(mode: ProfileMode): string {
  switch (mode) {
    case "favorites":
      return "Tap the heart on a post or reel to save it here.";
    case "reels":
      return "No reels yet. Add videos in the creator workspace.";
    case "posts":
    default:
      return "Your birthday photos will appear here once the creator adds them.";
  }
}

// ---------------------------------------------------------------------------
// 1. Shared Album URL Parser & Security Validator
// ---------------------------------------------------------------------------

const ALLOWED_GOOGLE_PHOTOS_HOSTS = new Set([
  "photos.app.goo.gl",
  "photos.google.com",
]);

/**
 * Parses and strictly validates a Google Photos shared album URL.
 * Protects against SSRF, javascript: injections, and invalid domains.
 */
export function parseGooglePhotosAlbumUrl(rawUrl: string): ParsedGooglePhotosUrl {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { isValid: false, error: "Empty or invalid URL input" };
  }

  const trimmed = rawUrl.trim();

  // Prevent protocol-relative or non-HTTPS URLs
  if (!trimmed.startsWith("https://")) {
    return { isValid: false, error: "Only secure https:// Google Photos URLs are allowed" };
  }

  // Prevent dangerous control characters / newlines
  if (/[\r\n\0\t]/.test(trimmed)) {
    return { isValid: false, error: "URL contains illegal control characters" };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { isValid: false, error: "Malformed URL structure" };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!ALLOWED_GOOGLE_PHOTOS_HOSTS.has(hostname)) {
    return { isValid: false, error: `Unauthorized host: ${hostname}. Only Google Photos domains are supported.` };
  }

  // Handle photos.app.goo.gl short links (e.g. https://photos.app.goo.gl/X8Fk9A2bCD4e)
  if (hostname === "photos.app.goo.gl") {
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length !== 1 || !/^[A-Za-z0-9_-]+$/.test(pathParts[0])) {
      return { isValid: false, error: "Invalid Google Photos short share link format" };
    }
    const albumKey = pathParts[0];
    return {
      isValid: true,
      type: "short_link",
      canonicalUrl: `https://photos.app.goo.gl/${albumKey}`,
      albumKey,
    };
  }

  // Handle photos.google.com/share/... or photos.google.com/album/...
  if (hostname === "photos.google.com") {
    const pathParts = parsed.pathname.split("/").filter(Boolean);

    if (pathParts[0] === "share" && pathParts[1]) {
      const albumKey = pathParts[1];
      const authKey = parsed.searchParams.get("key") || undefined;
      return {
        isValid: true,
        type: "share_album",
        canonicalUrl: parsed.origin + parsed.pathname + (authKey ? `?key=${encodeURIComponent(authKey)}` : ""),
        albumKey,
        authKey,
      };
    }

    if (pathParts[0] === "album" && pathParts[1]) {
      const albumKey = pathParts[1];
      return {
        isValid: true,
        type: "direct_album",
        canonicalUrl: parsed.origin + parsed.pathname,
        albumKey,
      };
    }

    return { isValid: false, error: "Path does not match a valid Google Photos album or share endpoint" };
  }

  return { isValid: false, error: "Unrecognized Google Photos URL structure" };
}

// ---------------------------------------------------------------------------
// 2. Storage Path Sanitization & Traversal Prevention
// ---------------------------------------------------------------------------

/**
 * Sanitizes input path / filename, strictly rejecting directory traversal attempts
 * (such as "../", "..\\", null bytes, or absolute paths).
 */
export function sanitizeAssetPath(inputPath: string): { safePath: string; isSafe: boolean } {
  if (!inputPath || typeof inputPath !== "string") {
    return { safePath: "media/photo-unknown.jpg", isSafe: false };
  }

  // Reject null bytes
  if (inputPath.includes("\0")) {
    return { safePath: "media/photo-unknown.jpg", isSafe: false };
  }

  // Reject traversal sequences
  if (inputPath.includes("..") || inputPath.includes(":\\") || inputPath.startsWith("/") || inputPath.startsWith("\\")) {
    // Sanitize by stripping invalid path segments
    const cleaned = inputPath
      .replace(/^[/\\]+/, "")
      .replace(/\.\.[/\\]/g, "")
      .replace(/[\\:]/g, "/");
    return { safePath: cleaned || "media/photo-unknown.jpg", isSafe: false };
  }

  // Replace backslashes with standard forward slashes
  const normalized = inputPath.replace(/\\/g, "/").replace(/^\/+/, "");
  return { safePath: normalized, isSafe: true };
}

// ---------------------------------------------------------------------------
// 3. Sensitive Log Redaction & Secret Protection
// ---------------------------------------------------------------------------

/**
 * Redacts secret auth keys, session parameters, and API tokens before logging.
 */
export function redactSensitiveUrlParams(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  try {
    const urlObj = new URL(rawUrl);
    const sensitiveKeys = ["key", "auth", "token", "apikey", "api_key", "secret", "bearer"];
    let modified = false;
    for (const param of Array.from(urlObj.searchParams.keys())) {
      if (sensitiveKeys.some((s) => param.toLowerCase().includes(s))) {
        urlObj.searchParams.set(param, "TOKEN_REDACTED_VAL");
        modified = true;
      }
    }
    if (modified) {
      return urlObj.toString().replace(/TOKEN_REDACTED_VAL/g, "[REDACTED]");
    }
    return urlObj.toString();
  } catch {
    // If not a full URL, redact key query params via regex
    return rawUrl.replace(/([?&](?:key|auth|token|secret|apiKey)=)[^&]+/gi, "$1[REDACTED]");
  }
}

// ---------------------------------------------------------------------------
// 4. Image Derivative Pipeline
// ---------------------------------------------------------------------------

/**
 * Generates derivative URL parameters for Google Photos base URLs.
 * Google Photos URLs support dynamic resizing syntax:
 *   =w{width}-h{height}-c (for cropped bounding box)
 *   =s{maxDimension} (for proportional scaling)
 *   =w{width} or =h{height}
 */
export function buildGooglePhotoDerivativeUrl(
  baseUrl: string,
  options: DerivativeOptions = {}
): string {
  if (!baseUrl) return "";

  // Strip any existing Google Photos derivative suffix
  const cleanBase = baseUrl.replace(/=w\d+.*$|=s\d+.*$|=h\d+.*$/i, "");

  const parts: string[] = [];

  if (options.download) {
    parts.push("d");
  } else if (options.width && options.height) {
    parts.push(`w${Math.max(1, Math.round(options.width))}`);
    parts.push(`h${Math.max(1, Math.round(options.height))}`);
    if (options.crop) {
      parts.push("c");
    }
  } else if (options.maxDimension) {
    parts.push(`s${Math.max(1, Math.round(options.maxDimension))}`);
  } else if (options.width) {
    parts.push(`w${Math.max(1, Math.round(options.width))}`);
  } else if (options.height) {
    parts.push(`h${Math.max(1, Math.round(options.height))}`);
  } else {
    // Default optimized web preview
    parts.push("w1920-h1080");
  }

  const suffix = parts.join("-");
  return `${cleanBase}=${suffix}`;
}

// ---------------------------------------------------------------------------
// 5. Shared Domain Transformation (PhotoAsset & Collections)
// ---------------------------------------------------------------------------

export interface IngestGooglePhotoOptions {
  albumTitle?: string;
  defaultCaption?: string;
  isPrivate?: boolean;
}

/**
 * Transforms a raw Google Photos record into the canonical PhotoAsset schema.
 */
export function transformGooglePhotoToAsset(
  item: GooglePhotoItemRaw,
  options: IngestGooglePhotoOptions = {}
): PhotoAsset {
  const isVideo = Boolean(
    item.mimeType?.startsWith("video/") || item.mediaMetadata?.video
  );
  const mediaKind = isVideo ? "video" : "image";

  const captureTime = item.mediaMetadata?.creationTime;
  const effectiveCaptureDate = captureTime
    ? captureTime.slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const hasKnownCaptureDate = Boolean(captureTime);

  // Generate responsive derivatives
  const fullUrl = isVideo
    ? item.baseUrl
    : buildGooglePhotoDerivativeUrl(item.baseUrl, { width: 1920, height: 1080 });

  const thumbnailUrl = isVideo
    ? `${item.baseUrl}=w400-h400-c`
    : buildGooglePhotoDerivativeUrl(item.baseUrl, { width: 400, height: 400, crop: true });

  const rawFilename = item.filename || `gp-${item.id}.jpg`;
  const { safePath } = sanitizeAssetPath(`google-photos/${rawFilename}`);

  const width = item.mediaMetadata?.width ? Number(item.mediaMetadata.width) : undefined;
  const height = item.mediaMetadata?.height ? Number(item.mediaMetadata.height) : undefined;

  const caption = item.description || options.defaultCaption || (options.albumTitle ? `${options.albumTitle} memory` : "Celebration memory");
  const altText = item.description || `Birthday photo memory ${effectiveCaptureDate}`;

  return {
    id: `gp-${item.id}`,
    storagePath: safePath,
    url: fullUrl,
    thumbnailUrl,
    thumbnailPath: safePath.replace(/\.([^.]+)$/, "-thumb.$1"),
    mediaKind,
    effectiveCaptureDate,
    hasKnownCaptureDate,
    uploadTimestamp: new Date().toISOString(),
    width,
    height,
    caption,
    altText,
    isPrivate: options.isPrivate ?? false,
  };
}

/**
 * Transforms ingested PhotoAssets into ProfilePostItem elements for the Profile grid.
 */
export function transformPhotosToProfilePosts(photos: PhotoAsset[]): ProfilePostItem[] {
  return photos.map((photo, index) => ({
    id: photo.id,
    url: photo.url,
    media_path: photo.storagePath,
    media_kind: photo.mediaKind,
    caption: photo.caption || "Birthday post",
    alt_text: photo.altText || photo.caption || "Birthday photograph",
    sort_order: index,
    is_published: true,
  }));
}

/**
 * Creates an AlbumCollection from ingested PhotoAssets.
 */
export function createAlbumFromIngestedPhotos(
  albumId: string,
  title: string,
  photos: PhotoAsset[],
  description: string = ""
): AlbumCollection {
  const now = new Date().toISOString();
  return {
    id: albumId,
    title,
    description: description || `Shared collection with ${photos.length} memories`,
    coverPhotoId: photos[0]?.id,
    coverPhotoUrl: photos[0]?.thumbnailUrl || photos[0]?.url,
    photoIds: photos.map((p) => p.id),
    photos,
    createdAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// 6. Accessibility Helpers (Focus Trap & ARIA Validation)
// ---------------------------------------------------------------------------

export const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Traps keyboard focus within an active lightbox or modal dialog.
 * Returns true if the key event was intercepted and handled.
 */
export function handleLightboxFocusTrap(
  container: { querySelectorAll: (sel: string) => NodeListOf<Element> } | null,
  event: { key: string; shiftKey: boolean; preventDefault: () => void },
  activeElement: Element | null
): boolean {
  if (event.key !== "Tab" || !container) {
    return false;
  }

  const focusable = Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS)) as HTMLElement[];
  if (focusable.length === 0) {
    event.preventDefault();
    return true;
  }

  const firstFocusable = focusable[0];
  const lastFocusable = focusable[focusable.length - 1];

  if (event.shiftKey) {
    // Backward tab
    if (activeElement === firstFocusable || !focusable.includes(activeElement as HTMLElement)) {
      event.preventDefault();
      lastFocusable.focus?.();
      return true;
    }
  } else {
    // Forward tab
    if (activeElement === lastFocusable || !focusable.includes(activeElement as HTMLElement)) {
      event.preventDefault();
      firstFocusable.focus?.();
      return true;
    }
  }

  return false;
}

/**
 * Validates that an element / markup conforms to accessibility dialog requirements.
 */
export function validateDialogAccessibility(dialog: {
  role?: string | null;
  ariaModal?: string | boolean | null;
  ariaLabel?: string | null;
  ariaLabelledBy?: string | null;
  hasCloseButton?: boolean;
}): { isValid: boolean; missingAttributes: string[] } {
  const missing: string[] = [];

  if (dialog.role !== "dialog") {
    missing.push('role="dialog"');
  }

  if (String(dialog.ariaModal) !== "true") {
    missing.push('aria-modal="true"');
  }

  if (!dialog.ariaLabel && !dialog.ariaLabelledBy) {
    missing.push('aria-label or aria-labelledby');
  }

  if (dialog.hasCloseButton === false) {
    missing.push('accessible close button with aria-label');
  }

  return {
    isValid: missing.length === 0,
    missingAttributes: missing,
  };
}
