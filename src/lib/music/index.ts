/**
 * Public barrel export for the shared music library.
 */

// Types
export type {
  DbTrack,
  DbPlaylist,
  PlaybackState,
  ListeningHistoryEntry,
  LyricsData,
  TimedLyricLine,
} from './types';

// API client functions
export {
  fetchTracks,
  fetchLikedTrackIds,
  likeTrack,
  unlikeTrack,
  fetchPlaylists,
  createPlaylist,
  fetchPlaylist,
  updatePlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  reorderPlaylistTracks,
  fetchPlaybackState,
  savePlaybackState,
  fetchHistory,
  recordHistoryEvent,
  fetchLyrics,
  getSignedAudioUrl,
} from './api-client';

// Store hook
export type { MusicStore } from './use-music-store';
export { useMusicStore, getMusicAudioRef } from './use-music-store';

// Audio importer & metadata helpers
export type {
  ManifestItem,
  ExtractedAudioMetadata,
} from './audio-importer';
export {
  EXT_TO_MIME,
  ALLOWED_AUDIO_EXTENSIONS,
  detectMimeType,
  extractAudioDuration,
  extractAudioMetadata,
  parseCsvManifest,
  parseJsonManifest,
  loadManifest,
  scanAudioDirectory,
} from './audio-importer';
