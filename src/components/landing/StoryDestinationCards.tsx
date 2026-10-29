"use client";

import React, { type JSX } from "react";
import "./story-destination-cards.css";

export interface MemoryPreviewItem {
  id: string;
  url: string;
  caption?: string;
  alt_text?: string;
  media_kind: "image" | "video";
}

export interface StoryDestinationCardsProps {
  onOpenBook: () => void;
  onOpenMemories: () => void;
  onSelectPhoto?: (item: { url: string; caption: string; kind?: "image" | "video" }) => void;
  memories: MemoryPreviewItem[];
  totalPagesCount?: number;
  loading?: boolean;
}

export const MAX_MEMORIES_PREVIEW = 4;
export const DEFAULT_BOOK_PAGES_COUNT = 7;
export const BOOK_FOIL_ENGLISH = "For my baba";
export const BOOK_FOIL_URDU = "تمہاری سالگرہ";
export const EMPTY_MEMORIES_GUIDANCE_TITLE = "Moments are waiting to be placed here...";
export const EMPTY_MEMORIES_GUIDANCE_TEXT =
  "Your birthday photos and sweet snapshots will appear here as soon as memories are pinned to the scrapbook.";

/**
 * Formats the badge text indicating total book keepsake pages
 */
export function formatPageCountBadge(totalPagesCount?: number): string {
  const count =
    typeof totalPagesCount === "number" && totalPagesCount > 0
      ? totalPagesCount
      : DEFAULT_BOOK_PAGES_COUNT;
  return `${count} Keepsake Pages · صفحات`;
}

/**
 * Returns up to maxCount memories for preview display
 */
export function getPreviewMemories(
  memories?: MemoryPreviewItem[],
  maxCount: number = MAX_MEMORIES_PREVIEW
): MemoryPreviewItem[] {
  if (!Array.isArray(memories)) return [];
  return memories.slice(0, maxCount);
}

/**
 * Resolves accessible alt text for an image/photo
 */
export function getMemoryAltText(item: MemoryPreviewItem, index: number): string {
  if (item.alt_text?.trim()) return item.alt_text.trim();
  if (item.caption?.trim()) return item.caption.trim();
  return `Birthday memory photograph ${index + 1}`;
}

/**
 * Resolves caption text for handwritten polaroid display
 */
export function getMemoryDisplayCaption(item: MemoryPreviewItem): string {
  if (item.caption?.trim()) return item.caption.trim();
  if (item.alt_text?.trim()) return item.alt_text.trim();
  return "A sweet memory ✿";
}

/**
 * Builds selection payload for photo modal/viewer
 */
export function buildSelectPhotoPayload(
  item: MemoryPreviewItem
): { url: string; caption: string; kind?: "image" | "video" } {
  return {
    url: item.url,
    caption: item.caption?.trim() || item.alt_text?.trim() || "A birthday memory",
    kind: item.media_kind,
  };
}

export function StoryDestinationCards({
  onOpenBook,
  onOpenMemories,
  onSelectPhoto,
  memories,
  totalPagesCount,
  loading = false,
}: StoryDestinationCardsProps): JSX.Element {
  const previewMemories = getPreviewMemories(memories, MAX_MEMORIES_PREVIEW);
  const pageBadge = formatPageCountBadge(totalPagesCount);

  return (
    <div className="story-destinations-wrapper">
      <div className="story-destinations-grid">
        {/* ==================================================================
            SECTION 4: Birthday Book Entry Point
            ================================================================== */}
        <section
          className="destination-card book-destination-card"
          aria-labelledby="book-destination-title"
        >
          {/* Decorative washi tape accents */}
          <div
            className="washi-tape washi-tape-pink destination-card-tape-left"
            aria-hidden="true"
          />
          <div
            className="washi-tape destination-card-tape-right"
            aria-hidden="true"
          />

          <div className="card-header-group">
            <span className="card-kicker">
              <span className="card-kicker-symbol" aria-hidden="true">
                ✿
              </span>
              <span>KEEPSAKE VOLUME</span>
            </span>
            <h2 id="book-destination-title" className="destination-title">
              The Birthday Book
            </h2>
            <p className="destination-subtitle">
              Letters, warm wishes, and notes collected together in a bound keepsake.
            </p>
          </div>

          {/* Vintage Leather/Cloth Book Cover Illustration */}
          <div className="book-cover-stage">
            <div
              className="vintage-book-cover"
              role="img"
              aria-label="Vintage leather-bound birthday book cover with gold foil lettering reading: For my baba · تمہاری سالگرہ"
            >
              <div className="book-spine-crease" aria-hidden="true" />
              <div className="book-spine-stitch" aria-hidden="true" />
              <div className="book-bookmark-ribbon" aria-hidden="true" />

              <div className="book-gold-frame">
                <span className="book-gold-corners corner-tl" aria-hidden="true">
                  ✦
                </span>
                <span className="book-gold-corners corner-tr" aria-hidden="true">
                  ✦
                </span>

                <div className="book-gold-foil-title">
                  <span className="book-gold-english">{BOOK_FOIL_ENGLISH}</span>
                  <span className="book-gold-divider" aria-hidden="true">
                    ·
                  </span>
                  <span className="book-gold-urdu" lang="ur" dir="rtl">
                    {BOOK_FOIL_URDU}
                  </span>
                </div>

                <div className="book-emblem" aria-hidden="true">
                  ✿
                </div>

                <div
                  className="book-page-count-badge"
                  aria-label={`Book contains ${pageBadge}`}
                >
                  <span aria-hidden="true">📖</span>
                  <span>{pageBadge}</span>
                </div>

                <span className="book-gold-corners corner-bl" aria-hidden="true">
                  ✦
                </span>
                <span className="book-gold-corners corner-br" aria-hidden="true">
                  ✦
                </span>
              </div>
            </div>
          </div>

          <div className="book-details-group">
            <p className="book-teaser-text">
              An intimate collection of handwritten letters, memories, and birthday wishes bound
              together just for you.
            </p>
            <button
              type="button"
              className="scrapbook-cta-button book-cta-button"
              onClick={onOpenBook}
              aria-label="Open Birthday Book"
            >
              <span>Open Birthday Book</span>
              <span className="cta-icon" aria-hidden="true">
                ✿
              </span>
            </button>
          </div>
        </section>

        {/* ==================================================================
            SECTION 5: Memories & Photographs Preview
            ================================================================== */}
        <section
          className="destination-card memories-destination-card"
          aria-labelledby="memories-destination-title"
        >
          {/* Decorative washi tape accents */}
          <div
            className="washi-tape washi-tape-sage destination-card-tape-left"
            aria-hidden="true"
          />
          <div
            className="washi-tape washi-tape-pink destination-card-tape-right"
            aria-hidden="true"
          />

          <div className="card-header-group">
            <span className="card-kicker">
              <span className="card-kicker-symbol" aria-hidden="true">
                ✧
              </span>
              <span>MEMORIES &amp; PHOTOGRAPHS</span>
            </span>
            <h2 id="memories-destination-title" className="destination-title">
              Snapshots in Time
            </h2>
            <p className="destination-subtitle">
              Captured smiles, candid days, and birthday memories.
            </p>
          </div>

          {/* Layered Polaroid Deck Stage */}
          <div className="memories-deck-stage">
            {loading ? (
              <div
                className="memories-loading-grid"
                role="status"
                aria-label="Loading memory photographs..."
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={`skeleton-${i}`} className="polaroid-skeleton">
                    <div className="skeleton-media-box" />
                    <div className="skeleton-caption-line" />
                  </div>
                ))}
              </div>
            ) : previewMemories.length === 0 ? (
              <div
                className="memories-empty-state"
                role="status"
                aria-label="No memories added yet"
              >
                <div className="empty-state-polaroid-frame" aria-hidden="true">
                  <span className="empty-icon-flower">✿</span>
                </div>
                <h3 className="empty-state-title">{EMPTY_MEMORIES_GUIDANCE_TITLE}</h3>
                <p className="empty-state-text">{EMPTY_MEMORIES_GUIDANCE_TEXT}</p>
              </div>
            ) : (
              <div
                className="memories-polaroid-grid"
                role="list"
                aria-label="Birthday memories photo preview"
              >
                {previewMemories.map((item, index) => {
                  const tiltClass = `polaroid-tilt-${index % 4}`;
                  const altText = getMemoryAltText(item, index);
                  const caption = getMemoryDisplayCaption(item);
                  const washiClass =
                    index % 3 === 0
                      ? "washi-tape-pink"
                      : index % 3 === 1
                      ? ""
                      : "washi-tape-sage";

                  return (
                    <div
                      key={item.id || `memory-${index}`}
                      className={`polaroid-grid-cell ${tiltClass}`}
                      role="listitem"
                    >
                      <button
                        type="button"
                        className="polaroid-card-button"
                        onClick={() =>
                          onSelectPhoto?.(buildSelectPhotoPayload(item))
                        }
                        aria-label={`View photo: ${caption}`}
                      >
                        <div className="scrapbook-polaroid polaroid-frame">
                          <div
                            className={`washi-tape ${washiClass} polaroid-washi`}
                            aria-hidden="true"
                          />
                          <div className="polaroid-media-container">
                            <img
                              src={item.url}
                              alt={altText}
                              className="polaroid-image"
                              loading="lazy"
                            />
                            {item.media_kind === "video" && (
                              <span
                                className="polaroid-video-badge"
                                aria-label="Video memory"
                                title="Video memory"
                              >
                                ▶
                              </span>
                            )}
                          </div>
                          <p className="polaroid-caption" title={caption}>
                            {caption}
                          </p>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="book-details-group">
            <p className="book-teaser-text">
              Browse through our personal scrapbook of candid days, celebrations, and shared smiles.
            </p>
            <button
              type="button"
              className="scrapbook-cta-button memories-cta-button"
              onClick={onOpenMemories}
              aria-label="Open all memories"
            >
              <span>Open all memories</span>
              <span className="cta-icon" aria-hidden="true">
                →
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
