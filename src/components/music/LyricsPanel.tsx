"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { fetchLyrics } from "@/lib/music/api-client";
import type { LyricsData, TimedLyricLine } from "@/lib/music/types";

export interface LyricsPanelProps {
  trackId: string | null;
  trackTitle?: string;
  trackArtist?: string;
  currentTime: number; // Current playback position in seconds
  isOpen: boolean;
  onClose: () => void;
  onSeek?: (seconds: number) => void;
}

export function LyricsPanel({
  trackId,
  trackTitle,
  trackArtist,
  currentTime,
  isOpen,
  onClose,
  onSeek,
}: LyricsPanelProps): React.JSX.Element | null {
  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Track the active line to scroll only when it actually changes
  const prevActiveIndexRef = useRef<number>(-1);

  // Fetch lyrics whenever trackId changes or panel opens
  useEffect(() => {
    if (!isOpen || !trackId) return;

    let isCancelled = false;
    fetchLyrics(trackId)
      .then((data) => {
        if (!isCancelled) {
          setLyricsData(data);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : "Failed to load lyrics");
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [trackId, isOpen]);

  // Keyboard navigation: Escape key closes panel
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Determine active lyric line index based on current playback timestamp (ms)
  const activeLineIndex = useMemo(() => {
    if (!lyricsData?.timed_json || lyricsData.timed_json.length === 0) {
      return -1;
    }

    const currentMs = Math.max(0, currentTime * 1000);
    const lines = lyricsData.timed_json;

    // First try exact window: startMs <= currentMs < endMs
    const exactIdx = lines.findIndex(
      (line) => currentMs >= line.startMs && currentMs < line.endMs
    );
    if (exactIdx !== -1) return exactIdx;

    // Fallback: find the last line that has already started
    for (let i = lines.length - 1; i >= 0; i--) {
      if (currentMs >= lines[i].startMs) {
        return i;
      }
    }

    return -1;
  }, [currentTime, lyricsData]);

  // Auto-scroll to active line smoothly when active line changes
  useEffect(() => {
    if (!isOpen || activeLineIndex === -1) return;

    if (activeLineIndex !== prevActiveIndexRef.current) {
      prevActiveIndexRef.current = activeLineIndex;

      const activeEl = lineRefs.current[activeLineIndex];
      if (activeEl && containerRef.current) {
        activeEl.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [activeLineIndex, isOpen]);

  if (!isOpen) return null;

  const hasTimedLyrics = Boolean(
    lyricsData?.timed_json && lyricsData.timed_json.length > 0
  );
  const hasPlainTextLyrics = Boolean(
    lyricsData?.plain_text && lyricsData.plain_text.trim().length > 0
  );

  return (
    <aside
      className="music-lyrics-panel"
      role="region"
      aria-label="Synchronized song lyrics"
    >
      {/* Floral Header */}
      <div className="music-lyrics-header">
        <div className="music-lyrics-titles">
          <span className="music-lyrics-kicker">✿ LYRICS ✿</span>
          <h3 className="music-lyrics-track-title">{trackTitle || "Now Playing"}</h3>
          {trackArtist && (
            <p className="music-lyrics-track-artist">{trackArtist}</p>
          )}
        </div>
        <button
          type="button"
          className="music-lyrics-close-btn"
          onClick={onClose}
          aria-label="Close lyrics panel"
          title="Close lyrics"
        >
          ×
        </button>
      </div>

      {/* Main Lyrics Body */}
      <div
        ref={containerRef}
        className="music-lyrics-content"
        tabIndex={0}
        aria-live="polite"
      >
        {isLoading && (
          <div className="music-lyrics-loading" role="status">
            <span className="music-lyrics-spinner" aria-hidden="true">♫</span>
            <p>Gathering romantic verses…</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="music-lyrics-error" role="alert">
            <span aria-hidden="true">✿</span>
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && hasTimedLyrics && (
          <div className="music-timed-lyrics-list">
            {lyricsData!.timed_json!.map((line: TimedLyricLine, index: number) => {
              const isActive = index === activeLineIndex;
              const isPast = activeLineIndex !== -1 && index < activeLineIndex;

              return (
                <div
                  key={`${line.startMs}-${index}`}
                  ref={(el) => {
                    lineRefs.current[index] = el;
                  }}
                  className={`music-lyric-line ${isActive ? "is-active" : ""} ${
                    isPast ? "is-past" : ""
                  }`}
                  onClick={() => onSeek && onSeek(line.startMs / 1000)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (onSeek) onSeek(line.startMs / 1000);
                    }
                  }}
                  title="Click to jump playback here"
                  aria-current={isActive ? "true" : undefined}
                >
                  <span className="music-lyric-text">{line.text || "♪"}</span>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && !error && !hasTimedLyrics && hasPlainTextLyrics && (
          <div className="music-plain-lyrics-body">
            <pre className="music-plain-lyrics-text">{lyricsData!.plain_text}</pre>
          </div>
        )}

        {!isLoading && !error && !hasTimedLyrics && !hasPlainTextLyrics && (
          <div className="music-lyrics-empty">
            <span className="music-lyrics-empty-flower" aria-hidden="true">✿</span>
            <h4 className="music-lyrics-empty-title">
              No lyrics available for this track yet ✿
            </h4>
            <p className="music-lyrics-empty-desc">
              Sing along from your heart, or hum the melody together in the starlight.
            </p>
          </div>
        )}
      </div>

      {/* Attribution footer if available */}
      {lyricsData?.source_attribution && (
        <div className="music-lyrics-footer">
          <small className="music-lyrics-attribution">
            Lyrics provided via {lyricsData.source_attribution}
          </small>
        </div>
      )}
    </aside>
  );
}
