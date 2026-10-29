"use client";

import React, { useState, useEffect } from "react";
import { fetchHistory } from "@/lib/music/api-client";
import type { ListeningHistoryEntry } from "@/lib/music/types";
import type { MusicTrackItem } from "./music-catalogue";
import { formatDuration } from "./music-catalogue";

// ============================================================================
// Helper: Relative time formatting (e.g. "Just now", "5m ago", "Yesterday")
// ============================================================================

export function formatRelativeTime(isoString: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  // Format month and day
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// ============================================================================
// Component: Listening History List
// ============================================================================

export interface ListeningHistoryListProps {
  entries: ListeningHistoryEntry[];
  isLoading: boolean;
  error: string | null;
  onSelectTrack: (track: MusicTrackItem) => void;
  knownTracks?: MusicTrackItem[];
}

export function ListeningHistoryList({
  entries,
  isLoading,
  error,
  onSelectTrack,
  knownTracks = [],
}: ListeningHistoryListProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="music-history-loading" role="status">
        <span className="music-history-spinner" aria-hidden="true">♫</span>
        <p>Loading your listening memories…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="music-history-error" role="alert">
        <span>⚠</span> {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="music-history-empty">
        <span className="music-history-empty-icon" aria-hidden="true">🌸</span>
        <h3 className="music-history-empty-title">No listening history yet</h3>
        <p className="music-history-empty-desc">
          Your recently played melodies will blossom here as you listen. Start playing your favorite tunes!
        </p>
      </div>
    );
  }

  return (
    <div className="music-history-list-wrapper">
      <ul className="music-history-items" aria-label="Listening history tracks">
        {entries.map((entry) => {
          // Resolve track item: from entry.track or knownTracks
          const matched = knownTracks.find((t) => t.id === entry.track_id);
          const title = entry.track?.title || matched?.title || "Unknown Song";
          const artist = entry.track?.artist || matched?.artist || "Soundtrack";
          const durationStr = entry.track?.duration_seconds
            ? formatDuration(entry.track.duration_seconds)
            : matched?.duration || "";

          const itemToPlay: MusicTrackItem = matched || {
            id: entry.track_id,
            title,
            artist,
            duration: durationStr,
            durationSeconds: entry.track?.duration_seconds || 0,
            isFavorite: Boolean(entry.track?.is_liked),
            url: entry.track?.audio_url || "",
          };

          return (
            <li
              key={entry.id}
              className="music-history-item"
              onClick={() => onSelectTrack(itemToPlay)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectTrack(itemToPlay);
                }
              }}
              aria-label={`Play ${title} by ${artist}, played ${formatRelativeTime(entry.played_at)}`}
            >
              <div className="music-history-play-icon" aria-hidden="true">
                ▶
              </div>

              <div className="music-history-meta">
                <span className="music-history-title">{title}</span>
                <span className="music-history-artist">{artist}</span>
              </div>

              <div className="music-history-status">
                {entry.completed ? (
                  <span
                    className="music-history-badge is-completed"
                    title="Played to completion"
                  >
                    ✓ Completed
                  </span>
                ) : (
                  <span
                    className="music-history-badge is-partial"
                    title="Listened partially"
                  >
                    Partial
                  </span>
                )}
                <time
                  dateTime={entry.played_at}
                  className="music-history-time"
                >
                  {formatRelativeTime(entry.played_at)}
                </time>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ============================================================================
// Modal: Listening History Modal
// ============================================================================

export interface ListeningHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrack: (track: MusicTrackItem) => void;
  knownTracks?: MusicTrackItem[];
}

export function ListeningHistoryModal({
  isOpen,
  onClose,
  onSelectTrack,
  knownTracks = [],
}: ListeningHistoryModalProps): React.JSX.Element | null {
  const [entries, setEntries] = useState<ListeningHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    fetchHistory(30)
      .then((data) => {
        if (isMounted) {
          setEntries(data);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load listening history.");
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

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

  if (!isOpen) return null;

  return (
    <div
      className="music-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="music-modal-card music-history-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="listening-history-title"
      >
        <div className="music-modal-header">
          <div className="music-modal-kicker">✿ LISTENING LOG ✿</div>
          <h2 id="listening-history-title" className="music-modal-title">
            Recently Played <span className="heart-glyph">♡</span>
          </h2>
          <button
            type="button"
            className="music-modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        <div className="music-history-modal-body">
          <ListeningHistoryList
            entries={entries}
            isLoading={isLoading}
            error={error}
            onSelectTrack={(track) => {
              onSelectTrack(track);
              onClose();
            }}
            knownTracks={knownTracks}
          />
        </div>

        <div className="music-modal-footer-action">
          <button
            type="button"
            className="music-btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
