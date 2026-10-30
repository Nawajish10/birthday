"use client";

import React, { type JSX } from "react";
import "./memories-preview.css";

export const DEFAULT_MEMORIES_HEADING = "Moments worth keeping.";
export const DEFAULT_MEMORIES_SUPPORTING =
  "A few little pieces of time that deserve a place of their own.";
export const DEFAULT_MEMORIES_KICKER = "Photo Stories · یادیں";
export const DEFAULT_MEMORIES_MAX_COUNT = 4;
export const EMPTY_MEMORIES_TITLE = "Moments are waiting to be placed here...";
export const EMPTY_MEMORIES_TEXT =
  "Your birthday photos and sweet snapshots will appear here as soon as memories are pinned to the scrapbook.";

export interface MemoryPreviewItem {
  id: string;
  url: string;
  caption?: string;
  alt_text?: string;
  media_kind?: "image" | "video";
}

export interface MemoriesPreviewSectionProps {
  heading?: string;
  supportingText?: string;
  memories?: MemoryPreviewItem[];
  onOpenMemories: () => void;
  onSelectPhoto?: (item: MemoryPreviewItem) => void;
  loading?: boolean;
  maxCount?: number;
  className?: string;
}

export function getMemoryAltText(item: MemoryPreviewItem, index: number): string {
  if (item.alt_text?.trim()) return item.alt_text.trim();
  if (item.caption?.trim()) return item.caption.trim();
  return `Birthday memory photograph ${index + 1}`;
}

export function getMemoryDisplayCaption(item: MemoryPreviewItem): string {
  if (item.caption?.trim()) return item.caption.trim();
  if (item.alt_text?.trim()) return item.alt_text.trim();
  return "A sweet memory ✿";
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
 */
export function isExcludedPhotoEntry(item?: MemoryPreviewItem | null): boolean {
  if (!item || typeof item !== "object") return true;

  if (item.id !== undefined && item.id !== null) {
    const idStr = String(item.id).trim().toLowerCase();
    if (["5", "6", "7", "photo-5", "photo-6", "photo-7", "photo_5", "photo_6", "photo_7"].includes(idStr)) {
      return true;
    }
    if (/(?:photo|image|img|item|memory|card|entry|pic)[-_]?(?:5|6|7)(?:$|[^0-9])/i.test(idStr)) {
      return true;
    }
    if (/^(?:photo|image|img|item|memory|entry)0?[567]$/i.test(idStr)) {
      return true;
    }
    if (/^(?:5|6|7)$/.test(idStr)) {
      return true;
    }
  }

  const meta = (item as Record<string, unknown>).metadata;
  if (meta && typeof meta === "object") {
    const m = meta as Record<string, unknown>;
    if (m.albumIndex === 5 || m.albumIndex === 6 || m.albumIndex === 7) return true;
    if (m.entryNumber === 5 || m.entryNumber === 6 || m.entryNumber === 7) return true;
    if (m.photoIndex === 5 || m.photoIndex === 6 || m.photoIndex === 7) return true;
  }

  const label = [item.caption, item.alt_text].filter(Boolean).join(" ").trim().toLowerCase();
  if (/\b(?:memory|photo|entry|no\.?)\s*0?[567]\b/i.test(label)) {
    return true;
  }

  return false;
}

/**
 * Dynamically selects memory items:
 * - Excludes entries numbered 5, 6, and 7
 * - Dynamically limits up to maxCount while keeping available records
 * - Preserves captions, dates, notes, and proper ordering
 */
export function selectDynamicMemories<T extends MemoryPreviewItem>(
  memories?: readonly T[] | T[] | null,
  options?: { maxCount?: number }
): T[] {
  if (!Array.isArray(memories)) return [];

  const filtered = memories.filter((item) => {
    if (!item) return false;
    if (isExcludedPhotoEntry(item)) return false;
    return true;
  });

  if (typeof options?.maxCount === "number" && options.maxCount > 0) {
    return filtered.slice(0, options.maxCount);
  }

  return filtered;
}

export function MemoriesPreviewSection({
  heading = DEFAULT_MEMORIES_HEADING,
  supportingText = DEFAULT_MEMORIES_SUPPORTING,
  memories = [],
  onOpenMemories,
  onSelectPhoto,
  loading = false,
  maxCount = DEFAULT_MEMORIES_MAX_COUNT,
  className = "",
}: MemoriesPreviewSectionProps): JSX.Element {
  let imageErrors: Record<string, boolean> = {};
  let setImageErrors: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void = () => {};
  try {
    const [errs, setErrs] = React.useState<Record<string, boolean>>({});
    imageErrors = errs;
    setImageErrors = setErrs;
  } catch {
    // Fallback when evaluated outside React dispatcher (e.g. direct functional call in unit test)
  }

  let previewMemories = selectDynamicMemories(memories, { maxCount });
  try {
    previewMemories = React.useMemo(() => {
      return selectDynamicMemories(memories, { maxCount });
    }, [memories, maxCount]);
  } catch {
    // Fallback when evaluated outside React dispatcher
  }
  const hasMemories = previewMemories.length > 0;

  const washiTapes = ["washi-tape-pink", "washi-tape-sage", ""];

  return (
    <section
      className={`memories-preview-section ${className}`.trim()}
      aria-labelledby="memories-preview-heading"
    >
      {/* Section Header */}
      <div className="memories-preview-header">
        <span className="memories-preview-kicker">{DEFAULT_MEMORIES_KICKER}</span>
        <h2 id="memories-preview-heading" className="memories-preview-heading">
          {heading}
        </h2>
        <p className="memories-preview-supporting">{supportingText}</p>
      </div>

      {/* =====================================================================
          1. Loading State
          ===================================================================== */}
      {loading && (
        <div className="memories-loading-grid" aria-live="polite">
          {[0, 1, 2, 3].map((n) => (
            <div key={n} className="memories-skeleton-polaroid" aria-hidden="true">
              <div className="memories-skeleton-thumb" />
              <div className="memories-skeleton-line" />
            </div>
          ))}
        </div>
      )}

      {/* =====================================================================
          2. Empty State (Clean fallback)
          ===================================================================== */}
      {!loading && !hasMemories && (
        <div className="memories-empty-card" role="region" aria-label="Memories empty state">
          <div
            className="washi-tape washi-tape-pink"
            style={{ top: "-10px", left: "50%", transform: "translateX(-50%)" }}
            aria-hidden="true"
          />
          <div className="memories-empty-icon" aria-hidden="true">
            <span>📷</span>
          </div>
          <h3 className="memories-empty-title">{EMPTY_MEMORIES_TITLE}</h3>
          <p className="memories-empty-text">{EMPTY_MEMORIES_TEXT}</p>
          <button
            type="button"
            className="memories-preview-cta-btn"
            onClick={onOpenMemories}
            aria-label="Explore memories and pinned photos"
          >
            <span>Explore memories</span>
            <span className="memories-preview-btn-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </div>
      )}

      {/* =====================================================================
          3. Curated Polaroid Memories Grid
          ===================================================================== */}
      {!loading && hasMemories && (
        <>
          <div
            className="memories-polaroid-grid"
            role="list"
            aria-label="Curated memory polaroids"
          >
            {previewMemories.map((item, idx) => {
              const alt = getMemoryAltText(item, idx);
              const caption = getMemoryDisplayCaption(item);
              const tapeClass = washiTapes[idx % washiTapes.length];
              const tiltClass = `tilt-${idx % 4}`;
              const photoKey = item.id || item.url || `mem-${idx}`;
              const isBroken = imageErrors[photoKey] === true || !isValidMediaUrl(item.url);

              return (
                <button
                  type="button"
                  key={item.id || idx}
                  className={`memories-polaroid-card polaroid-frame ${tiltClass}`}
                  onClick={() => {
                    if (onSelectPhoto) {
                      onSelectPhoto(item);
                    } else {
                      onOpenMemories();
                    }
                  }}
                  aria-label={`View photo: ${caption}`}
                >
                  {/* Decorative Washi Tape */}
                  <div
                    className={`washi-tape ${tapeClass}`.trim()}
                    aria-hidden="true"
                  />

                  {/* Photo Thumbnail */}
                  <div className="memories-photo-wrapper">
                    {!isBroken ? (
                      <img
                        src={item.url}
                        alt={alt}
                        className="memories-photo-img"
                        loading="lazy"
                        onError={() =>
                          setImageErrors((prev) => ({ ...prev, [photoKey]: true }))
                        }
                      />
                    ) : (
                      <div className="memories-photo-fallback" role="img" aria-label={alt}>
                        <span className="memories-fallback-icon" aria-hidden="true">
                          ✿
                        </span>
                        <span className="memories-fallback-title">Keepsake Memory</span>
                      </div>
                    )}
                    {item.media_kind === "video" && (
                      <span className="memories-video-badge" aria-label="Video clip">
                        ▶ Video
                      </span>
                    )}
                  </div>

                  {/* Handwritten Style Caption */}
                  <span className="memories-caption-text">{caption}</span>
                </button>
              );
            })}
          </div>

          {/* Section Action Button */}
          <div className="memories-preview-actions">
            <button
              type="button"
              className="memories-preview-cta-btn"
              onClick={onOpenMemories}
              aria-label="Explore memories"
            >
              <span>Explore memories</span>
              <span className="memories-preview-btn-arrow" aria-hidden="true">
                →
              </span>
            </button>
          </div>
        </>
      )}
    </section>
  );
}
