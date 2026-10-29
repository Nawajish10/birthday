'use client';

/**
 * Module-level music store with useSyncExternalStore.
 *
 * Multiple components can call `useMusicStore()` and share exactly the same
 * state snapshot — there is one store object, one audio element reference, and
 * one set of subscriptions per page load.
 *
 * Audio element: a single HTMLAudioElement is created lazily in the browser
 * and shared via `audioRef`. UI components should render:
 *   <audio ref={audioRef} ... />
 * or attach the element imperatively.
 */

import { useCallback, useSyncExternalStore } from 'react';
import type { RefObject } from 'react';
import {
  getNextTrackIndex,
  getPreviousTrackIndex,
} from '@/components/music/music-catalogue';
import {
  fetchTracks,
  fetchLikedTrackIds,
  fetchPlaylists,
  likeTrack,
  unlikeTrack,
  fetchPlaybackState,
  savePlaybackState,
} from './api-client';
import type { DbTrack, DbPlaylist, PlaybackState } from './types';

// ---------------------------------------------------------------------------
// State shape (internal)
// ---------------------------------------------------------------------------

interface StoreState {
  // Catalogue
  tracks: DbTrack[];
  likedTrackIds: Set<string>;
  playlists: DbPlaylist[];
  isLoading: boolean;
  error: string | null;

  // Playback
  currentTrackId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'one' | 'all';
  queue: string[];
  queueIndex: number;
  volume: number;
  isMuted: boolean;
}

// ---------------------------------------------------------------------------
// Module-level singleton
// ---------------------------------------------------------------------------

let _state: StoreState = {
  tracks: [],
  likedTrackIds: new Set<string>(),
  playlists: [],
  isLoading: false,
  error: null,
  currentTrackId: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  isShuffle: false,
  repeatMode: 'off',
  queue: [],
  queueIndex: -1,
  volume: 1,
  isMuted: false,
};

const _listeners = new Set<() => void>();

/** Replace state and notify all subscribers. */
function _setState(patch: Partial<StoreState>): void {
  _state = { ..._state, ...patch };
  _listeners.forEach((fn) => fn());
}

function _subscribe(listener: () => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

function _getSnapshot(): StoreState {
  return _state;
}

// Server-side snapshot (no audio, no subscriptions)
function _getServerSnapshot(): StoreState {
  return _state;
}

// ---------------------------------------------------------------------------
// Shared audio element ref (module-level singleton)
// ---------------------------------------------------------------------------
export function getMusicAudioRef(): RefObject<HTMLAudioElement | null> {
  return _audioRef;
}

const _audioRef: RefObject<HTMLAudioElement | null> = { current: null };

// ---------------------------------------------------------------------------
// Persist-state debounce
// ---------------------------------------------------------------------------
let _persistTimer: ReturnType<typeof setTimeout> | null = null;
const PERSIST_DEBOUNCE_MS = 5_000;

function _schedulePersist(): void {
  if (_persistTimer !== null) clearTimeout(_persistTimer);
  _persistTimer = setTimeout(() => {
    _persistTimer = null;
    const s = _state;
    const payload: PlaybackState = {
      trackId: s.currentTrackId,
      positionSeconds: s.currentTime,
      queueTrackIds: s.queue,
      queueIndex: s.queueIndex,
      isShuffle: s.isShuffle,
      repeatMode: s.repeatMode,
    };
    savePlaybackState(payload).catch(() => {
      // fire-and-forget; non-critical
    });
  }, PERSIST_DEBOUNCE_MS);
}

// ---------------------------------------------------------------------------
// Public MusicStore interface
// ---------------------------------------------------------------------------

export interface MusicStore {
  // Catalogue
  tracks: DbTrack[];
  likedTrackIds: Set<string>;
  playlists: DbPlaylist[];
  isLoading: boolean;
  error: string | null;

  // Playback (live state)
  currentTrackId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'one' | 'all';
  queue: string[];
  queueIndex: number;
  volume: number;
  isMuted: boolean;

  // The single shared audio element ref getter
  getAudioRef?(): RefObject<HTMLAudioElement | null>;

  // Actions
  loadCatalogue(): Promise<void>;
  loadLikes(): Promise<void>;
  loadPlaylists(): Promise<void>;
  setCurrentTrack(trackId: string | null): void;
  setIsPlaying(playing: boolean): void;
  setCurrentTime(t: number): void;
  setDuration(d: number): void;
  setQueue(trackIds: string[], startIndex?: number): void;
  next(): void;
  previous(): void;
  toggleShuffle(): void;
  setRepeatMode(mode: 'off' | 'one' | 'all'): void;
  setVolume(v: number): void;
  setMuted(m: boolean): void;
  toggleLike(trackId: string): Promise<void>;
  persistPlaybackState(): Promise<void>;
  restorePlaybackState(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMusicStore(): MusicStore {
  const snapshot = useSyncExternalStore(
    _subscribe,
    _getSnapshot,
    _getServerSnapshot
  );

  // -------------------------------------------------------------------------
  // Catalogue loaders
  // -------------------------------------------------------------------------

  const loadCatalogue = useCallback(async (): Promise<void> => {
    _setState({ isLoading: true, error: null });
    try {
      const tracks = await fetchTracks();
      _setState({ tracks, isLoading: false });
    } catch (err: unknown) {
      _setState({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load tracks',
      });
    }
  }, []);

  const loadLikes = useCallback(async (): Promise<void> => {
    try {
      const ids = await fetchLikedTrackIds();
      _setState({ likedTrackIds: new Set(ids) });
    } catch {
      // non-critical — silently ignore
    }
  }, []);

  const loadPlaylists = useCallback(async (): Promise<void> => {
    try {
      const playlists = await fetchPlaylists();
      _setState({ playlists });
    } catch (err: unknown) {
      _setState({
        error: err instanceof Error ? err.message : 'Failed to load playlists',
      });
    }
  }, []);

  // -------------------------------------------------------------------------
  // Playback setters
  // -------------------------------------------------------------------------

  const setCurrentTrack = useCallback((trackId: string | null): void => {
    _setState({ currentTrackId: trackId, currentTime: 0 });
    _schedulePersist();
  }, []);

  const setIsPlaying = useCallback((playing: boolean): void => {
    _setState({ isPlaying: playing });
  }, []);

  const setCurrentTime = useCallback((t: number): void => {
    _setState({ currentTime: t });
    // Note: persistence is debounced externally; callers should call
    // persistPlaybackState() or rely on the audio's timeupdate handler.
  }, []);

  const setDuration = useCallback((d: number): void => {
    _setState({ duration: d });
  }, []);

  const setQueue = useCallback(
    (trackIds: string[], startIndex = 0): void => {
      _setState({
        queue: trackIds,
        queueIndex: startIndex,
        currentTrackId: trackIds[startIndex] ?? null,
        currentTime: 0,
      });
      _schedulePersist();
    },
    []
  );

  // -------------------------------------------------------------------------
  // Navigation helpers (uses state machine helpers from music-catalogue.ts)
  // -------------------------------------------------------------------------

  const next = useCallback((): void => {
    const { queue, queueIndex, repeatMode, isShuffle } = _state;
    if (queue.length === 0) return;

    if (repeatMode === 'one') {
      // Restart the current track — signal audio element to seek to 0
      const audio = _audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => undefined);
      }
      return;
    }

    const nextIdx = getNextTrackIndex(
      queueIndex,
      queue.length,
      isShuffle,
      repeatMode === 'all'
    );

    if (nextIdx === -1) {
      // End of queue, no repeat — stop playback
      _setState({ isPlaying: false, currentTrackId: null, queueIndex: -1 });
      return;
    }

    _setState({
      queueIndex: nextIdx,
      currentTrackId: queue[nextIdx] ?? null,
      currentTime: 0,
      isPlaying: true,
    });
    _schedulePersist();
  }, []);

  const previous = useCallback((): void => {
    const { queue, queueIndex } = _state;
    if (queue.length === 0) return;

    // If more than 3 seconds in, restart current track instead
    if (_state.currentTime > 3) {
      const audio = _audioRef.current;
      if (audio) audio.currentTime = 0;
      _setState({ currentTime: 0 });
      return;
    }

    const prevIdx = getPreviousTrackIndex(queueIndex, queue.length);
    if (prevIdx === -1) return;

    _setState({
      queueIndex: prevIdx,
      currentTrackId: queue[prevIdx] ?? null,
      currentTime: 0,
      isPlaying: true,
    });
    _schedulePersist();
  }, []);

  // -------------------------------------------------------------------------
  // Shuffle / repeat / volume
  // -------------------------------------------------------------------------

  const toggleShuffle = useCallback((): void => {
    _setState({ isShuffle: !_state.isShuffle });
    _schedulePersist();
  }, []);

  const setRepeatMode = useCallback((mode: 'off' | 'one' | 'all'): void => {
    _setState({ repeatMode: mode });
    _schedulePersist();
  }, []);

  const setVolume = useCallback((v: number): void => {
    const clamped = Math.max(0, Math.min(1, v));
    _setState({ volume: clamped, isMuted: clamped === 0 });
    if (_audioRef.current) _audioRef.current.volume = clamped;
  }, []);

  const setMuted = useCallback((m: boolean): void => {
    _setState({ isMuted: m });
    if (_audioRef.current) _audioRef.current.muted = m;
  }, []);

  // -------------------------------------------------------------------------
  // Likes (optimistic)
  // -------------------------------------------------------------------------

  const toggleLike = useCallback(async (trackId: string): Promise<void> => {
    const wasLiked = _state.likedTrackIds.has(trackId);

    // Optimistic update
    const next = new Set(_state.likedTrackIds);
    if (wasLiked) next.delete(trackId);
    else next.add(trackId);
    _setState({ likedTrackIds: next });

    try {
      if (wasLiked) {
        await unlikeTrack(trackId);
      } else {
        await likeTrack(trackId);
      }
    } catch {
      // Revert optimistic update on failure
      const reverted = new Set(_state.likedTrackIds);
      if (wasLiked) reverted.add(trackId);
      else reverted.delete(trackId);
      _setState({ likedTrackIds: reverted });
    }
  }, []);

  // -------------------------------------------------------------------------
  // Persist / restore
  // -------------------------------------------------------------------------

  const persistPlaybackState = useCallback(async (): Promise<void> => {
    if (_persistTimer !== null) {
      clearTimeout(_persistTimer);
      _persistTimer = null;
    }
    const s = _state;
    const payload: PlaybackState = {
      trackId: s.currentTrackId,
      positionSeconds: s.currentTime,
      queueTrackIds: s.queue,
      queueIndex: s.queueIndex,
      isShuffle: s.isShuffle,
      repeatMode: s.repeatMode,
    };
    await savePlaybackState(payload);
  }, []);

  const restorePlaybackState = useCallback(async (): Promise<void> => {
    const saved = await fetchPlaybackState();
    if (!saved) return;
    _setState({
      currentTrackId: saved.trackId,
      queue: saved.queueTrackIds,
      queueIndex: saved.queueIndex,
      isShuffle: saved.isShuffle,
      repeatMode: saved.repeatMode,
      currentTime: saved.positionSeconds,
    });
    // Seek the audio element if it exists
    const audio = _audioRef.current;
    if (audio && saved.positionSeconds > 0) {
      audio.currentTime = saved.positionSeconds;
    }
  }, []);

  // -------------------------------------------------------------------------
  // Return store
  // -------------------------------------------------------------------------

  return {
    // State snapshot
    tracks: snapshot.tracks,
    likedTrackIds: snapshot.likedTrackIds,
    playlists: snapshot.playlists,
    isLoading: snapshot.isLoading,
    error: snapshot.error,
    currentTrackId: snapshot.currentTrackId,
    isPlaying: snapshot.isPlaying,
    currentTime: snapshot.currentTime,
    duration: snapshot.duration,
    isShuffle: snapshot.isShuffle,
    repeatMode: snapshot.repeatMode,
    queue: snapshot.queue,
    queueIndex: snapshot.queueIndex,
    volume: snapshot.volume,
    isMuted: snapshot.isMuted,
    // Shared audio ref getter
    getAudioRef: getMusicAudioRef,
    // Actions (stable callbacks)
    loadCatalogue,
    loadLikes,
    loadPlaylists,
    setCurrentTrack,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setQueue,
    next,
    previous,
    toggleShuffle,
    setRepeatMode,
    setVolume,
    setMuted,
    toggleLike,
    persistPlaybackState,
    restorePlaybackState,
  };
}
