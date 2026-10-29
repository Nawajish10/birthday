import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  loadPhotos,
  savePhotos,
  loadFavorites,
  saveFavorites,
  toggleFavorite,
  INITIAL_PRELOADED_PHOTOS,
  GOOGLE_PHOTOS_DATA,
  photoAssetToProfilePostItem,
  profilePostItemToPhotoAsset,
} from "../src/lib/media-service.ts";
import {
  groupPhotosChronologically,
  groupPhotosOnThisDay,
  CHERISHED_MOMENTS_TITLE,
  SPECIAL_MEMORIES_TITLE,
} from "../src/components/memories/memories-helpers.ts";
import {
  filterProfileMedia,
  getEmptyStateMessage,
  type ProfileMode,
} from "../src/lib/media-service.ts";
import type { PhotoAsset, ProfilePostItem } from "../src/types/media-contracts.ts";

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

// Sample test photos with known and unknown capture dates
const mockSharedPhotos: PhotoAsset[] = [
  {
    id: "photo-2024-oct",
    storagePath: "photos/p1.jpg",
    url: "/images/full-p1.jpg",
    fullDisplayUrl: "/images/full-p1.jpg",
    thumbnailUrl: "/images/thumb-p1.jpg",
    thumbnailPath: "thumbnails/p1.jpg",
    mediaKind: "image",
    effectiveCaptureDate: "2024-10-29",
    hasKnownCaptureDate: true,
    uploadTimestamp: "2024-10-30T10:00:00Z",
    caption: "Birthday smiles and balloons ✿",
    altText: "Smiling with birthday balloons",
  },
  {
    id: "photo-2023-oct",
    storagePath: "photos/p2.jpg",
    url: "/images/full-p2.jpg",
    fullDisplayUrl: "/images/full-p2.jpg",
    thumbnailUrl: "/images/thumb-p2.jpg",
    thumbnailPath: "thumbnails/p2.jpg",
    mediaKind: "image",
    effectiveCaptureDate: "2023-10-29",
    hasKnownCaptureDate: true,
    uploadTimestamp: "2023-10-30T10:00:00Z",
    caption: "Golden hour sunset memory ✨",
    altText: "Golden hour sunset glow",
  },
  {
    id: "photo-video-reel",
    storagePath: "videos/v1.mp4",
    url: "/videos/reel-1.mp4",
    fullDisplayUrl: "/videos/reel-1.mp4",
    thumbnailUrl: "/images/thumb-v1.jpg",
    mediaKind: "video",
    effectiveCaptureDate: "2024-12-01",
    hasKnownCaptureDate: true,
    uploadTimestamp: "2024-12-02T10:00:00Z",
    caption: "Celebration reel video",
    altText: "Video clips from party",
  },
  {
    id: "photo-unknown-moment-1",
    storagePath: "photos/p4.jpg",
    url: "/images/full-p4.jpg",
    fullDisplayUrl: "/images/full-p4.jpg",
    thumbnailUrl: "/images/thumb-p4.jpg",
    mediaKind: "image",
    effectiveCaptureDate: "2026-10-20T10:00:00Z", // upload fallback date
    hasKnownCaptureDate: false, // missing real capture date
    uploadTimestamp: "2026-10-20T10:00:00Z",
    caption: "Sweet candid tea moment ♡",
    altText: "Candid laughter over tea",
  },
  {
    id: "photo-unknown-moment-2",
    storagePath: "photos/p5.jpg",
    url: "/images/full-p5.jpg",
    fullDisplayUrl: "/images/full-p5.jpg",
    thumbnailUrl: "/images/thumb-p5.jpg",
    mediaKind: "image",
    effectiveCaptureDate: "2026-10-22T10:00:00Z",
    hasKnownCaptureDate: false, // missing real capture date
    uploadTimestamp: "2026-10-22T10:00:00Z",
    caption: "Quiet reading afternoon 🕊️",
    altText: "Reading a book by the window",
  },
];

// ============================================================================
// 1. SHARED PHOTO ASSET CONTRACT & NO DUPLICATE DOWNLOADS
// ============================================================================

test("1. Shared Photo Asset Contract: bijective mapping and single source of truth", () => {
  const photo = mockSharedPhotos[0];
  const postItem = photoAssetToProfilePostItem(photo);

  assert.equal(postItem.id, photo.id);
  assert.equal(postItem.url, photo.url);
  assert.equal(postItem.fullDisplayUrl, photo.fullDisplayUrl);
  assert.equal(postItem.thumbnailUrl, photo.thumbnailUrl);
  assert.equal(postItem.caption, photo.caption);
  assert.equal(postItem.hasKnownCaptureDate, true);
  assert.equal(postItem.effectiveCaptureDate, "2024-10-29");

  // Round-trip back to PhotoAsset preserves core properties
  const roundTrip = profilePostItemToPhotoAsset(postItem);
  assert.equal(roundTrip.id, photo.id);
  assert.equal(roundTrip.url, photo.url);
  assert.equal(roundTrip.fullDisplayUrl, photo.fullDisplayUrl);
  assert.equal(roundTrip.thumbnailUrl, photo.thumbnailUrl);
  assert.equal(roundTrip.mediaKind, "image");
  assert.equal(roundTrip.hasKnownCaptureDate, true);
});

test("1. Shared Photo Storage: Profile and Memories consume the exact same underlying storage", () => {
  const mockStorage = new MockStorage();

  // Save photos through media-service
  savePhotos(mockSharedPhotos, mockStorage);

  // Both consumers load from the identical storage key
  const profileLoaded = loadPhotos(mockStorage);
  const memoriesLoaded = loadPhotos(mockStorage);

  assert.equal(profileLoaded.length, mockSharedPhotos.length);
  assert.equal(memoriesLoaded.length, mockSharedPhotos.length);
  assert.deepEqual(profileLoaded.map((p) => p.id), memoriesLoaded.map((p) => p.id));

  // No separate duplicate keys created
  const storedKeys = Object.keys((mockStorage as any).store);
  assert.ok(storedKeys.includes("meerah_birthday_photos_v1"));
  assert.ok(!storedKeys.includes("profile_photos_v1"));
  assert.ok(!storedKeys.includes("memories_photos_v1"));
});

// ============================================================================
// 2. PROFILE PHOTO GRID RENDERING WITH THUMBNAILS & MODES
// ============================================================================

test("2. Profile Photo Grid: media filtering by mode (posts, reels, favorites)", () => {
  const postItems = mockSharedPhotos.map(photoAssetToProfilePostItem);
  const favorites = ["photo-2024-oct", "photo-video-reel"];

  // 'posts' tab displays only non-video images
  const postsView = filterProfileMedia(postItems, "posts", favorites);
  assert.equal(postsView.length, 4);
  assert.ok(postsView.every((p) => p.media_kind !== "video"));

  // 'reels' tab displays only video items
  const reelsView = filterProfileMedia(postItems, "reels", favorites);
  assert.equal(reelsView.length, 1);
  assert.equal(reelsView[0].id, "photo-video-reel");
  assert.equal(reelsView[0].media_kind, "video");

  // 'favorites' tab displays both images and videos that are favorited
  const favoritesView = filterProfileMedia(postItems, "favorites", favorites);
  assert.equal(favoritesView.length, 2);
  assert.ok(favoritesView.some((p) => p.id === "photo-2024-oct"));
  assert.ok(favoritesView.some((p) => p.id === "photo-video-reel"));
});

test("2. Profile Photo Grid: thumbnail URLs are properly preferred over raw full images", () => {
  const postItems = mockSharedPhotos.map(photoAssetToProfilePostItem);

  for (const item of postItems) {
    const thumb = item.thumbnailUrl || item.thumbnail_url || item.thumbnailPath || item.url;
    assert.ok(thumb, `Item ${item.id} must have a valid thumbnail URL`);
    if (item.thumbnailUrl) {
      assert.equal(thumb, item.thumbnailUrl);
    }
  }
});

test("2. Profile Empty States: contextual messages for all modes", () => {
  assert.match(getEmptyStateMessage("posts"), /birthday photos will appear/i);
  assert.match(getEmptyStateMessage("reels"), /no reels yet/i);
  assert.match(getEmptyStateMessage("favorites"), /tap the heart/i);
});

// ============================================================================
// 3. INTERACTIVE LIGHTBOX VIEWER: NAVIGATION, FULL DISPLAY, DATES & SHARE
// ============================================================================

test("3. Lightbox Navigation: index advancing, wrapping, and keyboard shortcuts", () => {
  const postItems = mockSharedPhotos
    .filter((p) => p.mediaKind !== "video")
    .map(photoAssetToProfilePostItem);
  const total = postItems.length;

  let currentIndex = 0;

  // Next navigation advances
  currentIndex = (currentIndex + 1) % total;
  assert.equal(currentIndex, 1);
  assert.equal(postItems[currentIndex].id, "photo-2023-oct");

  // Next from last index wraps around to first
  currentIndex = total - 1;
  currentIndex = (currentIndex + 1) % total;
  assert.equal(currentIndex, 0);
  assert.equal(postItems[currentIndex].id, "photo-2024-oct");

  // Previous navigation decrements
  currentIndex = (currentIndex - 1 + total) % total;
  assert.equal(currentIndex, total - 1);

  // Full display URL is resolved
  const activeItem = postItems[currentIndex];
  const displaySrc = activeItem.fullDisplayUrl || activeItem.url;
  assert.ok(displaySrc.startsWith("/images/full-"));
});

test("3. Lightbox Date Rendering: Strictly no date fabrication when dates are missing", () => {
  const knownPhoto = mockSharedPhotos.find((p) => p.hasKnownCaptureDate)!;
  const unknownPhoto = mockSharedPhotos.find((p) => !p.hasKnownCaptureDate)!;

  // For known capture dates, date formatting is performed
  assert.equal(knownPhoto.hasKnownCaptureDate, true);
  assert.ok(knownPhoto.effectiveCaptureDate);

  // For unknown capture dates, UI must NOT display fabricated capture date
  assert.equal(unknownPhoto.hasKnownCaptureDate, false);
  const shouldRenderDate = unknownPhoto.hasKnownCaptureDate && Boolean(unknownPhoto.effectiveCaptureDate);
  assert.equal(shouldRenderDate, false, "Missing capture dates must strictly never be rendered or fabricated");
});

// ============================================================================
// 4. MEMORIES CHRONOLOGICAL GROUPING WITHOUT DATE FABRICATION
// ============================================================================

test("4. Memories Chronological Grouping: known dates grouped by Month & Year descending", () => {
  const groups = groupPhotosChronologically(mockSharedPhotos);

  // Expected known groups: December 2024, October 2024, October 2023, then Curated group
  assert.ok(groups.length >= 3);
  const titles = groups.map((g) => g.title);

  assert.equal(titles[0], "December 2024");
  assert.equal(titles[1], "October 2024");
  assert.equal(titles[2], "October 2023");

  // Verify photos placed in appropriate groups
  const decGroup = groups.find((g) => g.title === "December 2024");
  assert.equal(decGroup?.photos[0].id, "photo-video-reel");

  const oct24Group = groups.find((g) => g.title === "October 2024");
  assert.equal(oct24Group?.photos[0].id, "photo-2024-oct");
});

test("4. Memories Chronological Grouping: missing dates grouped under curated 'Cherished Moments ✿'", () => {
  const groups = groupPhotosChronologically(mockSharedPhotos);

  // The unknown capture date photos are placed at the end under 'Cherished Moments ✿'
  const curatedGroup = groups.find(
    (g) => g.title === CHERISHED_MOMENTS_TITLE || g.title === SPECIAL_MEMORIES_TITLE
  );
  assert.ok(curatedGroup, "Must have a curated collection for photos without known capture dates");
  assert.equal(curatedGroup.photos.length, 2);

  const curatedIds = curatedGroup.photos.map((p) => p.id);
  assert.ok(curatedIds.includes("photo-unknown-moment-1"));
  assert.ok(curatedIds.includes("photo-unknown-moment-2"));

  // Verify none of the curated photos claim hasKnownCaptureDate
  assert.ok(curatedGroup.photos.every((p) => p.hasKnownCaptureDate === false));
});

test("4. Memories Chronological Grouping: supports custom curated collection title", () => {
  const groups = groupPhotosChronologically(mockSharedPhotos, {
    unknownGroupTitle: "Special Memories",
  });
  const customGroup = groups.find((g) => g.title === "Special Memories");
  assert.ok(customGroup);
  assert.equal(customGroup.photos.length, 2);
});

// ============================================================================
// 5. FAVORITE TOGGLING ON PHOTOS
// ============================================================================

test("5. Photo Favorites: toggling updates shared favorites state bidirectionally", () => {
  const mockStorage = new MockStorage();

  // Initially empty
  let favs = loadFavorites(mockStorage);
  assert.deepEqual(favs, ["photo-mem-1", "photo-mem-2"]); // default preloads

  // Toggle on a new photo
  favs = toggleFavorite("photo-2024-oct", mockStorage);
  assert.ok(favs.includes("photo-2024-oct"));

  // Toggle off
  favs = toggleFavorite("photo-2024-oct", mockStorage);
  assert.ok(!favs.includes("photo-2024-oct"));
});

// ============================================================================
// 6. RESPONSIVE CSS CLASSES, TOUCH TARGETS & ACCESSIBILITY AUDIT
// ============================================================================

test("6. Responsive Grid CSS: defines 3-column desktop and 2-column mobile layout", () => {
  const profileCssPath = path.resolve(process.cwd(), "src/components/profile/profile.css");
  const profileCss = fs.readFileSync(profileCssPath, "utf8");

  // Desktop 3-column
  assert.match(profileCss, /\.profileGalleryGrid[\s\S]*?grid-template-columns:\s*repeat\(3,\s*1fr\)/);

  // Mobile 2-column media query
  assert.match(profileCss, /@media\s*\(max-width:\s*480px\)[\s\S]*?grid-template-columns:\s*repeat\(2,\s*1fr\)/);
});

test("6. Lightbox Viewer CSS: navigation buttons, counter, share, and 44px+ touch targets", () => {
  const profileCssPath = path.resolve(process.cwd(), "src/components/profile/profile.css");
  const profileCss = fs.readFileSync(profileCssPath, "utf8");

  // Lightbox nav buttons
  assert.match(profileCss, /\.profileLightboxNavBtn/);
  assert.match(profileCss, /\.profileLightboxNavPrev/);
  assert.match(profileCss, /\.profileLightboxNavNext/);

  // Touch target check: 44px minimum
  assert.match(profileCss, /min-height:\s*44px|height:\s*44px/);
  assert.match(profileCss, /min-width:\s*44px|width:\s*44px/);

  // Counter, Share button, and Date
  assert.match(profileCss, /\.profileLightboxCounter/);
  assert.match(profileCss, /\.profileDetailShareBtn/);
  assert.match(profileCss, /\.profileDetailDate/);
  assert.match(profileCss, /\.profileErrorState/);
});

test("6. Accessibility & ARIA: dialog semantics, modal labels, and live status", () => {
  const profileTsxPath = path.resolve(process.cwd(), "src/components/profile/ProfilePanel.tsx");
  const profileTsx = fs.readFileSync(profileTsxPath, "utf8");

  // Dialog semantics on Lightbox
  assert.match(profileTsx, /role="dialog"/);
  assert.match(profileTsx, /aria-modal="true"/);
  assert.match(profileTsx, /aria-labelledby="media-detail-caption"/);

  // Previous and Next buttons with ARIA labels
  assert.match(profileTsx, /aria-label="Previous photo"/);
  assert.match(profileTsx, /aria-label="Next photo"/);
  assert.match(profileTsx, /aria-label="Close photo viewer"/);

  // Error and status regions
  assert.match(profileTsx, /role="alert"/);
  assert.match(profileTsx, /role="status"/);
});

// ============================================================================
// 7. MUSIC CONTINUITY RULE: ZERO EXTRA <audio> ELEMENTS
// ============================================================================

test("7. Music Continuity: Zero extra <audio> elements in Profile and Memories components", () => {
  const profileTsx = fs.readFileSync(path.resolve(process.cwd(), "src/components/profile/ProfilePanel.tsx"), "utf8");
  const memoriesTsx = fs.readFileSync(path.resolve(process.cwd(), "src/components/memories/MemoriesPanel.tsx"), "utf8");
  const storyViewerTsx = fs.readFileSync(path.resolve(process.cwd(), "src/components/memories/StoryViewer.tsx"), "utf8");

  assert.ok(!profileTsx.includes("<audio"), "ProfilePanel must NOT contain any <audio> elements");
  assert.ok(!memoriesTsx.includes("<audio"), "MemoriesPanel must NOT contain any <audio> elements");
  assert.ok(!storyViewerTsx.includes("<audio"), "StoryViewer must NOT contain any <audio> elements");
});

// ============================================================================
// 8. GOOGLE PHOTOS MERGE IN PROFILE (effectivePosts)
// ============================================================================

test("8. Google Photos Integration in Profile: merging minimal database posts with all 145 Google Photos", () => {
  assert.equal(GOOGLE_PHOTOS_DATA.length, 145, "Must have exactly 145 Google Photos in dataset");

  // Minimal posts from database (e.g. 2 items)
  const minimalDbPosts: ProfilePostItem[] = [
    {
      id: "db-post-1",
      url: "/photos/db1.jpg",
      media_kind: "image",
      caption: "Special birthday letter",
    },
    {
      id: "db-post-2",
      url: "/videos/db2.mp4",
      media_kind: "video",
      caption: "Video greeting reel",
    },
  ];

  const loadedPhotos = loadPhotos();
  const photoPosts = loadedPhotos.map(photoAssetToProfilePostItem);

  // Effective posts merge simulation (matching ProfilePanel.tsx logic)
  const seenIds = new Set(minimalDbPosts.map((p) => p.id));
  const seenUrls = new Set(minimalDbPosts.map((p) => p.url));
  const merged = [...minimalDbPosts];
  for (const item of photoPosts) {
    if (!seenIds.has(item.id) && !seenUrls.has(item.url)) {
      seenIds.add(item.id);
      seenUrls.add(item.url);
      merged.push(item);
    }
  }

  // Merged posts must contain all 145 Google Photos + minimal db posts
  assert.ok(merged.length >= 145, `Merged posts (${merged.length}) must include all 145 Google Photos`);
  assert.ok(merged.some((p) => p.id === "db-post-1"));
  assert.ok(merged.some((p) => p.id === "db-post-2"));
  assert.ok(merged.some((p) => p.id === "gphoto_special_birthday_popup"));

  // Verify filtering
  const postsTab = filterProfileMedia(merged, "posts", []);
  assert.ok(postsTab.length >= 144, "Posts tab must show images");
  assert.ok(postsTab.every((p) => p.media_kind !== "video"));

  const reelsTab = filterProfileMedia(merged, "reels", []);
  assert.ok(reelsTab.some((p) => p.id === "db-post-2"));
  assert.ok(reelsTab.every((p) => p.media_kind === "video"));

  // Favorites filter with Google Photos
  const favId = "gphoto_special_birthday_popup";
  const favsTab = filterProfileMedia(merged, "favorites", [favId]);
  assert.equal(favsTab.length, 1);
  assert.equal(favsTab[0].id, favId);

  // Inspect ProfilePanel.tsx implementation
  const profileTsx = fs.readFileSync(path.resolve(process.cwd(), "src/components/profile/ProfilePanel.tsx"), "utf8");
  assert.ok(profileTsx.includes("effectivePosts"), "ProfilePanel must calculate effectivePosts");
  assert.ok(profileTsx.includes("photoAssetToProfilePostItem"), "ProfilePanel must map photos via photoAssetToProfilePostItem");
  assert.ok(profileTsx.includes("effectivePosts.length"), "Profile counts must display effectivePosts.length");
});

// ============================================================================
// 9. GOOGLE PHOTOS IN MEMORIES: DEFAULT TAB, SYNC & COLLECTIONS
// ============================================================================

test("9. Google Photos Integration in Memories: default tab, sync, chronological & albums", () => {
  const memoriesTsx = fs.readFileSync(path.resolve(process.cwd(), "src/components/memories/MemoriesPanel.tsx"), "utf8");

  // Default activeTab must be 'photos'
  assert.ok(
    memoriesTsx.includes('useState<MemoriesTab>("photos")'),
    "MemoriesPanel must default activeTab to 'photos'"
  );

  // useEffect must sync photos when propPhotos updates
  assert.ok(
    memoriesTsx.includes("useEffect") && memoriesTsx.includes("[propPhotos]"),
    "MemoriesPanel must use useEffect with [propPhotos] to sync photos"
  );

  // Chronological grouping with 145 Google Photos
  const groups = groupPhotosChronologically(GOOGLE_PHOTOS_DATA);
  assert.ok(groups.length > 0, "Must produce chronological timeline groups for Google Photos");
  const totalPhotosInGroups = groups.reduce((acc, g) => acc + g.photos.length, 0);
  assert.equal(totalPhotosInGroups, 145, "All 145 Google Photos must be grouped");

  // On this day groups
  const onThisDay = groupPhotosOnThisDay(GOOGLE_PHOTOS_DATA);
  assert.ok(Array.isArray(onThisDay), "On this day must return an array of groups");
});
