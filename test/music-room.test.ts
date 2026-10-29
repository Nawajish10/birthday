import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import ReactDOMServer from "react-dom/server";

// Pure TypeScript catalogue and state helpers
import * as catalogueExports from "../src/components/music/music-catalogue.ts";
import type {
  MusicTrackItem,
  MusicFilterType,
  PlayerCardSize,
} from "../src/components/music/music-catalogue.ts";
const {
  SEED_MUSIC_CATALOGUE,
  PLAYLIST_NAMES,
  formatDuration,
  parseDurationToSeconds,
  searchAndFilterTracks,
  getNextTrackIndex,
  getPreviousTrackIndex,
  createLocalTrack,
  revokeLocalTrackUrls,
} = catalogueExports;

const nodeRequire = createRequire(import.meta.url);

function loadMusicRoomModule() {
  const filePath = path.resolve(process.cwd(), "src/components/music/MusicRoom.tsx");
  assert.ok(fs.existsSync(filePath), "MusicRoom.tsx must exist");

  const rawCode = fs.readFileSync(filePath, "utf-8");
  const cleanedCode = rawCode.replace(/import\s+['"][^'"]+\.css['"];?/g, "");
  const transpiled = ts.transpileModule(cleanedCode, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });

  const customRequire = (moduleName: string) => {
    if (moduleName === "./music-catalogue" || moduleName.endsWith("music-catalogue")) {
      return catalogueExports;
    }
    if (moduleName === "@/lib/music/use-music-store" || moduleName.endsWith("use-music-store")) {
      return {
        useMusicStore: () => ({
          tracks: [],
          queue: [],
          likedTrackIds: new Set(),
          currentTrackId: null,
          isPlaying: false,
          currentTime: 0,
          duration: 0,
          volume: 0.85,
          isMuted: false,
          isShuffle: false,
          repeatMode: "off",
          audioRef: { current: null },
          loadCatalogue: async () => {},
          loadLikes: async () => {},
          restorePlaybackState: async () => {},
          setCurrentTrack: () => {},
          setIsPlaying: () => {},
          setCurrentTime: () => {},
          setDuration: () => {},
          setVolume: () => {},
          setMuted: () => {},
          toggleShuffle: () => {},
          setRepeatMode: () => {},
          toggleLike: async () => {},
        }),
      };
    }
    if (moduleName === "@/lib/music/api-client" || moduleName.endsWith("api-client")) {
      return {
        recordHistoryEvent: async () => {},
        fetchHistory: async () => [],
        fetchPlaylist: async () => ({ id: "p1", name: "test", tracks: [] }),
        reorderPlaylistTracks: async () => {},
        removeTrackFromPlaylist: async () => {},
      };
    }
    if (moduleName.includes("PlaylistManagerModal")) {
      return {
        CreatePlaylistModal: () => null,
        EditPlaylistModal: () => null,
        AddToPlaylistModal: () => null,
      };
    }
    if (moduleName.includes("LyricsPanel")) {
      return {
        LyricsPanel: () => null,
      };
    }
    if (moduleName.includes("ListeningHistoryModal")) {
      return {
        ListeningHistoryList: () => null,
        ListeningHistoryModal: () => null,
        formatRelativeTime: () => "Just now",
      };
    }
    return nodeRequire(moduleName);
  };

  const moduleExports: any = {};
  const evalFunc = new Function("exports", "require", transpiled.outputText);
  evalFunc(moduleExports, customRequire);

  return { moduleExports, rawCode };
}

// ============================================================================
// 1. Catalogue Integrity Tests
// ============================================================================

test("Catalogue: contains exactly 50 seed songs", () => {
  assert.equal(SEED_MUSIC_CATALOGUE.length, 50, "Catalogue must contain exactly 50 songs");
});

test("Catalogue: all tracks have stable unique IDs and required metadata", () => {
  const ids = new Set<string>();

  for (let i = 0; i < SEED_MUSIC_CATALOGUE.length; i++) {
    const track = SEED_MUSIC_CATALOGUE[i];

    assert.ok(track.id, `Track at index ${i} must have an ID`);
    assert.ok(!ids.has(track.id), `Track ID ${track.id} must be unique`);
    ids.add(track.id);

    assert.ok(typeof track.title === "string" && track.title.trim().length > 0, `Track ${track.id} must have a title`);
    assert.ok(typeof track.artist === "string" && track.artist.trim().length > 0, `Track ${track.id} must have an artist`);
    assert.ok(typeof track.duration === "string" && /^\d+:\d{2}$/.test(track.duration), `Track ${track.id} must have duration format MM:SS`);
    assert.ok(typeof track.durationSeconds === "number" && track.durationSeconds > 0, `Track ${track.id} must have durationSeconds > 0`);
    assert.equal(typeof track.isFavorite, "boolean", `Track ${track.id} must have boolean isFavorite`);
    assert.equal(typeof track.url, "string", `Track ${track.id} must have a url string`);
  }
});

test("Catalogue: duration and durationSeconds are strictly consistent", () => {
  for (const track of SEED_MUSIC_CATALOGUE) {
    const parsed = parseDurationToSeconds(track.duration);
    assert.equal(
      parsed,
      track.durationSeconds,
      `Track ${track.id} (${track.title}) durationSeconds ${track.durationSeconds} must match parsed ${parsed}`
    );
  }
});

test("Catalogue: includes curated playlists and favorite selections", () => {
  const favorites = SEED_MUSIC_CATALOGUE.filter((t) => t.isFavorite);
  assert.ok(favorites.length >= 10, `Expected at least 10 favorites in seed catalogue, got ${favorites.length}`);

  const playlistsRepresented = new Set(
    SEED_MUSIC_CATALOGUE.map((t) => t.playlist).filter(Boolean)
  );

  for (const name of PLAYLIST_NAMES) {
    assert.ok(playlistsRepresented.has(name as string), `Playlist "${name}" must be represented in catalogue`);
  }
});

// ============================================================================
// 2. Pure Helper Functions: formatDuration & parseDurationToSeconds
// ============================================================================

test("formatDuration: formats seconds correctly into MM:SS", () => {
  assert.equal(formatDuration(0), "0:00");
  assert.equal(formatDuration(9), "0:09");
  assert.equal(formatDuration(59), "0:59");
  assert.equal(formatDuration(60), "1:00");
  assert.equal(formatDuration(65), "1:05");
  assert.equal(formatDuration(209), "3:29");
  assert.equal(formatDuration(3600), "60:00");
});

test("formatDuration: handles invalid, negative, or non-numeric inputs gracefully", () => {
  assert.equal(formatDuration(-10), "0:00");
  assert.equal(formatDuration(NaN), "0:00");
  assert.equal(formatDuration(null as any), "0:00");
  assert.equal(formatDuration(undefined as any), "0:00");
  assert.equal(formatDuration("abc" as any), "0:00");
});

test("parseDurationToSeconds: parses MM:SS and HH:MM:SS strings accurately", () => {
  assert.equal(parseDurationToSeconds("0:00"), 0);
  assert.equal(parseDurationToSeconds("0:45"), 45);
  assert.equal(parseDurationToSeconds("3:29"), 209);
  assert.equal(parseDurationToSeconds("10:28"), 628);
  assert.equal(parseDurationToSeconds("1:00:00"), 3600);
  assert.equal(parseDurationToSeconds("1:15:30"), 4530);
});

test("parseDurationToSeconds: handles invalid or empty strings gracefully", () => {
  assert.equal(parseDurationToSeconds(""), 0);
  assert.equal(parseDurationToSeconds("invalid"), 0);
  assert.equal(parseDurationToSeconds("-3:20"), 0);
  assert.equal(parseDurationToSeconds(null as any), 0);
});

test("Duration Helpers: round-trip consistency", () => {
  const testValues = [0, 45, 120, 209, 345, 628];
  for (const val of testValues) {
    const formatted = formatDuration(val);
    const parsed = parseDurationToSeconds(formatted);
    assert.equal(parsed, val, `Round trip for ${val} seconds failed`);
  }
});

// ============================================================================
// 3. Search and Filter Functions
// ============================================================================

test("searchAndFilterTracks: filter 'all' returns all tracks when query is empty", () => {
  const result = searchAndFilterTracks(SEED_MUSIC_CATALOGUE, "", "all");
  assert.equal(result.length, SEED_MUSIC_CATALOGUE.length);
});

test("searchAndFilterTracks: filter 'favorites' returns only favorite tracks", () => {
  const result = searchAndFilterTracks(SEED_MUSIC_CATALOGUE, "", "favorites");
  assert.ok(result.length > 0);
  for (const t of result) {
    assert.equal(t.isFavorite, true);
  }
});

test("searchAndFilterTracks: filter 'playlists' respects selected playlist name", () => {
  const result = searchAndFilterTracks(SEED_MUSIC_CATALOGUE, "", "playlists", "Desi Melodies");
  assert.ok(result.length > 0);
  for (const t of result) {
    assert.equal(t.playlist, "Desi Melodies");
  }
});

test("searchAndFilterTracks: searches by track title case-insensitively", () => {
  const result = searchAndFilterTracks(SEED_MUSIC_CATALOGUE, "golden", "all");
  assert.ok(result.some((t) => t.title.toLowerCase().includes("golden")));
});

test("searchAndFilterTracks: searches by artist name case-insensitively", () => {
  const result = searchAndFilterTracks(SEED_MUSIC_CATALOGUE, "sheeran", "all");
  assert.ok(result.length >= 2, "Ed Sheeran should have multiple tracks in catalogue");
  for (const t of result) {
    assert.ok(t.artist.toLowerCase().includes("sheeran"));
  }
});

test("searchAndFilterTracks: combined search and filter honors both constraints", () => {
  const result = searchAndFilterTracks(SEED_MUSIC_CATALOGUE, "atif", "playlists", "Desi Melodies");
  assert.ok(result.length > 0);
  for (const t of result) {
    assert.equal(t.playlist, "Desi Melodies");
    assert.ok(t.artist.toLowerCase().includes("atif") || t.title.toLowerCase().includes("atif"));
  }
});

test("searchAndFilterTracks: returns empty array for non-matching query", () => {
  const result = searchAndFilterTracks(SEED_MUSIC_CATALOGUE, "xyznonexistent999", "all");
  assert.equal(result.length, 0);
});

// ============================================================================
// 4. Navigation State Machines: getNextTrackIndex & getPreviousTrackIndex
// ============================================================================

test("getNextTrackIndex: advances normally when within range", () => {
  assert.equal(getNextTrackIndex(0, 10, false, false), 1);
  assert.equal(getNextTrackIndex(4, 10, false, false), 5);
  assert.equal(getNextTrackIndex(8, 10, false, false), 9);
});

test("getNextTrackIndex: handles end of playlist with repeat = true", () => {
  assert.equal(getNextTrackIndex(9, 10, false, true), 0);
  assert.equal(getNextTrackIndex(49, 50, false, true), 0);
});

test("getNextTrackIndex: stops (-1) at end of playlist with repeat = false", () => {
  assert.equal(getNextTrackIndex(9, 10, false, false), -1);
  assert.equal(getNextTrackIndex(49, 50, false, false), -1);
});

test("getNextTrackIndex: handles shuffle mode", () => {
  const total = 20;
  for (let i = 0; i < 10; i++) {
    const next = getNextTrackIndex(5, total, true, false);
    assert.ok(next >= 0 && next < total, `Shuffle index ${next} must be within [0, ${total - 1}]`);
  }
});

test("getNextTrackIndex: handles edge cases (empty or single item)", () => {
  assert.equal(getNextTrackIndex(0, 0, false, false), -1);
  assert.equal(getNextTrackIndex(0, 1, false, false), 0);
  assert.equal(getNextTrackIndex(-1, 5, false, false), 0);
});

test("getPreviousTrackIndex: moves backwards normally when currentIndex > 0", () => {
  assert.equal(getPreviousTrackIndex(5, 10), 4);
  assert.equal(getPreviousTrackIndex(1, 10), 0);
});

test("getPreviousTrackIndex: wraps around to last item when currentIndex <= 0", () => {
  assert.equal(getPreviousTrackIndex(0, 10), 9);
  assert.equal(getPreviousTrackIndex(-1, 10), 9);
});

test("getPreviousTrackIndex: handles edge cases (empty or single item)", () => {
  assert.equal(getPreviousTrackIndex(0, 0), -1);
  assert.equal(getPreviousTrackIndex(0, 1), 0);
});

// ============================================================================
// 5. Local Track Helpers & URL Cleanup
// ============================================================================

test("createLocalTrack: generates clean track item from file metadata", () => {
  const fakeFile = { name: "Our Favorite Roadtrip Song.mp3" } as File;
  const objectUrl = "blob:http://localhost/fake-uuid";

  const track = createLocalTrack(fakeFile, objectUrl);

  assert.ok(track.id.startsWith("local-"), "Local track id must start with local-");
  assert.equal(track.title, "Our Favorite Roadtrip Song", "Title should have file extension stripped");
  assert.equal(track.artist, "Local Audio File");
  assert.equal(track.url, objectUrl);
  assert.equal(track.isLocal, true);
  assert.equal(track.playlist, "Local Uploads");
});

test("revokeLocalTrackUrls: revokes URLs for local tracks and handles errors safely", () => {
  const revoked: string[] = [];
  const originalUrl = globalThis.URL;

  // Mock URL.revokeObjectURL
  globalThis.URL = {
    ...originalUrl,
    revokeObjectURL: (url: string) => {
      revoked.push(url);
    },
  } as any;

  try {
    const tracks: MusicTrackItem[] = [
      { id: "1", title: "A", artist: "B", duration: "1:00", durationSeconds: 60, isFavorite: false, url: "blob:1", isLocal: true },
      { id: "2", title: "C", artist: "D", duration: "1:00", durationSeconds: 60, isFavorite: false, url: "https://remote.mp3", isLocal: false },
      { id: "3", title: "E", artist: "F", duration: "1:00", durationSeconds: 60, isFavorite: false, url: "blob:2", isLocal: true },
    ];

    revokeLocalTrackUrls(tracks);

    assert.equal(revoked.length, 2);
    assert.deepEqual(revoked, ["blob:1", "blob:2"]);
  } finally {
    globalThis.URL = originalUrl;
  }
});

// ============================================================================
// 6. Component Contract & Static Markup Verification
// ============================================================================

test("MusicRoom Component: exports component and accepts props contract", () => {
  const { moduleExports, rawCode } = loadMusicRoomModule();
  assert.equal(typeof moduleExports.MusicRoom, "function", "MusicRoom must be an exported function");
  assert.ok(rawCode.includes("export interface MusicRoomProps"), "Must export MusicRoomProps interface");
  assert.ok(rawCode.includes("externalAudioRef"), "Must accept externalAudioRef prop");
  assert.ok(rawCode.includes("onTrackSelected"), "Must accept onTrackSelected prop");
  assert.ok(rawCode.includes("initialTrackId"), "Must accept initialTrackId prop");
});

test("MusicRoom Component: renders header, toolbar, vinyl card, and song library", () => {
  const { moduleExports } = loadMusicRoomModule();
  const MusicRoomComponent = moduleExports.MusicRoom;

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MusicRoomComponent, {
      initialTrackId: "track-01",
    })
  );

  // Header Verification
  assert.ok(html.includes("OUR LITTLE SOUNDTRACK"), "Must render kicker");
  assert.ok(html.includes("Music Room"), "Must render Music Room title");
  assert.ok(html.includes("♡"), "Must render heart glyph");

  // Toolbar Verification
  assert.ok(html.includes("Search songs or artists…"), "Must render search input");
  assert.ok(html.includes("All Songs"), "Must render All Songs filter chip");
  assert.ok(html.includes("Favourites ♡"), "Must render Favourites filter chip");
  assert.ok(html.includes("Playlists ♫"), "Must render Playlists filter chip");
  assert.ok(html.includes("Add local songs"), "Must render Add local songs button");
  assert.ok(html.includes('accept="audio/*'), "File input must accept audio");
  assert.ok(html.includes("video/mp4") || html.includes(".mp4"), "File input must accept MP4 media files");

  // Featured Now Playing Card Verification
  assert.ok(html.includes("NOW PLAYING"), "Must render NOW PLAYING badge");
  assert.ok(html.includes("Compact"), "Must render size switcher Compact");
  assert.ok(html.includes("Standard"), "Must render size switcher Standard");
  assert.ok(html.includes("Expanded"), "Must render size switcher Expanded");
  assert.ok(html.includes("music-vinyl-disc"), "Must render vinyl platter SVG");
  assert.ok(html.includes("Golden Hour"), "Must render initial track title Golden Hour");
  assert.ok(html.includes("JVKE"), "Must render initial track artist JVKE");

  // Controls Verification
  assert.ok(html.includes("music-btn-playpause"), "Must render Play/Pause button");
  assert.ok(html.includes("Volume slider"), "Must render volume slider");
  assert.ok(html.includes("Track progress slider"), "Must render progress slider");

  // Library Table Verification
  assert.ok(html.includes("Song Library"), "Must render Song Library heading");
  assert.ok(html.includes("music-table"), "Must render song table");
});

test("MusicRoom Component: respects initialTrackId prop and preserves track selection", () => {
  const { moduleExports } = loadMusicRoomModule();
  const MusicRoomComponent = moduleExports.MusicRoom;

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MusicRoomComponent, {
      initialTrackId: "track-04",
    })
  );

  assert.ok(html.includes("Afreen Afreen"), "Must display track-04 title 'Afreen Afreen'");
  assert.ok(html.includes("Rahat Fateh Ali Khan"), "Must display artist name");
});

test("MusicRoom Component: accessibility compliance for all interactive controls", () => {
  const { moduleExports } = loadMusicRoomModule();
  const MusicRoomComponent = moduleExports.MusicRoom;

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MusicRoomComponent)
  );

  // Button labels
  assert.ok(html.includes('aria-label="Previous track (|◀)"'), "Previous button must have descriptive label");
  assert.ok(html.includes('aria-label="Next track (▶|)"'), "Next button must have descriptive label");
  assert.ok(html.includes('aria-label="Play track (▶)"') || html.includes('aria-label="Pause track (Ⅱ)"'), "Play button must have label");
  assert.ok(html.includes('aria-label="Search song library"'), "Search input must have aria-label");
  assert.ok(html.includes('role="radiogroup"'), "Filter chips and size switcher must have radiogroup role");
});

// ============================================================================
// 7. CSS & Design System Tokens Verification
// ============================================================================

test("CSS Verification: music-room.css implements design tokens and responsive rules", () => {
  const cssPath = path.resolve(process.cwd(), "src/components/music/music-room.css");
  assert.ok(fs.existsSync(cssPath), "music-room.css must exist");

  const css = fs.readFileSync(cssPath, "utf-8");

  // Love Theme Tokens
  assert.ok(css.includes('[data-theme="love"]'), "Must scope to data-theme=love");
  assert.ok(css.includes("--color-primary"), "Must use --color-primary token");
  assert.ok(css.includes("--color-surface"), "Must use --color-surface token");
  assert.ok(css.includes("--color-accent"), "Must use --color-accent token");
  assert.ok(css.includes("--font-display"), "Must use --font-display token");

  // Card Size Variants
  assert.ok(css.includes(".compact"), "Must include .compact styles");
  assert.ok(css.includes(".standard"), "Must include .standard styles");
  assert.ok(css.includes(".expanded"), "Must include .expanded styles");

  // Vinyl Spin Animation
  assert.ok(css.includes("@keyframes vinylSpin"), "Must define @keyframes vinylSpin");
  assert.ok(css.includes("animation-play-state: paused"), "Must support paused animation state");

  // Responsive Breakpoints
  assert.ok(css.includes("@media (max-width: 1050px)"), "Must define 1050px responsive breakpoint");
  assert.ok(css.includes("@media (max-width: 760px)"), "Must define 760px responsive breakpoint");

  // Accessibility
  assert.ok(css.includes("focus-visible"), "Must define high-contrast focus-visible styles");
  assert.ok(css.includes("prefers-reduced-motion"), "Must support prefers-reduced-motion");
});

// ============================================================================
// 8. MP4 Media Pipeline & Shared Audio Engine Invariant Verification
// ============================================================================

test("MP4 & Codec Support: detects MP4 containers, video/mp4 with AAC audio, and verifies standard codecs", () => {
  const { isMp4Media, isSupportedAudioFormat, checkBrowserAudioCodecs, STANDARD_SUPPORTED_AUDIO_EXTENSIONS } = catalogueExports;
  assert.ok(typeof isMp4Media === "function", "isMp4Media must be exported");
  assert.ok(typeof isSupportedAudioFormat === "function", "isSupportedAudioFormat must be exported");
  assert.ok(typeof checkBrowserAudioCodecs === "function", "checkBrowserAudioCodecs must be exported");

  // Extension and MIME testing
  assert.equal(isMp4Media("track.mp4"), true, "Should identify .mp4 as MP4 media");
  assert.equal(isMp4Media("song.m4a"), true, "Should identify .m4a as MP4 media");
  assert.equal(isMp4Media("video.mp4?token=123#t=10"), true, "Should handle query and hash in MP4 URL");
  assert.equal(isMp4Media("blob:http://localhost/uuid", "video/mp4"), true, "Should identify video/mp4 MIME as MP4");
  assert.equal(isMp4Media("blob:http://localhost/uuid", "audio/mp4"), true, "Should identify audio/mp4 MIME as MP4");
  assert.equal(isMp4Media("music.mp3"), false, "MP3 is not MP4 container");

  // Audio format support
  assert.equal(isSupportedAudioFormat("song.mp3"), true, "MP3 must be supported");
  assert.equal(isSupportedAudioFormat("recording.mp4"), true, "MP4 must be supported");
  assert.equal(isSupportedAudioFormat("voice.m4a"), true, "M4A must be supported");
  assert.equal(isSupportedAudioFormat("track.aac"), true, "AAC must be supported");
  assert.equal(isSupportedAudioFormat("audio.wav"), true, "WAV must be supported");
  assert.equal(isSupportedAudioFormat("stream.ogg"), true, "OGG must be supported");
  assert.equal(isSupportedAudioFormat("document.pdf"), false, "PDF is not supported audio");

  // Codec check SSR fallback
  const codecs = checkBrowserAudioCodecs(null);
  assert.equal(codecs.mp3, true, "MP3 codec must be supported");
  assert.equal(codecs.mp4Audio, true, "MP4 audio codec must be supported");
  assert.equal(codecs.aac, true, "AAC codec must be supported");
  assert.equal(codecs.m4a, true, "M4A codec must be supported");
  assert.equal(codecs.mp4VideoContainerAudio, true, "MP4 video container audio must be supported");
});

test("Shared Audio Engine: MusicRoom renders ZERO <audio> tags when externalAudioRef is provided", () => {
  const { moduleExports } = loadMusicRoomModule();
  const MusicRoomComponent = moduleExports.MusicRoom;

  const externalAudioRef = { current: null };
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MusicRoomComponent, { externalAudioRef })
  );

  assert.equal(html.includes("<audio"), false, "MusicRoom must NOT render any <audio> elements when externalAudioRef is provided");
});

test("Shared Audio Engine: MusicRoom renders single fallback <audio> only when externalAudioRef is missing", () => {
  const { moduleExports } = loadMusicRoomModule();
  const MusicRoomComponent = moduleExports.MusicRoom;

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MusicRoomComponent)
  );

  const audioOccurrences = (html.match(/<audio/g) || []).length;
  assert.equal(audioOccurrences, 1, "MusicRoom must render exactly 1 fallback <audio> when externalAudioRef is omitted");
});

test("MP4 Media Pipeline: creates local track from MP4 file and preserves playback URL", () => {
  const { createLocalTrack } = catalogueExports;
  const mockMp4File = { name: "birthday-song.mp4", type: "video/mp4", size: 10485760 } as unknown as File;
  const objectUrl = "blob:http://localhost:3000/mock-uuid-mp4";
  const track = createLocalTrack(mockMp4File, objectUrl);

  assert.equal(track.title, "birthday-song", "Should strip .mp4 extension");
  assert.equal(track.url, objectUrl, "Should store objectUrl for playback");
  assert.equal(track.isLocal, true, "Should mark track as local");
});
