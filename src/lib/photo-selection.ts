/**
 * Dynamic Photo Selection & Validation Utilities
 * Filters excluded entries (items numbered 5, 6, 7), validates image URLs,
 * and dynamically selects available configured image records while preserving
 * captions, dates, notes, and proper ordering.
 */

export interface BasePhotoRecord {
  id?: string;
  url?: string;
  heading?: string;
  title?: string;
  caption?: string;
  date?: string;
  alt?: string;
  alt_text?: string;
  media_kind?: "image" | "video";
  mediaKind?: "image" | "video";
  washiTapeColor?: "gold" | "pink" | "sage";
  rotation?: number;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Validates whether a media URL is a valid, loadable path or URL.
 */
export function isValidMediaUrl(url?: unknown): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return false;
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("./") ||
    trimmed.startsWith("../") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  );
}

/**
 * Evaluates whether an image entry is numbered 5, 6, or 7.
 * Excludes entries by ID (e.g. photo-5, photo-6, photo-7, 5, 6, 7),
 * metadata albumIndex/entryNumber, or numbered headings/titles.
 */
export function isExcludedPhotoEntry(item?: BasePhotoRecord | null): boolean {
  if (!item || typeof item !== "object") return true;

  // 1. Check ID for 5, 6, 7 designations
  if (item.id !== undefined && item.id !== null) {
    const idStr = String(item.id).trim().toLowerCase();
    // Direct matches: 5, 6, 7, photo-5, photo-6, photo-7, etc.
    if (["5", "6", "7", "photo-5", "photo-6", "photo-7", "photo_5", "photo_6", "photo_7"].includes(idStr)) {
      return true;
    }
    // Delimited patterns: photo-5, img_6, card-7, item-5, memory-6, etc.
    if (/(?:photo|image|img|item|memory|card|entry|pic)[-_]?(?:5|6|7)(?:$|[^0-9])/i.test(idStr)) {
      return true;
    }
    // Suffix patterns: e.g. "photo5", "image6", "item7"
    if (/^(?:photo|image|img|item|memory|entry)0?[567]$/i.test(idStr)) {
      return true;
    }
    if (/^(?:5|6|7)$/.test(idStr)) {
      return true;
    }
  }

  // 2. Check metadata albumIndex or entryNumber
  if (item.metadata && typeof item.metadata === "object") {
    const meta = item.metadata as Record<string, unknown>;
    if (meta.albumIndex === 5 || meta.albumIndex === 6 || meta.albumIndex === 7) {
      return true;
    }
    if (meta.entryNumber === 5 || meta.entryNumber === 6 || meta.entryNumber === 7) {
      return true;
    }
    if (meta.photoIndex === 5 || meta.photoIndex === 6 || meta.photoIndex === 7) {
      return true;
    }
  }

  // 3. Check heading / title labels (e.g. "Memory 05", "Memory 5", "NO. 05", "Photo 5")
  const headingText = [item.heading, item.title].filter(Boolean).join(" ").trim().toLowerCase();
  if (/\b(?:memory|photo|entry|no\.?)\s*0?[567]\b/i.test(headingText)) {
    return true;
  }

  return false;
}

export interface DynamicPhotoSelectionOptions {
  maxCount?: number;
  requireValidUrl?: boolean;
}

/**
 * Dynamically selects photos from available configured image records:
 * - Excludes entries numbered 5, 6, and 7
 * - Eliminates hardcoded index dependencies
 * - Preserves captions, dates, notes, and proper ordering
 * - Supports optional dynamic limit or full configured list
 */
export function selectDynamicPhotos<T extends BasePhotoRecord>(
  photos?: readonly T[] | T[] | null,
  options?: DynamicPhotoSelectionOptions
): T[] {
  if (!Array.isArray(photos)) return [];

  const filtered = photos.filter((photo) => {
    if (!photo) return false;
    if (isExcludedPhotoEntry(photo)) return false;
    if (options?.requireValidUrl && !isValidMediaUrl(photo.url)) return false;
    return true;
  });

  if (typeof options?.maxCount === "number" && options.maxCount > 0) {
    return filtered.slice(0, options.maxCount);
  }

  return filtered;
}

/**
 * Dynamically selects memories for preview display:
 * - Excludes entries numbered 5, 6, and 7
 * - Dynamically limits up to maxCount while keeping available configured records
 * - Preserves captions, dates, notes, and proper ordering
 */
export function selectDynamicMemories<T extends BasePhotoRecord>(
  memories?: readonly T[] | T[] | null,
  options?: { maxCount?: number }
): T[] {
  return selectDynamicPhotos(memories, {
    maxCount: options?.maxCount,
    requireValidUrl: false, // retain broken items so fallback polaroids can render
  });
}
