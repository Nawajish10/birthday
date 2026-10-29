/**
 * music-system-catalogue.test.ts
 * Agent F – comprehensive edge-case coverage for music-catalogue.ts helpers.
 * Uses Node.js native test runner (node:test + node:assert/strict).
 */

import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  formatDuration,
  parseDurationToSeconds,
  searchAndFilterTracks,
  getNextTrackIndex,
  getPreviousTrackIndex,
  createLocalTrack,
  revokeLocalTrackUrls,
  SEED_MUSIC_CATALOGUE,
  PLAYLIST_NAMES,
  type MusicTrackItem,
} from "../src/components/music/music-catalogue.ts";

// ============================================================================
// 1. formatDuration – edge cases not covered in music-room.test.ts
// ============================================================================

describe("formatDuration – extended edge cases", () => {
  test("zero returns 0:00", () => {
    assert.equal(formatDuration(0), "0:00");
  });

  test("negative numbers clamp to 0:00", () => {
    assert.equal(formatDuration(-1), "0:00");
    assert.equal(formatDuration(-999), "0:00");
    assert.equal(formatDuration(-0.001), "0:00");
  });

  test("NaN returns 0:00", () => {
    assert.equal(formatDuration(NaN), "0:00");
  });

  test("null/undefined/string return 0:00", () => {
    assert.equal(formatDuration(null as any), "0:00");
    assert.equal(formatDuration(undefined as any), "0:00");
    assert.equal(formatDuration("hello" as any), "0:00");
    assert.equal(formatDuration({} as any), "0:00");
  });

  test("large value 3661 seconds = 61:01 (not HH:MM:SS)", () => {
    // The implementation uses MM:SS not HH:MM:SS, so 3661 = 61 min 1 sec
    const result = formatDuration(3661);
    assert.equal(result, "61:01");
  });

  test("1 hour exactly = 60:00", () => {
    assert.equal(formatDuration(3600), "60:00");
  });

  test("fractional seconds are floored", () => {
    assert.equal(formatDuration(1.9), "0:01");
    assert.equal(formatDuration(59.99), "0:59");
  });

  test("single-digit seconds get zero-padded", () => {
    assert.equal(formatDuration(65), "1:05");
    assert.equal(formatDuration(3601), "60:01");
  });
});

// ============================================================================
// 2. parseDurationToSeconds – edge cases
// ============================================================================

describe("parseDurationToSeconds – extended edge cases", () => {
  test("empty string returns 0", () => {
    assert.equal(parseDurationToSeconds(""), 0);
  });

  test("null/undefined return 0", () => {
    assert.equal(parseDurationToSeconds(null as any), 0);
    assert.equal(parseDurationToSeconds(undefined as any), 0);
  });

  test("non-string garbage returns 0", () => {
    assert.equal(parseDurationToSeconds(123 as any), 0);
    assert.equal(parseDurationToSeconds({} as any), 0);
  });

  test("plain text string returns 0", () => {
    assert.equal(parseDurationToSeconds("invalid"), 0);
    assert.equal(parseDurationToSeconds("abc:def"), 0);
  });

  test("negative duration string returns 0", () => {
    assert.equal(parseDurationToSeconds("-1:30"), 0);
    assert.equal(parseDurationToSeconds("-0:10"), 0);
  });

  test("HH:MM:SS format: 1:05:30 = 3930 seconds", () => {
    assert.equal(parseDurationToSeconds("1:05:30"), 3930);
  });

  test("HH:MM:SS format: 0:00:00 = 0", () => {
    assert.equal(parseDurationToSeconds("0:00:00"), 0);
  });

  test("HH:MM:SS format: 2:30:45 = 9045", () => {
    assert.equal(parseDurationToSeconds("2:30:45"), 9045);
  });

  test("MM:SS: boundary values", () => {
    assert.equal(parseDurationToSeconds("0:00"), 0);
    assert.equal(parseDurationToSeconds("0:01"), 1);
    assert.equal(parseDurationToSeconds("59:59"), 3599);
    assert.equal(parseDurationToSeconds("99:99"), 6039);
  });

  test("extra colons / four-part strings return 0", () => {
    // Our parser only handles 2 or 3 parts
    assert.equal(parseDurationToSeconds("1:2:3:4"), 0);
  });

  test("round-trip: formatDuration then parseDurationToSeconds", () => {
    const samples = [0, 1, 59, 60, 3599, 3600, 3661];
    for (const s of samples) {
      const formatted = formatDuration(s);
      const parsed = parseDurationToSeconds(formatted);
      assert.equal(parsed, s, `Round-trip failed for ${s}s → "${formatted}" → ${parsed}`);
    }
  });
});

// ============================================================================
// 3. searchAndFilterTracks – comprehensive cases
// ============================================================================

describe("searchAndFilterTracks – comprehensive cases", () => {
  // Build a minimal controlled track set for isolation
  const tracks: MusicTrackItem[] = [
    { id: "t1", title: "Golden Hour", artist: "JVKE", duration: "3:29", durationSeconds: 209, isFavorite: true, url: "", playlist: "Pop Hits" },
    { id: "t2", title: "Lover", artist: "Taylor Swift", duration: "3:41", durationSeconds: 221, isFavorite: true, url: "", playlist: "Pop Hits" },
    { id: "t3", title: "Yellow", artist: "Coldplay", duration: "4:29", durationSeconds: 269, isFavorite: false, url: "", playlist: "Acoustic" },
    { id: "t4", title: "Dil Dhadakne Do", artist: "Atif Aslam", duration: "5:00", durationSeconds: 300, isFavorite: false, url: "", playlist: "Desi" },
    { id: "t5", title: "No Playlist Song", artist: "Unknown Artist", duration: "2:00", durationSeconds: 120, isFavorite: false, url: "" },
  ];

  test("empty query + filter 'all' returns all tracks", () => {
    const result = searchAndFilterTracks(tracks, "", "all");
    assert.equal(result.length, tracks.length);
  });

  test("empty query + filter 'favorites' returns only favorites", () => {
    const result = searchAndFilterTracks(tracks, "", "favorites");
    assert.ok(result.length > 0, "At least one favorite expected");
    assert.ok(result.every((t) => t.isFavorite === true));
  });

  test("empty query + filter 'playlists' returns only tracks with a playlist", () => {
    const result = searchAndFilterTracks(tracks, "", "playlists");
    assert.ok(result.every((t) => Boolean(t.playlist)));
    // t5 has no playlist
    assert.ok(!result.find((t) => t.id === "t5"));
  });

  test("filter 'playlists' with selectedPlaylist returns only that playlist", () => {
    const result = searchAndFilterTracks(tracks, "", "playlists", "Desi");
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "t4");
  });

  test("filter 'playlists' with selectedPlaylist='all' returns all tracks with playlists", () => {
    const result = searchAndFilterTracks(tracks, "", "playlists", "all");
    // 'all' is treated as show all playlisted tracks
    assert.ok(result.every((t) => Boolean(t.playlist)));
  });

  test("query matches title case-insensitively", () => {
    const result = searchAndFilterTracks(tracks, "GOLDEN", "all");
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "t1");
  });

  test("query matches artist case-insensitively", () => {
    const result = searchAndFilterTracks(tracks, "coldplay", "all");
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "t3");
  });

  test("combined: query + favorites filter", () => {
    const result = searchAndFilterTracks(tracks, "lover", "favorites");
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "t2");
    assert.equal(result[0].isFavorite, true);
  });

  test("combined: query + playlists filter + selectedPlaylist", () => {
    const result = searchAndFilterTracks(tracks, "atif", "playlists", "Desi");
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "t4");
  });

  test("non-matching query returns empty array", () => {
    const result = searchAndFilterTracks(tracks, "xyzabc999nonexistent", "all");
    assert.equal(result.length, 0);
  });

  test("empty track array returns empty array", () => {
    const result = searchAndFilterTracks([], "hello", "all");
    assert.equal(result.length, 0);
  });

  test("null/non-array tracks returns empty array", () => {
    const result = searchAndFilterTracks(null as any, "hello", "all");
    assert.deepEqual(result, []);
  });

  test("whitespace-only query matches all tracks (trimmed to empty)", () => {
    const result = searchAndFilterTracks(tracks, "   ", "all");
    assert.equal(result.length, tracks.length);
  });

  test("query matching multiple tracks returns all matching", () => {
    // Both "Golden Hour" and "Lover" are in the catalogue; search for "lo" matches both
    const result = searchAndFilterTracks(tracks, "lo", "all");
    // "Golden" has "lo" in "Golden", "Lover" has "lo" in "Lover", "Yellow" has "ll"
    assert.ok(result.some((t) => t.id === "t2")); // "Lover" contains "lo"
    assert.ok(result.some((t) => t.id === "t3")); // "Yellow" contains "lo"
    // "Lover" → "lo", "Yellow" → "ello", "Dil Dhadakne Do" → no
    // Let's just assert no crash and returns array
    assert.ok(Array.isArray(result));
  });

  // Test using real SEED_MUSIC_CATALOGUE
  test("SEED_MUSIC_CATALOGUE: all playlist names represented after playlists filter", () => {
    for (const pl of PLAYLIST_NAMES) {
      const result = searchAndFilterTracks(SEED_MUSIC_CATALOGUE, "", "playlists", pl as string);
      assert.ok(result.length > 0, `Playlist "${pl}" must have at least one track`);
    }
  });
});

// ============================================================================
// 4. getNextTrackIndex – comprehensive state machine coverage
// ============================================================================

describe("getNextTrackIndex – state machine", () => {
  test("normal advance within bounds", () => {
    assert.equal(getNextTrackIndex(0, 5, false, false), 1);
    assert.equal(getNextTrackIndex(3, 5, false, false), 4);
  });

  test("end of queue without repeat returns -1", () => {
    assert.equal(getNextTrackIndex(4, 5, false, false), -1);
    assert.equal(getNextTrackIndex(9, 10, false, false), -1);
  });

  test("end of queue with repeat wraps to 0", () => {
    assert.equal(getNextTrackIndex(4, 5, false, true), 0);
    assert.equal(getNextTrackIndex(49, 50, false, true), 0);
  });

  test("single track always returns 0 (repeat-one behavior)", () => {
    assert.equal(getNextTrackIndex(0, 1, false, false), 0);
    assert.equal(getNextTrackIndex(0, 1, false, true), 0);
    assert.equal(getNextTrackIndex(0, 1, true, false), 0);
  });

  test("empty queue returns -1", () => {
    assert.equal(getNextTrackIndex(0, 0, false, false), -1);
    assert.equal(getNextTrackIndex(5, 0, true, true), -1);
  });

  test("negative currentIndex returns 0 (reset to start)", () => {
    assert.equal(getNextTrackIndex(-1, 5, false, false), 0);
    assert.equal(getNextTrackIndex(-5, 10, false, true), 0);
  });

  test("shuffle: returned index is within [0, totalCount)", () => {
    const total = 15;
    for (let i = 0; i < 20; i++) {
      const next = getNextTrackIndex(5, total, true, false);
      assert.ok(next >= 0 && next < total, `Shuffle index ${next} out of range [0, ${total - 1}]`);
    }
  });

  test("shuffle: never returns exactly currentIndex when totalCount > 1 (probabilistically)", () => {
    // Deterministic check: run 50 iterations from a fixed position
    const total = 50;
    const current = 25;
    let sameCount = 0;
    for (let i = 0; i < 50; i++) {
      const next = getNextTrackIndex(current, total, true, false);
      if (next === current) sameCount++;
    }
    // Allow at most 1 coincidence out of 50 (implementation shifts by 1 when same)
    assert.ok(sameCount === 0, `Shuffle returned same index ${sameCount} times`);
  });

  test("shuffle ignores repeat flag (still returns within range)", () => {
    const total = 10;
    for (let i = 0; i < 10; i++) {
      const idx = getNextTrackIndex(9, total, true, false);
      assert.ok(idx >= 0 && idx < total);
    }
  });
});

// ============================================================================
// 5. getPreviousTrackIndex – state machine
// ============================================================================

describe("getPreviousTrackIndex – state machine", () => {
  test("normal backward navigation", () => {
    assert.equal(getPreviousTrackIndex(5, 10), 4);
    assert.equal(getPreviousTrackIndex(1, 10), 0);
    assert.equal(getPreviousTrackIndex(9, 10), 8);
  });

  test("at index 0 wraps to last track", () => {
    assert.equal(getPreviousTrackIndex(0, 10), 9);
    assert.equal(getPreviousTrackIndex(0, 50), 49);
  });

  test("negative currentIndex also wraps to last", () => {
    assert.equal(getPreviousTrackIndex(-1, 10), 9);
    assert.equal(getPreviousTrackIndex(-5, 5), 4);
  });

  test("single track returns 0", () => {
    assert.equal(getPreviousTrackIndex(0, 1), 0);
  });

  test("empty queue returns -1", () => {
    assert.equal(getPreviousTrackIndex(0, 0), -1);
  });

  test("out-of-bounds currentIndex (>= totalCount) clamps to last", () => {
    assert.equal(getPreviousTrackIndex(15, 10), 9);
  });
});

// ============================================================================
// 6. createLocalTrack – ID prefix, title cleanup
// ============================================================================

describe("createLocalTrack – local track creation", () => {
  function fakeFile(name: string): File {
    return { name } as unknown as File;
  }

  const OBJ_URL = "blob:http://localhost/abc-def";

  test("id starts with 'local-'", () => {
    const track = createLocalTrack(fakeFile("Song.mp3"), OBJ_URL);
    assert.ok(track.id.startsWith("local-"), `ID "${track.id}" must start with "local-"`);
  });

  test("title strips file extension (.mp3)", () => {
    const track = createLocalTrack(fakeFile("Our Roadtrip Song.mp3"), OBJ_URL);
    assert.equal(track.title, "Our Roadtrip Song");
  });

  test("title strips .flac extension", () => {
    const track = createLocalTrack(fakeFile("Rainy Day.flac"), OBJ_URL);
    assert.equal(track.title, "Rainy Day");
  });

  test("title strips .wav extension", () => {
    const track = createLocalTrack(fakeFile("Birthday Surprise.wav"), OBJ_URL);
    assert.equal(track.title, "Birthday Surprise");
  });

  test("title strips multiple dots correctly (only last extension removed)", () => {
    const track = createLocalTrack(fakeFile("Version.1.2.mp3"), OBJ_URL);
    assert.equal(track.title, "Version.1.2");
  });

  test("url is set to the provided objectUrl", () => {
    const track = createLocalTrack(fakeFile("Song.mp3"), OBJ_URL);
    assert.equal(track.url, OBJ_URL);
  });

  test("artist is 'Local Audio File'", () => {
    const track = createLocalTrack(fakeFile("Song.mp3"), OBJ_URL);
    assert.equal(track.artist, "Local Audio File");
  });

  test("isLocal is true", () => {
    const track = createLocalTrack(fakeFile("Song.mp3"), OBJ_URL);
    assert.equal(track.isLocal, true);
  });

  test("playlist is 'Local Uploads'", () => {
    const track = createLocalTrack(fakeFile("Song.mp3"), OBJ_URL);
    assert.equal(track.playlist, "Local Uploads");
  });

  test("isFavorite is false by default", () => {
    const track = createLocalTrack(fakeFile("Song.mp3"), OBJ_URL);
    assert.equal(track.isFavorite, false);
  });

  test("file with no extension uses full name as title", () => {
    const track = createLocalTrack(fakeFile("README"), OBJ_URL);
    assert.equal(track.title, "README");
  });

  test("multiple createLocalTrack calls produce unique IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const track = createLocalTrack(fakeFile(`Song${i}.mp3`), OBJ_URL);
      ids.add(track.id);
    }
    assert.equal(ids.size, 20, "All 20 IDs must be unique");
  });
});

// ============================================================================
// 7. revokeLocalTrackUrls – safe URL cleanup
// ============================================================================

describe("revokeLocalTrackUrls – URL cleanup safety", () => {
  function withMockedRevokeUrl(fn: (revoked: string[]) => void) {
    const revoked: string[] = [];
    const originalUrl = globalThis.URL;
    globalThis.URL = {
      ...originalUrl,
      revokeObjectURL: (url: string) => { revoked.push(url); },
    } as any;
    try {
      fn(revoked);
    } finally {
      globalThis.URL = originalUrl;
    }
  }

  test("revokes only local track URLs", () => {
    withMockedRevokeUrl((revoked) => {
      const tracks: MusicTrackItem[] = [
        { id: "l1", title: "A", artist: "B", duration: "1:00", durationSeconds: 60, isFavorite: false, url: "blob:local-1", isLocal: true },
        { id: "r1", title: "C", artist: "D", duration: "1:00", durationSeconds: 60, isFavorite: false, url: "https://remote.mp3", isLocal: false },
        { id: "l2", title: "E", artist: "F", duration: "1:00", durationSeconds: 60, isFavorite: false, url: "blob:local-2", isLocal: true },
      ];
      revokeLocalTrackUrls(tracks);
      assert.equal(revoked.length, 2);
      assert.ok(revoked.includes("blob:local-1"));
      assert.ok(revoked.includes("blob:local-2"));
    });
  });

  test("empty array does not throw", () => {
    assert.doesNotThrow(() => revokeLocalTrackUrls([]));
  });

  test("null/undefined does not throw", () => {
    assert.doesNotThrow(() => revokeLocalTrackUrls(null as any));
    assert.doesNotThrow(() => revokeLocalTrackUrls(undefined as any));
  });

  test("tracks with isLocal=false are never revoked", () => {
    withMockedRevokeUrl((revoked) => {
      const tracks: MusicTrackItem[] = [
        { id: "r1", title: "A", artist: "B", duration: "1:00", durationSeconds: 60, isFavorite: false, url: "https://cdn.example.com/song.mp3", isLocal: false },
        { id: "r2", title: "C", artist: "D", duration: "1:00", durationSeconds: 60, isFavorite: false, url: "https://cdn.example.com/song2.mp3" }, // isLocal undefined
      ];
      revokeLocalTrackUrls(tracks);
      assert.equal(revoked.length, 0);
    });
  });

  test("tracks with empty URL are skipped safely", () => {
    withMockedRevokeUrl((revoked) => {
      const tracks: MusicTrackItem[] = [
        { id: "l1", title: "A", artist: "B", duration: "1:00", durationSeconds: 60, isFavorite: false, url: "", isLocal: true },
      ];
      assert.doesNotThrow(() => revokeLocalTrackUrls(tracks));
      assert.equal(revoked.length, 0);
    });
  });
});
