"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { StoryItem } from "../../types/media-contracts.ts";
import {
  DEFAULT_SLIDE_DURATION_MS,
  HOLD_THRESHOLD_MS,
  TAP_SPLIT_RATIO,
  calculateSegmentProgress,
  calculateTickElapsed,
  formatCaptureDate,
  captureAudioState,
  playStoryAudio,
  pauseStoryAudio,
  resumeStoryAudio,
  restoreAudioState,
  setStoryAudioMuted,
  type PreviousAudioState,
} from "./story-helpers.ts";
import "./stories.css";
export { StoryBuilderModal } from "./StoryBuilderModal.tsx";

export interface StoryViewerProps {
  story: StoryItem;
  isOpen: boolean;
  onClose: () => void;
  externalAudioRef?: React.RefObject<HTMLAudioElement | null>;
  loop?: boolean;
  slideDurationMs?: number;
  initialSlideIndex?: number;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({
  story,
  isOpen,
  onClose,
  externalAudioRef,
  loop = false,
  slideDurationMs = DEFAULT_SLIDE_DURATION_MS,
  initialSlideIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(initialSlideIndex);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Audio restoration tracker
  const priorAudioStateRef = useRef<PreviousAudioState | null>(null);

  // Hold pointer tracking
  const holdStartTimestampRef = useRef<number>(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const photos = story.photos && story.photos.length > 0 ? story.photos : [];
  const totalSlides = photos.length;
  const currentPhoto = photos[currentIndex];

  // Navigation handlers
  const handleNextSlide = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev + 1 < totalSlides) {
        setElapsedMs(0);
        return prev + 1;
      }
      if (loop) {
        setElapsedMs(0);
        return 0;
      }
      onClose();
      return prev;
    });
  }, [totalSlides, loop, onClose]);

  const handlePrevSlide = useCallback(() => {
    setCurrentIndex((prev) => {
      setElapsedMs(0);
      if (prev > 0) return prev - 1;
      if (loop) return Math.max(0, totalSlides - 1);
      return 0;
    });
  }, [totalSlides, loop]);

  // Audio coordination effect: starts background music on open, restores prior audio on close
  useEffect(() => {
    if (!isOpen) return;

    const audioEl = externalAudioRef?.current || null;
    if (audioEl) {
      priorAudioStateRef.current = captureAudioState(audioEl);

      if (story.musicTrack && story.musicTrack.audioUrl) {
        playStoryAudio(audioEl, story.musicTrack).catch(() => {
          // Unhandled browser policy - story remains 100% usable
        });
      }
    }

    return () => {
      if (audioEl) {
        restoreAudioState(audioEl, priorAudioStateRef.current);
      }
    };
  }, [isOpen, story.id, story.musicTrack, externalAudioRef]);

  // Handle Mute toggle
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (externalAudioRef?.current) {
      setStoryAudioMuted(externalAudioRef.current, nextMuted);
    }
  };

  // Keyboard navigation (Escape, ArrowLeft, ArrowRight, Space)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNextSlide();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevSlide();
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPaused((p) => {
          const next = !p;
          if (next) {
            pauseStoryAudio(externalAudioRef?.current || null);
          } else {
            resumeStoryAudio(externalAudioRef?.current || null);
          }
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handleNextSlide, handlePrevSlide, externalAudioRef]);

  // Playback timer tick
  useEffect(() => {
    if (!isOpen || isPaused || isHolding || totalSlides === 0) return;

    const TICK_INTERVAL_MS = 50;
    const interval = setInterval(() => {
      setElapsedMs((prev) => {
        const { nextElapsed, shouldAdvance } = calculateTickElapsed(
          prev,
          TICK_INTERVAL_MS,
          false,
          slideDurationMs
        );
        if (shouldAdvance) {
          handleNextSlide();
          return 0;
        }
        return nextElapsed;
      });
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isOpen, isPaused, isHolding, totalSlides, slideDurationMs, handleNextSlide]);

  // Pointer interactions (tap navigation vs hold-to-pause)
  const handlePointerDown = () => {
    holdStartTimestampRef.current = Date.now();
    holdTimerRef.current = setTimeout(() => {
      setIsHolding(true);
      pauseStoryAudio(externalAudioRef?.current || null);
    }, HOLD_THRESHOLD_MS);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    const durationHeld = Date.now() - holdStartTimestampRef.current;

    if (durationHeld >= HOLD_THRESHOLD_MS || isHolding) {
      // It was a long press hold -> resume playback
      setIsHolding(false);
      if (!isPaused) {
        resumeStoryAudio(externalAudioRef?.current || null);
      }
    } else {
      // It was a quick tap -> navigate based on X coordinate ratio
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const tapXRatio = (e.clientX - rect.left) / rect.width;
        if (tapXRatio < TAP_SPLIT_RATIO) {
          handlePrevSlide();
        } else {
          handleNextSlide();
        }
      } else {
        handleNextSlide();
      }
    }
  };

  const handlePointerCancel = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (isHolding) {
      setIsHolding(false);
      if (!isPaused) {
        resumeStoryAudio(externalAudioRef?.current || null);
      }
    }
  };

  if (!isOpen || totalSlides === 0) return null;

  return (
    <div
      className="storyViewerOverlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Story: ${story.title}`}
    >
      <div
        className="storyViewerFrame"
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerCancel}
      >
        {/* Top Segmented Progress Bar */}
        <div className="storyProgressContainer" aria-label="Story Progress">
          {photos.map((photo, idx) => {
            const segPct = calculateSegmentProgress(
              idx,
              currentIndex,
              elapsedMs,
              slideDurationMs
            );
            return (
              <div key={photo.id || idx} className="storyProgressSegment">
                <div
                  className="storyProgressFill"
                  style={{ width: `${segPct}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Story Header */}
        <header className="storyHeader">
          <div className="storyHeaderMeta">
            <div className="storyHeaderAvatar" aria-hidden="true">
              ✿
            </div>
            <div>
              <h2 className="storyHeaderTitle">{story.title}</h2>
              <p className="storyHeaderSubtitle">
                Slide {currentIndex + 1} of {totalSlides}
              </p>
            </div>
          </div>

          <div
            className="storyHeaderActions"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
          >
            {/* Audio Mute/Unmute */}
            {story.musicTrack && (
              <button
                type="button"
                className="storyIconButton"
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute story music" : "Mute story music"}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? "🔇" : "🔊"}
              </button>
            )}

            {/* Pause / Resume button */}
            <button
              type="button"
              className="storyIconButton"
              onClick={() => {
                setIsPaused((prev) => {
                  const next = !prev;
                  if (next) {
                    pauseStoryAudio(externalAudioRef?.current || null);
                  } else {
                    resumeStoryAudio(externalAudioRef?.current || null);
                  }
                  return next;
                });
              }}
              aria-label={isPaused ? "Play story" : "Pause story"}
              title={isPaused ? "Play" : "Pause"}
            >
              {isPaused ? "▶" : "⏸"}
            </button>

            {/* Close Story */}
            <button
              type="button"
              className="storyIconButton"
              onClick={onClose}
              aria-label="Close story"
              title="Close"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Visual Content Slide */}
        <div className="storySlideArea">
          {currentPhoto && (
            <img
              src={currentPhoto.url}
              alt={
                currentPhoto.altText ||
                currentPhoto.caption ||
                `Slide ${currentIndex + 1} of ${story.title}`
              }
              className="storySlideImage"
              draggable={false}
              decoding="async"
            />
          )}

          {/* Pause / Hold Indicator */}
          {(isPaused || isHolding) && (
            <div className="storyPauseOverlay">
              {isHolding ? "Holding · Paused" : "Paused"}
            </div>
          )}
        </div>

        {/* Bottom Banner & Caption */}
        <footer className="storyFooter">
          {story.musicTrack && (
            <div className="storyMusicBanner" aria-label="Background music">
              <span aria-hidden="true">🎵</span>
              <span>
                {story.musicTrack.title} · {story.musicTrack.artist}
              </span>
            </div>
          )}

          <div className="storyCaptionCard">
            {currentPhoto?.caption && (
              <p className="storyCaptionText">{currentPhoto.caption}</p>
            )}
            {currentPhoto?.hasKnownCaptureDate && currentPhoto?.effectiveCaptureDate && (
              <p className="storyCaptureDate">
                <span aria-hidden="true">🗓</span>
                <span>
                  Captured on{" "}
                  {formatCaptureDate(currentPhoto.effectiveCaptureDate)}
                </span>
              </p>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};
