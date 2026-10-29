/**
 * Canonical shared types for the music system.
 * Compatible with MusicTrackItem from music-catalogue.ts but extended
 * for database-backed (Supabase) usage.
 */

// ---------------------------------------------------------------------------
// Track / Playlist
// ---------------------------------------------------------------------------

/** A track row as stored in (and returned from) the Supabase database. */
export interface DbTrack {
  id: string; // UUID
  title: string;
  artist: string;
  album: string | null;
  duration_seconds: number | null;
  artwork_path: string | null;
  source_type: 'imported' | 'provider';
  provider_ref: string | null;
  availability_status: 'available' | 'unavailable' | 'processing' | 'error';
  media_path: string; // storage key
  is_published: boolean;
  sort_order: number;
  // Joined/derived fields (may be absent in some queries)
  audio_url?: string | null; // signed URL resolved client-side
  is_liked?: boolean; // joined from music_likes
}

/** A playlist row as stored in the Supabase database. */
export interface DbPlaylist {
  id: string;
  name: string;
  description: string | null;
  artwork_path: string | null;
  created_at: string;
  updated_at: string;
  track_count?: number;
  tracks?: DbTrack[];
}

// ---------------------------------------------------------------------------
// Playback persistence
// ---------------------------------------------------------------------------

/** The serialisable playback state that is persisted to the API. */
export interface PlaybackState {
  trackId: string | null;
  positionSeconds: number;
  queueTrackIds: string[];
  queueIndex: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'one' | 'all';
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export interface ListeningHistoryEntry {
  id: string;
  track_id: string;
  played_at: string;
  completed: boolean;
  progress_seconds: number | null;
  track?: DbTrack;
}

// ---------------------------------------------------------------------------
// Lyrics
// ---------------------------------------------------------------------------

export interface TimedLyricLine {
  startMs: number;
  endMs: number;
  text: string;
}

export interface LyricsData {
  plain_text: string | null;
  timed_json: TimedLyricLine[] | null;
  language: string;
  source_attribution: string | null;
}
