"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import type { JSX, MouseEvent } from "react";
import "./video.css";

export interface VideoSubtitleCue {
  start: number;
  end: number;
  text: string;
}

export interface VideoPanelProps {
  videoUrl?: string;
  title?: string;
  description?: string;
  posterUrl?: string;
  onClose?: () => void;
  isModal?: boolean;
  captionsUrl?: string;
  subtitles?: VideoSubtitleCue[];
}

export const DEFAULT_VIDEO_TITLE = "A Year of Magic & Memories";
export const DEFAULT_VIDEO_URDU_TITLE = "ہماری یادوں کی جھلک";
export const EXPECTED_CINEMA_TITLE = "Birthday Video for Meerah · ہماری یادوں کی جھلک";
export const DEFAULT_VIDEO_DESCRIPTION =
  "A hand-curated reel of heartfelt smiles, laughter, quiet milestones, and cherished memories celebrating Meerah's special birthday.";
export const DEFAULT_PLACEHOLDER_NOTE =
  "The creator is editing the final reel of moments to cherish. Add your birthday video in the creator studio or check back soon!";
export const DEFAULT_PLACEHOLDER_NOTE_URDU =
  "تخلیق کار یادگار لمحات کی حتمی ریل تیار کر رہے ہیں۔ تخلیق کار اسٹوڈیو میں اپنی ویڈیو شامل کریں یا جلد دوبارہ دیکھیں۔";

export const SAMPLE_PREVIEW_VIDEO_URL =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

export const DEFAULT_SUBTITLES: VideoSubtitleCue[] = [
  { start: 0, end: 4, text: "Happy Birthday Meerah! 🎂✨" },
  { start: 4, end: 8, text: "A year of warmth, laughter, and unforgettable moments · سالگرہ مبارک" },
  { start: 8, end: 12, text: "Every snapshot holds a quiet blessing and joy." },
  { start: 12, end: 16, text: "May your coming year be filled with wonder and love ♡" },
];

/**
 * State resolution helper for video destination logic & tests
 */
export function resolveVideoDestinationState(options: {
  videoUrl?: string;
  isPreviewMode?: boolean;
  hasVideoError?: boolean;
}): {
  hasPlayableSource: boolean;
  activeUrl: string | null;
  showCinemaCard: boolean;
} {
  const resolved =
    options.videoUrl && options.videoUrl.trim().length > 0 ? options.videoUrl.trim() : null;
  const isPreview = Boolean(options.isPreviewMode);
  const hasError = Boolean(options.hasVideoError);
  const activeUrl = isPreview ? SAMPLE_PREVIEW_VIDEO_URL : resolved;
  const hasPlayableSource = Boolean(activeUrl) && !hasError;
  return {
    hasPlayableSource,
    activeUrl,
    showCinemaCard: !hasPlayableSource,
  };
}

/**
 * Film Reel and Cinema Projector SVG Illustration
 */
export function CinemaProjectorIllustration(): JSX.Element {
  return (
    <svg
      className="cinema-projector-illustration"
      viewBox="0 0 160 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Vintage cinema projector and spinning film reels illustration"
    >
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE8A5" />
          <stop offset="50%" stopColor="#F1C75B" />
          <stop offset="100%" stopColor="#C69325" />
        </linearGradient>
        <linearGradient id="beamGradient" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#F1C75B" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#FBF4E6" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Projector Light Beam */}
      <polygon points="105,75 155,40 155,110 105,85" fill="url(#beamGradient)" />

      {/* Floating Sparkle Stars in Beam */}
      <circle cx="125" cy="65" r="2.5" fill="#F1C75B" />
      <circle cx="140" cy="55" r="1.5" fill="#FDE8A5" />
      <circle cx="135" cy="85" r="2" fill="#F1C75B" />
      <circle cx="148" cy="75" r="1.5" fill="#FFFFFF" />

      {/* Projector Body */}
      <rect
        x="45"
        y="60"
        width="60"
        height="45"
        rx="6"
        fill="#3D2B33"
        stroke="#C69325"
        strokeWidth="2.5"
      />
      <rect x="52" y="68" width="46" height="28" rx="3" fill="#24181E" />
      <line x1="56" y1="75" x2="94" y2="75" stroke="#C69325" strokeWidth="1" strokeDasharray="2 2" />
      <line x1="56" y1="82" x2="94" y2="82" stroke="#C69325" strokeWidth="1" strokeDasharray="2 2" />
      <line x1="56" y1="89" x2="94" y2="89" stroke="#C69325" strokeWidth="1" strokeDasharray="2 2" />

      {/* Projector Lens Barrel */}
      <path
        d="M105 72 L116 68 L116 92 L105 88 Z"
        fill="#C69325"
        stroke="#3D2B33"
        strokeWidth="1.5"
      />
      <rect x="116" y="66" width="4" height="28" rx="1.5" fill="#F1C75B" />

      {/* Film Reel Left */}
      <circle cx="48" cy="38" r="24" fill="#3D2B33" stroke="url(#goldGradient)" strokeWidth="3" />
      <circle cx="48" cy="38" r="8" fill="#F1C75B" />
      <circle cx="48" cy="38" r="3" fill="#3D2B33" />
      <circle cx="48" cy="22" r="3.5" fill="#FBF4E6" />
      <circle cx="48" cy="54" r="3.5" fill="#FBF4E6" />
      <circle cx="32" cy="38" r="3.5" fill="#FBF4E6" />
      <circle cx="64" cy="38" r="3.5" fill="#FBF4E6" />

      {/* Film Reel Right */}
      <circle cx="92" cy="35" r="22" fill="#3D2B33" stroke="url(#goldGradient)" strokeWidth="3" />
      <circle cx="92" cy="35" r="7" fill="#F1C75B" />
      <circle cx="92" cy="35" r="2.5" fill="#3D2B33" />
      <circle cx="92" cy="21" r="3" fill="#FBF4E6" />
      <circle cx="92" cy="49" r="3" fill="#FBF4E6" />
      <circle cx="78" cy="35" r="3" fill="#FBF4E6" />
      <circle cx="106" cy="35" r="3" fill="#FBF4E6" />

      {/* Film Ribbon threading through */}
      <path
        d="M48 62 C 60 55, 75 58, 92 57"
        stroke="#F1C75B"
        strokeWidth="3.5"
        strokeDasharray="4 2"
        fill="none"
      />

      {/* Projector Tripod Stand */}
      <path
        d="M75 105 L52 135 M75 105 L75 136 M75 105 L98 135"
        stroke="#624752"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Filmstrip Sprocket Holes Border Row
 */
export function FilmstripSprockets({ isBottom = false }: { isBottom?: boolean }): JSX.Element {
  const holes = Array.from({ length: 16 });
  return (
    <div
      className={`filmstrip-sprockets ${isBottom ? "filmstrip-sprockets-bottom" : ""}`}
      aria-hidden="true"
    >
      {holes.map((_, i) => (
        <span key={i} className="sprocket-hole" />
      ))}
    </div>
  );
}

export function VideoPanel({
  videoUrl,
  title = DEFAULT_VIDEO_TITLE,
  description = DEFAULT_VIDEO_DESCRIPTION,
  posterUrl,
  onClose,
  isModal = false,
  captionsUrl,
  subtitles = DEFAULT_SUBTITLES,
}: VideoPanelProps): JSX.Element {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hasStartedPlayback, setHasStartedPlayback] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<boolean>(false);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [currentCaption, setCurrentCaption] = useState<string>(
    subtitles?.[0]?.text || "Happy Birthday Meerah! 🎂✨"
  );

  // Active video source: user prop, or sample video if user initiated preview mode
  const resolvedUrl = (videoUrl && videoUrl.trim().length > 0) ? videoUrl.trim() : null;
  const activeVideoUrl = isPreviewMode ? SAMPLE_PREVIEW_VIDEO_URL : resolvedUrl;
  const hasPlayableSource = Boolean(activeVideoUrl) && !videoError;

  // Handle explicit gesture playback
  const handleTriggerPlayGesture = useCallback(() => {
    if (videoRef.current) {
      setHasStartedPlayback(true);
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Explicit playback caught (e.g. user blocked or codec issue)
        });
    }
  }, []);

  // Update caption track on timeupdate
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current || !subtitles || subtitles.length === 0) return;
    const currentSeconds = videoRef.current.currentTime;
    const activeCue = subtitles.find(
      (cue) => currentSeconds >= cue.start && currentSeconds < cue.end
    );
    if (activeCue && activeCue.text !== currentCaption) {
      setCurrentCaption(activeCue.text);
    }
  }, [subtitles, currentCaption]);

  // Modal escape key listener
  useEffect(() => {
    if (!onClose) return;

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Toggle preview mode for creator placeholder testing
  const handleTogglePreview = () => {
    setVideoError(false);
    setIsPreviewMode((prev) => !prev);
    setHasStartedPlayback(false);
    setIsPlaying(false);
  };

  const content = (
    <div
      className="video-destination-card"
      role="region"
      aria-label="Birthday Video Destination"
    >
      {/* Scrapbook Washi Tape Accents */}
      <div className="video-washi-tape video-washi-tape-gold video-washi-tape-top-left" aria-hidden="true" />
      <div className="video-washi-tape video-washi-tape-pink video-washi-tape-top-right" aria-hidden="true" />

      {/* Modal Close Button */}
      {onClose && (
        <button
          type="button"
          className="video-modal-close-button"
          onClick={onClose}
          aria-label="Close video"
          title="Close video"
        >
          ×
        </button>
      )}

      {/* Header Info */}
      <header className="video-destination-header">
        <div className="video-kicker-badge">
          <span>🎬</span>
          <span>Celebration Reel · ویڈیو</span>
        </div>
        <h2 id="video-destination-title" className="video-destination-title">
          {title}
        </h2>
        <span className="video-destination-subtitle-urdu">{DEFAULT_VIDEO_URDU_TITLE}</span>
        {description && (
          <p className="video-destination-description">{description}</p>
        )}
      </header>

      {/* Video Display or Graceful Missing State */}
      {hasPlayableSource ? (
        <div className="video-cinema-viewport-wrapper">
          <div className="antique-gold-frame">
            {/* Top Filmstrip Sprockets */}
            <FilmstripSprockets isBottom={false} />

            {/* Video Player Canvas */}
            <div className="video-aspect-container">
              {/* HTML5 Native Video: Strict Zero Autoplay, Controls Enabled */}
              <video
                ref={videoRef}
                className="video-native-element"
                controls
                playsInline
                preload="metadata"
                poster={posterUrl}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onError={() => setVideoError(true)}
                onTimeUpdate={handleTimeUpdate}
                aria-label={title || "Birthday video player"}
              >
                <source src={activeVideoUrl!} type="video/mp4" />
                {captionsUrl && (
                  <track
                    kind="captions"
                    label="English"
                    src={captionsUrl}
                    srcLang="en"
                    default
                  />
                )}
                Your browser does not support the video tag.
              </video>

              {/* Initial Play Gesture Overlay: explicit user interaction required */}
              {!hasStartedPlayback && !isPlaying && (
                <div
                  className="video-gesture-play-overlay"
                  onClick={handleTriggerPlayGesture}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleTriggerPlayGesture();
                    }
                  }}
                  aria-label="Play birthday video"
                >
                  <div className="gesture-play-button-circle">
                    <span className="gesture-play-triangle" />
                  </div>
                  <span className="gesture-play-label">Play Birthday Reel ▶</span>
                </div>
              )}
            </div>

            {/* Bottom Filmstrip Sprockets */}
            <FilmstripSprockets isBottom={true} />
          </div>

          {/* Subtitle Captions Indicator */}
          <div className="video-subtitles-banner" role="status" aria-live="polite">
            <span className="video-caption-indicator">💬 Subtitles:</span>
            <span className="video-subtitles-text">{currentCaption}</span>
          </div>
        </div>
      ) : (
        /* Graceful Missing Video / Scrapbook Cinema Card */
        <div className="scrapbook-cinema-card" role="status" aria-label="Cinema placeholder note">
          <CinemaProjectorIllustration />

          <h3 className="cinema-placeholder-title">
            {EXPECTED_CINEMA_TITLE}
          </h3>

          <div className="cinema-placeholder-note">
            <p style={{ margin: 0 }}>{DEFAULT_PLACEHOLDER_NOTE}</p>
            <span className="cinema-placeholder-note-urdu">
              {DEFAULT_PLACEHOLDER_NOTE_URDU}
            </span>
          </div>

          <div className="video-action-row">
            <button
              type="button"
              className="video-btn-primary"
              onClick={handleTogglePreview}
              aria-label="Preview sample celebration reel"
            >
              <span>✨</span>
              <span>Preview Sample Celebration Reel</span>
            </button>
            {onClose && (
              <button
                type="button"
                className="video-btn-secondary"
                onClick={onClose}
                aria-label="Return to Scrapbook"
              >
                Return to Scrapbook
              </button>
            )}
          </div>
        </div>
      )}

      {/* Preview Mode Notice & Toggle */}
      {isPreviewMode && (
        <div
          style={{
            margin: "1rem auto 0 auto",
            textAlign: "center",
            fontSize: "0.85rem",
            color: "var(--video-plum)",
          }}
        >
          <span>Showing sample preview reel. </span>
          <button
            type="button"
            className="video-btn-secondary"
            onClick={handleTogglePreview}
            style={{ padding: "0.3rem 0.8rem", fontSize: "0.8rem" }}
          >
            Back to Cinema Note
          </button>
        </div>
      )}

      {/* Footer Details */}
      <footer className="video-destination-footer">
        <div className="video-guarantee-badge">
          <span>🛡️</span>
          <span>Zero Autoplay · Audio requires explicit tap</span>
        </div>
        <div style={{ fontStyle: "italic", opacity: 0.85 }}>
          Meerah&apos;s Birthday Keepsake Collection ♡
        </div>
      </footer>
    </div>
  );

  // If rendered as a modal, wrap with fixed overlay and backdrop click handler
  if (isModal) {
    return (
      <div
        className="video-destination-modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-destination-title"
        onClick={(e: MouseEvent<HTMLDivElement>) => {
          if (e.target === e.currentTarget && onClose) {
            onClose();
          }
        }}
      >
        {content}
      </div>
    );
  }

  // Standalone section mode
  return <div className="video-destination-standalone">{content}</div>;
}

export default VideoPanel;
