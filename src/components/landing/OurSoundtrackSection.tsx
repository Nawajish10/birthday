"use client";

import React, { type JSX } from "react";
import "./our-soundtrack.css";

export const DEFAULT_SOUNDTRACK_HEADING = "Our soundtrack.";
export const DEFAULT_SOUNDTRACK_SUPPORTING = "Some feelings are easier to share through a song.";
export const DEFAULT_SOUNDTRACK_KICKER = "Shared Melodies · ہمارے گیت";

export interface SoundtrackTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration_seconds?: number | null;
  isUnavailable?: boolean;
}

export interface OurSoundtrackSectionProps {
  heading?: string;
  supportingText?: string;
  tracks: SoundtrackTrack[];
  activeTrack: SoundtrackTrack | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPlayTrack: (track: SoundtrackTrack) => void;
  onOpenSongbook: () => void;
  loading?: boolean;
  error?: string | null;
  personalNote?: string;
  className?: string;
}

/**
 * Formats duration seconds into mm:ss display
 */
export function formatTrackDuration(seconds?: number | null): string {
  if (typeof seconds !== "number" || isNaN(seconds) || seconds <= 0) {
    return "3:24";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function OurSoundtrackSection({
  heading = DEFAULT_SOUNDTRACK_HEADING,
  supportingText = DEFAULT_SOUNDTRACK_SUPPORTING,
  tracks = [],
  activeTrack = null,
  isPlaying = false,
  onTogglePlay,
  onPlayTrack,
  onOpenSongbook,
  loading = false,
  error = null,
  personalNote = "Every track holds a memory we've shared together...",
  className = "",
}: OurSoundtrackSectionProps): JSX.Element {
  const hasTracks = Array.isArray(tracks) && tracks.length > 0;
  const currentTrack = activeTrack ?? (hasTracks ? tracks[0] : null);

  const activeIndex = hasTracks && currentTrack
    ? tracks.findIndex((t) => t.id === currentTrack.id)
    : -1;

  const handlePrevTrack = () => {
    if (!hasTracks) return;
    const prevIdx = activeIndex > 0 ? activeIndex - 1 : tracks.length - 1;
    onPlayTrack(tracks[prevIdx]);
  };

  const handleNextTrack = () => {
    if (!hasTracks) return;
    const nextIdx = activeIndex < tracks.length - 1 ? activeIndex + 1 : 0;
    onPlayTrack(tracks[nextIdx]);
  };

  return (
    <section
      className={`soundtrack-section ${className}`.trim()}
      aria-labelledby="soundtrack-heading"
    >
      {/* Header */}
      <div className="soundtrack-header">
        <span className="soundtrack-kicker">{DEFAULT_SOUNDTRACK_KICKER}</span>
        <h2 id="soundtrack-heading" className="soundtrack-heading">
          {heading}
        </h2>
        <p className="soundtrack-supporting">{supportingText}</p>
      </div>

      {/* Main Card */}
      <div
        className={`soundtrack-card ${isPlaying ? "is-playing" : "is-paused"} ${
          loading ? "is-loading" : ""
        } ${error ? "has-error" : ""} ${!hasTracks && !loading && !error ? "is-empty" : ""}`}
      >
        {/* Decorative Washi Tapes */}
        <div
          className="washi-tape washi-tape-pink washi-tape-top-left"
          aria-hidden="true"
        />
        <div
          className="washi-tape washi-tape-sage washi-tape-top-right"
          aria-hidden="true"
        />

        {/* =================================================================
            1. Loading State
            ================================================================= */}
        {loading && (
          <div className="soundtrack-state-wrapper" aria-live="polite">
            <div className="soundtrack-pulse-disc" aria-hidden="true">
              <span>♫</span>
            </div>
            <h3 className="soundtrack-state-title">Tuning our frequencies...</h3>
            <p className="soundtrack-state-desc">
              Gathering our favorite melodies and setting the vinyl on the turntable.
            </p>
          </div>
        )}

        {/* =================================================================
            2. Error State
            ================================================================= */}
        {!loading && error && (
          <div className="soundtrack-state-wrapper" role="alert">
            <div className="soundtrack-pulse-disc" aria-hidden="true">
              <span>⚠</span>
            </div>
            <h3 className="soundtrack-state-title">Soundtrack Temporarily Offline</h3>
            <p className="soundtrack-state-desc">
              {error || "We could not load the playlist right now."}
            </p>
            <button
              type="button"
              className="soundtrack-state-btn"
              onClick={onOpenSongbook}
              aria-label="Open songbook library"
            >
              Browse songbook library ♫
            </button>
          </div>
        )}

        {/* =================================================================
            3. Empty State
            ================================================================= */}
        {!loading && !error && !hasTracks && (
          <div className="soundtrack-state-wrapper">
            <div className="soundtrack-pulse-disc" aria-hidden="true">
              <span>🌻</span>
            </div>
            <h3 className="soundtrack-state-title">
              The songbook is waiting for our soundtrack...
            </h3>
            <p className="soundtrack-state-desc">{personalNote}</p>
            <button
              type="button"
              className="soundtrack-state-btn"
              onClick={onOpenSongbook}
              aria-label="Open full songbook to select and play music"
            >
              Open full songbook ♫
            </button>
          </div>
        )}

        {/* =================================================================
            4. Normal Player State (reusing parent audio engine, NO audio tag)
            ================================================================= */}
        {!loading && !error && hasTracks && currentTrack && (
          <>
            <div className="soundtrack-player-layout">
              {/* Vinyl Turntable Display */}
              <div className="soundtrack-turntable" aria-hidden="true">
                <div className="soundtrack-vinyl">
                  <div className="soundtrack-vinyl-groove g1" />
                  <div className="soundtrack-vinyl-groove g2" />
                  <div className="soundtrack-vinyl-groove g3" />
                  <div className="soundtrack-vinyl-label">
                    <div className="soundtrack-vinyl-center-hole" />
                  </div>
                </div>

                {/* Tonearm Needle */}
                <div className="soundtrack-tonearm">
                  <div className="soundtrack-tonearm-base" />
                  <div className="soundtrack-tonearm-rod" />
                  <div className="soundtrack-tonearm-head" />
                </div>
              </div>

              {/* Player Metadata & Controls */}
              <div className="soundtrack-info-controls">
                <div className="soundtrack-badge-row">
                  <span className="soundtrack-status-badge">
                    {isPlaying ? "NOW PLAYING" : "PAUSED"}
                  </span>
                  <div className="soundtrack-soundwave" aria-hidden="true">
                    <span className="soundtrack-soundwave-bar" />
                    <span className="soundtrack-soundwave-bar" />
                    <span className="soundtrack-soundwave-bar" />
                    <span className="soundtrack-soundwave-bar" />
                  </div>
                </div>

                {/* Title & Artist */}
                <div className="soundtrack-active-meta">
                  <h3 className="soundtrack-active-title">{currentTrack.title}</h3>
                  <p className="soundtrack-active-artist">{currentTrack.artist}</p>
                  {(currentTrack.isUnavailable || !currentTrack.url) && (
                    <span className="soundtrack-unavailable-notice">
                      Track currently unavailable
                    </span>
                  )}
                </div>

                {/* Progress bar simulation */}
                <div className="soundtrack-progress-container" aria-hidden="true">
                  <div className="soundtrack-progress-track">
                    <div className="soundtrack-progress-fill" />
                  </div>
                  <div className="soundtrack-progress-times">
                    <span>{isPlaying ? "1:15" : "0:00"}</span>
                    <span>{formatTrackDuration(currentTrack.duration_seconds)}</span>
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="soundtrack-control-buttons">
                  <button
                    type="button"
                    className="soundtrack-skip-btn"
                    onClick={handlePrevTrack}
                    aria-label="Previous track"
                    title="Previous track"
                  >
                    ⏮
                  </button>

                  <button
                    type="button"
                    className="soundtrack-play-toggle-btn"
                    onClick={onTogglePlay}
                    aria-label={
                      isPlaying
                        ? `Pause ${currentTrack.title}`
                        : `Play ${currentTrack.title}`
                    }
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? "⏸" : "▶"}
                  </button>

                  <button
                    type="button"
                    className="soundtrack-skip-btn"
                    onClick={handleNextTrack}
                    aria-label="Next track"
                    title="Next track"
                  >
                    ⏭
                  </button>

                  <button
                    type="button"
                    className="soundtrack-open-songbook-btn"
                    onClick={onOpenSongbook}
                    aria-label="Open full songbook"
                  >
                    <span>Open songbook</span>
                    <span aria-hidden="true">♫</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Track Select Playlist */}
            <div className="soundtrack-playlist-container">
              <h4 className="soundtrack-playlist-heading">Quick Select Tracks</h4>
              <div
                className="soundtrack-playlist-grid"
                role="list"
                aria-label="Soundtrack track selection"
              >
                {tracks.map((track, idx) => {
                  const isActive = track.id === currentTrack.id;
                  const isUnavail = track.isUnavailable || !track.url;
                  return (
                    <button
                      type="button"
                      key={track.id || idx}
                      className={`soundtrack-track-row ${isActive ? "is-active" : ""} ${
                        isUnavail ? "is-unavailable" : ""
                      }`}
                      onClick={() => onPlayTrack(track)}
                      aria-current={isActive ? "true" : undefined}
                      aria-label={`${isActive && isPlaying ? "Currently playing" : "Play"} ${
                        track.title
                      } by ${track.artist}`}
                    >
                      <span className="soundtrack-track-num">
                        {isActive && isPlaying ? "♫" : String(idx + 1).padStart(2, "0")}
                      </span>
                      <div className="soundtrack-track-info">
                        <span className="soundtrack-track-title">{track.title}</span>
                        <span className="soundtrack-track-artist">{track.artist}</span>
                      </div>
                      <span className="soundtrack-track-duration">
                        {formatTrackDuration(track.duration_seconds)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
