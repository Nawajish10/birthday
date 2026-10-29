/**
 * music-personal-features.test.ts
 * Tests for Agent E deliverables:
 * - PlaylistManagerModal (Create, Edit, Add to playlist)
 * - LyricsPanel (Synchronized timed lyrics, plain text, empty state)
 * - ListeningHistoryModal & formatRelativeTime
 */

import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import ReactDOMServer from "react-dom/server";

const nodeRequire = createRequire(import.meta.url);

function loadComponentModule(relativePath: string) {
  const filePath = path.resolve(process.cwd(), relativePath);
  assert.ok(fs.existsSync(filePath), `${relativePath} must exist`);

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
    if (moduleName.includes("api-client")) {
      return {
        fetchHistory: async () => [],
        fetchLyrics: async () => null,
        fetchPlaylist: async () => ({ id: "p1", name: "test", tracks: [] }),
        createPlaylist: async () => ({ id: "p1", name: "test" }),
        updatePlaylist: async () => ({ id: "p1", name: "test" }),
        deletePlaylist: async () => {},
        addTrackToPlaylist: async () => {},
        removeTrackFromPlaylist: async () => {},
        reorderPlaylistTracks: async () => {},
      };
    }
    if (moduleName.includes("music-catalogue")) {
      return {
        formatDuration: (s: number) => {
          const m = Math.floor(s / 60);
          const rem = Math.floor(s % 60);
          return `${m}:${rem.toString().padStart(2, "0")}`;
        },
      };
    }
    return nodeRequire(moduleName);
  };

  const moduleExports: any = {};
  const evalFunc = new Function("exports", "require", transpiled.outputText);
  evalFunc(moduleExports, customRequire);

  return moduleExports;
}

const historyModule = loadComponentModule("src/components/music/ListeningHistoryModal.tsx");
const playlistModule = loadComponentModule("src/components/music/PlaylistManagerModal.tsx");
const lyricsModule = loadComponentModule("src/components/music/LyricsPanel.tsx");

const { formatRelativeTime, ListeningHistoryList, ListeningHistoryModal } = historyModule;
const { CreatePlaylistModal, EditPlaylistModal, AddToPlaylistModal } = playlistModule;
const { LyricsPanel } = lyricsModule;

// ============================================================================
// 1. Relative Time Formatting
// ============================================================================

describe("formatRelativeTime helper", () => {
  test("handles empty string safely", () => {
    assert.equal(formatRelativeTime(""), "");
  });

  test("returns 'Just now' for timestamps within 60 seconds", () => {
    const now = new Date().toISOString();
    assert.equal(formatRelativeTime(now), "Just now");

    const thirtySecAgo = new Date(Date.now() - 30_000).toISOString();
    assert.equal(formatRelativeTime(thirtySecAgo), "Just now");
  });

  test("returns 'Xm ago' for timestamps within the hour", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    assert.equal(formatRelativeTime(fiveMinAgo), "5m ago");

    const fiftyMinAgo = new Date(Date.now() - 50 * 60_000).toISOString();
    assert.equal(formatRelativeTime(fiftyMinAgo), "50m ago");
  });

  test("returns 'Xh ago' for timestamps within 24 hours", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600_000).toISOString();
    assert.equal(formatRelativeTime(threeHoursAgo), "3h ago");
  });

  test("returns 'Yesterday' for timestamps between 24 and 48 hours", () => {
    const yesterday = new Date(Date.now() - 25 * 3600_000).toISOString();
    assert.equal(formatRelativeTime(yesterday), "Yesterday");
  });

  test("returns 'Xd ago' for timestamps within 7 days", () => {
    const fourDaysAgo = new Date(Date.now() - 4 * 86400_000).toISOString();
    assert.equal(formatRelativeTime(fourDaysAgo), "4d ago");
  });
});

// ============================================================================
// 2. Playlist Modals Markup & Accessibility
// ============================================================================

describe("PlaylistManagerModal components", () => {
  test("CreatePlaylistModal: renders nothing when isOpen is false", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(CreatePlaylistModal, {
        isOpen: false,
        onClose: () => {},
      })
    );
    assert.equal(html, "");
  });

  test("CreatePlaylistModal: renders dialog structure and accessibility attributes when open", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(CreatePlaylistModal, {
        isOpen: true,
        onClose: () => {},
      })
    );

    assert.ok(html.includes('role="dialog"'), "Must have dialog role");
    assert.ok(html.includes('aria-modal="true"'), "Must be aria-modal");
    assert.ok(html.includes("Create Playlist"), "Must have Create Playlist title");
    assert.ok(html.includes("Playlist Name"), "Must have Playlist Name label");
    assert.ok(html.includes("Description"), "Must have Description label");
    assert.ok(html.includes("Create Playlist ♫"), "Must have submit button");
  });

  test("EditPlaylistModal: renders playlist details and delete section when open", () => {
    const samplePlaylist = {
      id: "pl-123",
      name: "Starlight Reverie",
      description: "Songs under the midnight moon",
      artwork_path: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(EditPlaylistModal, {
        isOpen: true,
        playlist: samplePlaylist,
        onClose: () => {},
      })
    );

    assert.ok(html.includes("Playlist Settings"), "Must have Playlist Settings heading");
    assert.ok(html.includes("Starlight Reverie"), "Must populate playlist name");
    assert.ok(html.includes("Songs under the midnight moon"), "Must populate description");
    assert.ok(html.includes("Delete Playlist"), "Must render delete option");
  });

  test("AddToPlaylistModal: renders user playlist choices and empty states", () => {
    const track = { id: "track-01", title: "Golden Hour", artist: "JVKE" };
    const playlists = [
      {
        id: "pl-1",
        name: "Acoustic Sunset",
        description: null,
        artwork_path: null,
        created_at: "",
        updated_at: "",
        track_count: 5,
      },
    ];

    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(AddToPlaylistModal, {
        isOpen: true,
        track,
        playlists,
        onClose: () => {},
      })
    );

    assert.ok(html.includes("Save Song"), "Must show Save Song header");
    assert.ok(html.includes("Golden Hour"), "Must show target song title");
    assert.ok(html.includes("JVKE"), "Must show target song artist");
    assert.ok(html.includes("Acoustic Sunset"), "Must list existing playlist");
    assert.ok(html.includes("5 tracks"), "Must show playlist track count");
  });
});

// ============================================================================
// 3. Lyrics Panel Component
// ============================================================================

describe("LyricsPanel component", () => {
  test("renders nothing when isOpen is false", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(LyricsPanel, {
        trackId: "track-01",
        currentTime: 10,
        isOpen: false,
        onClose: () => {},
      })
    );
    assert.equal(html, "");
  });

  test("renders panel container and track info when isOpen is true", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(LyricsPanel, {
        trackId: "track-01",
        trackTitle: "Until I Found You",
        trackArtist: "Stephen Sanchez",
        currentTime: 0,
        isOpen: true,
        onClose: () => {},
      })
    );

    assert.ok(html.includes('role="region"'), "Must have region role");
    assert.ok(html.includes("✿ LYRICS ✿"), "Must have romantic kicker");
    assert.ok(html.includes("Until I Found You"), "Must display track title");
    assert.ok(html.includes("Stephen Sanchez"), "Must display artist");
  });
});

// ============================================================================
// 4. Listening History List Component
// ============================================================================

describe("ListeningHistoryList component", () => {
  test("renders empty state when history entries are empty", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(ListeningHistoryList, {
        entries: [],
        isLoading: false,
        error: null,
        onSelectTrack: () => {},
      })
    );

    assert.ok(html.includes("No listening history yet"), "Must show empty state message");
  });

  test("renders history rows with relative times and completion status", () => {
    const entries = [
      {
        id: "hist-1",
        track_id: "track-01",
        played_at: new Date(Date.now() - 10 * 60_000).toISOString(),
        completed: true,
        progress_seconds: 209,
        track: {
          id: "track-01",
          title: "Golden Hour",
          artist: "JVKE",
          album: null,
          duration_seconds: 209,
          artwork_path: null,
          source_type: "imported",
          provider_ref: null,
          availability_status: "available",
          media_path: "audio/golden-hour.mp3",
          is_published: true,
          sort_order: 1,
        },
      },
      {
        id: "hist-2",
        track_id: "track-02",
        played_at: new Date(Date.now() - 3600_000).toISOString(),
        completed: false,
        progress_seconds: 45,
        track: {
          id: "track-02",
          title: "Lover",
          artist: "Taylor Swift",
          album: null,
          duration_seconds: 221,
          artwork_path: null,
          source_type: "imported",
          provider_ref: null,
          availability_status: "available",
          media_path: "audio/lover.mp3",
          is_published: true,
          sort_order: 2,
        },
      },
    ];

    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(ListeningHistoryList, {
        entries,
        isLoading: false,
        error: null,
        onSelectTrack: () => {},
      })
    );

    assert.ok(html.includes("Golden Hour"), "Must render completed track title");
    assert.ok(html.includes("JVKE"), "Must render artist");
    assert.ok(html.includes("✓ Completed"), "Must show completed checkmark");
    assert.ok(html.includes("10m ago"), "Must show relative time");

    assert.ok(html.includes("Lover"), "Must render second track title");
    assert.ok(html.includes("Partial"), "Must show partial status for uncompleted track");
    assert.ok(html.includes("1h ago"), "Must show relative time for second track");
  });
});
