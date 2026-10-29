/**
 * Pure state machine, timing, audio bridge, and persistence helper functions
 * for Story Viewer and Story Builder in the Birthday application.
 *
 * Designed to be zero-dependency and runnable in both Node.js tests and browser environments.
 */

import type { PhotoAsset, StoryAudioTrack, StoryItem } from "../../types/media-contracts.ts";
import type { MusicTrackItem } from "../music/music-catalogue.ts";

export const DEFAULT_SLIDE_DURATION_MS = 5000;
export const HOLD_THRESHOLD_MS = 250;
export const TAP_SPLIT_RATIO = 0.35; // Tapping leftmost 35% steps back; rest steps forward

export interface StoryPlaybackState {
  currentIndex: number;
  elapsedMs: number;
  isPaused: boolean;
  isHolding: boolean;
  isMuted: boolean;
  isCompleted: boolean;
}

export interface PreviousAudioState {
  src: string;
  currentTime: number;
  wasPlaying: boolean;
  volume: number;
}

// ---------------- 1. SLIDE PROGRESS & STEP TIMING ----------------

/**
 * Calculates progress percentage (0 - 100) for a given elapsed time.
 */
export function calculateProgress(
  elapsedMs: number,
  durationMs: number = DEFAULT_SLIDE_DURATION_MS
): number {
  if (durationMs <= 0) return 100;
  if (elapsedMs <= 0) return 0;
  const pct = (elapsedMs / durationMs) * 100;
  return Math.min(100, Math.max(0, pct));
}

/**
 * Calculates progress of a specific slide segment in the segmented progress bar.
 * - Prior slides: 100%
 * - Current slide: 0% - 100% based on elapsedMs
 * - Future slides: 0%
 */
export function calculateSegmentProgress(
  slideIndex: number,
  currentSlideIndex: number,
  elapsedMs: number,
  durationMs: number = DEFAULT_SLIDE_DURATION_MS
): number {
  if (slideIndex < currentSlideIndex) return 100;
  if (slideIndex > currentSlideIndex) return 0;
  return calculateProgress(elapsedMs, durationMs);
}

/**
 * Calculates next elapsed time for a timer tick.
 * Returns updated elapsedMs and whether the slide should advance.
 */
export function calculateTickElapsed(
  currentElapsed: number,
  deltaMs: number,
  isPaused: boolean,
  durationMs: number = DEFAULT_SLIDE_DURATION_MS
): { nextElapsed: number; shouldAdvance: boolean } {
  if (isPaused) {
    return { nextElapsed: currentElapsed, shouldAdvance: false };
  }
  const next = currentElapsed + Math.max(0, deltaMs);
  if (next >= durationMs) {
    return { nextElapsed: durationMs, shouldAdvance: true };
  }
  return { nextElapsed: next, shouldAdvance: false };
}

// ---------------- 2. TAP NAVIGATION & BOUNDARY LOGIC ----------------

/**
 * Calculates the next slide index given total slides and loop behavior.
 */
export function getNextSlideIndex(
  currentIndex: number,
  totalSlides: number,
  loop: boolean = false
): { nextIndex: number; isCompleted: boolean } {
  if (totalSlides <= 0) {
    return { nextIndex: 0, isCompleted: true };
  }
  if (currentIndex + 1 < totalSlides) {
    return { nextIndex: currentIndex + 1, isCompleted: false };
  }
  if (loop) {
    return { nextIndex: 0, isCompleted: false };
  }
  return { nextIndex: currentIndex, isCompleted: true };
}

/**
 * Calculates the previous slide index given total slides.
 */
export function getPreviousSlideIndex(
  currentIndex: number,
  totalSlides: number,
  loop: boolean = false
): number {
  if (totalSlides <= 0) return 0;
  if (currentIndex > 0) return currentIndex - 1;
  if (loop) return Math.max(0, totalSlides - 1);
  return 0;
}

/**
 * Determines navigation direction based on tap X coordinate ratio across the screen (0.0 to 1.0).
 * Left side (< splitRatio) = step backward.
 * Right side (>= splitRatio) = advance forward.
 */
export function handleTapNavigation(
  tapXRatio: number,
  currentIndex: number,
  totalSlides: number,
  loop: boolean = false,
  splitRatio: number = TAP_SPLIT_RATIO
): { nextIndex: number; isCompleted: boolean; direction: "prev" | "next" } {
  const safeRatio = Math.max(0, Math.min(1, tapXRatio));
  if (safeRatio < splitRatio) {
    const prev = getPreviousSlideIndex(currentIndex, totalSlides, loop);
    return { nextIndex: prev, isCompleted: false, direction: "prev" };
  } else {
    const next = getNextSlideIndex(currentIndex, totalSlides, loop);
    return { ...next, direction: "next" };
  }
}

// ---------------- 3. PURE PLAYBACK STATE MACHINE ----------------

export function createInitialPlaybackState(initialIndex: number = 0): StoryPlaybackState {
  return {
    currentIndex: Math.max(0, initialIndex),
    elapsedMs: 0,
    isPaused: false,
    isHolding: false,
    isMuted: false,
    isCompleted: false,
  };
}

export function pauseStory(state: StoryPlaybackState): StoryPlaybackState {
  return {
    ...state,
    isPaused: true,
  };
}

export function resumeStory(state: StoryPlaybackState): StoryPlaybackState {
  return {
    ...state,
    isPaused: false,
  };
}

export function togglePauseStory(state: StoryPlaybackState): StoryPlaybackState {
  return {
    ...state,
    isPaused: !state.isPaused,
  };
}

export function startHold(state: StoryPlaybackState): StoryPlaybackState {
  return {
    ...state,
    isHolding: true,
    isPaused: true,
  };
}

export function endHold(
  state: StoryPlaybackState,
  wasPausedBeforeHold: boolean = false
): StoryPlaybackState {
  return {
    ...state,
    isHolding: false,
    isPaused: wasPausedBeforeHold,
  };
}

export function toggleMute(state: StoryPlaybackState): StoryPlaybackState {
  return {
    ...state,
    isMuted: !state.isMuted,
  };
}

export function stepToNextSlide(
  state: StoryPlaybackState,
  totalSlides: number,
  loop: boolean = false
): StoryPlaybackState {
  const { nextIndex, isCompleted } = getNextSlideIndex(state.currentIndex, totalSlides, loop);
  return {
    ...state,
    currentIndex: nextIndex,
    elapsedMs: 0,
    isCompleted,
  };
}

export function stepToPreviousSlide(
  state: StoryPlaybackState,
  totalSlides: number,
  loop: boolean = false
): StoryPlaybackState {
  const prevIndex = getPreviousSlideIndex(state.currentIndex, totalSlides, loop);
  return {
    ...state,
    currentIndex: prevIndex,
    elapsedMs: 0,
    isCompleted: false,
  };
}

// ---------------- 4. STORY AUDIO BRIDGE (COORDINATING WITH EXTERNAL AUDIO) ----------------

/**
 * Captures current audio state from an external audio element so it can be restored on close.
 */
export function captureAudioState(audioEl: HTMLAudioElement | null): PreviousAudioState | null {
  if (!audioEl) return null;
  return {
    src: audioEl.currentSrc || audioEl.src || "",
    currentTime: audioEl.currentTime || 0,
    wasPlaying: !audioEl.paused && !audioEl.ended,
    volume: typeof audioEl.volume === "number" ? audioEl.volume : 1,
  };
}

/**
 * Plays story soundtrack using the existing external audio element.
 * Never creates duplicate `<audio>` elements.
 * Catches browser autoplay/permission rejections gracefully.
 */
export async function playStoryAudio(
  audioEl: HTMLAudioElement | null,
  track: StoryAudioTrack | null | undefined
): Promise<{ success: boolean; error?: string }> {
  if (!audioEl) {
    return { success: false, error: "No external audio element provided" };
  }
  if (!track || !track.audioUrl) {
    return { success: false, error: "No audio track or audioUrl available" };
  }

  try {
    const currentSrc = audioEl.currentSrc || audioEl.src || "";
    // If the track is already loaded, ensure playback
    if (currentSrc === track.audioUrl) {
      if (audioEl.paused) {
        await audioEl.play();
      }
      return { success: true };
    }

    audioEl.src = track.audioUrl;
    audioEl.currentTime = 0;
    audioEl.load();
    await audioEl.play();
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Story remains 100% usable even if autoplay is blocked
    return { success: false, error: message };
  }
}

/**
 * Pauses external audio if playing.
 */
export function pauseStoryAudio(audioEl: HTMLAudioElement | null): void {
  if (!audioEl) return;
  try {
    if (!audioEl.paused) {
      audioEl.pause();
    }
  } catch {
    // Safe noop
  }
}

/**
 * Resumes external audio if currently paused and has a valid source.
 */
export async function resumeStoryAudio(audioEl: HTMLAudioElement | null): Promise<boolean> {
  if (!audioEl || !audioEl.src) return false;
  try {
    if (audioEl.paused) {
      await audioEl.play();
      return true;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Restores audio element back to its prior state or stops cleanly when story unmounts.
 */
export function restoreAudioState(
  audioEl: HTMLAudioElement | null,
  previousState: PreviousAudioState | null
): void {
  if (!audioEl) return;
  try {
    // First ensure story playback stops
    if (!audioEl.paused) {
      audioEl.pause();
    }

    if (previousState && previousState.src) {
      audioEl.src = previousState.src;
      audioEl.currentTime = previousState.currentTime;
      if (typeof previousState.volume === "number") {
        audioEl.volume = previousState.volume;
      }
      if (previousState.wasPlaying) {
        audioEl.play().catch(() => {
          // Silent catch for browser permission
        });
      }
    } else {
      audioEl.removeAttribute("src");
      audioEl.load();
    }
  } catch {
    // Safe fallback
  }
}

/**
 * Adjusts mute state of external audio element.
 */
export function setStoryAudioMuted(audioEl: HTMLAudioElement | null, isMuted: boolean): void {
  if (!audioEl) return;
  try {
    audioEl.muted = isMuted;
  } catch {
    // Safe noop
  }
}

// ---------------- 5. MUSIC NORMALIZATION & SAFE STORY SAVING ----------------

/**
 * Normalizes either a MusicTrackItem from the catalogue or an existing StoryAudioTrack into a StoryAudioTrack.
 */
export function normalizeMusicTrack(
  track: MusicTrackItem | StoryAudioTrack
): StoryAudioTrack {
  const duration = "durationSeconds" in track ? track.durationSeconds : track.duration;
  const audioUrl = "url" in track ? track.url : track.audioUrl;
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    audioUrl: audioUrl || "",
    duration: typeof duration === "number" ? duration : undefined,
  };
}

/**
 * Attaches a music track to a story without mutating the original object.
 */
export function attachMusicToStory(
  story: StoryItem,
  track: StoryAudioTrack | MusicTrackItem | null | undefined
): StoryItem {
  if (!track) {
    const copy: StoryItem = { ...story };
    delete (copy as Partial<StoryItem>).musicTrackId;
    delete (copy as Partial<StoryItem>).musicTrack;
    return copy;
  }
  const normalized = normalizeMusicTrack(track);
  return {
    ...story,
    musicTrackId: normalized.id,
    musicTrack: normalized,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Detaches music track from a story cleanly.
 */
export function detachMusicFromStory(story: StoryItem): StoryItem {
  const copy: StoryItem = { ...story };
  delete (copy as Partial<StoryItem>).musicTrackId;
  delete (copy as Partial<StoryItem>).musicTrack;
  return {
    ...copy,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Reorders slide IDs or Photo assets immutably.
 */
export function reorderSlideIds(
  photoIds: string[],
  fromIndex: number,
  toIndex: number
): string[] {
  if (
    fromIndex < 0 ||
    fromIndex >= photoIds.length ||
    toIndex < 0 ||
    toIndex >= photoIds.length ||
    fromIndex === toIndex
  ) {
    return [...photoIds];
  }
  const copy = [...photoIds];
  const [removed] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, removed);
  return copy;
}

export function reorderStoryPhotos(
  photos: PhotoAsset[],
  fromIndex: number,
  toIndex: number
): PhotoAsset[] {
  if (
    fromIndex < 0 ||
    fromIndex >= photos.length ||
    toIndex < 0 ||
    toIndex >= photos.length ||
    fromIndex === toIndex
  ) {
    return [...photos];
  }
  const copy = [...photos];
  const [removed] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, removed);
  return copy;
}

/**
 * Validates story builder inputs.
 */
export function validateStoryData(
  title: string,
  photoIds: string[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!title || !title.trim()) {
    errors.push("Story title cannot be empty");
  }
  if (!photoIds || photoIds.length === 0) {
    errors.push("At least one photo must be selected for the story");
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Formats effective capture date into human-friendly text for story banner.
 */
export function formatCaptureDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
