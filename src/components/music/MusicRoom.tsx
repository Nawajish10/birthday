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

export interface MusicRoomProps {
  externalAudioRef?: React.RefObject<HTMLAudioElement | null>;
  onTrackSelected?: (track: MusicTrackItem) => void;
  initialTrackId?: string;
}

export function MusicRoom({
  externalAudioRef,
  onTrackSelected,
  initialTrackId,
}: MusicRoomProps): React.JSX.Element {
  // 1. Core State
  const [tracks, setTracks] = useState<MusicTrackItem[]>(() => [...SEED_MUSIC_CATALOGUE]);
  const [cardSize, setCardSize] = useState<PlayerCardSize>("standard");
  const [activeFilter, setActiveFilter] = useState<MusicFilterType>("all");
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Determine initial active track
  const [currentTrackId, setCurrentTrackId] = useState<string>(() => {
    if (initialTrackId) {
      const match = SEED_MUSIC_CATALOGUE.find((t) => t.id === initialTrackId);
      if (match) return match.id;
    }
    return SEED_MUSIC_CATALOGUE[0]?.id ?? "";
  });

  // Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(() => {
    const initial = SEED_MUSIC_CATALOGUE.find((t) => t.id === (initialTrackId || SEED_MUSIC_CATALOGUE[0]?.id));
    return initial ? initial.durationSeconds : 0;
  });
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Unavailable Asset Toast (for honest handling of demo tracks without audio files)
  const [unavailableToast, setUnavailableToast] = useState<string | null>(null);

  // Internal Audio Element Ref fallback
  const internalAudioRef = useRef<HTMLAudioElement | null>(null);
  const localTracksRef = useRef<MusicTrackItem[]>([]);

  // Active track derived object
  const currentTrack = useMemo(
    () => tracks.find((t) => t.id === currentTrackId) || tracks[0] || null,
    [tracks, currentTrackId]
  );

  // Filtered tracks derived list
  const filteredTracks = useMemo(
    () => searchAndFilterTracks(tracks, searchQuery, activeFilter, selectedPlaylist),
    [tracks, searchQuery, activeFilter, selectedPlaylist]
  );

  // Counts for filter chips
  const totalCount = tracks.length;
  const favCount = useMemo(() => tracks.filter((t) => t.isFavorite).length, [tracks]);

  // Audio element resolver
  const getAudioEl = useCallback((): HTMLAudioElement | null => {
    if (externalAudioRef && externalAudioRef.current) {
      return externalAudioRef.current;
    }
    return internalAudioRef.current;
  }, [externalAudioRef]);

  // Clean up any local blob URLs on unmount
  useEffect(() => {
    const currentTracks = localTracksRef.current;
    return () => {
      revokeLocalTrackUrls(currentTracks);
    };
  }, []);

  // Sync volume with active audio element
  useEffect(() => {
    const audio = getAudioEl();
    if (audio) {
      audio.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, getAudioEl]);

  // Handle Playback State Change
  const startPlayback = useCallback(
    (track: MusicTrackItem) => {
      const audio = getAudioEl();

      if (!track.url) {
        // Honest state: No simulated fake audio playback!
        setIsPlaying(false);
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
        if (audio.src !== track.url) {
          audio.src = track.url;
          audio.load();
        }
        audio
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch(() => {
            setIsPlaying(false);
            setUnavailableToast(`Could not play "${track.title}". Check audio format compatibility.`);
          });
      }
    },
    [getAudioEl]
  );

  // Track selection handler
  const handleSelectTrack = useCallback(
    (track: MusicTrackItem, autoPlay = true) => {
      setCurrentTrackId(track.id);
      setCurrentTime(0);
      setDuration(track.durationSeconds || 0);

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
        setIsPlaying(false);
      }
    },
    [onTrackSelected, startPlayback, getAudioEl]
  );

  // Play / Pause Toggle
  const handleTogglePlay = useCallback(() => {
    if (!currentTrack) return;

    if (isPlaying) {
      const audio = getAudioEl();
      if (audio) {
        audio.pause();
      }
      setIsPlaying(false);
    } else {
      startPlayback(currentTrack);
    }
  }, [currentTrack, isPlaying, getAudioEl, startPlayback]);

  // Next Track
  const handleNextTrack = useCallback(() => {
    if (filteredTracks.length === 0) return;
    const currentIndex = filteredTracks.findIndex((t) => t.id === currentTrackId);
    const nextIdx = getNextTrackIndex(currentIndex, filteredTracks.length, isShuffle, isRepeat);

    if (nextIdx !== -1 && filteredTracks[nextIdx]) {
      handleSelectTrack(filteredTracks[nextIdx], isPlaying);
    } else {
      // Reached the end of queue without repeat
      setIsPlaying(false);
      setCurrentTime(0);
      const audio = getAudioEl();
      if (audio) audio.pause();
    }
  }, [filteredTracks, currentTrackId, isShuffle, isRepeat, isPlaying, handleSelectTrack, getAudioEl]);

  // Previous Track
  const handlePreviousTrack = useCallback(() => {
    if (filteredTracks.length === 0) return;
    const currentIndex = filteredTracks.findIndex((t) => t.id === currentTrackId);
    const prevIdx = getPreviousTrackIndex(currentIndex, filteredTracks.length);

    if (prevIdx !== -1 && filteredTracks[prevIdx]) {
      handleSelectTrack(filteredTracks[prevIdx], isPlaying);
    }
  }, [filteredTracks, currentTrackId, isPlaying, handleSelectTrack]);

  // Audio Event Listeners
  useEffect(() => {
    const audio = getAudioEl();
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(Math.floor(audio.duration));
      }
    };

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(Math.floor(audio.duration));
      }
    };

    const onEnded = () => {
      handleNextTrack();
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [getAudioEl, handleNextTrack]);

  // Seek / Progress Scrubbing
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    const audio = getAudioEl();
    if (audio) {
      audio.currentTime = newTime;
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = (trackId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, isFavorite: !t.isFavorite } : t))
    );
  };

  // Local File Upload
  const handleAddLocalFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newLocalTracks: MusicTrackItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (typeof window !== "undefined" && window.URL && window.URL.createObjectURL) {
        const objectUrl = window.URL.createObjectURL(file);
        const item = createLocalTrack(file, objectUrl);
        newLocalTracks.push(item);
        localTracksRef.current.push(item);
      }
    }

    if (newLocalTracks.length > 0) {
      setTracks((prev) => [...newLocalTracks, ...prev]);
      // Immediately select and start the first uploaded track
      handleSelectTrack(newLocalTracks[0], true);
      setActiveFilter("all");
    }

    // Reset input value so same files can be re-selected if desired
    e.target.value = "";
  };

  return (
    <div className="music-room-container" data-theme="love">
      {/* Fallback Internal Audio element if external is not provided */}
      {!externalAudioRef && <audio ref={internalAudioRef} preload="metadata" />}

      {/* Header */}
      <header className="music-room-header">
        <span className="music-room-kicker">
          <span>✿</span> OUR LITTLE SOUNDTRACK <span>✿</span>
        </span>
        <h1 className="music-room-title">
          Music Room <span className="heart-glyph">♡</span>
        </h1>
        <p className="music-room-subtitle">
          Every melody carries a moment, and every song brings us back to each other.
          Listen to our shared catalogue or upload your own favorites.
        </p>
      </header>

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
          </div>

          {/* Add Local Songs Button */}
          <div className="music-upload-wrapper">
            <input
              type="file"
              id="music-local-input"
              className="music-upload-input"
              accept="audio/*"
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
            <button
              type="button"
              className={`music-playlist-pill ${selectedPlaylist === "Local Uploads" ? "is-active" : ""}`}
              onClick={() => setSelectedPlaylist("Local Uploads")}
            >
              Local Uploads
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
                  onClick={() => setIsShuffle((prev) => !prev)}
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

                {/* Repeat */}
                <button
                  type="button"
                  className={`music-btn-control ${isRepeat ? "is-active" : ""}`}
                  onClick={() => setIsRepeat((prev) => !prev)}
                  aria-pressed={isRepeat}
                  aria-label={isRepeat ? "Disable repeat" : "Enable repeat"}
                  title="Repeat (↻)"
                >
                  ↻
                </button>
              </div>

              {/* Volume Slider */}
              <div className="music-volume-box">
                <button
                  type="button"
                  className="music-volume-icon-btn"
                  onClick={() => setIsMuted((prev) => !prev)}
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
                  onChange={(e) => {
                    setVolume(Number(e.target.value));
                    if (isMuted) setIsMuted(false);
                  }}
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
      </section>

      {/* Library Table / Grid */}
      <section className="music-library-section" aria-label="Song catalogue library">
        <div className="music-library-header">
          <h2 className="music-library-title">Song Library</h2>
          <span className="music-library-count">
            {filteredTracks.length} {filteredTracks.length === 1 ? "track" : "tracks"}
          </span>
        </div>

        {filteredTracks.length > 0 ? (
          <div className="music-table-wrapper">
            <table className="music-table">
              <thead>
                <tr>
                  <th className="music-col-index">#</th>
                  <th className="music-col-cover"></th>
                  <th className="music-col-info">Title & Artist</th>
                  <th className="music-col-playlist">Playlist</th>
                  <th className="music-col-duration">Duration</th>
                  <th className="music-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTracks.map((track, idx) => {
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
                      <td className="music-col-playlist">{track.playlist || "—"}</td>
                      <td className="music-col-duration">{track.duration}</td>
                      <td className="music-col-actions" onClick={(e) => e.stopPropagation()}>
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
    </div>
  );
}
