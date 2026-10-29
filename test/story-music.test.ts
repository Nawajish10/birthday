import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateProgress,
  calculateSegmentProgress,
  calculateTickElapsed,
  getNextSlideIndex,
  getPreviousSlideIndex,
  handleTapNavigation,
  createInitialPlaybackState,
  pauseStory,
  resumeStory,
  togglePauseStory,
  startHold,
  endHold,
  stepToNextSlide,
  stepToPreviousSlide,
  normalizeMusicTrack,
  attachMusicToStory,
  detachMusicFromStory,
  reorderSlideIds,
  reorderStoryPhotos,
  validateStoryData,
  formatCaptureDate,
  captureAudioState,
  playStoryAudio,
  pauseStoryAudio,
  resumeStoryAudio,
  restoreAudioState,
  DEFAULT_SLIDE_DURATION_MS,
  type PreviousAudioState,
} from "../src/components/memories/story-helpers.ts";
import {
  createStory,
  loadStories,
  deleteStory,
  INITIAL_PRELOADED_PHOTOS,
} from "../src/lib/media-service.ts";
import type { StoryItem, StoryAudioTrack } from "../src/types/media-contracts.ts";
import { SEED_MUSIC_CATALOGUE, MUSIC_CATALOGUE } from "../src/components/music/music-catalogue.ts";

// In-memory Storage mock for isolated persistence tests
class MockStorage implements Storage {
  private store: Record<string, string> = {};
  get length() {
    return Object.keys(this.store).length;
  }
  clear(): void {
    this.store = {};
  }
  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }
  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null;
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
}

// Mock HTMLAudioElement for testing external audio element coordination
class MockAudioElement {
  src: string = "";
  currentSrc: string = "";
  currentTime: number = 0;
  paused: boolean = true;
  ended: boolean = false;
  muted: boolean = false;
  volume: number = 1.0;
  playCount: number = 0;
  pauseCount: number = 0;
  loadCount: number = 0;
  shouldRejectPlay: boolean = false;

  async play(): Promise<void> {
    if (this.shouldRejectPlay) {
      throw new Error("NotAllowedError: play() failed because the user didn't interact first.");
    }
    this.paused = false;
    this.currentSrc = this.src;
    this.playCount++;
  }

  pause(): void {
    this.paused = true;
    this.pauseCount++;
  }

  load(): void {
    this.loadCount++;
    this.currentSrc = this.src;
  }

  removeAttribute(attr: string): void {
    if (attr === "src") {
      this.src = "";
      this.currentSrc = "";
    }
  }
}

// ---------------- 1. PROGRESS CALCULATION & STEP TIMING ----------------

test("Story Helpers: calculateProgress clamps between 0% and 100%", () => {
  assert.equal(calculateProgress(0, 5000), 0);
  assert.equal(calculateProgress(2500, 5000), 50);
  assert.equal(calculateProgress(5000, 5000), 100);
  assert.equal(calculateProgress(7500, 5000), 100, "Should clamp at 100%");
  assert.equal(calculateProgress(-100, 5000), 0, "Should clamp negative to 0%");
  assert.equal(calculateProgress(100, 0), 100, "0 duration returns 100%");
});

test("Story Helpers: calculateSegmentProgress represents individual slide status", () => {
  const currentSlide = 2; // 3rd slide (0-indexed)
  const duration = 5000;

  // Slide 0 and 1 are past -> should be 100%
  assert.equal(calculateSegmentProgress(0, currentSlide, 2500, duration), 100);
  assert.equal(calculateSegmentProgress(1, currentSlide, 2500, duration), 100);

  // Slide 2 is active -> should be 50%
  assert.equal(calculateSegmentProgress(2, currentSlide, 2500, duration), 50);

  // Slide 3 is future -> should be 0%
  assert.equal(calculateSegmentProgress(3, currentSlide, 2500, duration), 0);
});

test("Story Helpers: calculateTickElapsed respects pause and slide completion", () => {
  // Paused: elapsed time shouldn't advance
  const pausedRes = calculateTickElapsed(1000, 100, true, 5000);
  assert.equal(pausedRes.nextElapsed, 1000);
  assert.equal(pausedRes.shouldAdvance, false);

  // Running normally
  const activeRes = calculateTickElapsed(1000, 100, false, 5000);
  assert.equal(activeRes.nextElapsed, 1100);
  assert.equal(activeRes.shouldAdvance, false);

  // Reaching completion threshold
  const endRes = calculateTickElapsed(4950, 100, false, 5000);
  assert.equal(endRes.nextElapsed, 5000);
  assert.equal(endRes.shouldAdvance, true);
});

// ---------------- 2. SLIDE ADVANCEMENT & BOUNDARY WRAPPING ----------------

test("Story Helpers: getNextSlideIndex advances or completes without loop", () => {
  const total = 3;
  // Step from 0 -> 1
  assert.deepEqual(getNextSlideIndex(0, total, false), { nextIndex: 1, isCompleted: false });
  // Step from 1 -> 2
  assert.deepEqual(getNextSlideIndex(1, total, false), { nextIndex: 2, isCompleted: false });
  // Step from 2 -> end
  assert.deepEqual(getNextSlideIndex(2, total, false), { nextIndex: 2, isCompleted: true });

  // With loop enabled: step from 2 wraps to 0
  assert.deepEqual(getNextSlideIndex(2, total, true), { nextIndex: 0, isCompleted: false });
});

test("Story Helpers: getPreviousSlideIndex steps back and respects boundary", () => {
  const total = 4;
  assert.equal(getPreviousSlideIndex(3, total), 2);
  assert.equal(getPreviousSlideIndex(1, total), 0);
  // Boundary at 0 without loop
  assert.equal(getPreviousSlideIndex(0, total, false), 0);
  // Boundary at 0 with loop
  assert.equal(getPreviousSlideIndex(0, total, true), 3);
});

test("Story Helpers: handleTapNavigation splits screen left (prev) and right (next)", () => {
  const total = 5;
  const current = 2;

  // Tap at left 20% (< 35%) -> previous slide
  const leftTap = handleTapNavigation(0.2, current, total);
  assert.equal(leftTap.direction, "prev");
  assert.equal(leftTap.nextIndex, 1);
  assert.equal(leftTap.isCompleted, false);

  // Tap at right 70% (>= 35%) -> next slide
  const rightTap = handleTapNavigation(0.7, current, total);
  assert.equal(rightTap.direction, "next");
  assert.equal(rightTap.nextIndex, 3);
  assert.equal(rightTap.isCompleted, false);
});

// ---------------- 3. PAUSE / RESUME / HOLD STATE MACHINE ----------------

test("Story Helpers: hold-to-pause and resume state machine", () => {
  let state = createInitialPlaybackState();
  assert.equal(state.currentIndex, 0);
  assert.equal(state.isPaused, false);
  assert.equal(state.isHolding, false);

  // User touches and holds
  state = startHold(state);
  assert.equal(state.isHolding, true);
  assert.equal(state.isPaused, true);

  // User releases hold (was not paused before hold)
  state = endHold(state, false);
  assert.equal(state.isHolding, false);
  assert.equal(state.isPaused, false);

  // User toggles pause directly
  state = togglePauseStory(state);
  assert.equal(state.isPaused, true);

  // Hold starts while already paused
  state = startHold(state);
  assert.equal(state.isHolding, true);
  state = endHold(state, true);
  assert.equal(state.isHolding, false);
  assert.equal(state.isPaused, true, "Should retain prior paused state");

  // Step next slide resets elapsed
  state = { ...state, elapsedMs: 3400 };
  state = stepToNextSlide(state, 3);
  assert.equal(state.currentIndex, 1);
  assert.equal(state.elapsedMs, 0);
});

// ---------------- 4. MUSIC TRACK ATTACHMENT & NORMALIZATION ----------------

test("Story Helpers: normalizeMusicTrack and attach/detach from story", () => {
  const sampleCatalogueTrack = MUSIC_CATALOGUE[0]; // Golden Hour
  assert.ok(sampleCatalogueTrack.title);

  const normalized = normalizeMusicTrack(sampleCatalogueTrack);
  assert.equal(normalized.id, sampleCatalogueTrack.id);
  assert.equal(normalized.title, sampleCatalogueTrack.title);
  assert.equal(normalized.artist, sampleCatalogueTrack.artist);

  const initialStory: StoryItem = {
    id: "story-test-1",
    title: "Test Celebration",
    photoIds: ["p1", "p2"],
    photos: INITIAL_PRELOADED_PHOTOS.slice(0, 2),
    createdAt: "2026-10-20T10:00:00Z",
    updatedAt: "2026-10-20T10:00:00Z",
  };

  // Attach music
  const withMusic = attachMusicToStory(initialStory, sampleCatalogueTrack);
  assert.equal(withMusic.musicTrackId, sampleCatalogueTrack.id);
  assert.equal(withMusic.musicTrack?.title, sampleCatalogueTrack.title);

  // Detach music
  const detached = detachMusicFromStory(withMusic);
  assert.equal(detached.musicTrackId, undefined);
  assert.equal(detached.musicTrack, undefined);
});

test("Story Helpers: slide reordering immutability", () => {
  const ids = ["p1", "p2", "p3", "p4"];
  const reordered = reorderSlideIds(ids, 0, 2);
  assert.deepEqual(reordered, ["p2", "p3", "p1", "p4"]);
  assert.deepEqual(ids, ["p1", "p2", "p3", "p4"], "Original array should not be mutated");

  const photos = INITIAL_PRELOADED_PHOTOS.slice(0, 3);
  const reorderedPhotos = reorderStoryPhotos(photos, 2, 0);
  assert.equal(reorderedPhotos[0].id, photos[2].id);
  assert.equal(reorderedPhotos.length, 3);
});

test("Story Helpers: validation and date formatting", () => {
  assert.equal(validateStoryData("", []).isValid, false);
  assert.equal(validateStoryData("Valid Title", []).isValid, false);
  assert.equal(validateStoryData("Valid Title", ["p1"]).isValid, true);

  const formatted = formatCaptureDate("2024-10-29");
  assert.ok(formatted.includes("2024") || formatted.includes("Oct"));
});

// ---------------- 5. AUDIO BRIDGE & EXTERNAL AUDIO ELEMENT TESTS ----------------

test("Story Audio Bridge: plays background track and restores prior audio on close", async () => {
  const mockAudio = new MockAudioElement() as unknown as HTMLAudioElement;
  mockAudio.src = "https://cdn.example.com/prior-ambient.mp3";
  mockAudio.currentTime = 42;
  await (mockAudio as unknown as MockAudioElement).play();

  // Capture prior state
  const prior = captureAudioState(mockAudio);
  assert.ok(prior);
  assert.equal(prior.src, "https://cdn.example.com/prior-ambient.mp3");
  assert.equal(prior.currentTime, 42);
  assert.equal(prior.wasPlaying, true);

  // Story plays new track
  const storyTrack: StoryAudioTrack = {
    id: "story-bgm-1",
    title: "Afreen Afreen",
    artist: "Rahat",
    audioUrl: "https://cdn.example.com/afreen.mp3",
  };

  const playResult = await playStoryAudio(mockAudio, storyTrack);
  assert.equal(playResult.success, true);
  assert.equal(mockAudio.src, "https://cdn.example.com/afreen.mp3");
  assert.equal(mockAudio.paused, false);

  // Close story -> restore previous state
  restoreAudioState(mockAudio, prior);
  assert.equal(mockAudio.src, "https://cdn.example.com/prior-ambient.mp3");
  assert.equal(mockAudio.currentTime, 42);
  assert.equal(mockAudio.paused, false, "Should resume prior playing track");
});

test("Story Audio Bridge: handles blocked autoplay gracefully without crashing", async () => {
  const mockAudio = new MockAudioElement() as unknown as HTMLAudioElement;
  (mockAudio as unknown as MockAudioElement).shouldRejectPlay = true;

  const storyTrack: StoryAudioTrack = {
    id: "story-bgm-2",
    title: "Lover",
    artist: "Taylor Swift",
    audioUrl: "https://cdn.example.com/lover.mp3",
  };

  // playStoryAudio should not throw; it returns { success: false, error }
  const result = await playStoryAudio(mockAudio, storyTrack);
  assert.equal(result.success, false);
  assert.ok(result.error?.includes("NotAllowedError"));
});

// ---------------- 6. STORY PERSISTENCE WITH MUSIC REFERENCE ----------------

test("Story Persistence: createStory saves music reference and reloads safely", () => {
  const storage = new MockStorage();
  const selectedPhotos = INITIAL_PRELOADED_PHOTOS.slice(0, 2);
  const track = MUSIC_CATALOGUE[1]; // Lover

  const created = createStory(
    "Golden Birthday Memories",
    selectedPhotos.map((p) => p.id),
    selectedPhotos,
    normalizeMusicTrack(track),
    storage
  );

  assert.equal(created.title, "Golden Birthday Memories");
  assert.equal(created.musicTrackId, track.id);
  assert.equal(created.musicTrack?.title, track.title);

  // Reload from storage
  const loaded = loadStories(storage);
  const found = loaded.find((s) => s.id === created.id);
  assert.ok(found, "Saved story should be loaded from storage");
  assert.equal(found.musicTrackId, track.id);
  assert.equal(found.musicTrack?.title, track.title);
  assert.equal(found.photoIds.length, 2);

  // Clean delete leaves storage clean
  const remaining = deleteStory(created.id, storage);
  assert.equal(remaining.find((s) => s.id === created.id), undefined);
});
