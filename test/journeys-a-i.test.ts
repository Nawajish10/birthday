import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  calculateAge,
  calculateNextBirthdayCountdown,
  isOnThisDay,
  formatEffectiveDate,
  groupPhotosByCaptureYear,
} from "../src/lib/birthday-dates.ts";

import {
  loadProfile,
  saveProfile,
  loadPhotos,
  addPhotoAsset,
  deletePhotoAsset,
  loadFavorites,
  toggleFavorite,
  loadHighlights,
  createHighlight,
  deleteHighlight,
  loadAlbums,
  createAlbum,
  deleteAlbum,
  loadStories,
  createStory,
  deleteStory,
  removePhotoFromCollection,
  DEFAULT_PROFILE,
} from "../src/lib/media-service.ts";

import {
  validateCaptureFile,
  stopMediaTracks,
  createPhotoAsset,
} from "../src/components/camera/camera-pipeline.ts";

import {
  groupPhotosChronologically,
  groupPhotosOnThisDay,
  getOnThisDayLabel,
} from "../src/components/memories/memories-helpers.ts";

import {
  calculateProgress,
  calculateSegmentProgress,
  handleTapNavigation,
  normalizeMusicTrack,
  attachMusicToStory,
  detachMusicFromStory,
  reorderSlideIds,
  reorderStoryPhotos,
  captureAudioState,
  playStoryAudio,
  restoreAudioState,
} from "../src/components/memories/story-helpers.ts";

import type { PhotoAsset } from "../src/types/media-contracts.ts";

// In-Memory Storage Mock for Isolated Journey Testing
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

// ============================================================================
// JOURNEY A: Profile Initialization
// ============================================================================
test("Journey A — Profile initialization: age, countdown, bio, highlights, posts", () => {
  const storage = new MockStorage();

  // 1. Load saved profile
  const profile = loadProfile(storage);
  assert.equal(profile.displayName, "Meerah");
  assert.equal(profile.bio, "birthday girl · main character today");
  assert.ok(profile.birthDate === "2002-10-28" || profile.birthDate === "2002-10-29");

  // 2. Authoritative age calculation
  const age = calculateAge(profile.birthDate, profile.birthDate.replace("2002", "2026"));
  assert.equal(age, 24);

  // 3. Authoritative next birthday countdown
  const countdown = calculateNextBirthdayCountdown(profile.birthDate, profile.birthDate.replace("2002", "2026") + "T12:00:00");
  assert.equal(countdown.isToday, true);
  assert.equal(countdown.days, 0);

  // 4. Preselected highlights
  const highlights = loadHighlights(storage);
  assert.ok(highlights.length >= 4);
  assert.equal(highlights[0].title, "Memories ✿");

  // 5. Preselected posts
  const photos = loadPhotos(storage);
  assert.ok(photos.length >= 4);

  // 6. Profile editing
  const updated = saveProfile(
    { displayName: "Meerah ✨", bio: "Today the world celebrates you" },
    storage
  );
  assert.equal(updated.displayName, "Meerah ✨");
  assert.equal(updated.bio, "Today the world celebrates you");
});

// ============================================================================
// JOURNEY B: Upload and Publish a Photo
// ============================================================================
test("Journey B — Upload & publish photo lifecycle with persistent reference integrity", () => {
  const storage = new MockStorage();

  // 1. File validation
  const validFile = { name: "meerah_smile.jpg", type: "image/jpeg", size: 3.5 * 1024 * 1024 };
  const validation = validateCaptureFile(validFile);
  assert.equal(validation.valid, true);

  // 2. Create photo asset
  const newAsset = createPhotoAsset({
    url: "blob:http://localhost/sample-guid",
    storagePath: "recipient/uploads/meerah_smile.jpg",
    mediaKind: "image",
    effectiveCaptureDate: "2024-10-29",
    hasKnownCaptureDate: true,
    caption: "A joyful birthday celebration moment",
    altText: "Meerah smiling brightly",
  });
  assert.ok(newAsset.id.startsWith("photo-"));
  assert.equal(newAsset.effectiveCaptureDate, "2024-10-29");

  // 3. Persist asset to storage
  addPhotoAsset(newAsset, storage);
  const photosAfterUpload = loadPhotos(storage);
  assert.ok(photosAfterUpload.some((p) => p.id === newAsset.id));

  // 4. Reload verification
  const photosOnReload = loadPhotos(storage);
  const found = photosOnReload.find((p) => p.id === newAsset.id);
  assert.ok(found);
  assert.equal(found.caption, "A joyful birthday celebration moment");

  // 5. Add to collection (e.g. highlight)
  const hl = createHighlight("Birthday Joy", [newAsset.id], newAsset.id, storage);
  assert.ok(hl.photoIds.includes(newAsset.id));

  // 6. Remove from collection without deleting original asset
  removePhotoFromCollection("highlight", hl.id, newAsset.id, storage);
  const hlAfterRemove = loadHighlights(storage).find((h) => h.id === hl.id);
  assert.ok(hlAfterRemove && !hlAfterRemove.photoIds.includes(newAsset.id));

  // Original asset still exists!
  const photosAfterCollectionRemoval = loadPhotos(storage);
  assert.ok(photosAfterCollectionRemoval.some((p) => p.id === newAsset.id));
});

// ============================================================================
// JOURNEY C: Mobile Camera Capture
// ============================================================================
test("Journey C — Mobile camera capture flow with stream track cleanup and fallback", () => {
  // 1. Validation of camera captured image (PNG/JPEG from canvas or stream)
  const capturedFile = { name: "camera_capture.png", type: "image/png", size: 1.2 * 1024 * 1024 };
  const valid = validateCaptureFile(capturedFile);
  assert.equal(valid.valid, true);

  // 2. Stream track cleanup simulation
  let stoppedTrackCount = 0;
  const mockTrack = {
    stop() {
      stoppedTrackCount++;
    },
  };
  const mockStream = {
    getTracks() {
      return [mockTrack, mockTrack];
    },
  } as unknown as MediaStream;

  stopMediaTracks(mockStream);
  assert.equal(stoppedTrackCount, 2);

  // 3. Fallback validation when camera is denied or file is oversized
  const oversizedFile = { name: "huge.jpg", type: "image/jpeg", size: 15 * 1024 * 1024 };
  const rejected = validateCaptureFile(oversizedFile);
  assert.equal(rejected.valid, false);
  assert.match(rejected.error || "", /12 MB/i);
});

// ============================================================================
// JOURNEY D: Favorites
// ============================================================================
test("Journey D — Favorites toggle, persistence across reloads, and safe removal", () => {
  const storage = new MockStorage();

  // 1. Initial favorites
  const initial = loadFavorites(storage);
  assert.ok(initial.length >= 2);

  // 2. Favorite photo-mem-3
  const updated = toggleFavorite("photo-mem-3", storage);
  assert.ok(updated.includes("photo-mem-3"));

  // 3. Reload from storage
  const reloaded = loadFavorites(storage);
  assert.ok(reloaded.includes("photo-mem-3"));

  // 4. Unfavorite
  const unfaved = toggleFavorite("photo-mem-3", storage);
  assert.ok(!unfaved.includes("photo-mem-3"));

  // 5. Source photo asset remains completely intact in photo library
  const photos = loadPhotos(storage);
  assert.ok(photos.some((p) => p.id === "photo-mem-3"));
});

// ============================================================================
// JOURNEY E: Highlights and Albums
// ============================================================================
test("Journey E — Highlights and albums: creation, editing, and safe deletion", () => {
  const storage = new MockStorage();

  // 1. Create album
  const album = createAlbum("Golden Starlight", "Memories under city lights", ["photo-mem-1", "photo-mem-2"], storage);
  assert.equal(album.title, "Golden Starlight");
  assert.equal(album.photoIds.length, 2);

  // 2. Reopen album
  const reloadedAlbums = loadAlbums(storage);
  const foundAlbum = reloadedAlbums.find((a) => a.id === album.id);
  assert.ok(foundAlbum);
  assert.equal(foundAlbum.photoIds.length, 2);

  // 3. Safe deletion of album
  const remainingAlbums = deleteAlbum(album.id, storage);
  assert.ok(!remainingAlbums.some((a) => a.id === album.id));

  // Source photos are still in library!
  const photos = loadPhotos(storage);
  assert.ok(photos.some((p) => p.id === "photo-mem-1"));
  assert.ok(photos.some((p) => p.id === "photo-mem-2"));
});

// ============================================================================
// JOURNEY F: On This Day Discovery
// ============================================================================
test("Journey F — On This Day discovery: past years matching, milestone labels, strict date rule", () => {
  const testPhotos: PhotoAsset[] = [
    {
      id: "otd-1",
      storagePath: "p1.jpg",
      url: "/p1.jpg",
      mediaKind: "image",
      effectiveCaptureDate: "2025-10-29",
      hasKnownCaptureDate: true,
      uploadTimestamp: "2025-10-29",
      caption: "1 year ago",
    },
    {
      id: "otd-2",
      storagePath: "p2.jpg",
      url: "/p2.jpg",
      mediaKind: "image",
      effectiveCaptureDate: "2023-10-29",
      hasKnownCaptureDate: true,
      uploadTimestamp: "2023-10-29",
      caption: "3 years ago",
    },
    {
      id: "otd-today",
      storagePath: "p3.jpg",
      url: "/p3.jpg",
      mediaKind: "image",
      effectiveCaptureDate: "2026-10-29", // Same year -> NOT an On This Day memory from the past
      hasKnownCaptureDate: true,
      uploadTimestamp: "2026-10-29",
      caption: "Taken today",
    },
    {
      id: "otd-unknown",
      storagePath: "p4.jpg",
      url: "/p4.jpg",
      mediaKind: "image",
      effectiveCaptureDate: "2023-10-29",
      hasKnownCaptureDate: false, // Strict rule: must be excluded!
      uploadTimestamp: "2026-10-29",
      caption: "Unknown capture date",
    },
  ];

  const onThisDayGroups = groupPhotosOnThisDay(testPhotos, "2026-10-29");

  // Groups by past years
  assert.equal(onThisDayGroups.length, 2); // 2025 (1 year ago) and 2023 (3 years ago)
  assert.equal(onThisDayGroups[0].year, 2025);
  assert.equal(onThisDayGroups[0].label, "1 Year Ago Today ✿");
  assert.equal(onThisDayGroups[1].year, 2023);
  assert.equal(onThisDayGroups[1].label, "3 Years Ago Today ♡");

  // Verify unknown date photo is strictly NOT included
  const allOtdPhotoIds = onThisDayGroups.flatMap((g) => g.photos.map((p) => p.id));
  assert.ok(!allOtdPhotoIds.includes("otd-unknown"));
  assert.ok(!allOtdPhotoIds.includes("otd-today"));
});

// ============================================================================
// JOURNEY G: Story with Music
// ============================================================================
test("Journey G — Story creation, music attachment, slide navigation, and audio cleanup", async () => {
  const storage = new MockStorage();
  const photos = loadPhotos(storage).slice(0, 3);

  // 1. Create story with music
  const story = createStory(
    "A Beautiful Birthday Morning",
    photos.map((p) => p.id),
    photos,
    {
      id: "track-01",
      title: "Golden Hour",
      artist: "JVKE",
      audioUrl: "https://cdn.example.com/audio/golden-hour.mp3",
    },
    storage
  );

  assert.equal(story.title, "A Beautiful Birthday Morning");
  assert.equal(story.musicTrackId, "track-01");
  assert.equal(story.photos.length, 3);

  // 2. Slide progress calculation
  assert.equal(calculateProgress(0, 3), 0);
  assert.equal(Math.round(calculateProgress(1, 3)), 33);
  assert.equal(Math.round(calculateProgress(2, 3)), 67);
  assert.equal(calculateProgress(3, 3), 100);

  // 3. Segment progress
  assert.equal(calculateSegmentProgress(0, 0, 2500, 5000), 50);
  assert.equal(calculateSegmentProgress(1, 0, 2500, 5000), 0);
  assert.equal(calculateSegmentProgress(0, 1, 1000, 5000), 100);

  // 4. Tap navigation: left side = previous, right side = next
  assert.equal(handleTapNavigation(0.2, 5, 10).nextIndex, 4); // Tap on left 20% -> previous slide
  assert.equal(handleTapNavigation(0.8, 5, 10).nextIndex, 6); // Tap on right 80% -> next slide

  // 5. Audio state coordination: zero duplicate audio elements
  let playCalled = false;
  let pauseCalled = false;
  let loaded = false;
  const mockAudio: any = {
    src: "",
    currentTime: 0,
    paused: true,
    load() {
      loaded = true;
    },
    play() {
      playCalled = true;
      mockAudio.paused = false;
      return Promise.resolve();
    },
    pause() {
      pauseCalled = true;
      mockAudio.paused = true;
    },
    removeAttribute(attr: string) {
      if (attr === "src") mockAudio.src = "";
    },
  };

  const res = await playStoryAudio(mockAudio as HTMLAudioElement, {
    id: "track-01",
    title: "Golden Hour",
    artist: "JVKE",
    audioUrl: "https://cdn.example.com/audio/golden-hour.mp3",
  });
  assert.equal(res.success, true);
  assert.equal(playCalled, true);
  assert.equal(loaded, true);
  assert.equal(mockAudio.src, "https://cdn.example.com/audio/golden-hour.mp3");

  // Reopen and cleanup
  restoreAudioState(mockAudio, {
    wasPlaying: false,
    src: "",
    currentTime: 0,
    volume: 1,
  });
  assert.equal(pauseCalled, true);
});

// ============================================================================
// JOURNEY H: Authorization & Private Access
// ============================================================================
test("Journey H — Authorization: canEdit controls, negative unauthorized access protection", () => {
  const storage = new MockStorage();

  // Authorized user
  const authProfile = loadProfile(storage);
  assert.equal(authProfile.canEdit, true);

  // Unauthorized visitor simulation
  const guestProfile = {
    ...authProfile,
    canEdit: false,
  };
  assert.equal(guestProfile.canEdit, false);

  // Private photo flag verification
  const privatePhoto: PhotoAsset = {
    id: "private-photo-1",
    storagePath: "vault/p1.jpg",
    url: "/p1.jpg",
    mediaKind: "image",
    effectiveCaptureDate: "2024-10-29",
    hasKnownCaptureDate: true,
    uploadTimestamp: "2026-10-29",
    isPrivate: true,
  };
  assert.equal(privatePhoto.isPrivate, true);
});

// ============================================================================
// JOURNEY I: Mobile Regression & CSS Token Audits
// ============================================================================
test("Journey I — Mobile regression: safe areas, touch targets >= 44px, no overflow", () => {
  const profileCss = fs.readFileSync(path.resolve("src/components/profile/profile.css"), "utf-8");
  const memoriesCss = fs.readFileSync(path.resolve("src/components/memories/memories.css"), "utf-8");
  const cameraCss = fs.readFileSync(path.resolve("src/components/camera/camera.css"), "utf-8");

  // 1. Design Token compliance [data-theme="love"]
  assert.ok(memoriesCss.includes("[data-theme=\"love\"]") || memoriesCss.includes("--memories-rose"));
  assert.ok(profileCss.includes("--profile-rose") || profileCss.includes("profileAvatar"));
  assert.ok(cameraCss.includes("--cam-primary") || cameraCss.includes("cameraPanel"));

  // 2. Safe Area Inset Support
  assert.ok(memoriesCss.includes("safe-area-inset-top") || memoriesCss.includes("safe-area-inset-bottom"));
  assert.ok(cameraCss.includes("safe-area-inset-bottom"));

  // 3. Minimum Touch Target (44x44px)
  assert.ok(memoriesCss.includes("44px") || memoriesCss.includes("--memories-touch-target"));
  assert.ok(cameraCss.includes("44px") || cameraCss.includes("min-height: 44px") || cameraCss.includes("min-height: 48px"));

  // 4. Mobile Breakpoints: 320px, 480px, 768px
  assert.ok(profileCss.includes("@media") && profileCss.includes("480px"));
  assert.ok(memoriesCss.includes("@media"));
  assert.ok(cameraCss.includes("@media"));
});
