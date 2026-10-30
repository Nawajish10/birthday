import test from "node:test";
import assert from "node:assert/strict";
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
  classifyPhoto,
  bulkClassifyPhotos,
  filterMainGallery,
  filterPrivateGallery,
  filterMainGalleryPosts,
  DEFAULT_PROFILE,
} from "../src/lib/media-service.ts";
import type { PhotoAsset, ProfilePostItem } from "../src/types/media-contracts.ts";

// Simple in-memory Storage mock
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

test("Media Service: Profile loading and updating", () => {
  const storage = new MockStorage();
  const profile = loadProfile(storage);
  assert.equal(profile.displayName, DEFAULT_PROFILE.displayName);
  assert.equal(profile.birthDate, DEFAULT_PROFILE.birthDate);

  const updated = saveProfile({ displayName: "Meerah Jaan", bio: "Queen of today" }, storage);
  assert.equal(updated.displayName, "Meerah Jaan");
  assert.equal(updated.bio, "Queen of today");

  const reloaded = loadProfile(storage);
  assert.equal(reloaded.displayName, "Meerah Jaan");
  assert.equal(reloaded.bio, "Queen of today");
});

test("Media Service: Photo adding and favorite toggling", () => {
  const storage = new MockStorage();
  const newPhoto: PhotoAsset = {
    id: "test-photo-99",
    storagePath: "photos/test.jpg",
    url: "https://example.com/test.jpg",
    mediaKind: "image",
    effectiveCaptureDate: "2024-10-29",
    hasKnownCaptureDate: true,
    uploadTimestamp: new Date().toISOString(),
    caption: "Test photo capture",
  };

  const photos = addPhotoAsset(newPhoto, storage);
  assert.ok(photos.some((p) => p.id === "test-photo-99"));

  const favs = toggleFavorite("test-photo-99", storage);
  assert.ok(favs.includes("test-photo-99"));

  const reloadedFavs = loadFavorites(storage);
  assert.ok(reloadedFavs.includes("test-photo-99"));

  // Toggle off
  const unfaved = toggleFavorite("test-photo-99", storage);
  assert.ok(!unfaved.includes("test-photo-99"));
});

test("Media Service: Highlight and Album creation and safe deletion", () => {
  const storage = new MockStorage();
  const hl = createHighlight("Trip 2024", ["photo-mem-1", "photo-mem-2"], "photo-mem-1", storage);
  assert.equal(hl.title, "Trip 2024");
  assert.equal(hl.photoIds.length, 2);

  const album = createAlbum("Summer Memories", "Warm memories", ["photo-mem-3"], storage);
  assert.equal(album.title, "Summer Memories");
  assert.equal(album.photoIds.length, 1);

  // Safe deletion: deleting highlight does NOT delete photos
  const remainingHls = deleteHighlight(hl.id, storage);
  assert.ok(!remainingHls.some((h) => h.id === hl.id));
  const photosAfterHlDelete = loadPhotos(storage);
  assert.ok(photosAfterHlDelete.some((p) => p.id === "photo-mem-1"));

  // Safe deletion: deleting album does NOT delete photos
  const remainingAlbums = deleteAlbum(album.id, storage);
  assert.ok(!remainingAlbums.some((a) => a.id === album.id));
  const photosAfterAlbDelete = loadPhotos(storage);
  assert.ok(photosAfterAlbDelete.some((p) => p.id === "photo-mem-3"));
});

test("Media Service: Removing photo from collection leaves photo asset intact", () => {
  const storage = new MockStorage();
  const hl = createHighlight("Vacation", ["photo-mem-1", "photo-mem-2"], "photo-mem-1", storage);

  const removed = removePhotoFromCollection("highlight", hl.id, "photo-mem-1", storage);
  assert.equal(removed, true);

  const updatedHl = loadHighlights(storage).find((h) => h.id === hl.id);
  assert.ok(updatedHl);
  assert.ok(!updatedHl.photoIds.includes("photo-mem-1"));
  assert.ok(updatedHl.photoIds.includes("photo-mem-2"));

  // Photo asset itself is still in the library!
  const photos = loadPhotos(storage);
  assert.ok(photos.some((p) => p.id === "photo-mem-1"));
});

test("Media Service: Deleting a photo asset cleans references across all collections", () => {
  const storage = new MockStorage();
  const testPhoto: PhotoAsset = {
    id: "photo-to-delete",
    storagePath: "photos/del.jpg",
    url: "https://example.com/del.jpg",
    mediaKind: "image",
    effectiveCaptureDate: "2024-10-29",
    hasKnownCaptureDate: true,
    uploadTimestamp: new Date().toISOString(),
  };

  addPhotoAsset(testPhoto, storage);
  toggleFavorite("photo-to-delete", storage);
  const hl = createHighlight("Test HL", ["photo-to-delete", "photo-mem-1"], "photo-to-delete", storage);
  const alb = createAlbum("Test Alb", "Desc", ["photo-to-delete"], storage);
  const story = createStory("Test Story", ["photo-to-delete"], [testPhoto], undefined, storage);

  // Now delete photo-to-delete
  const { photos, favorites, highlights, albums, stories } = deletePhotoAsset("photo-to-delete", storage);

  assert.ok(!photos.some((p) => p.id === "photo-to-delete"));
  assert.ok(!favorites.includes("photo-to-delete"));

  const targetHl = highlights.find((h) => h.id === hl.id);
  assert.ok(targetHl && !targetHl.photoIds.includes("photo-to-delete"));
  assert.equal(targetHl.coverPhotoId, undefined);

  const targetAlb = albums.find((a) => a.id === alb.id);
  assert.ok(targetAlb && !targetAlb.photoIds.includes("photo-to-delete"));

  const targetStory = stories.find((s) => s.id === story.id);
  assert.ok(targetStory && !targetStory.photoIds.includes("photo-to-delete"));
});

test("Media Service: Story creation with music and deletion", () => {
  const storage = new MockStorage();
  const photos = loadPhotos(storage).slice(0, 2);
  const story = createStory(
    "Birthday Morning",
    photos.map((p) => p.id),
    photos,
    {
      id: "track-1",
      title: "Afreen Afreen",
      artist: "Rahat",
      audioUrl: "https://example.com/audio.mp3",
    },
    storage
  );

  assert.equal(story.title, "Birthday Morning");
  assert.equal(story.musicTrackId, "track-1");
  assert.equal(story.musicTrack?.title, "Afreen Afreen");

  const reloaded = loadStories(storage).find((s) => s.id === story.id);
  assert.ok(reloaded);
  assert.equal(reloaded.musicTrackId, "track-1");

  // Deleting story does not delete photo assets or music
  const remaining = deleteStory(story.id, storage);
  assert.ok(!remaining.some((s) => s.id === story.id));
  assert.ok(loadPhotos(storage).length >= 2);
});

test("Media Service: Individual and Bulk Gallery Classification", () => {
  const storage = new MockStorage();
  const photo1: PhotoAsset = {
    id: "cls-photo-1",
    storagePath: "photos/1.jpg",
    url: "https://example.com/1.jpg",
    mediaKind: "image",
    effectiveCaptureDate: "2024-10-29",
    hasKnownCaptureDate: true,
    uploadTimestamp: new Date().toISOString(),
    galleryCategory: "main",
    isPrivate: false,
  };
  const photo2: PhotoAsset = {
    id: "cls-photo-2",
    storagePath: "photos/2.jpg",
    url: "https://example.com/2.jpg",
    mediaKind: "image",
    effectiveCaptureDate: "2024-10-29",
    hasKnownCaptureDate: true,
    uploadTimestamp: new Date().toISOString(),
    galleryCategory: "main",
    isPrivate: false,
  };

  addPhotoAsset(photo1, storage);
  addPhotoAsset(photo2, storage);

  // 1. Individual classification: classify photo1 as private
  const classified = classifyPhoto("cls-photo-1", "private", storage);
  assert.ok(classified);
  assert.equal(classified?.galleryCategory, "private");
  assert.equal(classified?.isPrivate, true);

  // 2. Main Gallery filtering: strictly excludes private photos
  const allPhotos = loadPhotos(storage);
  const mainGallery = filterMainGallery(allPhotos);
  assert.ok(!mainGallery.some((p) => p.id === "cls-photo-1"), "Private photo must NOT be in Main Gallery");
  assert.ok(mainGallery.some((p) => p.id === "cls-photo-2"), "Main photo must be in Main Gallery");

  // 3. Private Gallery filtering: includes private photo
  const privateGallery = filterPrivateGallery(allPhotos);
  assert.ok(privateGallery.some((p) => p.id === "cls-photo-1"), "Private photo must be in Private Gallery");
  assert.ok(!privateGallery.some((p) => p.id === "cls-photo-2"), "Main photo must NOT be in Private Gallery");

  // 4. Bulk classification: classify both as main
  const bulkUpdated = bulkClassifyPhotos(["cls-photo-1", "cls-photo-2"], "main", storage);
  assert.ok(bulkUpdated.every((p) => (p.id === "cls-photo-1" || p.id === "cls-photo-2" ? p.galleryCategory === "main" && !p.isPrivate : true)));

  // 5. Post filtering
  const samplePosts: ProfilePostItem[] = [
    { id: "post-pub", url: "/1.jpg", media_kind: "image", galleryCategory: "main" },
    { id: "post-priv", url: "/2.jpg", media_kind: "image", galleryCategory: "private" },
  ];
  const filteredPosts = filterMainGalleryPosts(samplePosts);
  assert.equal(filteredPosts.length, 1);
  assert.equal(filteredPosts[0].id, "post-pub");
});
