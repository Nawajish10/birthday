"use client";

import React from "react";
import "./landing-music-card.css";

export interface LandingMusicTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
}

export interface LandingMusicCardProps {
  tracks: LandingMusicTrack[];
  activeTrack: LandingMusicTrack | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPlayTrack: (track: LandingMusicTrack) => void;
  onOpenSongbook: () => void;
  personalNote?: string;
}

export function LandingMusicCard({
  tracks = [],
  activeTrack = null,
  isPlaying = false,
  onTogglePlay,
  onPlayTrack,
  onOpenSongbook,
  personalNote = "A song for every memory we've made so far...",
}: LandingMusicCardProps): React.JSX.Element {
  const hasTracks = Array.isArray(tracks) && tracks.length > 0;
  const currentTrack = activeTrack ?? (hasTracks ? tracks[0] : null);

  // Fallback / Empty state when no tracks exist
  if (!hasTracks) {
    return (
      <section
        className="scrapbook-music-card is-empty"
        aria-label="Music Player — No Tracks Available"
      >
        <div className="washi-tape washi-tape-pink scrapbook-music-tape-top" aria-hidden="true" />
        <div className="scrapbook-music-empty-wrapper">
          <div className="scrapbook-music-empty-disc" aria-hidden="true">
            <div className="scrapbook-music-disc-inner">
              <span className="scrapbook-music-empty-icon">🌻</span>
            </div>
          </div>
          <div className="scrapbook-music-empty-content">
            <span className="scrapbook-music-tag">OUR SONGBOOK</span>
            <h3 className="scrapbook-music-empty-title">
              The songbook is waiting for our soundtrack...
            </h3>
            <p className="scrapbook-music-empty-note">{personalNote}</p>
            <button
              type="button"
              className="scrapbook-music-btn-songbook"
              onClick={onOpenSongbook}
              aria-label="Open full songbook to select and play music"
            >
              Open full songbook ♫
            </button>
          </div>
        </div>
      </section>
    );
  }

  const playPauseLabel = isPlaying
    ? `Pause ${currentTrack?.title || "music"}`
    : `Play ${currentTrack?.title || "music"}`;

  return (
    <section
      className={`scrapbook-music-card ${isPlaying ? "is-playing" : "is-paused"}`}
      aria-label="Scrapbook Featured Music Player"
    >
      {/* Decorative Washi Tapes */}
      <div className="washi-tape washi-tape-pink scrapbook-music-tape-left" aria-hidden="true" />
      <div className="washi-tape washi-tape-sage scrapbook-music-tape-right" aria-hidden="true" />

      {/* Header Banner */}
      <div className="scrapbook-music-header">
        <div className="scrapbook-music-badge">
          <span className="sunflower-glyph" aria-hidden="true">🌻</span>
          <span className="scrapbook-music-badge-text">OUR MEMORY SOUNDTRACK</span>
          <span className="rose-glyph" aria-hidden="true">🌹</span>
        </div>
        <p className="scrapbook-music-note">&ldquo;{personalNote}&rdquo;</p>
      </div>

      {/* Main Player Body */}
      <div className="scrapbook-music-body">
        {/* Left: Vintage Vinyl Turntable Player */}
        <div className="scrapbook-vinyl-container">
          <div className="scrapbook-vinyl-turntable">
            {/* The Stylus / Tonearm */}
            <div className={`scrapbook-tonearm ${isPlaying ? "is-engaged" : ""}`} aria-hidden="true">
              <div className="scrapbook-tonearm-base" />
              <div className="scrapbook-tonearm-rod" />
              <div className="scrapbook-tonearm-head" />
            </div>

            {/* Vinyl Disc */}
            <div
              className={`scrapbook-vinyl-disc ${isPlaying ? "is-spinning" : ""}`}
              aria-hidden="true"
            >
              <div className="scrapbook-vinyl-groove-outer">
                <div className="scrapbook-vinyl-groove-mid">
                  <div className="scrapbook-vinyl-groove-inner">
                    <div className="scrapbook-vinyl-label">
                      <div className="scrapbook-vinyl-label-art">
                        <span className="vinyl-label-icon">🌻</span>
                        <span className="vinyl-label-ring" />
                      </div>
                      <div className="scrapbook-vinyl-spindle" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Play/Pause Control directly on player */}
          <div className="scrapbook-vinyl-controls">
            <button
              type="button"
              className="scrapbook-play-toggle-btn"
              onClick={onTogglePlay}
              aria-label={playPauseLabel}
            >
              {isPlaying ? (
                <span className="btn-icon" aria-hidden="true">⏸</span>
              ) : (
                <span className="btn-icon" aria-hidden="true">▶</span>
              )}
              <span className="btn-text">{isPlaying ? "Pause" : "Play"}</span>
            </button>
            <div className="scrapbook-status-pill" aria-live="polite">
              {isPlaying ? (
                <>
                  <span className="pulse-dot" aria-hidden="true" />
                  <span>Now Playing</span>
                </>
              ) : (
                <>
                  <span className="paused-dot" aria-hidden="true" />
                  <span>Paused</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Track Info & Mini Tracklist */}
        <div className="scrapbook-track-details">
          {/* Active Track Highlight */}
          <div className="scrapbook-active-track-banner">
            <span className="track-playing-label">FEATURED SONG</span>
            <h3 className="scrapbook-track-title">{currentTrack?.title || "No track chosen"}</h3>
            <p className="scrapbook-track-artist">{currentTrack?.artist || "Various Artists"}</p>
          </div>

          {/* Mini Tracklist Selector */}
          <div className="scrapbook-tracklist-wrapper">
            <span className="scrapbook-tracklist-heading">Playlist Selection</span>
            <div
              className="scrapbook-tracklist"
              role="list"
              aria-label="Available songs to play"
            >
              {tracks.map((track, index) => {
                const isSelected = currentTrack?.id === track.id;
                const isCurrentPlaying = isSelected && isPlaying;
                const trackButtonLabel = isCurrentPlaying
                  ? `Pause ${track.title} by ${track.artist}`
                  : `Play ${track.title} by ${track.artist}`;

                return (
                  <div key={track.id || `${track.title}-${index}`} role="listitem">
                    <button
                      type="button"
                      className={`scrapbook-tracklist-item ${isSelected ? "is-selected" : ""} ${
                        isCurrentPlaying ? "is-playing" : ""
                      }`}
                      onClick={() => {
                        if (isSelected) {
                          onTogglePlay();
                        } else {
                          onPlayTrack(track);
                        }
                      }}
                      aria-label={trackButtonLabel}
                      aria-current={isSelected ? "true" : undefined}
                    >
                      <span className="track-item-index" aria-hidden="true">
                        {isCurrentPlaying ? "🎶" : `${index + 1}.`}
                      </span>
                      <div className="track-item-info">
                        <span className="track-item-title">{track.title}</span>
                        <span className="track-item-artist">{track.artist}</span>
                      </div>
                      <span className="track-item-status-icon" aria-hidden="true">
                        {isCurrentPlaying ? "⏸" : "▶"}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Songbook link button */}
          <div className="scrapbook-songbook-action">
            <button
              type="button"
              className="scrapbook-music-btn-songbook"
              onClick={onOpenSongbook}
              aria-label="Open full songbook"
            >
              Open full songbook ♫
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
