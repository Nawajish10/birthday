"use client";

import React, { useState, useEffect, useRef } from "react";
import { fetchPlaylists } from "@/lib/music/api-client";
import type { DbPlaylist, DbTrack } from "@/lib/music/types";
import "./admin-music-upload.css";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_EXTENSIONS = [
  ".mp3",
  ".wav",
  ".m4a",
  ".aac",
  ".ogg",
  ".flac",
  ".webm",
];

const ALLOWED_MIME_PREFIXES = ["audio/"];

export interface UploadQueueItem {
  id: string;
  file: File;
  title: string;
  artist: string;
  album: string;
  playlistId: string;
  durationSeconds: number | null;
  status: "idle" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  uploadedTrack?: DbTrack;
}

interface AdminMusicUploadProps {
  onTrackUploaded?: (track: DbTrack) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function cleanFilenameToTitle(filename: string): string {
  const withoutExt = filename.replace(/\.[^/.]+$/, "");
  // Replace underscores and hyphens with spaces
  return withoutExt.replace(/[_-]+/g, " ").trim();
}

export function AdminMusicUpload({ onTrackUploaded }: AdminMusicUploadProps) {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [playlists, setPlaylists] = useState<DbPlaylist[]>([]);
  const [recentUploads, setRecentUploads] = useState<DbTrack[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [defaultPlaylistId, setDefaultPlaylistId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load playlists on mount
  useEffect(() => {
    let isMounted = true;
    fetchPlaylists()
      .then((data) => {
        if (isMounted) setPlaylists(data || []);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Extract audio duration using browser Audio constructor
  const extractDuration = (file: File): Promise<number | null> => {
    return new Promise((resolve) => {
      try {
        const objectUrl = URL.createObjectURL(file);
        const audio = new Audio();
        audio.preload = "metadata";
        audio.onloadedmetadata = () => {
          const duration = Math.round(audio.duration);
          URL.revokeObjectURL(objectUrl);
          resolve(isNaN(duration) ? null : duration);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(null);
        };
        audio.src = objectUrl;
      } catch {
        resolve(null);
      }
    });
  };

  const handleFiles = async (files: FileList | File[]) => {
    setGlobalError("");
    const newItems: UploadQueueItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;

      // File validation
      const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext);
      const isAudioMime =
        ALLOWED_MIME_PREFIXES.some((prefix) => file.type.startsWith(prefix)) ||
        isAllowedExt;

      let error: string | undefined;
      let status: UploadQueueItem["status"] = "idle";

      if (!isAudioMime && !isAllowedExt) {
        error = `Invalid format. Supported: ${ALLOWED_EXTENSIONS.join(", ")}`;
        status = "error";
      } else if (file.size > MAX_FILE_SIZE) {
        error = `Exceeds 50MB limit (${formatBytes(file.size)})`;
        status = "error";
      }

      const item: UploadQueueItem = {
        id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file,
        title: cleanFilenameToTitle(file.name),
        artist: "",
        album: "",
        playlistId: defaultPlaylistId,
        durationSeconds: null,
        status,
        progress: 0,
        error,
      };

      newItems.push(item);
    }

    setQueue((prev) => [...prev, ...newItems]);

    // Asynchronously extract duration for newly added valid items
    for (const item of newItems) {
      if (item.status === "idle") {
        extractDuration(item.file).then((duration) => {
          if (duration !== null) {
            setQueue((curr) =>
              curr.map((q) =>
                q.id === item.id ? { ...q, durationSeconds: duration } : q
              )
            );
          }
        });
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void handleFiles(e.target.files);
      e.target.value = "";
    }
  };

  const updateItem = (id: string, updates: Partial<UploadQueueItem>) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const removeItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCompleted = () => {
    setQueue((prev) => prev.filter((item) => item.status !== "success"));
  };

  // Upload an individual queue item
  const uploadItem = (item: UploadQueueItem) => {
    if (!item.title.trim()) {
      updateItem(item.id, {
        status: "error",
        error: "Title is required",
      });
      return;
    }

    updateItem(item.id, {
      status: "uploading",
      progress: 0,
      error: undefined,
    });

    const formData = new FormData();
    formData.append("file", item.file);
    formData.append("title", item.title.trim());
    if (item.artist.trim()) formData.append("artist", item.artist.trim());
    if (item.album.trim()) formData.append("album", item.album.trim());
    if (item.playlistId) formData.append("playlist_id", item.playlistId);
    if (item.durationSeconds !== null && item.durationSeconds !== undefined) {
      formData.append("duration_seconds", String(item.durationSeconds));
    }

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.min(
          99,
          Math.round((event.loaded / event.total) * 100)
        );
        updateItem(item.id, { progress: percent });
      }
    };

    xhr.onload = () => {
      try {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status === 201 || xhr.status === 200) {
          updateItem(item.id, {
            status: "success",
            progress: 100,
            uploadedTrack: response,
          });
          setRecentUploads((prev) => [response, ...prev]);
          if (onTrackUploaded) onTrackUploaded(response);
        } else {
          updateItem(item.id, {
            status: "error",
            error: response?.error || `Upload failed with HTTP ${xhr.status}`,
          });
        }
      } catch {
        updateItem(item.id, {
          status: "error",
          error: `Upload failed with status ${xhr.status}`,
        });
      }
    };

    xhr.onerror = () => {
      updateItem(item.id, {
        status: "error",
        error: "Network error occurred during upload.",
      });
    };

    xhr.open("POST", "/api/music/upload");
    xhr.send(formData);
  };

  const uploadAllPending = () => {
    const pending = queue.filter(
      (item) => item.status === "idle" || item.status === "error"
    );
    for (const item of pending) {
      if (!item.error || item.error === "Title is required") {
        uploadItem(item);
      }
    }
  };

  const pendingCount = queue.filter((i) => i.status === "idle").length;
  const uploadingCount = queue.filter((i) => i.status === "uploading").length;
  const successCount = queue.filter((i) => i.status === "success").length;
  const errorCount = queue.filter((i) => i.status === "error").length;

  return (
    <div className="adminMusicContainer">
      <div className="adminMusicHeader">
        <div>
          <h2>Audio Library Ingestion & Upload</h2>
          <p>
            Batch-upload audio files to the private bucket, auto-extract metadata,
            and associate them with playlists.
          </p>
        </div>
      </div>

      {globalError && <div className="error">{globalError}</div>}

      {/* Dropzone */}
      <div
        className={`musicDropzone ${dragActive ? "dragActive" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="musicDropzoneContent">
          <span className="musicDropzoneIcon">🎵</span>
          <div className="musicDropzoneTitle">
            Drag & drop audio files here, or click to browse
          </div>
          <div className="musicDropzoneHint">
            Supported formats: MP3, WAV, M4A, AAC, OGG, FLAC, WebM (Max 50MB per file).
            Multiple files supported.
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".mp3,.wav,.m4a,.aac,.ogg,.flac,.webm,audio/*"
          className="musicDropzoneFileInput"
          onChange={handleFileInputChange}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Batch Controls */}
      {queue.length > 0 && (
        <div className="batchControls">
          <div className="batchStatus">
            <span>
              Queue: <b>{queue.length}</b> total ({pendingCount} pending,{" "}
              {uploadingCount} uploading, {successCount} done, {errorCount} failed)
            </span>
            {playlists.length > 0 && (
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                Default Playlist:
                <select
                  value={defaultPlaylistId}
                  onChange={(e) => {
                    const plId = e.target.value;
                    setDefaultPlaylistId(plId);
                    // Update all idle items in queue to this playlist
                    setQueue((prev) =>
                      prev.map((it) =>
                        it.status === "idle" ? { ...it, playlistId: plId } : it
                      )
                    );
                  }}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "1px solid var(--line, #e8ddce)",
                  }}
                >
                  <option value="">(None)</option>
                  {playlists.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="batchActions">
            {pendingCount + errorCount > 0 && (
              <button
                className="button rose"
                disabled={uploadingCount > 0}
                onClick={uploadAllPending}
              >
                {uploadingCount > 0 ? "Uploading…" : `Upload All (${pendingCount + errorCount})`}
              </button>
            )}
            {successCount > 0 && (
              <button className="button secondary" onClick={clearCompleted}>
                Clear Completed
              </button>
            )}
          </div>
        </div>
      )}

      {/* Queue Items */}
      {queue.length > 0 && (
        <div className="uploadQueue">
          {queue.map((item) => (
            <div
              key={item.id}
              className={`uploadItemCard status-${item.status}`}
            >
              <div className="uploadItemHead">
                <div className="uploadItemMeta">
                  <b>{item.file.name}</b>
                  <span>({formatBytes(item.file.size)})</span>
                  {item.durationSeconds !== null && (
                    <span>⏱ {formatDuration(item.durationSeconds)}</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={`uploadItemBadge badge-${item.status}`}>
                    {item.status === "uploading"
                      ? `${item.progress}%`
                      : item.status}
                  </span>
                  {item.status !== "uploading" && (
                    <button
                      className="button secondary"
                      style={{ padding: "4px 8px", fontSize: 11 }}
                      onClick={() => removeItem(item.id)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {item.status === "uploading" && (
                <div className="uploadProgressContainer">
                  <div
                    className="uploadProgressBar"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}

              {/* Error banner */}
              {item.error && (
                <div className="uploadItemError">⚠️ {item.error}</div>
              )}

              {/* Editable Fields (only if not successfully uploaded) */}
              {item.status !== "success" ? (
                <div className="uploadItemFormGrid">
                  <div className="uploadField">
                    <label>Title *</label>
                    <input
                      type="text"
                      value={item.title}
                      disabled={item.status === "uploading"}
                      onChange={(e) =>
                        updateItem(item.id, { title: e.target.value })
                      }
                      placeholder="Track title"
                      required
                    />
                  </div>
                  <div className="uploadField">
                    <label>Artist</label>
                    <input
                      type="text"
                      value={item.artist}
                      disabled={item.status === "uploading"}
                      onChange={(e) =>
                        updateItem(item.id, { artist: e.target.value })
                      }
                      placeholder="Artist name"
                    />
                  </div>
                  <div className="uploadField">
                    <label>Album</label>
                    <input
                      type="text"
                      value={item.album}
                      disabled={item.status === "uploading"}
                      onChange={(e) =>
                        updateItem(item.id, { album: e.target.value })
                      }
                      placeholder="Album name"
                    />
                  </div>
                  <div className="uploadField">
                    <label>Playlist</label>
                    <select
                      value={item.playlistId}
                      disabled={item.status === "uploading"}
                      onChange={(e) =>
                        updateItem(item.id, { playlistId: e.target.value })
                      }
                    >
                      <option value="">(None)</option>
                      {playlists.map((pl) => (
                        <option key={pl.id} value={pl.id}>
                          {pl.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="uploadItemFooter">
                  <span>
                    ✓ Uploaded as <b>{item.title}</b> {item.artist ? `by ${item.artist}` : ""}
                  </span>
                  {item.uploadedTrack?.media_path && (
                    <small style={{ color: "var(--muted, #85756c)" }}>
                      Storage: {item.uploadedTrack.media_path}
                    </small>
                  )}
                </div>
              )}

              {/* Item Action Buttons */}
              {item.status === "idle" && (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    className="button rose"
                    style={{ padding: "6px 14px", fontSize: 11 }}
                    onClick={() => uploadItem(item)}
                  >
                    Upload Track
                  </button>
                </div>
              )}

              {item.status === "error" && (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button
                    className="button secondary"
                    style={{ padding: "6px 14px", fontSize: 11 }}
                    onClick={() => removeItem(item.id)}
                  >
                    Discard
                  </button>
                  <button
                    className="button rose"
                    style={{ padding: "6px 14px", fontSize: 11 }}
                    onClick={() => uploadItem(item)}
                  >
                    Retry Upload
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recent Uploads Section */}
      {recentUploads.length > 0 && (
        <div className="recentUploadsCard">
          <div className="panelHead">
            <h3>Recent Uploads (Session)</h3>
            <span style={{ fontSize: 12, color: "var(--muted, #85756c)" }}>
              {recentUploads.length} item(s)
            </span>
          </div>
          <div className="recentUploadsList">
            {recentUploads.map((track) => (
              <div key={track.id} className="recentTrackRow">
                <div className="recentTrackInfo">
                  <div className="recentTrackTitle">
                    🎵 {track.title} {track.artist ? `· ${track.artist}` : ""}
                  </div>
                  <div className="recentTrackSub">
                    {track.album ? `Album: ${track.album} · ` : ""}
                    {formatDuration(track.duration_seconds)}
                    {track.media_path ? ` · Key: ${track.media_path}` : ""}
                  </div>
                </div>
                <span className="uploadItemBadge badge-success">Available</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
