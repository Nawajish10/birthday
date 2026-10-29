"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import "./music-room.css";
import {
  type MusicTrackItem,
  type MusicFilterType,
  type PlayerCardSize,
  PLAYLIST_NAMES,
  SEED_MUSIC_CATALOGUE,
  searchAndFilterTracks,
  formatDuration,
  getNextTrackIndex,
  getPreviousTrackIndex,
  createLocalTrack,
  revokeLocalTrackUrls,
} from "./music-catalogue";
import { useMusicStore, getMusicAudioRef } from "@/lib/music/use-music-store";
import {
  recordHistoryEvent,
  fetchHistory,
  fetchPlaylist,
  reorderPlaylistTracks,
  removeTrackFromPlaylist,
} from "@/lib/music/api-client";
import type { DbTrack, DbPlaylist, ListeningHistoryEntry } from "@/lib/music/types";
import {
  CreatePlaylistModal,
  EditPlaylistModal,
  AddToPlaylistModal,
} from "./PlaylistManagerModal";
import { LyricsPanel } from "./LyricsPanel";
import {
  ListeningHistoryList,
} from "./ListeningHistoryModal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CatalogueMode = "loading" | "loaded" | "fallback";
type RepeatMode = "off" | "all" | "one";

export interface MusicRoomProps {
  externalAudioRef?: React.RefObject<HTMLAudioElement | null>;
  onTrackSelected?: (track: MusicTrackItem) => void;
  initialTrackId?: string;
}

// ---------------------------------------------------------------------------
// Helper: convert a DbTrack to MusicTrackItem shape
// ---------------------------------------------------------------------------

function dbTrackToItem(track: DbTrack, likedIds: Set<string>): MusicTrackItem {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    duration: track.duration_seconds
      ? formatDuration(track.duration_seconds)
      : "--:--",
    durationSeconds: track.duration_seconds ?? 0,
    isFavorite: likedIds.has(track.id),
    url: track.audio_url ?? "",
    playlist: undefined,
    isLocal: false,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MusicRoom({
  externalAudioRef,
  onTrackSelected,
  initialTrackId,
}: MusicRoomProps): React.JSX.Element {
  // ------------------------------------------------------------------
  // Shared store
  // ------------------------------------------------------------------
  const store = useMusicStore();

  // ------------------------------------------------------------------
  // Catalogue mode
  // ------------------------------------------------------------------
  const [catalogueMode, setCatalogueMode] = useState<CatalogueMode>("loading");

  // ------------------------------------------------------------------
  // Local UI state (never promoted to store)
  // ------------------------------------------------------------------
  const [cardSize, setCardSize] = useState<PlayerCardSize>("standard");
  const [activeFilter, setActiveFilter] = useState<MusicFilterType>("all");
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [unavailableToast, setUnavailableToast] = useState<string | null>(null);
  const [showQueue, setShowQueue] = useState<boolean>(false);
  const [showLyrics, setShowLyrics] = useState<boolean>(false);

  // Modals state
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState<boolean>(false);
  const [editingPlaylist, setEditingPlaylist] = useState<DbPlaylist | null>(null);
  const [trackForPlaylist, setTrackForPlaylist] = useState<MusicTrackItem | null>(null);
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState<boolean>(false);

  // Recently played / listening history state
  const [historyEntries, setHistoryEntries] = useState<ListeningHistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Custom playlist tracks state (when viewing a specific user playlist)
  const [customPlaylistTracks, setCustomPlaylistTracks] = useState<MusicTrackItem[] | null>(null);
  const [isCustomPlaylistLoading, setIsCustomPlaylistLoading] = useState<boolean>(false);

  // ------------------------------------------------------------------
  // Seed/demo-mode local tracks (kept separate from store)
  // ------------------------------------------------------------------
  const [seedTracks, setSeedTracks] = useState<MusicTrackItem[]>(() => [
    ...SEED_MUSIC_CATALOGUE,
  ]);

  // Local file upload state — ephemeral, not in store
  const [localTracks, setLocalTracks] = useState<MusicTrackItem[]>([]);
  const localTracksRef = useRef<MusicTrackItem[]>([]);

  // ------------------------------------------------------------------
  // Playback state — bridge from store (with local fallbacks for demo mode)
  // ------------------------------------------------------------------
  const [localCurrentTrackId, setLocalCurrentTrackId] = useState<string>(
    () => {
      if (initialTrackId) {
        const match = SEED_MUSIC_CATALOGUE.find((t) => t.id === initialTrackId);
        if (match) return match.id;
      }
      return SEED_MUSIC_CATALOGUE[0]?.id ?? "";
    }
  );
  const [localIsPlaying, setLocalIsPlaying] = useState<boolean>(false);
  const [localCurrentTime, setLocalCurrentTime] = useState<number>(0);
  const [localDuration, setLocalDuration] = useState<number>(() => {
    const initial = SEED_MUSIC_CATALOGUE.find(
      (t) =>
        t.id === (initialTrackId || SEED_MUSIC_CATALOGUE[0]?.id)
    );
    return initial ? initial.durationSeconds : 0;
  });
  const [localIsShuffle, setLocalIsShuffle] = useState<boolean>(false);
  // 3-way repeat local (fallback when in demo mode)
  const [localRepeatMode, setLocalRepeatMode] = useState<RepeatMode>("off");
  const [localVolume, setLocalVolume] = useState<number>(0.85);
  const [localIsMuted, setLocalIsMuted] = useState<boolean>(false);

  // Use store values when loaded; local state in fallback/loading
  const isStoreMode = catalogueMode === "loaded";

  const currentTrackId: string | null = isStoreMode
    ? store.currentTrackId
    : localCurrentTrackId;
  const isPlaying: boolean = isStoreMode ? store.isPlaying : localIsPlaying;
  const currentTime: number = isStoreMode ? store.currentTime : localCurrentTime;
  const duration: number = isStoreMode ? store.duration : localDuration;
  const isShuffle: boolean = isStoreMode ? store.isShuffle : localIsShuffle;
  const repeatMode: RepeatMode = isStoreMode
    ? (store.repeatMode as RepeatMode)
    : localRepeatMode;
  const volume: number = isStoreMode ? store.volume : localVolume;
  const isMuted: boolean = isStoreMode ? store.isMuted : localIsMuted;

  // ------------------------------------------------------------------
  // Audio element ref resolution
  // ------------------------------------------------------------------
  const internalAudioRef = useRef<HTMLAudioElement | null>(null);

  const getAudioEl = useCallback((): HTMLAudioElement | null => {
    if (externalAudioRef !== undefined) {
      return externalAudioRef ? externalAudioRef.current : null;
    }
    // When store is active, use shared audio ref
    const sharedRef = getMusicAudioRef();
    if (isStoreMode && sharedRef.current) {
      return sharedRef.current;
    }
    return internalAudioRef.current;
  }, [externalAudioRef, isStoreMode]);

  // ------------------------------------------------------------------
  // Tracks: merge DB tracks (store) + local uploads + seed (fallback)
  // ------------------------------------------------------------------
  const tracks: MusicTrackItem[] = useMemo(() => {
    if (catalogueMode === "loaded") {
      // Map DB tracks; overlay liked state from store
      const dbItems = store.tracks.map((t) =>
        dbTrackToItem(t, store.likedTrackIds)
      );
      return [...localTracks, ...dbItems];
    }
    // fallback / loading: use seed tracks with local overrides
    return [...localTracks, ...seedTracks];
  }, [catalogueMode, store.tracks, store.likedTrackIds, localTracks, seedTracks]);

  const currentTrack = useMemo(
    () => tracks.find((t) => t.id === (currentTrackId ?? "")) || tracks[0] || null,
    [tracks, currentTrackId]
  );

  // Filtered tracks for all / favorites / static playlists
  const standardFilteredTracks = useMemo(
    () =>
      searchAndFilterTracks(tracks, searchQuery, activeFilter, selectedPlaylist),
    [tracks, searchQuery, activeFilter, selectedPlaylist]
  );

  // Active custom playlist resolution
  const isCustomPlaylistSelected =
    activeFilter === "playlists" && selectedPlaylist.startsWith("custom:");
  const customPlaylistId = isCustomPlaylistSelected
    ? selectedPlaylist.replace("custom:", "")
    : null;
  const currentCustomPlaylist = useMemo(
    () =>
      customPlaylistId
        ? store.playlists.find((p) => p.id === customPlaylistId) ?? null
        : null,
    [customPlaylistId, store.playlists]
  );

  // The active list of tracks to render in the table
  const displayedTracks = useMemo(() => {
    if (isCustomPlaylistSelected) {
      if (!customPlaylistTracks) return [];
      if (!searchQuery.trim()) return customPlaylistTracks;
      const q = searchQuery.toLowerCase().trim();
      return customPlaylistTracks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
      );
    }
    return standardFilteredTracks;
  }, [isCustomPlaylistSelected, customPlaylistTracks, searchQuery, standardFilteredTracks]);

  const totalCount = tracks.length;
  const favCount = useMemo(() => tracks.filter((t) => t.isFavorite).length, [tracks]);

  // ------------------------------------------------------------------
  // Load custom playlist tracks when custom playlist is chosen
  // ------------------------------------------------------------------
  const loadCustomPlaylist = useCallback(
    async (playlistId: string) => {
      try {
        setIsCustomPlaylistLoading(true);
        const pl = await fetchPlaylist(playlistId);
        if (pl.tracks) {
          const items = pl.tracks.map((t) =>
            dbTrackToItem(t, store.likedTrackIds)
          );
          setCustomPlaylistTracks(items);
        } else {
          setCustomPlaylistTracks([]);
        }
      } catch {
        setCustomPlaylistTracks([]);
      } finally {
        setIsCustomPlaylistLoading(false);
      }
    },
    [store.likedTrackIds]
  );

  useEffect(() => {
    if (!isCustomPlaylistSelected || !customPlaylistId) return;
    let isMounted = true;
    fetchPlaylist(customPlaylistId)
      .then((pl) => {
        if (!isMounted) return;
        const items = (pl.tracks ?? []).map((t) => dbTrackToItem(t, store.likedTrackIds));
        setCustomPlaylistTracks(items);
        setIsCustomPlaylistLoading(false);
      })
      .catch(() => {
        if (isMounted) {
          setCustomPlaylistTracks([]);
          setIsCustomPlaylistLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [isCustomPlaylistSelected, customPlaylistId, store.likedTrackIds]);

  useEffect(() => {
    if (activeFilter !== "recently-played") return;
    let isMounted = true;
    fetchHistory(30)
      .then((data) => {
        if (!isMounted) return;
        setHistoryEntries(data);
        setIsHistoryLoading(false);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setHistoryError(err instanceof Error ? err.message : "Failed to load history.");
        setIsHistoryLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [activeFilter]);

  // ------------------------------------------------------------------
  // On mount: try to load catalogue, likes, and playlists from store
  // ------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await store.loadCatalogue();
        if (cancelled) return;

        // Also load likes for isFavorite state
        await store.loadLikes();
        if (cancelled) return;

        // Load custom playlists
        await store.loadPlaylists();
        if (cancelled) return;

        setCatalogueMode("loaded");

        // Restore persisted playback state (don't auto-play)
        try {
          await store.restorePlaybackState();
        } catch {
          // non-critical
        }

        // If initialTrackId requested and not yet active, honor it
        if (
          initialTrackId &&
          store.currentTrackId !== initialTrackId
        ) {
          store.setCurrentTrack(initialTrackId);
        }
      } catch {
        if (!cancelled) {
          setCatalogueMode("fallback");
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------------
  // History recording
  // ------------------------------------------------------------------
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHistoryTrackRef = useRef<string | null>(null);

  const clearHistoryTimer = useCallback(() => {
    if (historyTimerRef.current !== null) {
      clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
    }
  }, []);

  // When a DB track starts playing, schedule 30-second history record
  const scheduleHistoryRecord = useCallback(
    (trackId: string) => {
      if (lastHistoryTrackRef.current === trackId) return; // already scheduled
      clearHistoryTimer();
      lastHistoryTrackRef.current = trackId;
      historyTimerRef.current = setTimeout(() => {
        recordHistoryEvent(trackId, { completed: false, progressSeconds: 30 }).catch(
          () => undefined
        );
      }, 30_000);
    },
    [clearHistoryTimer]
  );

  // ------------------------------------------------------------------
  // Clean up local blob URLs on unmount
  // ------------------------------------------------------------------
  useEffect(() => {
    const ref = localTracksRef.current;
    return () => {
      revokeLocalTrackUrls(ref);
      clearHistoryTimer();
    };
  }, [clearHistoryTimer]);

  // ------------------------------------------------------------------
  // Sync volume with audio element
  // ------------------------------------------------------------------
  useEffect(() => {
    const audio = getAudioEl();
    if (audio) {
      audio.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, getAudioEl]);

  // ------------------------------------------------------------------
  // Playback helpers (local mode)
  // ------------------------------------------------------------------

  const setCurrentTrackId = useCallback(
    (id: string) => {
      if (isStoreMode) {
        store.setCurrentTrack(id);
      } else {
        setLocalCurrentTrackId(id);
      }
    },
    [isStoreMode, store]
  );

  const setIsPlayingState = useCallback(
    (playing: boolean) => {
      if (isStoreMode) {
        store.setIsPlaying(playing);
      } else {
        setLocalIsPlaying(playing);
      }
    },
    [isStoreMode, store]
  );

  const setCurrentTimeState = useCallback(
    (t: number) => {
      if (isStoreMode) {
        store.setCurrentTime(t);
      } else {
        setLocalCurrentTime(t);
      }
    },
    [isStoreMode, store]
  );

  const setDurationState = useCallback(
    (d: number) => {
      if (isStoreMode) {
        store.setDuration(d);
      } else {
        setLocalDuration(d);
      }
    },
    [isStoreMode, store]
  );

  // ------------------------------------------------------------------
  // startPlayback
  // ------------------------------------------------------------------
  const startPlayback = useCallback(
    (track: MusicTrackItem) => {
      const audio = getAudioEl();

      if (!track.url) {
        setIsPlayingState(false);
        setUnavailableToast(
          `Demo Track: "${track.title}" does not have an audio file attached yet. Upload a local song or add an MP3 in the creator studio.`
        );
        if (audio) {
          audio.pause();
        }
        return;
      }

      setUnavailableToast(null);

      if (audio) {
        if (typeof document !== "undefined") {
          try {
            document.querySelectorAll("video").forEach((v) => { if (!v.paused) v.pause(); });
          } catch {}
        }
        if (audio.src !== track.url) {
          audio.src = track.url;
          audio.load();
        }
        audio
          .play()
          .then(() => {
            setIsPlayingState(true);
            // Schedule history only for DB-backed tracks (non-local, has url, not seed)
            if (!track.isLocal && catalogueMode === "loaded") {
              scheduleHistoryRecord(track.id);
            }
          })
          .catch(() => {
            setIsPlayingState(false);
            setUnavailableToast(
              `Could not play "${track.title}". Check audio format compatibility.`
            );
          });
      }
    },
    [getAudioEl, setIsPlayingState, catalogueMode, scheduleHistoryRecord]
  );

  // ------------------------------------------------------------------
  // handleSelectTrack
  // ------------------------------------------------------------------
  const handleSelectTrack = useCallback(
    (track: MusicTrackItem, autoPlay = true) => {
      setCurrentTrackId(track.id);
      setCurrentTimeState(0);
      setDurationState(track.durationSeconds || 0);
      clearHistoryTimer();
      lastHistoryTrackRef.current = null;

      if (onTrackSelected) {
        onTrackSelected(track);
      }

      if (autoPlay) {
        startPlayback(track);
      } else {
        const audio = getAudioEl();
        if (audio && track.url && audio.src !== track.url) {
          audio.src = track.url;
        }
        setIsPlayingState(false);
      }
    },
    [
      onTrackSelected,
      startPlayback,
      getAudioEl,
      setCurrentTrackId,
      setCurrentTimeState,
      setDurationState,
      setIsPlayingState,
      clearHistoryTimer,
    ]
  );

  // ------------------------------------------------------------------
  // Toggle play / pause
  // ------------------------------------------------------------------
  const handleTogglePlay = useCallback(() => {
    if (!currentTrack) return;

    if (isPlaying) {
      const audio = getAudioEl();
      if (audio) {
        audio.pause();
      }
      setIsPlayingState(false);
    } else {
      startPlayback(currentTrack);
    }
  }, [currentTrack, isPlaying, getAudioEl, startPlayback, setIsPlayingState]);

  // ------------------------------------------------------------------
  // Repeat cycle (3-way)
  // ------------------------------------------------------------------
  const cycleRepeatMode = useCallback(() => {
    const next: RepeatMode =
      repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off";
    if (isStoreMode) {
      store.setRepeatMode(next);
    } else {
      setLocalRepeatMode(next);
    }
  }, [repeatMode, isStoreMode, store]);

  // ------------------------------------------------------------------
  // Next track
  // ------------------------------------------------------------------
  const handleNextTrack = useCallback(() => {
    const activeList = displayedTracks.length > 0 ? displayedTracks : tracks;
    if (activeList.length === 0) return;

    if (isStoreMode) {
      const isRepeatAll = repeatMode === "all";
      const isRepeatOne = repeatMode === "one";

      if (isRepeatOne) {
        const audio = getAudioEl();
        if (audio) {
          audio.currentTime = 0;
          audio.play().catch(() => undefined);
        }
        return;
      }

      const currentIndex = activeList.findIndex((t) => t.id === currentTrackId);
      const nextIdx = getNextTrackIndex(
        currentIndex,
        activeList.length,
        isShuffle,
        isRepeatAll
      );

      if (nextIdx !== -1 && activeList[nextIdx]) {
        handleSelectTrack(activeList[nextIdx], isPlaying);
      } else {
        setIsPlayingState(false);
        setCurrentTimeState(0);
        const audio = getAudioEl();
        if (audio) audio.pause();
      }
    } else {
      const currentIndex = activeList.findIndex((t) => t.id === currentTrackId);
      const isRepeatBool = repeatMode === "all";
      const nextIdx = getNextTrackIndex(
        currentIndex,
        activeList.length,
        isShuffle,
        isRepeatBool
      );

      if (nextIdx !== -1 && activeList[nextIdx]) {
        handleSelectTrack(activeList[nextIdx], isPlaying);
      } else {
        setIsPlayingState(false);
        setCurrentTimeState(0);
        const audio = getAudioEl();
        if (audio) audio.pause();
      }
    }
  }, [
    displayedTracks,
    tracks,
    isStoreMode,
    repeatMode,
    currentTrackId,
    isShuffle,
    isPlaying,
    handleSelectTrack,
    getAudioEl,
    setIsPlayingState,
    setCurrentTimeState,
  ]);

  // ------------------------------------------------------------------
  // Previous track
  // ------------------------------------------------------------------
  const handlePreviousTrack = useCallback(() => {
    const activeList = displayedTracks.length > 0 ? displayedTracks : tracks;
    if (activeList.length === 0) return;
    const currentIndex = activeList.findIndex((t) => t.id === currentTrackId);
    const prevIdx = getPreviousTrackIndex(currentIndex, activeList.length);

    if (prevIdx !== -1 && activeList[prevIdx]) {
      handleSelectTrack(activeList[prevIdx], isPlaying);
    }
  }, [displayedTracks, tracks, currentTrackId, isPlaying, handleSelectTrack]);

  // ------------------------------------------------------------------
  // Audio event listeners
  // ------------------------------------------------------------------
  useEffect(() => {
    const audio = getAudioEl();
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTimeState(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration)) {
        setDurationState(Math.floor(audio.duration));
      }
    };

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDurationState(Math.floor(audio.duration));
      }
    };

    const onEnded = () => {
      // Record history completion for DB tracks
      if (currentTrack && !currentTrack.isLocal && catalogueMode === "loaded") {
        recordHistoryEvent(currentTrack.id, { completed: true }).catch(
          () => undefined
        );
        clearHistoryTimer();
        lastHistoryTrackRef.current = null;
      }
      handleNextTrack();
    };

    const onPlay = () => setIsPlayingState(true);
    const onPause = () => setIsPlayingState(false);
    const onError = () => {
      setIsPlayingState(false);
      setUnavailableToast(`Playback issue with "${currentTrack?.title || "track"}". Check format compatibility.`);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
    };
  }, [
    getAudioEl,
    handleNextTrack,
    setCurrentTimeState,
    setDurationState,
    setIsPlayingState,
    currentTrack,
    catalogueMode,
    clearHistoryTimer,
  ]);

  // ------------------------------------------------------------------
  // Seek / progress scrubbing
  // ------------------------------------------------------------------
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setCurrentTimeState(newTime);
    const audio = getAudioEl();
    if (audio) {
      audio.currentTime = newTime;
    }
  };

  // ------------------------------------------------------------------
  // Shuffle
  // ------------------------------------------------------------------
  const handleToggleShuffle = useCallback(() => {
    if (isStoreMode) {
      store.toggleShuffle();
    } else {
      setLocalIsShuffle((prev) => !prev);
    }
  }, [isStoreMode, store]);

  // ------------------------------------------------------------------
  // Volume
  // ------------------------------------------------------------------
  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value);
      if (isStoreMode) {
        store.setVolume(v);
        if (isMuted) store.setMuted(false);
      } else {
        setLocalVolume(v);
        if (isMuted) setLocalIsMuted(false);
      }
    },
    [isStoreMode, store, isMuted]
  );

  const handleToggleMute = useCallback(() => {
    if (isStoreMode) {
      store.setMuted(!isMuted);
    } else {
      setLocalIsMuted((prev) => !prev);
    }
  }, [isStoreMode, store, isMuted]);

  // ------------------------------------------------------------------
  // Toggle Favorite
  // ------------------------------------------------------------------
  const handleToggleFavorite = useCallback(
    (trackId: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();

      const track = tracks.find((t) => t.id === trackId);
      if (!track) return;

      if (!track.isLocal && catalogueMode === "loaded") {
        store.toggleLike(trackId).catch(() => undefined);
      } else {
        setSeedTracks((prev) =>
          prev.map((t) =>
            t.id === trackId ? { ...t, isFavorite: !t.isFavorite } : t
          )
        );
      }
    },
    [tracks, catalogueMode, store]
  );

  // ------------------------------------------------------------------
  // Reorder and remove in custom playlists
  // ------------------------------------------------------------------
  const handleReorderPlaylistTrack = useCallback(
    async (idx: number, direction: -1 | 1) => {
      if (!customPlaylistTracks || !customPlaylistId) return;
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= customPlaylistTracks.length) return;

      const updated = [...customPlaylistTracks];
      const [item] = updated.splice(idx, 1);
      updated.splice(targetIdx, 0, item);
      setCustomPlaylistTracks(updated);

      try {
        await reorderPlaylistTracks(
          customPlaylistId,
          updated.map((t) => t.id)
        );
      } catch {
        loadCustomPlaylist(customPlaylistId);
      }
    },
    [customPlaylistTracks, customPlaylistId, loadCustomPlaylist]
  );

  const handleRemoveTrackFromCustomPlaylist = useCallback(
    async (trackId: string) => {
      if (!customPlaylistId) return;
      setCustomPlaylistTracks((prev) =>
        prev ? prev.filter((t) => t.id !== trackId) : null
      );

      try {
        await removeTrackFromPlaylist(customPlaylistId, trackId);
        store.loadPlaylists();
      } catch {
        loadCustomPlaylist(customPlaylistId);
      }
    },
    [customPlaylistId, store, loadCustomPlaylist]
  );

  // ------------------------------------------------------------------
  // Local File Upload
  // ------------------------------------------------------------------
  const handleAddLocalFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newLocalTracks: MusicTrackItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (
        typeof window !== "undefined" &&
        window.URL &&
        window.URL.createObjectURL
      ) {
        const objectUrl = window.URL.createObjectURL(file);
        const item = createLocalTrack(file, objectUrl);
        newLocalTracks.push(item);
        localTracksRef.current.push(item);
      }
    }

    if (newLocalTracks.length > 0) {
      setLocalTracks((prev) => [...newLocalTracks, ...prev]);
      handleSelectTrack(newLocalTracks[0], true);
      setActiveFilter("all");
    }

    e.target.value = "";
  };

  // ------------------------------------------------------------------
  // Queue items (resolved to MusicTrackItem from store queue)
  // ------------------------------------------------------------------
  const queueItems = useMemo((): MusicTrackItem[] => {
    if (!isStoreMode || store.queue.length === 0) return [];
    return store.queue
      .map((id) => tracks.find((t) => t.id === id))
      .filter((t): t is MusicTrackItem => t !== undefined);
  }, [isStoreMode, store.queue, tracks]);

  // ------------------------------------------------------------------
  // Repeat button label / class
  // ------------------------------------------------------------------
  const repeatLabel =
    repeatMode === "off"
      ? "Enable repeat-all (↻)"
      : repeatMode === "all"
      ? "Enable repeat-one (①↻)"
      : "Disable repeat (↻)";

  const repeatDisplay =
    repeatMode === "off" ? "↻" : repeatMode === "all" ? "↻" : "①↻";

  const repeatBtnClass = [
    "music-btn-control",
    repeatMode !== "off" ? "is-active" : "",
    repeatMode === "one" ? "is-repeat-one" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="music-room-container" data-theme="love">
      {/* Audio element: external → store's ref → internal */}
      {!externalAudioRef && (
        isStoreMode
          ? <audio ref={getMusicAudioRef()} preload="metadata" />
          : <audio ref={internalAudioRef} preload="metadata" />
      )}

      {/* Header */}
      <header className="music-room-header">
        <span className="music-room-kicker">
          <span>✿</span> OUR LITTLE SOUNDTRACK <span>✿</span>
        </span>
        <h1 className="music-room-title">
          Music Room <span className="heart-glyph">♡</span>
        </h1>
        <p className="music-room-subtitle">
          Every melody carries a moment, and every song brings us back to each
          other. Listen to our shared catalogue or upload your own favorites.
        </p>
      </header>

      {/* Loading state */}
      {catalogueMode === "loading" && (
        <div className="music-loading-state" role="status" aria-live="polite">
          <span>♫</span> Loading music catalogue…
        </div>
      )}

      {/* Demo mode notice */}
      {catalogueMode === "fallback" && (
        <div className="music-demo-notice" role="alert">
          <span>🎵</span> Running in demo mode — audio files are unavailable.
          Sign in to stream the full catalogue.
        </div>
      )}

      {/* Toolbar: Search, Filters, Add Local Songs */}
      <section className="music-toolbar" aria-label="Music library controls">
        <div className="music-toolbar-top">
          {/* Search Box */}
          <div className="music-search-box">
            <span className="music-search-icon" aria-hidden="true">
              🔍
            </span>
            <input
              type="search"
              className="music-search-input"
              placeholder="Search songs or artists…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search song library"
            />
            {searchQuery && (
              <button
                type="button"
                className="music-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search query"
              >
                ×
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="music-filter-chips" role="radiogroup" aria-label="Filter catalogue">
            <button
              type="button"
              className={`music-chip ${activeFilter === "all" ? "is-active" : ""}`}
              onClick={() => setActiveFilter("all")}
              role="radio"
              aria-checked={activeFilter === "all"}
            >
              All Songs <span className="music-chip-count">{totalCount}</span>
            </button>
            <button
              type="button"
              className={`music-chip ${activeFilter === "favorites" ? "is-active" : ""}`}
              onClick={() => setActiveFilter("favorites")}
              role="radio"
              aria-checked={activeFilter === "favorites"}
            >
              Favourites ♡ <span className="music-chip-count">{favCount}</span>
            </button>
            <button
              type="button"
              className={`music-chip ${activeFilter === "playlists" ? "is-active" : ""}`}
              onClick={() => setActiveFilter("playlists")}
              role="radio"
              aria-checked={activeFilter === "playlists"}
            >
              Playlists ♫
            </button>
            <button
              type="button"
              className={`music-chip ${activeFilter === "recently-played" ? "is-active" : ""}`}
              onClick={() => setActiveFilter("recently-played")}
              role="radio"
              aria-checked={activeFilter === "recently-played"}
            >
              Recently Played ↺
            </button>
          </div>

          {/* Add Local Songs Button */}
          <div className="music-upload-wrapper">
            <input
              type="file"
              id="music-local-input"
              className="music-upload-input"
              accept="audio/*,audio/mp4,video/mp4,audio/aac,audio/x-m4a,audio/mp3,.mp3,.mp4,.m4a,.aac,.wav,.ogg"
              multiple
              onChange={handleAddLocalFiles}
              aria-label="Upload local audio files"
            />
            <label htmlFor="music-local-input" className="music-upload-btn">
              <span>＋</span> Add local songs
            </label>
          </div>
        </div>

        {/* Playlists Sub-Selector Chips */}
        {activeFilter === "playlists" && (
          <div className="music-playlist-pills" role="radiogroup" aria-label="Select playlist">
            <button
              type="button"
              className={`music-playlist-pill ${selectedPlaylist === "all" ? "is-active" : ""}`}
              onClick={() => setSelectedPlaylist("all")}
            >
              All Playlists
            </button>
            {PLAYLIST_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                className={`music-playlist-pill ${selectedPlaylist === name ? "is-active" : ""}`}
                onClick={() => setSelectedPlaylist(name)}
              >
                {name}
              </button>
            ))}
            {store.playlists.map((pl) => (
              <button
                key={pl.id}
                type="button"
                className={`music-playlist-pill ${selectedPlaylist === `custom:${pl.id}` ? "is-active" : ""}`}
                onClick={() => setSelectedPlaylist(`custom:${pl.id}`)}
              >
                {pl.name} {pl.track_count !== undefined ? `(${pl.track_count})` : ""}
              </button>
            ))}
            <button
              type="button"
              className={`music-playlist-pill ${selectedPlaylist === "Local Uploads" ? "is-active" : ""}`}
              onClick={() => setSelectedPlaylist("Local Uploads")}
            >
              Local Uploads
            </button>
            <button
              type="button"
              className="music-new-playlist-btn"
              onClick={() => setIsCreatePlaylistOpen(true)}
              aria-label="Create new playlist"
            >
              ＋ New Playlist
            </button>
          </div>
        )}
      </section>

      {/* Featured Now Playing Card */}
      <section
        className={`music-player-card ${cardSize} ${isPlaying ? "is-playing" : "is-paused"}`}
        aria-label="Now Playing card"
      >
        {/* Floral Corner Accents */}
        <span className="music-card-floral-corner music-card-floral-tl" aria-hidden="true">✿</span>
        <span className="music-card-floral-corner music-card-floral-tr" aria-hidden="true">✿</span>
        <span className="music-card-floral-corner music-card-floral-bl" aria-hidden="true">✿</span>
        <span className="music-card-floral-corner music-card-floral-br" aria-hidden="true">✿</span>

        {/* Top Bar: Now Playing Label & Size Switcher */}
        <div className="music-player-topbar">
          <div className="music-player-nowplaying-badge">
            <span className="pulse-dot" aria-hidden="true" />
            <span>NOW PLAYING</span>
          </div>

          {/* Size Switcher */}
          <div className="music-size-switcher" role="radiogroup" aria-label="Player card size">
            <button
              type="button"
              className={`music-size-btn ${cardSize === "compact" ? "is-active" : ""}`}
              onClick={() => setCardSize("compact")}
              role="radio"
              aria-checked={cardSize === "compact"}
              aria-label="Compact player view"
            >
              Compact
            </button>
            <button
              type="button"
              className={`music-size-btn ${cardSize === "standard" ? "is-active" : ""}`}
              onClick={() => setCardSize("standard")}
              role="radio"
              aria-checked={cardSize === "standard"}
              aria-label="Standard player view"
            >
              Standard
            </button>
            <button
              type="button"
              className={`music-size-btn ${cardSize === "expanded" ? "is-active" : ""}`}
              onClick={() => setCardSize("expanded")}
              role="radio"
              aria-checked={cardSize === "expanded"}
              aria-label="Expanded player view"
            >
              Expanded
            </button>
          </div>
        </div>

        {/* Main Player Body: Vinyl Turntable & Track Meta */}
        <div className="music-player-main">
          {/* Turntable Platter */}
          <div className="music-vinyl-section">
            <div className="music-vinyl-turntable">
              {/* Pure SVG Vinyl Record Platter */}
              <svg
                className="music-vinyl-disc"
                viewBox="0 0 200 200"
                role="img"
                aria-label={`Vinyl record platter for ${currentTrack ? currentTrack.title : "soundtrack"}`}
              >
                <defs>
                  <radialGradient id="platterGrooves" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#1A0F1F" />
                    <stop offset="35%" stopColor="#2A162D" />
                    <stop offset="68%" stopColor="#16081A" />
                    <stop offset="85%" stopColor="#251229" />
                    <stop offset="100%" stopColor="#120614" />
                  </radialGradient>
                  <linearGradient id="platterSheen" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255, 255, 255, 0.15)" />
                    <stop offset="45%" stopColor="rgba(255, 255, 255, 0)" />
                    <stop offset="55%" stopColor="rgba(255, 255, 255, 0)" />
                    <stop offset="100%" stopColor="rgba(255, 255, 255, 0.12)" />
                  </linearGradient>
                </defs>

                {/* Vinyl Base */}
                <circle cx="100" cy="100" r="96" fill="url(#platterGrooves)" stroke="#3A1F3B" strokeWidth="2" />

                {/* Grooves */}
                <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255, 255, 255, 0.06)" strokeWidth="1" />
                <circle cx="100" cy="100" r="78" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="0.8" />
                <circle cx="100" cy="100" r="68" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.8" />
                <circle cx="100" cy="100" r="58" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="0.8" />
                <circle cx="100" cy="100" r="48" fill="none" stroke="rgba(255, 255, 255, 0.06)" strokeWidth="0.8" />

                {/* Light Sheen Reflection */}
                <circle cx="100" cy="100" r="96" fill="url(#platterSheen)" />

                {/* Center Badge */}
                <circle cx="100" cy="100" r="34" fill="#F7A8B8" stroke="#D4A47C" strokeWidth="2" />
                <circle cx="100" cy="100" r="30" fill="#3A1F3B" />
                <text x="100" y="106" textAnchor="middle" fill="#F7A8B8" fontSize="16" fontFamily="sans-serif">
                  ✿
                </text>
                <circle cx="100" cy="100" r="4.5" fill="#1A0F1F" stroke="#F8F1E9" strokeWidth="1" />
              </svg>

              {/* Tonearm */}
              <svg className="music-tonearm" viewBox="0 0 50 100" aria-hidden="true">
                <circle cx="25" cy="12" r="10" fill="#2A162D" stroke="#D4A47C" strokeWidth="2" />
                <circle cx="25" cy="12" r="4" fill="#D4A47C" />
                <path d="M25 18 L25 72 L32 82" fill="none" stroke="#D4A47C" strokeWidth="3" strokeLinecap="round" />
                <rect x="27" y="78" width="10" height="15" rx="2" fill="#F7A8B8" />
                <circle cx="32" cy="94" r="1.5" fill="#FFF" />
              </svg>
            </div>
          </div>

          {/* Track Metadata & Controls */}
          <div className="music-track-meta">
            <div className="music-meta-header">
              <div className="music-meta-titles">
                <h2 className="music-track-title">{currentTrack?.title || "No song selected"}</h2>
                <p className="music-track-artist">{currentTrack?.artist || "Soundtrack"}</p>
                {currentTrack?.playlist && (
                  <span className="music-track-playlist-badge">{currentTrack.playlist}</span>
                )}
              </div>

              {currentTrack && (
                <button
                  type="button"
                  className={`music-favorite-btn ${currentTrack.isFavorite ? "is-favorite" : ""}`}
                  onClick={(e) => handleToggleFavorite(currentTrack.id, e)}
                  aria-label={
                    currentTrack.isFavorite
                      ? `Remove ${currentTrack.title} from favourites`
                      : `Add ${currentTrack.title} to favourites`
                  }
                >
                  {currentTrack.isFavorite ? "♥" : "♡"}
                </button>
              )}
            </div>

            {/* Progress Slider */}
            <div className="music-progress-container">
              <input
                type="range"
                className="music-progress-slider"
                min={0}
                max={duration > 0 ? duration : 100}
                value={currentTime}
                onChange={handleProgressChange}
                aria-label="Track progress slider"
              />
              <div className="music-progress-times">
                <span>{formatDuration(currentTime)}</span>
                <span>{formatDuration(duration)}</span>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="music-controls-bar">
              <div className="music-playback-buttons">
                {/* Shuffle */}
                <button
                  type="button"
                  className={`music-btn-control ${isShuffle ? "is-active" : ""}`}
                  onClick={handleToggleShuffle}
                  aria-pressed={isShuffle}
                  aria-label={isShuffle ? "Disable shuffle" : "Enable shuffle"}
                  title="Shuffle (⤨)"
                >
                  ⤨
                </button>

                {/* Previous */}
                <button
                  type="button"
                  className="music-btn-control"
                  onClick={handlePreviousTrack}
                  aria-label="Previous track (|◀)"
                  title="Previous (|◀)"
                >
                  |◀
                </button>

                {/* Play / Pause */}
                <button
                  type="button"
                  className="music-btn-playpause"
                  onClick={handleTogglePlay}
                  aria-label={isPlaying ? "Pause track (Ⅱ)" : "Play track (▶)"}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? "Ⅱ" : "▶"}
                </button>

                {/* Next */}
                <button
                  type="button"
                  className="music-btn-control"
                  onClick={handleNextTrack}
                  aria-label="Next track (▶|)"
                  title="Next (▶|)"
                >
                  ▶|
                </button>

                {/* Repeat — 3-way cycle: off → all → one → off */}
                <button
                  type="button"
                  className={repeatBtnClass}
                  onClick={cycleRepeatMode}
                  aria-pressed={repeatMode !== "off"}
                  aria-label={repeatLabel}
                  title={repeatLabel}
                >
                  {repeatDisplay}
                </button>

                {/* Synchronized Lyrics Toggle */}
                <button
                  type="button"
                  className={`music-btn-control music-lyrics-toggle-btn ${showLyrics ? "is-active" : ""}`}
                  onClick={() => setShowLyrics((v) => !v)}
                  aria-pressed={showLyrics}
                  aria-label={showLyrics ? "Hide synchronized lyrics" : "Show synchronized lyrics"}
                  title="Toggle lyrics (💬)"
                >
                  💬
                </button>
              </div>

              {/* Volume Slider */}
              <div className="music-volume-box">
                <button
                  type="button"
                  className="music-volume-icon-btn"
                  onClick={handleToggleMute}
                  aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                >
                  {isMuted || volume === 0 ? "🔇" : "🔉"}
                </button>
                <input
                  type="range"
                  className="music-volume-slider"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  aria-label="Volume slider"
                />
                <span className="music-volume-icon-btn" aria-hidden="true">
                  🔊
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Graceful Toast for Unavailable Demo Audio */}
        {unavailableToast && (
          <div className="music-notice-toast" role="alert">
            <span>♫ {unavailableToast}</span>
            <button
              type="button"
              className="music-notice-dismiss"
              onClick={() => setUnavailableToast(null)}
              aria-label="Dismiss notice"
            >
              ×
            </button>
          </div>
        )}

        {/* Lyrics Panel Expansion */}
        <LyricsPanel
          trackId={currentTrack?.id ?? null}
          trackTitle={currentTrack?.title}
          trackArtist={currentTrack?.artist}
          currentTime={currentTime}
          isOpen={showLyrics}
          onClose={() => setShowLyrics(false)}
          onSeek={(seekSec) => {
            setCurrentTimeState(seekSec);
            const audio = getAudioEl();
            if (audio) {
              audio.currentTime = seekSec;
            }
          }}
        />

        {/* Queue Panel */}
        {isStoreMode && queueItems.length > 0 && (
          <div className="music-queue-panel">
            <button
              type="button"
              className="music-queue-toggle"
              onClick={() => setShowQueue((v) => !v)}
              aria-expanded={showQueue}
              aria-controls="music-queue-list"
            >
              {showQueue ? "▾" : "▸"} Queue ({queueItems.length})
            </button>
            {showQueue && (
              <ol
                id="music-queue-list"
                className="music-queue-list"
                aria-label="Upcoming queue"
              >
                {queueItems.map((item, idx) => {
                  const isCurrent = item.id === currentTrackId;
                  return (
                    <li
                      key={item.id}
                      className={`music-queue-item${isCurrent ? " is-current" : ""}`}
                      onClick={() => handleSelectTrack(item, true)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectTrack(item, true);
                        }
                      }}
                      aria-label={`${isCurrent ? "Now playing: " : ""}${item.title} by ${item.artist}`}
                    >
                      <span className="music-queue-item-index">
                        {isCurrent ? "♫" : String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="music-queue-item-info">
                        <span className="music-queue-item-title">{item.title}</span>
                        <span className="music-queue-item-artist">{item.artist}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}
      </section>

      {/* Library Table / Grid / Recently Played Section */}
      {activeFilter === "recently-played" ? (
        <section className="music-library-section" aria-label="Recently played tracks">
          <div className="music-library-header">
            <h2 className="music-library-title">Recently Played Melodies</h2>
            <span className="music-library-count">
              {historyEntries.length} {historyEntries.length === 1 ? "track" : "tracks"}
            </span>
          </div>

          <ListeningHistoryList
            entries={historyEntries}
            isLoading={isHistoryLoading}
            error={historyError}
            onSelectTrack={(track) => handleSelectTrack(track, true)}
            knownTracks={tracks}
          />
        </section>
      ) : (
        <section className="music-library-section" aria-label="Song catalogue library">
          <div className="music-library-header">
            <h2 className="music-library-title">Song Library</h2>
            <span className="music-library-count">
              {displayedTracks.length} {displayedTracks.length === 1 ? "track" : "tracks"}
            </span>
          </div>

          {/* Custom Playlist Header (When viewing a user-created playlist) */}
          {isCustomPlaylistSelected && currentCustomPlaylist && (
            <div className="music-custom-playlist-header">
              <div className="music-custom-playlist-meta">
                <h3 className="music-custom-playlist-name">{currentCustomPlaylist.name}</h3>
                {currentCustomPlaylist.description && (
                  <p className="music-custom-playlist-desc">{currentCustomPlaylist.description}</p>
                )}
              </div>
              <button
                type="button"
                className="music-custom-playlist-edit-btn"
                onClick={() => setEditingPlaylist(currentCustomPlaylist)}
              >
                ⚙ Edit Playlist
              </button>
            </div>
          )}

          {isCustomPlaylistLoading ? (
            <div className="music-loading-state" role="status" aria-live="polite">
              <span>♫</span> Loading playlist tracks…
            </div>
          ) : displayedTracks.length > 0 ? (
            <div className="music-table-wrapper">
              <table className="music-table">
                <thead>
                  <tr>
                    <th className="music-col-index">#</th>
                    <th className="music-col-cover"></th>
                    <th className="music-col-info">Title &amp; Artist</th>
                    <th className="music-col-playlist">Playlist</th>
                    <th className="music-col-duration">Duration</th>
                    <th className="music-col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedTracks.map((track, idx) => {
                    const isActive = track.id === currentTrackId;
                    return (
                      <tr
                        key={track.id}
                        className={`music-track-row ${isActive ? "is-active-row" : ""}`}
                        onClick={() => handleSelectTrack(track, true)}
                      >
                        <td className="music-col-index">
                          {isActive && isPlaying ? "♫" : String(idx + 1).padStart(2, "0")}
                        </td>
                        <td className="music-col-cover">
                          <div className="music-mini-cover" aria-hidden="true">
                            <span>✿</span>
                          </div>
                        </td>
                        <td className="music-col-info">
                          <div className="music-row-title">{track.title}</div>
                          <div className="music-row-artist">{track.artist}</div>
                        </td>
                        <td className="music-col-playlist">
                          {isCustomPlaylistSelected
                            ? currentCustomPlaylist?.name
                            : track.playlist || "—"}
                        </td>
                        <td className="music-col-duration">{track.duration}</td>
                        <td
                          className="music-col-actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="music-track-actions-cell">
                            {/* Reorder and remove buttons when viewing custom playlist */}
                            {isCustomPlaylistSelected && (
                              <>
                                <button
                                  type="button"
                                  className="music-track-reorder-btn"
                                  onClick={() => handleReorderPlaylistTrack(idx, -1)}
                                  disabled={idx === 0}
                                  aria-label={`Move ${track.title} up`}
                                  title="Move up (▲)"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  className="music-track-reorder-btn"
                                  onClick={() => handleReorderPlaylistTrack(idx, 1)}
                                  disabled={idx === displayedTracks.length - 1}
                                  aria-label={`Move ${track.title} down`}
                                  title="Move down (▼)"
                                >
                                  ▼
                                </button>
                                <button
                                  type="button"
                                  className="music-track-remove-btn"
                                  onClick={() => handleRemoveTrackFromCustomPlaylist(track.id)}
                                  aria-label={`Remove ${track.title} from playlist`}
                                  title="Remove from playlist (×)"
                                >
                                  ×
                                </button>
                              </>
                            )}

                            {/* Add to Playlist button */}
                            <button
                              type="button"
                              className="music-table-action-btn music-add-to-playlist-btn"
                              onClick={() => {
                                setTrackForPlaylist(track);
                                setIsAddToPlaylistOpen(true);
                              }}
                              aria-label={`Add ${track.title} to playlist`}
                              title="Add to playlist (＋)"
                            >
                              ＋
                            </button>

                            {/* Heart favorite button */}
                            <button
                              type="button"
                              className={`music-table-action-btn ${track.isFavorite ? "is-fav" : ""}`}
                              onClick={(e) => handleToggleFavorite(track.id, e)}
                              aria-label={
                                track.isFavorite
                                  ? `Remove ${track.title} from favourites`
                                  : `Add ${track.title} to favourites`
                              }
                            >
                              {track.isFavorite ? "♥" : "♡"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="music-empty-state">
              <span className="music-empty-icon" aria-hidden="true">
                🌸
              </span>
              <h3 className="music-empty-title">
                {searchQuery ? "No matching songs found" : "No songs in this list"}
              </h3>
              <p className="music-empty-desc">
                {searchQuery
                  ? `We couldn't find anything matching "${searchQuery}". Try another artist or song title.`
                  : activeFilter === "favorites"
                  ? "You haven't marked any favorites yet. Click the heart icon ♡ on any song to save it here!"
                  : isCustomPlaylistSelected
                  ? "This playlist has no songs yet. Browse the catalogue and click ＋ to add your favorites!"
                  : "No songs found for this playlist."}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  className="music-empty-action"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------------------------
          Playlist Management Modals
          ------------------------------------------------------------------ */}

      {/* Create Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isCreatePlaylistOpen}
        onClose={() => setIsCreatePlaylistOpen(false)}
        onCreated={(newPlaylist) => {
          store.loadPlaylists();
          setActiveFilter("playlists");
          setSelectedPlaylist(`custom:${newPlaylist.id}`);
        }}
      />

      {/* Edit Playlist Modal */}
      <EditPlaylistModal
        isOpen={editingPlaylist !== null}
        playlist={editingPlaylist}
        onClose={() => setEditingPlaylist(null)}
        onUpdated={(updated) => {
          store.loadPlaylists();
          if (customPlaylistId === updated.id) {
            loadCustomPlaylist(updated.id);
          }
        }}
        onDeleted={(deletedId) => {
          store.loadPlaylists();
          if (customPlaylistId === deletedId) {
            setSelectedPlaylist("all");
          }
        }}
      />

      {/* Add To Playlist Modal */}
      <AddToPlaylistModal
        isOpen={isAddToPlaylistOpen}
        track={trackForPlaylist}
        playlists={store.playlists}
        onClose={() => {
          setIsAddToPlaylistOpen(false);
          setTrackForPlaylist(null);
        }}
        onTrackAdded={(playlistId) => {
          store.loadPlaylists();
          if (customPlaylistId === playlistId) {
            loadCustomPlaylist(playlistId);
          }
        }}
        onCreateNewPlaylist={() => {
          setIsCreatePlaylistOpen(true);
        }}
      />
    </div>
  );
}
