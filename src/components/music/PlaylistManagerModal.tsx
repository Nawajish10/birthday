"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addTrackToPlaylist,
} from "@/lib/music/api-client";
import type { DbPlaylist } from "@/lib/music/types";

// ============================================================================
// 1. Create Playlist Modal
// ============================================================================

export interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (newPlaylist: DbPlaylist) => void;
}

export function CreatePlaylistModal({
  isOpen,
  onClose,
  onCreated,
}: CreatePlaylistModalProps): React.JSX.Element | null {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    // Autofocus name input after render
    const timer = setTimeout(() => {
      nameInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Keyboard navigation: Escape closes modal
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please provide a name for your playlist.");
      return;
    }
    if (trimmedName.length > 60) {
      setError("Playlist name cannot exceed 60 characters.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const newPlaylist = await createPlaylist(trimmedName, description.trim() || undefined);
      if (onCreated) {
        onCreated(newPlaylist);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create playlist.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="music-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="music-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-playlist-title"
      >
        <div className="music-modal-header">
          <div className="music-modal-kicker">✿ NEW COLLECTION ✿</div>
          <h2 id="create-playlist-title" className="music-modal-title">
            Create Playlist <span className="heart-glyph">♡</span>
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

        <form onSubmit={handleSubmit} className="music-modal-form">
          {error && (
            <div className="music-modal-error" role="alert">
              <span>⚠</span> {error}
            </div>
          )}

          <div className="music-modal-field">
            <label htmlFor="create-playlist-name" className="music-modal-label">
              Playlist Name <span className="music-modal-required">*</span>
            </label>
            <input
              ref={nameInputRef}
              id="create-playlist-name"
              type="text"
              className="music-modal-input"
              placeholder="e.g., Midnight Memories, Sunday Acoustic"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              disabled={isSubmitting}
              required
            />
            <div className="music-modal-hint">{name.length}/60 characters</div>
          </div>

          <div className="music-modal-field">
            <label htmlFor="create-playlist-desc" className="music-modal-label">
              Description <span className="music-modal-optional">(Optional)</span>
            </label>
            <textarea
              id="create-playlist-desc"
              className="music-modal-textarea"
              placeholder="A tender melody mix for stargazing or quiet evenings together…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={200}
              disabled={isSubmitting}
            />
          </div>

          <div className="music-modal-actions">
            <button
              type="button"
              className="music-btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="music-btn-primary"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? "Creating…" : "Create Playlist ♫"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// 2. Edit Playlist Modal (Rename / Delete)
// ============================================================================

export interface EditPlaylistModalProps {
  isOpen: boolean;
  playlist: DbPlaylist | null;
  onClose: () => void;
  onUpdated?: (updated: DbPlaylist) => void;
  onDeleted?: (deletedId: string) => void;
}

export function EditPlaylistModal({
  isOpen,
  playlist,
  onClose,
  onUpdated,
  onDeleted,
}: EditPlaylistModalProps): React.JSX.Element | null {
  const [name, setName] = useState(() => playlist?.name || "");
  const [description, setDescription] = useState(() => playlist?.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prevPlaylistId, setPrevPlaylistId] = useState<string | null>(playlist?.id ?? null);
  if (playlist && playlist.id !== prevPlaylistId) {
    setPrevPlaylistId(playlist.id);
    setName(playlist.name || "");
    setDescription(playlist.description || "");
    setError(null);
    setIsSubmitting(false);
    setIsDeleting(false);
    setConfirmDelete(false);
  }

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

  if (!isOpen || !playlist) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Playlist name cannot be empty.");
      return;
    }
    if (trimmedName.length > 60) {
      setError("Playlist name cannot exceed 60 characters.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const updated = await updatePlaylist(playlist.id, {
        name: trimmedName,
        description: description.trim() || undefined,
      });
      if (onUpdated) onUpdated(updated);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update playlist.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);
      await deletePlaylist(playlist.id);
      if (onDeleted) onDeleted(playlist.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete playlist.");
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="music-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="music-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-playlist-title"
      >
        <div className="music-modal-header">
          <div className="music-modal-kicker">✿ EDIT COLLECTION ✿</div>
          <h2 id="edit-playlist-title" className="music-modal-title">
            Playlist Settings <span className="heart-glyph">♡</span>
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

        <form onSubmit={handleUpdate} className="music-modal-form">
          {error && (
            <div className="music-modal-error" role="alert">
              <span>⚠</span> {error}
            </div>
          )}

          <div className="music-modal-field">
            <label htmlFor="edit-playlist-name" className="music-modal-label">
              Playlist Name <span className="music-modal-required">*</span>
            </label>
            <input
              id="edit-playlist-name"
              type="text"
              className="music-modal-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              disabled={isSubmitting || isDeleting}
              required
            />
          </div>

          <div className="music-modal-field">
            <label htmlFor="edit-playlist-desc" className="music-modal-label">
              Description <span className="music-modal-optional">(Optional)</span>
            </label>
            <textarea
              id="edit-playlist-desc"
              className="music-modal-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={200}
              disabled={isSubmitting || isDeleting}
            />
          </div>

          <div className="music-modal-actions">
            <button
              type="button"
              className="music-btn-secondary"
              onClick={onClose}
              disabled={isSubmitting || isDeleting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="music-btn-primary"
              disabled={isSubmitting || isDeleting || !name.trim()}
            >
              {isSubmitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>

        <hr className="music-modal-divider" />

        {/* Delete Playlist Zone */}
        <div className="music-delete-zone">
          <div className="music-delete-info">
            <h3 className="music-delete-title">Delete Playlist</h3>
            <p className="music-delete-text">
              Permanently remove &ldquo;{playlist.name}&rdquo;. The songs will remain in your library.
            </p>
          </div>
          {confirmDelete ? (
            <div className="music-confirm-delete-group">
              <span className="music-confirm-warning">Are you sure?</span>
              <button
                type="button"
                className="music-btn-danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting…" : "Yes, Delete"}
              </button>
              <button
                type="button"
                className="music-btn-secondary-sm"
                onClick={() => setConfirmDelete(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="music-btn-outline-danger"
              onClick={() => setConfirmDelete(true)}
              disabled={isSubmitting || isDeleting}
            >
              Delete Playlist
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. Add To Playlist Modal
// ============================================================================

export interface AddToPlaylistModalProps {
  isOpen: boolean;
  track: { id: string; title: string; artist: string } | null;
  playlists: DbPlaylist[];
  onClose: () => void;
  onTrackAdded?: (playlistId: string, trackId: string) => void;
  onCreateNewPlaylist?: () => void;
}

export function AddToPlaylistModal({
  isOpen,
  track,
  playlists,
  onClose,
  onTrackAdded,
  onCreateNewPlaylist,
}: AddToPlaylistModalProps): React.JSX.Element | null {
  const [addingToId, setAddingToId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const [prevTrackId, setPrevTrackId] = useState<string | null>(track?.id ?? null);
  if (track && track.id !== prevTrackId) {
    setPrevTrackId(track.id);
    setAddingToId(null);
    setAddedIds(new Set());
    setError(null);
  }

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

  if (!isOpen || !track) return null;

  const handleAdd = async (playlist: DbPlaylist) => {
    try {
      setAddingToId(playlist.id);
      setError(null);
      await addTrackToPlaylist(playlist.id, track.id);
      setAddedIds((prev) => new Set(prev).add(playlist.id));
      if (onTrackAdded) {
        onTrackAdded(playlist.id, track.id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add track.";
      if (msg.includes("already in playlist")) {
        setAddedIds((prev) => new Set(prev).add(playlist.id));
      } else {
        setError(msg);
      }
    } finally {
      setAddingToId(null);
    }
  };

  return (
    <div
      className="music-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="music-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-to-playlist-title"
      >
        <div className="music-modal-header">
          <div className="music-modal-kicker">✿ ADD TO PLAYLIST ✿</div>
          <h2 id="add-to-playlist-title" className="music-modal-title">
            Save Song <span className="heart-glyph">♡</span>
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

        <div className="music-modal-target-track">
          <span className="music-modal-track-icon" aria-hidden="true">♫</span>
          <div className="music-modal-track-info">
            <span className="music-modal-track-title">{track.title}</span>
            <span className="music-modal-track-artist">{track.artist}</span>
          </div>
        </div>

        {error && (
          <div className="music-modal-error" role="alert">
            <span>⚠</span> {error}
          </div>
        )}

        <div className="music-playlist-picker-list">
          {playlists.length === 0 ? (
            <div className="music-modal-empty-playlists">
              <p>You don&apos;t have any custom playlists yet.</p>
              {onCreateNewPlaylist && (
                <button
                  type="button"
                  className="music-btn-primary-sm"
                  onClick={() => {
                    onClose();
                    onCreateNewPlaylist();
                  }}
                >
                  ＋ Create your first playlist
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="music-modal-section-label">Choose a playlist:</div>
              <ul className="music-playlist-select-items">
                {playlists.map((pl) => {
                  const isAdded = addedIds.has(pl.id);
                  const isBusy = addingToId === pl.id;

                  return (
                    <li key={pl.id} className="music-playlist-select-item">
                      <div className="music-playlist-item-meta">
                        <span className="music-playlist-item-name">{pl.name}</span>
                        {pl.track_count !== undefined && (
                          <span className="music-playlist-item-count">
                            {pl.track_count} {pl.track_count === 1 ? "track" : "tracks"}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className={`music-playlist-add-btn ${isAdded ? "is-added" : ""}`}
                        onClick={() => handleAdd(pl)}
                        disabled={isBusy || isAdded}
                        aria-label={`Add to playlist ${pl.name}`}
                      >
                        {isBusy ? "Adding…" : isAdded ? "✓ Added" : "＋ Add"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <div className="music-modal-footer-action">
          {onCreateNewPlaylist && (
            <button
              type="button"
              className="music-btn-text"
              onClick={() => {
                onClose();
                onCreateNewPlaylist();
              }}
            >
              ＋ Create a new playlist
            </button>
          )}
          <button
            type="button"
            className="music-btn-secondary"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
