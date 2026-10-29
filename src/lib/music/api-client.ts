/**
 * Client-side API functions for the music system.
 * All functions call the API routes under /api/music/* and run in the browser.
 * They throw on network or auth errors.
 */

import type {
  DbTrack,
  DbPlaylist,
  PlaybackState,
  ListeningHistoryEntry,
  LyricsData,
} from './types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Signed-URL memory cache: storagePath → { url, expiresAt (epoch ms) }.
 * Keyed per session (module singleton).
 */
const _signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

async function apiFetch<T>(
  input: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = `API error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = String(body.error);
    } catch {
      // ignore parse errors — use status message
    }
    throw new Error(message);
  }

  // 204 No Content — return undefined cast as T
  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Tracks
// ---------------------------------------------------------------------------

/** Fetch the full published track catalogue. */
export async function fetchTracks(): Promise<DbTrack[]> {
  return apiFetch<DbTrack[]>('/api/music/tracks');
}

// ---------------------------------------------------------------------------
// Likes
// ---------------------------------------------------------------------------

/** Fetch the IDs of tracks the current user has liked. */
export async function fetchLikedTrackIds(): Promise<string[]> {
  return apiFetch<string[]>('/api/music/likes');
}

/** Like a track. */
export async function likeTrack(trackId: string): Promise<void> {
  return apiFetch<void>('/api/music/likes', {
    method: 'POST',
    body: JSON.stringify({ track_id: trackId }),
  });
}

/** Unlike a track. */
export async function unlikeTrack(trackId: string): Promise<void> {
  return apiFetch<void>('/api/music/likes', {
    method: 'DELETE',
    body: JSON.stringify({ track_id: trackId }),
  });
}

// ---------------------------------------------------------------------------
// Playlists
// ---------------------------------------------------------------------------

/** Fetch all playlists for the current user. */
export async function fetchPlaylists(): Promise<DbPlaylist[]> {
  return apiFetch<DbPlaylist[]>('/api/music/playlists');
}

/** Create a new playlist. */
export async function createPlaylist(
  name: string,
  description?: string
): Promise<DbPlaylist> {
  return apiFetch<DbPlaylist>('/api/music/playlists', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });
}

/** Fetch a single playlist (with its tracks). */
export async function fetchPlaylist(id: string): Promise<DbPlaylist> {
  return apiFetch<DbPlaylist>(`/api/music/playlists/${id}`);
}

/** Update playlist metadata. */
export async function updatePlaylist(
  id: string,
  updates: { name?: string; description?: string }
): Promise<DbPlaylist> {
  return apiFetch<DbPlaylist>(`/api/music/playlists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/** Delete a playlist. */
export async function deletePlaylist(id: string): Promise<void> {
  return apiFetch<void>(`/api/music/playlists/${id}`, { method: 'DELETE' });
}

/** Add a track to a playlist. */
export async function addTrackToPlaylist(
  playlistId: string,
  trackId: string,
  sortOrder?: number
): Promise<void> {
  return apiFetch<void>(`/api/music/playlists/${playlistId}/tracks`, {
    method: 'POST',
    body: JSON.stringify({ track_id: trackId, sort_order: sortOrder }),
  });
}

/** Remove a track from a playlist. */
export async function removeTrackFromPlaylist(
  playlistId: string,
  trackId: string
): Promise<void> {
  return apiFetch<void>(`/api/music/playlists/${playlistId}/tracks`, {
    method: 'DELETE',
    body: JSON.stringify({ track_id: trackId }),
  });
}

/** Reorder tracks within a playlist. */
export async function reorderPlaylistTracks(
  playlistId: string,
  orderedTrackIds: string[]
): Promise<void> {
  return apiFetch<void>(`/api/music/playlists/${playlistId}/tracks`, {
    method: 'PATCH',
    body: JSON.stringify({ ordered_track_ids: orderedTrackIds }),
  });
}

// ---------------------------------------------------------------------------
// Playback state persistence
// ---------------------------------------------------------------------------

/** Fetch the user's persisted playback state (or null if none saved). */
export async function fetchPlaybackState(): Promise<PlaybackState | null> {
  try {
    return await apiFetch<PlaybackState>('/api/music/playback-state');
  } catch (err: unknown) {
    // 404 means no saved state — treat as null
    if (err instanceof Error && err.message.includes('404')) return null;
    throw err;
  }
}

/** Persist the current playback state. */
export async function savePlaybackState(state: PlaybackState): Promise<void> {
  return apiFetch<void>('/api/music/playback-state', {
    method: 'PUT',
    body: JSON.stringify(state),
  });
}

// ---------------------------------------------------------------------------
// Listening history
// ---------------------------------------------------------------------------

/** Fetch recent listening history. */
export async function fetchHistory(limit = 50): Promise<ListeningHistoryEntry[]> {
  return apiFetch<ListeningHistoryEntry[]>(`/api/music/history?limit=${limit}`);
}

/** Record a listening history event. */
export async function recordHistoryEvent(
  trackId: string,
  opts?: { completed?: boolean; progressSeconds?: number }
): Promise<void> {
  return apiFetch<void>('/api/music/history', {
    method: 'POST',
    body: JSON.stringify({
      track_id: trackId,
      completed: opts?.completed ?? false,
      progress_seconds: opts?.progressSeconds ?? null,
    }),
  });
}

// ---------------------------------------------------------------------------
// Lyrics
// ---------------------------------------------------------------------------

/** Fetch lyrics for a track (returns null if not found). */
export async function fetchLyrics(trackId: string): Promise<LyricsData | null> {
  try {
    return await apiFetch<LyricsData>(`/api/music/lyrics/${trackId}`);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('404')) return null;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Signed audio URLs
// ---------------------------------------------------------------------------

/**
 * Get a signed URL for a storage path.
 * Results are cached in memory for the session to avoid re-fetching.
 * The server response is expected to include { url, expiresIn } where
 * expiresIn is the seconds until expiry.
 */
export async function getSignedAudioUrl(path: string): Promise<string> {
  const cached = _signedUrlCache.get(path);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    // Still valid with >60 s to spare
    return cached.url;
  }

  const data = await apiFetch<{ url: string; expiresIn?: number }>(
    '/api/music/upload/signed-url',
    {
      method: 'POST',
      body: JSON.stringify({ path }),
    }
  );

  const ttlMs = (data.expiresIn ?? 3600) * 1000;
  _signedUrlCache.set(path, { url: data.url, expiresAt: Date.now() + ttlMs });
  return data.url;
}
