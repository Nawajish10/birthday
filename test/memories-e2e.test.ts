import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  groupPhotosChronologically,
  groupPhotosOnThisDay,
  getOnThisDayLabel,
} from "../src/components/memories/memories-helpers.ts";
import {
  loadPhotos,
  savePhotos,
  loadAlbums,
  createAlbum,
  deleteAlbum,
  loadFavorites,
  toggleFavorite,
  loadStories,
  createStory,
} from "../src/lib/media-service.ts";
import type { PhotoAsset } from "../src/types/media-contracts.ts";

// In-memory Storage mock for isolated test runs
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

const mockPhotos: PhotoAsset[] = [
  {
    id: "photo-2024-10",
    storagePath: "photos/p1.jpg",
    url: "/images/p1.jpg",
    mediaKind: "image",
    effectiveCaptureDate: "2024-10-29",
    hasKnownCaptureDate: true,
    uploadTimestamp: "2024-10-30T10:00:00Z",
    caption: "22nd Birthday Celebration",
    altText: "Meerah blowing out candles",
  },
  {
    id: "photo-2023-10",
    storagePath: "photos/p2.jpg",
    url: "/images/p2.jpg",
    mediaKind: "image",
    effectiveCaptureDate: "2023-10-29T15:30:00Z",
    hasKnownCaptureDate: true,
    uploadTimestamp: "2023-10-30T10:00:00Z",
    caption: "Golden hour sunset cake",
    altText: "Golden hour sunset smile",
  },
  {
    id: "photo-2025-05",
    storagePath: "photos/p3.jpg",
    url: "/images/p3.jpg",
    mediaKind: "image",
    effectiveCaptureDate: "2025-05-14",
    hasKnownCaptureDate: true,
    uploadTimestamp: "2025-05-15T10:00:00Z",
    caption: "Spring blossom walk",
    altText: "Blossom garden",
  },
  {
    id: "photo-2022-10",
    storagePath: "photos/p4.jpg",
    url: "/images/p4.jpg",
    mediaKind: "image",
    effectiveCaptureDate: "2022-10-29",
    hasKnownCaptureDate: true,
    uploadTimestamp: "2022-10-30T10:00:00Z",
    caption: "Four years of joy",
    altText: "Four years memory",
  },
  {
    id: "photo-2024-03",
    storagePath: "photos/p5.jpg",
    url: "/images/p5.jpg",
    mediaKind: "image",
    effectiveCaptureDate: "2024-03-15",
    hasKnownCaptureDate: true,
    uploadTimestamp: "2024-03-16T10:00:00Z",
    caption: "Coffee and notes",
    altText: "Warm coffee table",
  },
  {
    id: "photo-unknown-1",
    storagePath: "photos/p6.jpg",
    url: "/images/p6.jpg",
    mediaKind: "image",
    effectiveCaptureDate: "2024-10-29", // has date string, but hasKnownCaptureDate is false!
    hasKnownCaptureDate: false,
    uploadTimestamp: "2026-10-01T12:00:00Z",
    caption: "Old scan without metadata",
    altText: "Scanned vintage photo",
  },
  {
    id: "photo-unknown-2",
    storagePath: "photos/p7.jpg",
    url: "/images/p7.jpg",
    mediaKind: "image",
    effectiveCaptureDate: "",
    hasKnownCaptureDate: false,
    uploadTimestamp: "2026-09-01T12:00:00Z",
    caption: "Candid memory",
  },
];

// ---------------------------------------------------------------------------
// Suite 1: Chronological Timeline Grouping
// ---------------------------------------------------------------------------
test("Memories Timeline: Chronological grouping by Year and Month", () => {
  const groups = groupPhotosChronologically(mockPhotos);

  assert.ok(groups.length > 0, "Timeline should produce non-empty groups");

  // Check descending order of groups
  const groupTitles = groups.map((g) => g.title);
  assert.equal(groupTitles[0], "May 2025");
  assert.equal(groupTitles[1], "October 2024");
  assert.equal(groupTitles[2], "March 2024");
  assert.equal(groupTitles[3], "October 2023");
  assert.equal(groupTitles[4], "October 2022");
  assert.equal(groupTitles[5], "Unknown Date");

  // Verify May 2025 contains photo-2025-05
  const mayGroup = groups.find((g) => g.title === "May 2025");
  assert.ok(mayGroup);
  assert.equal(mayGroup.photos.length, 1);
  assert.equal(mayGroup.photos[0].id, "photo-2025-05");

  // Verify October 2024 contains photo-2024-10
  const oct2024Group = groups.find((g) => g.title === "October 2024");
  assert.ok(oct2024Group);
  assert.equal(oct2024Group.photos.length, 1);
  assert.equal(oct2024Group.photos[0].id, "photo-2024-10");

  // Verify unknown capture dates grouped under "Unknown Date"
  const unknownGroup = groups.find((g) => g.title === "Unknown Date");
  assert.ok(unknownGroup);
  assert.equal(unknownGroup.photos.length, 2);
  const unknownIds = unknownGroup.photos.map((p) => p.id);
  assert.ok(unknownIds.includes("photo-unknown-1"));
  assert.ok(unknownIds.includes("photo-unknown-2"));

  // Empty input handling
  assert.deepEqual(groupPhotosChronologically([]), []);
});

// ---------------------------------------------------------------------------
// Suite 2: "On This Day" Discovery Engine & Milestone Labels
// ---------------------------------------------------------------------------
test("Memories On This Day Engine: Milestone label generation", () => {
  assert.equal(getOnThisDayLabel(1), "1 Year Ago Today ✿");
  assert.equal(getOnThisDayLabel(2), "2 Years Ago Today ✨");
  assert.equal(getOnThisDayLabel(3), "3 Years Ago Today ♡");
  assert.equal(getOnThisDayLabel(4), "4 Years Ago Today 🎂");
  assert.equal(getOnThisDayLabel(5), "5 Years Ago Today 🎈");
  assert.equal(getOnThisDayLabel(7), "7 Years Ago Today ✿");
});

test("Memories On This Day Engine: Exact matching and strict date policy", () => {
  const referenceDate = "2026-10-29T12:00:00Z";

  const onThisDayGroups = groupPhotosOnThisDay(mockPhotos, referenceDate);

  // Groups should be sorted descending by year: 2024 (2 yrs ago), 2023 (3 yrs ago), 2022 (4 yrs ago)
  assert.equal(onThisDayGroups.length, 3, "Should match 2024, 2023, and 2022 memories");

  // First group: 2024 (2 Years Ago Today ✨)
  assert.equal(onThisDayGroups[0].year, 2024);
  assert.equal(onThisDayGroups[0].yearsAgo, 2);
  assert.equal(onThisDayGroups[0].label, "2 Years Ago Today ✨");
  assert.equal(onThisDayGroups[0].photos.length, 1);
  assert.equal(onThisDayGroups[0].photos[0].id, "photo-2024-10");

  // Second group: 2023 (3 Years Ago Today ♡)
  assert.equal(onThisDayGroups[1].year, 2023);
  assert.equal(onThisDayGroups[1].yearsAgo, 3);
  assert.equal(onThisDayGroups[1].label, "3 Years Ago Today ♡");
  assert.equal(onThisDayGroups[1].photos[0].id, "photo-2023-10");

  // Third group: 2022 (4 Years Ago Today 🎂)
  assert.equal(onThisDayGroups[2].year, 2022);
  assert.equal(onThisDayGroups[2].yearsAgo, 4);
  assert.equal(onThisDayGroups[2].label, "4 Years Ago Today 🎂");
  assert.equal(onThisDayGroups[2].photos[0].id, "photo-2022-10");

  // STRICT RULE TEST:
  // photo-unknown-1 has effectiveCaptureDate = "2024-10-29", but hasKnownCaptureDate = false
  // It MUST NOT appear anywhere in onThisDayGroups!
  const allMatchedIds = onThisDayGroups.flatMap((g) => g.photos.map((p) => p.id));
  assert.equal(allMatchedIds.includes("photo-unknown-1"), false, "Photos without known date must NEVER match");
  assert.equal(allMatchedIds.includes("photo-unknown-2"), false);

  // Photos from different months (March, May) must NOT match
  assert.equal(allMatchedIds.includes("photo-2024-03"), false);
  assert.equal(allMatchedIds.includes("photo-2025-05"), false);

  // Test reference date with no past matches
  const nonMatchingRef = "2026-01-01T00:00:00Z";
  const emptyMatches = groupPhotosOnThisDay(mockPhotos, nonMatchingRef);
  assert.equal(emptyMatches.length, 0);
});

// ---------------------------------------------------------------------------
// Suite 3: Album Management & Safe Deletion
// ---------------------------------------------------------------------------
test("Memories Albums: Creation, photo linking and safe deletion", () => {
  const storage = new MockStorage();

  // Seed storage with photos
  savePhotos(mockPhotos, storage);
  assert.equal(loadPhotos(storage).length, mockPhotos.length);

  // Create a new album
  const albumTitle = "Special Moments";
  const albumDesc = "Precious memories curated for Meerah's birthday";
  const selectedPhotoIds = ["photo-2024-10", "photo-2023-10"];

  const createdAlbum = createAlbum(albumTitle, albumDesc, selectedPhotoIds, storage);
  assert.ok(createdAlbum.id.startsWith("album-"));
  assert.equal(createdAlbum.title, albumTitle);
  assert.equal(createdAlbum.description, albumDesc);
  assert.deepEqual(createdAlbum.photoIds, selectedPhotoIds);

  // Verify album is retrieved by loadAlbums
  const currentAlbums = loadAlbums(storage);
  const found = currentAlbums.find((a) => a.id === createdAlbum.id);
  assert.ok(found, "Created album should be in storage");
  assert.equal(found.photoIds.length, 2);

  // SAFE DELETION TEST:
  // Delete the album and ensure original photos in storage are completely untouched
  const updatedAlbums = deleteAlbum(createdAlbum.id, storage);
  assert.equal(updatedAlbums.some((a) => a.id === createdAlbum.id), false, "Album must be removed");

  const photosAfterDelete = loadPhotos(storage);
  assert.equal(
    photosAfterDelete.length,
    mockPhotos.length,
    "Safe deletion guarantee: photos must NOT be deleted when an album is deleted"
  );
  assert.ok(photosAfterDelete.find((p) => p.id === "photo-2024-10"));
  assert.ok(photosAfterDelete.find((p) => p.id === "photo-2023-10"));
});

// ---------------------------------------------------------------------------
// Suite 4: Favorite Toggling within Memories
// ---------------------------------------------------------------------------
test("Memories Favorites: Toggling hearts on and off", () => {
  const storage = new MockStorage();

  const initialFavs = loadFavorites(storage);
  const targetPhotoId = "photo-2024-10";

  // Toggle favorite on
  let favs = toggleFavorite(targetPhotoId, storage);
  assert.ok(favs.includes(targetPhotoId), "Photo should now be favorited");

  // Toggle favorite off
  favs = toggleFavorite(targetPhotoId, storage);
  assert.equal(favs.includes(targetPhotoId), false, "Photo should now be un-favorited");
});

// ---------------------------------------------------------------------------
// Suite 5: Stories Integration
// ---------------------------------------------------------------------------
test("Memories Stories: Story creation and structure", () => {
  const storage = new MockStorage();

  const storyPhotos = mockPhotos.slice(0, 2);
  const newStory = createStory(
    "A Day of Wonder",
    storyPhotos.map((p) => p.id),
    storyPhotos,
    {
      id: "track-1",
      title: "Afreen Afreen",
      artist: "Rahat Fateh Ali Khan & Momina Mustehsan",
      audioUrl: "https://example.com/audio.mp3",
    },
    storage
  );

  assert.ok(newStory.id.startsWith("story-"));
  assert.equal(newStory.title, "A Day of Wonder");
  assert.equal(newStory.photoIds.length, 2);
  assert.equal(newStory.photos.length, 2);
  assert.equal(newStory.musicTrack?.title, "Afreen Afreen");

  const storiesInStorage = loadStories(storage);
  assert.ok(storiesInStorage.find((s) => s.id === newStory.id));
});

// ---------------------------------------------------------------------------
// Suite 6: CSS Design Tokens, Responsive Rules & Accessibility Audit
// ---------------------------------------------------------------------------
test("Memories CSS Audit: [data-theme='love'], touch targets and safe-area", () => {
  const cssPath = path.resolve(process.cwd(), "src/components/memories/memories.css");
  assert.ok(fs.existsSync(cssPath), "memories.css must exist");

  const css = fs.readFileSync(cssPath, "utf-8");

  // 1. Theme Tokens
  assert.ok(css.includes('[data-theme="love"]'), "Should support [data-theme='love']");
  assert.ok(css.includes("--memories-rose"), "Must define rose token");
  assert.ok(css.includes("--memories-pink"), "Must define pink token");
  assert.ok(css.includes("--memories-green"), "Must define green token");
  assert.ok(css.includes("--memories-paper"), "Must define paper token");

  // 2. Touch targets >= 44x44px
  assert.ok(
    css.includes("44px"),
    "Must enforce minimum 44px touch targets"
  );
  assert.ok(css.includes("--memories-touch-target: 44px") || css.includes("min-height: 44px") || css.includes("min-width: 44px"));

  // 3. Safe area insets
  assert.ok(css.includes("safe-area-inset-top"), "Must handle safe-area-inset-top");
  assert.ok(css.includes("safe-area-inset-bottom"), "Must handle safe-area-inset-bottom");

  // 4. Sticky timeline header
  assert.ok(css.includes("position: sticky"), "Timeline headers must be sticky");
  assert.ok(css.includes("backdrop-filter"), "Sticky header must have blur backdrop");

  // 5. Mobile-first responsive breakpoints (320px, 360px, 390px, 768px, 1024px)
  assert.ok(css.includes("359px") || css.includes("320px"), "Should handle ultra-compact mobile (< 360px)");
  assert.ok(css.includes("360px"), "Should handle standard compact mobile (360px)");
  assert.ok(css.includes("390px"), "Should handle modern smartphones (390px)");
  assert.ok(css.includes("768px"), "Should handle tablets/iPads (768px)");
  assert.ok(css.includes("1024px"), "Should handle desktop (1024px)");
});
