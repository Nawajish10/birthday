"use client";

import React, { useState, useRef, useCallback, type JSX } from "react";
import "./swipeable-photo-cards.css";

/**
 * ============================================================================
 * Section 3: Swipeable Photo Cards — Types & Contracts
 * Editorial scrapbook photo cards with washi tape accents and heartfelt narratives.
 * ============================================================================
 */

export interface SwipeablePhotoItem {
  id?: string;
  url: string;
  heading?: string;
  title?: string;
  caption?: string;
  date?: string;
  alt?: string;
  washiTapeColor?: "gold" | "pink" | "sage";
  rotation?: number;
  kind?: "image" | "video";
}

export interface SwipeablePhotoCardsProps {
  photos?: SwipeablePhotoItem[];
  title?: string;
  subtitle?: string;
  onSelectPhoto?: (photo: SwipeablePhotoItem, index: number) => void;
  loading?: boolean;
  className?: string;
  initialIndex?: number;
  wrap?: boolean;
}

/**
 * Minimum touch travel in pixels to register a swipe gesture
 */
export const SWIPE_THRESHOLD_PX = 45;

/**
 * Curated default photographs for Meerah's journey album.
 * Each card features an intentional editorial heading, heartfelt narrative,
 * authentic date stamp, and subtle scrapbook washi tape styling.
 */
export const DEFAULT_PHOTOS: readonly SwipeablePhotoItem[] = [
  {
    id: "photo-1",
    url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=900&q=82",
    heading: "Golden Hour Celebrations",
    title: "Golden Hour Celebrations",
    caption: "The room filled with laughter as the sparklers were lit. A moment where time seemed to slow down, bathed in the softest amber light.",
    date: "October 2025",
    alt: "Meerah celebrating with birthday sparkles and golden ambient lighting",
    washiTapeColor: "gold",
    rotation: -1.4,
  },
  {
    id: "photo-2",
    url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=82",
    heading: "Starlit Evenings & Twilight",
    title: "Starlit Evenings & Twilight",
    caption: "Tiny fairy lights strung across the patio, casting gentle glows into the twilight. Long stories, comfortable silences, and endless tea.",
    date: "November 2025",
    alt: "Soft golden bokeh lights illuminating a calm evening celebration",
    washiTapeColor: "pink",
    rotation: 1.5,
  },
  {
    id: "photo-3",
    url: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=900&q=82",
    heading: "Cozy Teacups & Quiet Talks",
    title: "Cozy Teacups & Quiet Talks",
    caption: "Cinnamon tea in vintage porcelain, steam rising against the rainy windowpane. The quietest conversations that always meant the most.",
    date: "December 2025",
    alt: "A warm cozy tea moment captured with genuine smiles and gentle light",
    washiTapeColor: "sage",
    rotation: -1.0,
  },
  {
    id: "photo-4",
    url: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=900&q=82",
    heading: "Sweet Confections & Petals",
    title: "Sweet Confections & Petals",
    caption: "Handmade birthday cake adorned with delicate edible rose petals and candlelight. Blown out candles with wishes whispered into the breeze.",
    date: "October 2025",
    alt: "Handcrafted birthday cake decorated with fresh petals and glowing candlelight",
    washiTapeColor: "gold",
    rotation: 1.6,
  },
] as const;

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
export function isExcludedPhotoEntry(item?: SwipeablePhotoItem | null): boolean {
  if (!item || typeof item !== "object") return true;

  // 1. Check ID for 5, 6, 7 designations
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

  // 2. Check metadata albumIndex or entryNumber if present
  const meta = (item as Record<string, unknown>).metadata;
  if (meta && typeof meta === "object") {
    const m = meta as Record<string, unknown>;
    if (m.albumIndex === 5 || m.albumIndex === 6 || m.albumIndex === 7) return true;
    if (m.entryNumber === 5 || m.entryNumber === 6 || m.entryNumber === 7) return true;
    if (m.photoIndex === 5 || m.photoIndex === 6 || m.photoIndex === 7) return true;
  }

  // 3. Check heading / title labels
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
export function selectDynamicPhotos<T extends SwipeablePhotoItem>(
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
 * Pure Domain & Boundary Calculation Helpers
 */

export function clampPhotoIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  if (index < 0) return 0;
  if (index >= total) return total - 1;
  return index;
}

export function getNextPhotoIndex(current: number, total: number, wrap: boolean = false): number {
  if (total <= 0) return 0;
  if (wrap) {
    return (current + 1) % total;
  }
  return Math.min(current + 1, total - 1);
}

export function getPrevPhotoIndex(current: number, total: number, wrap: boolean = false): number {
  if (total <= 0) return 0;
  if (wrap) {
    return (current - 1 + total) % total;
  }
  return Math.max(current - 1, 0);
}

export function calculateSwipeDirection(
  startX: number,
  endX: number,
  threshold: number = SWIPE_THRESHOLD_PX
): "next" | "prev" | "none" {
  const deltaX = startX - endX;
  if (Math.abs(deltaX) < threshold) {
    return "none";
  }
  return deltaX > 0 ? "next" : "prev";
}

export function resolvePhotoAltText(photo: SwipeablePhotoItem, index: number): string {
  if (photo.alt?.trim()) return photo.alt.trim();
  if (photo.caption?.trim()) return photo.caption.trim();
  if (photo.heading?.trim()) return photo.heading.trim();
  if (photo.title?.trim()) return photo.title.trim();
  return `Meerah's birthday memory photograph ${index + 1}`;
}

export function resolvePhotoHeading(photo: SwipeablePhotoItem, index: number): string {
  if (photo.heading?.trim()) return photo.heading.trim();
  if (photo.title?.trim()) return photo.title.trim();
  return `Memory ${String(index + 1).padStart(2, "0")}`;
}

export function resolvePhotoWashiColor(
  color?: "gold" | "pink" | "sage",
  index: number = 0
): "gold" | "pink" | "sage" {
  if (color === "gold" || color === "pink" || color === "sage") {
    return color;
  }
  const sequence: ("gold" | "pink" | "sage")[] = ["gold", "pink", "sage"];
  return sequence[index % sequence.length];
}

/**
 * SwipeablePhotoCards Component
 * A responsive, editorial scrapbook carousel of polaroid-framed photos with washi tape accents.
 */
export function SwipeablePhotoCards({
  photos = DEFAULT_PHOTOS as SwipeablePhotoItem[],
  title = "Sweet Birthday Memories",
  subtitle = "Genuine snapshots, warm memories, and sunlit moments pinned into your keepsake.",
  onSelectPhoto,
  loading = false,
  className = "",
  initialIndex = 0,
  wrap = false,
}: SwipeablePhotoCardsProps): JSX.Element {
  const photoList = React.useMemo(() => {
    const raw = Array.isArray(photos) ? photos : [];
    return selectDynamicPhotos(raw);
  }, [photos]);
  const totalPhotos = photoList.length;

  const [currentIndex, setCurrentIndex] = useState<number>(() =>
    clampPhotoIndex(initialIndex, totalPhotos)
  );
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const getPhotoKey = useCallback((photo: SwipeablePhotoItem, index: number): string => {
    return photo.id || photo.url || `photo-${index}`;
  }, []);

  // Touch gesture state
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => getNextPhotoIndex(prev, totalPhotos, wrap));
  }, [totalPhotos, wrap]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => getPrevPhotoIndex(prev, totalPhotos, wrap));
  }, [totalPhotos, wrap]);

  const goTo = useCallback(
    (targetIndex: number) => {
      setCurrentIndex(clampPhotoIndex(targetIndex, totalPhotos));
    },
    [totalPhotos]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (totalPhotos <= 1) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(totalPhotos - 1);
      }
    },
    [totalPhotos, goPrev, goNext, goTo]
  );

  // Touch swipe event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || e.changedTouches.length === 0) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current ?? endY;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    const deltaX = Math.abs(startX - endX);
    const deltaY = Math.abs(startY - endY);

    // Only swipe if horizontal motion exceeds vertical scroll
    if (deltaX >= deltaY) {
      const direction = calculateSwipeDirection(startX, endX, SWIPE_THRESHOLD_PX);
      if (direction === "next") {
        goNext();
      } else if (direction === "prev") {
        goPrev();
      }
    }
  };

  const handleImageError = useCallback((photoKey: string) => {
    setImageErrors((prev) => ({ ...prev, [photoKey]: true }));
  }, []);

  // Loading skeleton state
  if (loading) {
    return (
      <section
        className={`swipeable-photos-section is-loading ${className}`}
        aria-label="Photo Memories Carousel — Loading"
        aria-busy="true"
      >
        <div className="photos-header">
          <span className="photos-kicker">PHOTO REEL · یادیں</span>
          <h2 className="photos-title">{title}</h2>
          <p className="photos-subtitle">{subtitle}</p>
        </div>
        <div className="photos-skeleton-card polaroid-frame">
          <div className="washi-tape washi-tape-gold washi-pos-center" aria-hidden="true" />
          <div className="photos-skeleton-image shimmer" />
          <div className="photos-skeleton-heading shimmer" />
          <div className="photos-skeleton-caption shimmer" />
        </div>
      </section>
    );
  }

  // Empty state
  if (totalPhotos === 0) {
    return (
      <section
        className={`swipeable-photos-section is-empty ${className}`}
        aria-label="Photo Memories Carousel — No Photos"
      >
        <div className="photos-header">
          <span className="photos-kicker">PHOTO REEL · یادیں</span>
          <h2 className="photos-title">{title}</h2>
          <p className="photos-subtitle">{subtitle}</p>
        </div>
        <div className="photos-empty-card polaroid-frame">
          <div className="washi-tape washi-tape-pink washi-pos-center" aria-hidden="true" />
          <div className="photos-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 64 64" fill="none" className="photos-camera-svg">
              <rect x="8" y="18" width="48" height="36" rx="6" stroke="#D4798D" strokeWidth="3" fill="#FFF9EF" />
              <path d="M22 18L26 10H38L42 18" stroke="#D4798D" strokeWidth="3" strokeLinejoin="round" />
              <circle cx="32" cy="36" r="11" stroke="#624752" strokeWidth="3" fill="#FBF4E6" />
              <circle cx="32" cy="36" r="4" fill="#F1C75B" />
              <circle cx="46" cy="25" r="2.5" fill="#5B8266" />
            </svg>
          </div>
          <h3 className="photos-empty-heading">No photographs pinned yet</h3>
          <p className="photos-empty-text">
            Genuine photographs and memories will be arranged here like polaroids on an antique keepsake wall.
          </p>
        </div>
      </section>
    );
  }

  const currentPhoto = photoList[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalPhotos - 1;
  const washiColor = resolvePhotoWashiColor(currentPhoto.washiTapeColor, currentIndex);
  const altText = resolvePhotoAltText(currentPhoto, currentIndex);
  const headingText = resolvePhotoHeading(currentPhoto, currentIndex);
  const currentKey = getPhotoKey(currentPhoto, currentIndex);
  const hasError = imageErrors[currentKey] === true || !isValidMediaUrl(currentPhoto.url);

  return (
    <section
      ref={containerRef}
      className={`swipeable-photos-section ${className}`}
      aria-label="Photo Memories Carousel"
      aria-roledescription="carousel"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header section with kicker and live badge */}
      <div className="photos-header">
        <div className="photos-kicker-row">
          <span className="photos-kicker">PHOTO REEL · یادیں</span>
          <span className="photos-counter-pill" aria-live="polite">
            Photo {currentIndex + 1} of {totalPhotos}
          </span>
        </div>
        <h2 className="photos-title">{title}</h2>
        <p className="photos-subtitle">{subtitle}</p>
      </div>

      {/* Main carousel viewport */}
      <div className="photos-carousel-viewport">
        {/* Previous peek card (desktop context hint) */}
        {currentIndex > 0 && (() => {
          const prevPhoto = photoList[currentIndex - 1];
          const prevKey = getPhotoKey(prevPhoto, currentIndex - 1);
          const prevValid = isValidMediaUrl(prevPhoto.url) && !imageErrors[prevKey];
          return (
            <div
              className="photo-card-peek photo-card-peek-prev"
              onClick={goPrev}
              aria-hidden="true"
            >
              {prevValid ? (
                <img
                  src={prevPhoto.url}
                  alt=""
                  className="peek-thumbnail"
                  loading="lazy"
                  onError={() => handleImageError(prevKey)}
                />
              ) : (
                <div className="peek-thumbnail peek-thumbnail-fallback">✿</div>
              )}
            </div>
          );
        })()}

        {/* Active Polaroid Scrapbook Frame */}
        <div
          className="active-polaroid-container"
          style={{
            transform: `rotate(${currentPhoto.rotation ?? 0}deg)`,
          }}
        >
          {/* Washi Tape Accent */}
          <div
            className={`washi-tape washi-tape-${washiColor} washi-pos-center photo-card-tape`}
            aria-hidden="true"
          />

          <article
            className="polaroid-card"
            onClick={() => onSelectPhoto?.(currentPhoto, currentIndex)}
            role={onSelectPhoto ? "button" : undefined}
            tabIndex={onSelectPhoto ? 0 : undefined}
            onKeyDown={(e) => {
              if (onSelectPhoto && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onSelectPhoto(currentPhoto, currentIndex);
              }
            }}
            aria-label={
              onSelectPhoto
                ? `Photo ${currentIndex + 1}: ${headingText}. Click to enlarge.`
                : `Photo ${currentIndex + 1}: ${headingText}`
            }
          >
            {/* Image frame */}
            <div className="polaroid-image-frame">
              {!hasError ? (
                <img
                  src={currentPhoto.url}
                  alt={altText}
                  className="polaroid-image"
                  onError={() => handleImageError(currentKey)}
                  loading="eager"
                />
              ) : (
                <div className="polaroid-image-fallback" role="img" aria-label={altText}>
                  <span className="fallback-flower-icon" aria-hidden="true">✿</span>
                  <span className="fallback-title">Memory in our hearts</span>
                  <span className="fallback-sub">Keepsake photograph</span>
                </div>
              )}

              {onSelectPhoto && (
                <div className="polaroid-expand-badge" aria-hidden="true">
                  <span className="expand-icon">🔍</span>
                  <span className="expand-text">Enlarge</span>
                </div>
              )}
            </div>

            {/* Editorial Polaroid Chin / Narrative Area */}
            <div className="polaroid-chin">
              <div className="polaroid-header-row">
                <h3 className="polaroid-heading">{headingText}</h3>
                <span className="polaroid-index-badge">
                  NO. {String(currentIndex + 1).padStart(2, "0")}
                </span>
              </div>

              {currentPhoto.caption && (
                <p className="polaroid-caption">{currentPhoto.caption}</p>
              )}

              <div className="polaroid-meta-row">
                {currentPhoto.date && (
                  <span className="polaroid-date-stamp">
                    <span className="stamp-icon" aria-hidden="true">❦</span>
                    {currentPhoto.date}
                  </span>
                )}
                <span className="polaroid-tag-badge">
                  <span className="tag-flower" aria-hidden="true">✦</span>
                  Keepsake Album
                </span>
              </div>
            </div>
          </article>
        </div>

        {/* Next peek card (desktop context hint) */}
        {currentIndex < totalPhotos - 1 && (() => {
          const nextPhoto = photoList[currentIndex + 1];
          const nextKey = getPhotoKey(nextPhoto, currentIndex + 1);
          const nextValid = isValidMediaUrl(nextPhoto.url) && !imageErrors[nextKey];
          return (
            <div
              className="photo-card-peek photo-card-peek-next"
              onClick={goNext}
              aria-hidden="true"
            >
              {nextValid ? (
                <img
                  src={nextPhoto.url}
                  alt=""
                  className="peek-thumbnail"
                  loading="lazy"
                  onError={() => handleImageError(nextKey)}
                />
              ) : (
                <div className="peek-thumbnail peek-thumbnail-fallback">✿</div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Navigation Controls Row */}
      <div className="photos-controls-row">
        <button
          type="button"
          className="photos-nav-btn photos-nav-prev"
          onClick={goPrev}
          disabled={!wrap && isFirst}
          aria-label="Previous photo"
        >
          <span aria-hidden="true">←</span>
          <span className="nav-btn-text">Previous</span>
        </button>

        {/* Dot Pagination Controls */}
        <div
          className="photos-dots-group"
          role="group"
          aria-label="Select a photo memory"
        >
          {photoList.map((photo, i) => (
            <button
              key={photo.id || `photo-dot-${i}`}
              type="button"
              className={`photos-dot ${i === currentIndex ? "active" : ""}`}
              onClick={() => goTo(i)}
              aria-label={`Go to photo ${i + 1} of ${totalPhotos}: ${resolvePhotoHeading(photo, i)}`}
              aria-current={i === currentIndex ? "true" : undefined}
            />
          ))}
        </div>

        <button
          type="button"
          className="photos-nav-btn photos-nav-next"
          onClick={goNext}
          disabled={!wrap && isLast}
          aria-label="Next photo"
        >
          <span className="nav-btn-text">Next</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>

      {/* Touch swipe hint for touch screens */}
      <div className="photos-mobile-hint" aria-hidden="true">
        <span>← Swipe across the photo or use arrows to flip through moments →</span>
      </div>
    </section>
  );
}
