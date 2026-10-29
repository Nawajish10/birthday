"use client";

import React, { useState, useRef, useCallback, type JSX } from "react";
import "./swipeable-photo-cards.css";

/**
 * ============================================================================
 * Section 3: Swipeable Photo Cards — Types & Contracts
 * ============================================================================
 */

export interface SwipeablePhotoItem {
  id?: string;
  url: string;
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
 * Curated default photographs for Meerah's birthday album
 */
export const DEFAULT_PHOTOS: readonly SwipeablePhotoItem[] = [
  {
    id: "photo-1",
    url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=900&q=82",
    caption: "Sunlit celebrations and laughter that lit up the whole room · یادگار لمحہ",
    date: "October 2025",
    alt: "Meerah celebrating with birthday sparkles and golden ambient lighting",
    washiTapeColor: "gold",
    rotation: -1.2,
  },
  {
    id: "photo-2",
    url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=82",
    caption: "Golden fairy lights glowing into the twilight · جگمگاتے چراغ",
    date: "November 2025",
    alt: "Soft golden bokeh lights illuminating a calm evening celebration",
    washiTapeColor: "pink",
    rotation: 1.5,
  },
  {
    id: "photo-3",
    url: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=900&q=82",
    caption: "Quiet conversations and treasured smiles along the way.",
    date: "December 2025",
    alt: "A warm cozy tea moment captured with genuine smiles",
    washiTapeColor: "sage",
    rotation: -0.9,
  },
  {
    id: "photo-4",
    url: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=900&q=82",
    caption: "A birthday cake decorated with fresh petals and sweet wishes.",
    date: "October 2025",
    alt: "Handcrafted birthday cake with edible flower petals and candlelight",
    washiTapeColor: "gold",
    rotation: 1.4,
  },
  {
    id: "photo-5",
    url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=900&q=82",
    caption: "Melodies that stay in our hearts long after the song ends · سریلی یادیں",
    date: "January 2026",
    alt: "Vintage vinyl record and acoustic guitar in warm evening light",
    washiTapeColor: "pink",
    rotation: -1.4,
  },
  {
    id: "photo-6",
    url: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=900&q=82",
    caption: "A year of warmth, growth, and countless shared reasons to smile.",
    date: "March 2026",
    alt: "Joyful birthday memories with loved ones under fairy string lights",
    washiTapeColor: "sage",
    rotation: 0.8,
  },
] as const;

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
  return `Meerah's birthday memory photograph ${index + 1}`;
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
 * A responsive, image-led carousel of authentic polaroid-framed photos with washi tape accents.
 */
export function SwipeablePhotoCards({
  photos = DEFAULT_PHOTOS as SwipeablePhotoItem[],
  title = "Photographs from the Journey",
  subtitle = "Genuine snapshots, warm memories, and sunlit moments pinned into your keepsake.",
  onSelectPhoto,
  loading = false,
  className = "",
  initialIndex = 0,
  wrap = false,
}: SwipeablePhotoCardsProps): JSX.Element {
  const photoList = Array.isArray(photos) ? photos : [];
  const totalPhotos = photoList.length;

  const [currentIndex, setCurrentIndex] = useState<number>(() =>
    clampPhotoIndex(initialIndex, totalPhotos)
  );
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

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

  const handleImageError = (index: number) => {
    setImageErrors((prev) => ({ ...prev, [index]: true }));
  };

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
  const hasError = imageErrors[currentIndex] === true;

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
      {/* Header section with badge */}
      <div className="photos-header">
        <div className="photos-kicker-row">
          <span className="photos-kicker">PHOTO REEL · یادیں</span>
          <span className="photos-counter-pill" aria-live="polite">
            {currentIndex + 1} of {totalPhotos}
          </span>
        </div>
        <h2 className="photos-title">{title}</h2>
        <p className="photos-subtitle">{subtitle}</p>
      </div>

      {/* Main carousel viewport */}
      <div className="photos-carousel-viewport">
        {/* Previous peek card (desktop/tablet hint) */}
        {currentIndex > 0 && (
          <div
            className="photo-card-peek photo-card-peek-prev"
            onClick={goPrev}
            aria-hidden="true"
          >
            <img
              src={photoList[currentIndex - 1].url}
              alt=""
              className="peek-thumbnail"
              loading="lazy"
            />
          </div>
        )}

        {/* Active Polaroid Frame */}
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
                ? `Photo ${currentIndex + 1}: ${currentPhoto.caption || altText}. Click to enlarge.`
                : `Photo ${currentIndex + 1}: ${currentPhoto.caption || altText}`
            }
          >
            {/* Image frame */}
            <div className="polaroid-image-frame">
              {!hasError ? (
                <img
                  src={currentPhoto.url}
                  alt={altText}
                  className="polaroid-image"
                  onError={() => handleImageError(currentIndex)}
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

            {/* Polaroid Chin / Caption Area */}
            <div className="polaroid-chin">
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
                <span className="polaroid-index-badge">
                  NO. {String(currentIndex + 1).padStart(2, "0")}
                </span>
              </div>
            </div>
          </article>
        </div>

        {/* Next peek card (desktop/tablet hint) */}
        {currentIndex < totalPhotos - 1 && (
          <div
            className="photo-card-peek photo-card-peek-next"
            onClick={goNext}
            aria-hidden="true"
          >
            <img
              src={photoList[currentIndex + 1].url}
              alt=""
              className="peek-thumbnail"
              loading="lazy"
            />
          </div>
        )}
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
              aria-label={`Go to photo ${i + 1} of ${totalPhotos}`}
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
        <span>← Swipe across the photo to flip through moments →</span>
      </div>
    </section>
  );
}
