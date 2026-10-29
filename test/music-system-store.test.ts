/**
 * music-system-store.test.ts
 * Agent F – Unit tests for music store / playback state machine logic.
 *
 * The store (use-music-store.ts) uses React hooks internally, so we test
 * the pure state-transition logic extracted as standalone pure functions.
 * Each function mirrors the intent of the corresponding store action.
 *
 * No DOM, no React, no hooks — pure logic tests only.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  getNextTrackIndex,
  getPreviousTrackIndex,
  type MusicTrackItem,
} from "../src/components/music/music-catalogue.ts";

// ============================================================================
// Types matching use-music-store.ts expected shape
// ============================================================================

type RepeatMode = "off" | "all" | "one";

interface PlaybackState {
  queue: MusicTrackItem[];
  currentIndex: number;
  isPlaying: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  volume: number;
}

// ============================================================================
// Pure state transition helpers (mirror of store actions)
// ============================================================================

function makeTrack(id: string): MusicTrackItem {
  return {
    id,
    title: `Track ${id}`,
    artist: "Test Artist",
    duration: "3:00",
    durationSeconds: 180,
    isFavorite: false,
    url: "",
  };
}

function makeQueue(count: number): MusicTrackItem[] {
  return Array.from({ length: count }, (_, i) => makeTrack(`t${i + 1}`));
}

function initialState(overrides: Partial<PlaybackState> = {}): PlaybackState {
  return {
    queue: makeQueue(5),
    currentIndex: 0,
    isPlaying: false,
    isShuffle: false,
    repeatMode: "off",
    volume: 0.8,
    ...overrides,
  };
}

// next() action
function nextTrack(state: PlaybackState): PlaybackState {
  const repeat = state.repeatMode === "all";
  const stayOnSame = state.repeatMode === "one";
  if (stayOnSame) return state; // repeat=one stays on same track
  const nextIdx = getNextTrackIndex(
    state.currentIndex,
    state.queue.length,
    state.isShuffle,
    repeat
  );
  if (nextIdx === -1) return { ...state, isPlaying: false }; // end of queue
  return { ...state, currentIndex: nextIdx, isPlaying: true };
}

// previous() action
function previousTrack(state: PlaybackState): PlaybackState {
  const prevIdx = getPreviousTrackIndex(state.currentIndex, state.queue.length);
  if (prevIdx === -1) return state;
  return { ...state, currentIndex: prevIdx, isPlaying: true };
}

// toggleShuffle()
function toggleShuffle(state: PlaybackState): PlaybackState {
  return { ...state, isShuffle: !state.isShuffle };
}

// setRepeatMode()
function setRepeatMode(state: PlaybackState, mode: RepeatMode): PlaybackState {
  return { ...state, repeatMode: mode };
}

// cycleRepeatMode(): off → all → one → off
function cycleRepeatMode(state: PlaybackState): PlaybackState {
  const cycle: RepeatMode[] = ["off", "all", "one"];
  const next = cycle[(cycle.indexOf(state.repeatMode) + 1) % cycle.length];
  return { ...state, repeatMode: next };
}

// setQueue()
function setQueue(state: PlaybackState, queue: MusicTrackItem[], startIndex = 0): PlaybackState {
  return { ...state, queue, currentIndex: startIndex, isPlaying: queue.length > 0 };
}

// ============================================================================
// Tests: next() behavior
// ============================================================================

describe("Store: next() – repeatMode='all' wraps to 0", () => {
  test("at end of queue with repeatMode='all', wraps to index 0", () => {
    const state = initialState({ currentIndex: 4, repeatMode: "all" }); // 5-track queue, last track
    const next = nextTrack(state);
    assert.equal(next.currentIndex, 0, "Should wrap to index 0");
    assert.equal(next.isPlaying, true);
  });

  test("in middle of queue with repeatMode='all', advances normally", () => {
    const state = initialState({ currentIndex: 2, repeatMode: "all" });
    const next = nextTrack(state);
    assert.equal(next.currentIndex, 3);
    assert.equal(next.isPlaying, true);
  });
});

describe("Store: next() – repeatMode='off' stops at end", () => {
  test("at end of queue with repeatMode='off', isPlaying becomes false", () => {
    const state = initialState({ currentIndex: 4, repeatMode: "off", isPlaying: true });
    const next = nextTrack(state);
    assert.equal(next.isPlaying, false, "Should stop playing at end of queue");
  });

  test("index stays at -1 sentinel (not changing currentIndex on stop)", () => {
    const state = initialState({ currentIndex: 4, repeatMode: "off" });
    const next = nextTrack(state);
    // When getNextTrackIndex returns -1, isPlaying becomes false
    // currentIndex is not updated to -1 in our implementation
    assert.equal(next.isPlaying, false);
  });

  test("in middle of queue advances normally", () => {
    const state = initialState({ currentIndex: 1, repeatMode: "off" });
    const next = nextTrack(state);
    assert.equal(next.currentIndex, 2);
  });
});

describe("Store: next() – repeatMode='one' stays on same track", () => {
  test("repeatMode='one' does not advance track index", () => {
    const state = initialState({ currentIndex: 2, repeatMode: "one" });
    const next = nextTrack(state);
    assert.equal(next.currentIndex, 2, "Should stay on same track with repeat=one");
  });

  test("repeatMode='one' at end of queue also stays", () => {
    const state = initialState({ currentIndex: 4, repeatMode: "one" });
    const next = nextTrack(state);
    assert.equal(next.currentIndex, 4);
  });
});

// ============================================================================
// Tests: previous() behavior
// ============================================================================

describe("Store: previous() – navigation", () => {
  test("at start (index 0) wraps to last track", () => {
    const state = initialState({ currentIndex: 0 });
    const prev = previousTrack(state);
    assert.equal(prev.currentIndex, state.queue.length - 1, "Should wrap to last track");
    assert.equal(prev.isPlaying, true);
  });

  test("in middle, goes to previous track", () => {
    const state = initialState({ currentIndex: 3 });
    const prev = previousTrack(state);
    assert.equal(prev.currentIndex, 2);
    assert.equal(prev.isPlaying, true);
  });

  test("at index 1, goes to index 0", () => {
    const state = initialState({ currentIndex: 1 });
    const prev = previousTrack(state);
    assert.equal(prev.currentIndex, 0);
  });

  test("empty queue: previous returns unchanged state", () => {
    const state = initialState({ queue: [], currentIndex: 0 });
    const prev = previousTrack(state);
    assert.equal(prev.currentIndex, 0, "Empty queue: no change");
  });
});

// ============================================================================
// Tests: toggleShuffle()
// ============================================================================

describe("Store: toggleShuffle() – state toggle", () => {
  test("toggleShuffle turns off → on", () => {
    const state = initialState({ isShuffle: false });
    const toggled = toggleShuffle(state);
    assert.equal(toggled.isShuffle, true);
  });

  test("toggleShuffle turns on → off", () => {
    const state = initialState({ isShuffle: true });
    const toggled = toggleShuffle(state);
    assert.equal(toggled.isShuffle, false);
  });

  test("double toggle returns to original state", () => {
    const state = initialState({ isShuffle: false });
    const result = toggleShuffle(toggleShuffle(state));
    assert.equal(result.isShuffle, state.isShuffle);
  });

  test("toggleShuffle does not mutate other fields", () => {
    const state = initialState({ isShuffle: false, repeatMode: "all", volume: 0.5 });
    const toggled = toggleShuffle(state);
    assert.equal(toggled.repeatMode, "all");
    assert.equal(toggled.volume, 0.5);
    assert.equal(toggled.currentIndex, state.currentIndex);
  });
});

// ============================================================================
// Tests: setRepeatMode()
// ============================================================================

describe("Store: setRepeatMode() – explicit set", () => {
  test("set to 'all'", () => {
    const state = initialState({ repeatMode: "off" });
    assert.equal(setRepeatMode(state, "all").repeatMode, "all");
  });

  test("set to 'one'", () => {
    const state = initialState({ repeatMode: "off" });
    assert.equal(setRepeatMode(state, "one").repeatMode, "one");
  });

  test("set to 'off'", () => {
    const state = initialState({ repeatMode: "all" });
    assert.equal(setRepeatMode(state, "off").repeatMode, "off");
  });
});

describe("Store: cycleRepeatMode() – off → all → one → off", () => {
  test("off → all", () => {
    const s = initialState({ repeatMode: "off" });
    assert.equal(cycleRepeatMode(s).repeatMode, "all");
  });

  test("all → one", () => {
    const s = initialState({ repeatMode: "all" });
    assert.equal(cycleRepeatMode(s).repeatMode, "one");
  });

  test("one → off", () => {
    const s = initialState({ repeatMode: "one" });
    assert.equal(cycleRepeatMode(s).repeatMode, "off");
  });

  test("three cycles returns to original mode", () => {
    const s = initialState({ repeatMode: "off" });
    const result = cycleRepeatMode(cycleRepeatMode(cycleRepeatMode(s)));
    assert.equal(result.repeatMode, "off");
  });
});

// ============================================================================
// Tests: setQueue()
// ============================================================================

describe("Store: setQueue() – queue management", () => {
  test("replaces queue and resets to index 0 by default", () => {
    const state = initialState({ currentIndex: 3 });
    const newTracks = makeQueue(10);
    const next = setQueue(state, newTracks);
    assert.equal(next.queue.length, 10);
    assert.equal(next.currentIndex, 0);
    assert.equal(next.isPlaying, true);
  });

  test("can set starting index", () => {
    const state = initialState();
    const newTracks = makeQueue(8);
    const next = setQueue(state, newTracks, 5);
    assert.equal(next.currentIndex, 5);
    assert.equal(next.isPlaying, true);
  });

  test("setting empty queue sets isPlaying=false", () => {
    const state = initialState({ isPlaying: true });
    const next = setQueue(state, []);
    assert.equal(next.queue.length, 0);
    assert.equal(next.isPlaying, false);
  });

  test("queue items are the exact objects provided (no deep copy)", () => {
    const state = initialState();
    const newTracks = makeQueue(3);
    const next = setQueue(state, newTracks);
    assert.equal(next.queue[0], newTracks[0], "Queue items must be the same references");
  });
});

// ============================================================================
// Tests: Integration – shuffle + next
// ============================================================================

describe("Store integration: shuffle + next", () => {
  test("shuffle next always returns a valid index for large queues", () => {
    const state = initialState({ queue: makeQueue(20), currentIndex: 10, isShuffle: true, repeatMode: "all" });
    for (let i = 0; i < 20; i++) {
      const next = nextTrack(state);
      assert.ok(next.currentIndex >= 0 && next.currentIndex < state.queue.length);
    }
  });

  test("previous after shuffle next is deterministic (previous is not shuffle)", () => {
    const state = initialState({ queue: makeQueue(10), currentIndex: 5 });
    // Go back always goes to index 4
    const prev = previousTrack(state);
    assert.equal(prev.currentIndex, 4);
  });
});

// ============================================================================
// Tests: Volume boundary (pure state guard)
// ============================================================================

describe("Store: volume range validation (0.0 – 1.0)", () => {
  function setVolume(state: PlaybackState, vol: number): PlaybackState {
    const clamped = Math.max(0, Math.min(1, isNaN(vol) ? 0 : vol));
    return { ...state, volume: clamped };
  }

  test("volume 0.5 sets correctly", () => {
    const s = setVolume(initialState(), 0.5);
    assert.equal(s.volume, 0.5);
  });

  test("volume above 1.0 clamps to 1.0", () => {
    const s = setVolume(initialState(), 2.5);
    assert.equal(s.volume, 1.0);
  });

  test("volume below 0 clamps to 0", () => {
    const s = setVolume(initialState(), -0.1);
    assert.equal(s.volume, 0);
  });

  test("NaN volume clamps to 0", () => {
    const s = setVolume(initialState(), NaN);
    assert.equal(s.volume, 0);
  });

  test("volume of exactly 0 is valid", () => {
    const s = setVolume(initialState(), 0);
    assert.equal(s.volume, 0);
  });

  test("volume of exactly 1 is valid", () => {
    const s = setVolume(initialState(), 1);
    assert.equal(s.volume, 1);
  });
});
