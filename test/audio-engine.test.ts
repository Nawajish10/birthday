import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import React from "react";
import ReactDOMServer from "react-dom/server";

// Import catalogue exports from both canonical paths
import * as catalogueExports from "../src/components/music/music-catalogue.ts";
import * as libCatalogueExports from "../src/lib/music-catalogue.ts";

const {
  SEED_MUSIC_CATALOGUE,
  formatDuration,
  parseDurationToSeconds,
  getNextTrackIndex,
  getPreviousTrackIndex,
  createLocalTrack,
  revokeLocalTrackUrls,
  checkBrowserAudioCodecs,
  isSupportedAudioFormat,
  isMp4Media,
  STANDARD_SUPPORTED_AUDIO_EXTENSIONS,
  STANDARD_SUPPORTED_AUDIO_MIMES,
} = catalogueExports;

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
        getMusicAudioRef: () => ({ current: null }),
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
      return { LyricsPanel: () => null };
    }
    if (moduleName.includes("ListeningHistoryModal")) {
      return {
        ListeningHistoryModal: () => null,
        ListeningHistoryList: () => null,
      };
    }
    if (moduleName === "react") return React;
    return {};
  };

  const moduleExports: Record<string, unknown> = {};
  const runFn = new Function("exports", "require", "module", transpiled.outputText);
  runFn(moduleExports, customRequire, { exports: moduleExports });
  return { moduleExports };
}

function loadOurSoundtrackSectionModule() {
  const filePath = path.resolve(process.cwd(), "src/components/landing/OurSoundtrackSection.tsx");
  assert.ok(fs.existsSync(filePath), "OurSoundtrackSection.tsx must exist");

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
    if (moduleName === "react") return React;
    return {};
  };

  const moduleExports: Record<string, unknown> = {};
  const runFn = new Function("exports", "require", "module", transpiled.outputText);
  runFn(moduleExports, customRequire, { exports: moduleExports });
  return { moduleExports };
}

// ============================================================================
// 1. CANONICAL EXPORT & CONTRACT SYNC
// ============================================================================

test("Music Catalogue Exports: src/lib/music-catalogue.ts mirrors components catalogue exports", () => {
  assert.ok(libCatalogueExports.SEED_MUSIC_CATALOGUE, "Must export SEED_MUSIC_CATALOGUE");
  assert.equal(libCatalogueExports.SEED_MUSIC_CATALOGUE.length, 50, "Must have 50 seed songs");
  assert.equal(typeof libCatalogueExports.formatDuration, "function");
  assert.equal(typeof libCatalogueExports.checkBrowserAudioCodecs, "function");
  assert.equal(typeof libCatalogueExports.isMp4Media, "function");
  assert.equal(typeof libCatalogueExports.isSupportedAudioFormat, "function");
});

// ============================================================================
// 2. MP4 AUDIO INTEGRATION & BROWSER CODEC VERIFICATION
// ============================================================================

test("MP4 Integration: detects MP4 audio and video container formats", () => {
  // Pure audio / video container filenames
  assert.equal(isMp4Media("birthday_melody.mp4"), true);
  assert.equal(isMp4Media("acoustic_song.m4a"), true);
  assert.equal(isMp4Media("https://storage.googleapis.com/music/track.mp4?alt=media"), true);
  assert.equal(isMp4Media("https://cdn.example.com/audio/track.m4a#t=30"), true);

  // MIME types
  assert.equal(isMp4Media("blob:http://localhost/uuid", "video/mp4"), true);
  assert.equal(isMp4Media("blob:http://localhost/uuid", "audio/mp4"), true);
  assert.equal(isMp4Media("blob:http://localhost/uuid", "audio/x-m4a"), true);

  // Non-MP4 formats
  assert.equal(isMp4Media("song.mp3"), false);
  assert.equal(isMp4Media("audio.wav"), false);
  assert.equal(isMp4Media("track.ogg"), false);
  assert.equal(isMp4Media(""), false);
});

test("Audio Format Pipeline: validates standard audio extensions and MIME types", () => {
  assert.ok(STANDARD_SUPPORTED_AUDIO_EXTENSIONS.includes(".mp3"));
  assert.ok(STANDARD_SUPPORTED_AUDIO_EXTENSIONS.includes(".mp4"));
  assert.ok(STANDARD_SUPPORTED_AUDIO_EXTENSIONS.includes(".m4a"));
  assert.ok(STANDARD_SUPPORTED_AUDIO_EXTENSIONS.includes(".aac"));
  assert.ok(STANDARD_SUPPORTED_AUDIO_EXTENSIONS.includes(".wav"));
  assert.ok(STANDARD_SUPPORTED_AUDIO_EXTENSIONS.includes(".ogg"));

  assert.ok(STANDARD_SUPPORTED_AUDIO_MIMES.includes("audio/mpeg"));
  assert.ok(STANDARD_SUPPORTED_AUDIO_MIMES.includes("audio/mp4"));
  assert.ok(STANDARD_SUPPORTED_AUDIO_MIMES.includes("video/mp4"));
  assert.ok(STANDARD_SUPPORTED_AUDIO_MIMES.includes("audio/aac"));
  assert.ok(STANDARD_SUPPORTED_AUDIO_MIMES.includes("audio/x-m4a"));

  // Extension checking
  assert.equal(isSupportedAudioFormat("track.mp3"), true);
  assert.equal(isSupportedAudioFormat("audio.mp4"), true);
  assert.equal(isSupportedAudioFormat("clip.m4a"), true);
  assert.equal(isSupportedAudioFormat("voice.aac"), true);
  assert.equal(isSupportedAudioFormat("sound.wav"), true);
  assert.equal(isSupportedAudioFormat("sample.ogg"), true);
  assert.equal(isSupportedAudioFormat("notes.txt"), false);
  assert.equal(isSupportedAudioFormat("cover.png"), false);

  // MIME checking
  assert.equal(isSupportedAudioFormat("blob:uuid", "audio/mpeg"), true);
  assert.equal(isSupportedAudioFormat("blob:uuid", "video/mp4"), true);
  assert.equal(isSupportedAudioFormat("blob:uuid", "audio/flac"), true);
  assert.equal(isSupportedAudioFormat("blob:uuid", "image/jpeg"), false);
});

test("Browser Codec Verification: checkBrowserAudioCodecs queries canPlayType correctly", () => {
  // 1. SSR / headless fallback
  const ssrResult = checkBrowserAudioCodecs(null);
  assert.equal(ssrResult.mp3, true);
  assert.equal(ssrResult.mp4Audio, true);
  assert.equal(ssrResult.aac, true);
  assert.equal(ssrResult.m4a, true);
  assert.equal(ssrResult.mp4VideoContainerAudio, true);

  // 2. Mock HTMLAudioElement simulating standard browser response
  const queriedMimes: string[] = [];
  const mockAudio = {
    canPlayType: (mime: string) => {
      queriedMimes.push(mime);
      if (mime.includes("mpeg") || mime.includes("mp4") || mime.includes("aac")) {
        return "probably";
      }
      return "";
    },
  } as unknown as HTMLAudioElement;

  const result = checkBrowserAudioCodecs(mockAudio);
  assert.equal(result.mp3, true, "MP3 must be supported");
  assert.equal(result.mp4Audio, true, "MP4 audio must be supported");
  assert.equal(result.aac, true, "AAC must be supported");
  assert.equal(result.mp4VideoContainerAudio, true, "MP4 video container audio must be supported");
  assert.ok(queriedMimes.length > 0, "canPlayType must have been queried");
});

test("Local File Handler: createLocalTrack handles MP4 files and sanitizes titles", () => {
  const mp4AudioFile = {
    name: "Golden Hour - Acoustic Version.mp4",
    type: "audio/mp4",
    size: 5242880,
  } as unknown as File;

  const mp4VideoContainerFile = {
    name: "Meerah_Celebration_Clip.mp4",
    type: "video/mp4",
    size: 20971520,
  } as unknown as File;

  const url1 = "blob:http://localhost/track-uuid-1";
  const url2 = "blob:http://localhost/track-uuid-2";

  const track1 = createLocalTrack(mp4AudioFile, url1);
  const track2 = createLocalTrack(mp4VideoContainerFile, url2);

  assert.equal(track1.title, "Golden Hour - Acoustic Version");
  assert.equal(track1.url, url1);
  assert.equal(track1.isLocal, true);
  assert.equal(track1.playlist, "Local Uploads");

  assert.equal(track2.title, "Meerah_Celebration_Clip");
  assert.equal(track2.url, url2);
  assert.equal(track2.isLocal, true);

  // Object URL cleanup
  let revokedUrls: string[] = [];
  const origRevoke = globalThis.URL?.revokeObjectURL;
  if (!globalThis.URL) {
    (globalThis as unknown as { URL: { revokeObjectURL: (u: string) => void } }).URL = {
      revokeObjectURL: (u: string) => revokedUrls.push(u),
    };
  } else {
    globalThis.URL.revokeObjectURL = (u: string) => revokedUrls.push(u);
  }

  revokeLocalTrackUrls([track1, track2]);
  assert.ok(revokedUrls.includes(url1), "Must revoke url1");
  assert.ok(revokedUrls.includes(url2), "Must revoke url2");

  if (origRevoke) {
    globalThis.URL.revokeObjectURL = origRevoke;
  }
});

// ============================================================================
// 3. SHARED AUDIO ENGINE INVARIANT (ZERO DUPLICATE AUDIO TAGS)
// ============================================================================

test("Shared Audio Engine Invariant: MusicRoom strictly renders ZERO <audio> tags with externalAudioRef", () => {
  const { moduleExports } = loadMusicRoomModule();
  const MusicRoomComponent = moduleExports.MusicRoom as React.ComponentType<{
    externalAudioRef?: React.RefObject<HTMLAudioElement | null>;
  }>;

  const dummyAudio = {} as HTMLAudioElement;
  const externalAudioRef = { current: dummyAudio };

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MusicRoomComponent, { externalAudioRef })
  );

  assert.equal(
    html.includes("<audio"),
    false,
    "Strictly ZERO <audio> elements allowed in MusicRoom when externalAudioRef is provided"
  );
});

test("Shared Audio Engine Invariant: OurSoundtrackSection strictly renders ZERO <audio> tags in all states", () => {
  const { moduleExports } = loadOurSoundtrackSectionModule();
  const OurSoundtrackSection = moduleExports.OurSoundtrackSection as React.ComponentType<{
    tracks?: unknown[];
    activeTrack?: unknown;
    isPlaying?: boolean;
    onTogglePlay?: () => void;
    onPlayTrack?: (track: unknown) => void;
    onOpenSongbook?: () => void;
    loading?: boolean;
    error?: string | null;
  }>;

  // 1. Loading state
  const htmlLoading = ReactDOMServer.renderToStaticMarkup(
    React.createElement(OurSoundtrackSection, {
      loading: true,
      tracks: [],
    })
  );
  assert.equal(htmlLoading.includes("<audio"), false, "Loading state must have zero <audio> tags");

  // 2. Error state
  const htmlError = ReactDOMServer.renderToStaticMarkup(
    React.createElement(OurSoundtrackSection, {
      loading: false,
      error: "Network unavailable",
      tracks: [],
    })
  );
  assert.equal(htmlError.includes("<audio"), false, "Error state must have zero <audio> tags");

  // 3. Empty state
  const htmlEmpty = ReactDOMServer.renderToStaticMarkup(
    React.createElement(OurSoundtrackSection, {
      loading: false,
      tracks: [],
    })
  );
  assert.equal(htmlEmpty.includes("<audio"), false, "Empty state must have zero <audio> tags");

  // 4. Active playing state with MP4 track
  const testTracks = [
    {
      id: "track-mp4-1",
      title: "Lover (Acoustic MP4)",
      artist: "Taylor Swift",
      url: "https://example.com/audio/lover.mp4",
      duration_seconds: 221,
    },
    {
      id: "track-aac-2",
      title: "Afreen Afreen",
      artist: "Rahat Fateh Ali Khan",
      url: "https://example.com/audio/afreen.m4a",
      duration_seconds: 404,
    },
  ];

  const htmlPlaying = ReactDOMServer.renderToStaticMarkup(
    React.createElement(OurSoundtrackSection, {
      tracks: testTracks,
      activeTrack: testTracks[0],
      isPlaying: true,
      onTogglePlay: () => {},
      onPlayTrack: () => {},
      onOpenSongbook: () => {},
    })
  );

  assert.equal(htmlPlaying.includes("<audio"), false, "Playing state must have zero <audio> tags");
  assert.ok(htmlPlaying.includes("Lover (Acoustic MP4)"), "Must display MP4 track title");
  assert.ok(htmlPlaying.includes("NOW PLAYING"), "Must show NOW PLAYING status");
  assert.ok(htmlPlaying.includes("3:41"), "Must format duration properly");
});

test("MusicRoom File Picker: accepts audio/* and MP4 video containers with AAC audio tracks", () => {
  const { moduleExports } = loadMusicRoomModule();
  const MusicRoomComponent = moduleExports.MusicRoom as React.ComponentType;

  const html = ReactDOMServer.renderToStaticMarkup(React.createElement(MusicRoomComponent));

  assert.ok(html.includes('type="file"'), "Must have file input for local uploads");
  assert.ok(html.includes('accept="audio/*,audio/mp4,video/mp4'), "Accept attribute must support audio/*, audio/mp4, and video/mp4");
  assert.ok(html.includes(".mp4"), "Accept attribute must include .mp4 extension");
  assert.ok(html.includes(".m4a"), "Accept attribute must include .m4a extension");
});

// ============================================================================
// 4. USER-GESTURE FALLBACK & AUTOPLAY COMPLIANCE
// ============================================================================

test("User-Gesture Fallback: interactive controls provide user-initiated play/pause toggles", () => {
  const { moduleExports } = loadOurSoundtrackSectionModule();
  const OurSoundtrackSection = moduleExports.OurSoundtrackSection as React.ComponentType<{
    tracks?: unknown[];
    activeTrack?: unknown;
    isPlaying?: boolean;
    onTogglePlay?: () => void;
    onPlayTrack?: (track: unknown) => void;
    onOpenSongbook?: () => void;
  }>;

  const track = {
    id: "test-track",
    title: "Golden Hour",
    artist: "JVKE",
    url: "https://example.com/golden.mp4",
    duration_seconds: 209,
  };

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(OurSoundtrackSection, {
      tracks: [track],
      activeTrack: track,
      isPlaying: false,
      onTogglePlay: () => {},
      onPlayTrack: () => {},
      onOpenSongbook: () => {},
    })
  );

  // Play toggle button
  assert.ok(html.includes('aria-label="Play Golden Hour"'), "Play toggle must have descriptive label");
  assert.ok(html.includes('title="Play"'), "Play toggle button must have title");
  assert.ok(html.includes("soundtrack-play-toggle-btn"), "Must have play toggle button class");

  // Track row selection
  assert.ok(html.includes('aria-label="Play Golden Hour by JVKE"'), "Track selection button must be accessible");
});

test("Mutual Exclusivity: MusicRoom pauses video playback when starting audio", () => {
  const musicRoomSource = fs.readFileSync(
    path.resolve(process.cwd(), "src/components/music/MusicRoom.tsx"),
    "utf-8"
  );

  assert.ok(
    musicRoomSource.includes('querySelectorAll("video")') ||
    musicRoomSource.includes("querySelectorAll('video')"),
    "MusicRoom must query and pause video elements when playing music"
  );
  assert.ok(
    musicRoomSource.includes(".pause()"),
    "MusicRoom must call pause() on active video elements"
  );
});

test("CSS Verification: music-player.css defines scrubber, volume, and accessibility styles", () => {
  const cssPath = path.resolve(process.cwd(), "src/components/music/music-player.css");
  assert.ok(fs.existsSync(cssPath), "music-player.css must exist");

  const css = fs.readFileSync(cssPath, "utf-8");
  assert.ok(css.includes(".music-progress-bar"), "Must style progress scrubber");
  assert.ok(css.includes(".music-volume-slider"), "Must style volume scrubber");
  assert.ok(css.includes("prefers-reduced-motion"), "Must support prefers-reduced-motion");
  assert.ok(css.includes("focus-visible"), "Must have focus-visible styling");
});
