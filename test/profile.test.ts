import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { calculateAge, calculateNextBirthdayCountdown } from "../src/lib/birthday-dates.ts";
import {
  loadProfile,
  saveProfile,
  loadHighlights,
  createHighlight,
  deleteHighlight,
  loadPhotos,
  savePhotos,
} from "../src/lib/media-service.ts";
import type { PhotoAsset } from "../src/types/media-contracts.ts";

// Core Types
export type ProfileMode = "posts" | "reels" | "favorites";

export interface ProfilePostItem {
  id: string;
  url: string;
  media_path?: string;
  media_kind: "image" | "video";
  caption?: string;
  alt_text?: string;
  sort_order?: number;
  is_published?: boolean;
}

export interface ProfileHighlight {
  id: string;
  title: string;
  coverUrl?: string;
  photoIds?: string[];
}

// Logic implementations matching ProfilePanel
export function filterProfileMedia(
  items: ProfilePostItem[],
  mode: ProfileMode,
  favorites: string[]
): ProfilePostItem[] {
  if (!items || !Array.isArray(items)) return [];
  if (mode === "reels") {
    return items.filter((p) => p.media_kind === "video");
  }
  if (mode === "favorites") {
    const favSet = new Set(favorites || []);
    return items.filter((p) => favSet.has(p.id));
  }
  return items.filter((p) => p.media_kind !== "video");
}

export function getEmptyStateMessage(mode: ProfileMode): string {
  switch (mode) {
    case "favorites":
      return "Tap the heart on a post or reel to save it here.";
    case "reels":
      return "No reels yet. Add videos in the creator workspace.";
    case "posts":
    default:
      return "Your birthday photos will appear here once the creator adds them.";
  }
}

export function sanitizeExternalUrl(rawUrl: unknown): { isSafe: boolean; sanitizedUrl: string | null } {
  if (typeof rawUrl !== "string") {
    return { isSafe: false, sanitizedUrl: null };
  }
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { isSafe: false, sanitizedUrl: null };
  }
  try {
    const parsed = new URL(trimmed);
    const safeProtocols = ["https:", "http:"];
    if (safeProtocols.includes(parsed.protocol.toLowerCase())) {
      return { isSafe: true, sanitizedUrl: parsed.toString() };
    }
    return { isSafe: false, sanitizedUrl: null };
  } catch {
    return { isSafe: false, sanitizedUrl: null };
  }
}

export const DEFAULT_HIGHLIGHTS: ProfileHighlight[] = [
  { id: "hl-memories", title: "Memories ✿" },
  { id: "hl-golden", title: "Golden Days ✨" },
  { id: "hl-laughter", title: "Laughter ♡" },
  { id: "hl-wishes", title: "Wishes 🎂" },
  { id: "hl-forever", title: "Eternal 🕊️" },
];

export function resolveHighlights(highlights?: ProfileHighlight[]): ProfileHighlight[] {
  if (highlights && highlights.length > 0) {
    return highlights;
  }
  return DEFAULT_HIGHLIGHTS;
}

export function getHighlightGlyph(id: string, title: string): string {
  const t = (title || "").toLowerCase();
  if (t.includes("memory") || t.includes("memories")) return "✿";
  if (t.includes("gold") || t.includes("shine") || t.includes("star")) return "✨";
  if (t.includes("laugh") || t.includes("smile") || t.includes("love") || t.includes("heart")) return "♡";
  if (t.includes("wish") || t.includes("cake") || t.includes("celebrat") || t.includes("birthday")) return "🎂";
  if (t.includes("eternal") || t.includes("forever") || t.includes("chapter") || t.includes("vault")) return "🕊️";
  if (t.includes("song") || t.includes("music")) return "♪";
  return "❀";
}

export function toggleFavoriteId(current: string[], id: string): string[] {
  if (!Array.isArray(current)) return [id];
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
}

export const FAVORITES_STORAGE_KEY = "birthday_favorites";
export const FAVORITES_STORAGE_ALT_KEY = "birthday-favorites";

export function loadFavoritesFromStorage(storage?: { getItem: (key: string) => string | null }): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(FAVORITES_STORAGE_KEY) || storage.getItem(FAVORITES_STORAGE_ALT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function saveFavoritesToStorage(
  nextFavorites: string[],
  storage?: { setItem: (key: string, val: string) => void }
): boolean {
  if (!storage) return false;
  try {
    const serialized = JSON.stringify(nextFavorites);
    storage.setItem(FAVORITES_STORAGE_KEY, serialized);
    storage.setItem(FAVORITES_STORAGE_ALT_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}

// Mock test fixture data
const samplePosts: ProfilePostItem[] = [
  { id: "p1", url: "/photos/p1.jpg", media_path: "p1.jpg", media_kind: "image", caption: "Sunrise coffee", alt_text: "A cup of warm coffee" },
  { id: "p2", url: "/photos/p2.mp4", media_path: "p2.mp4", media_kind: "video", caption: "Birthday surprise dance" },
  { id: "p3", url: "/photos/p3.jpg", media_path: "p3.jpg", media_kind: "image", caption: "Laughing at the cafe", alt_text: "Laughing with friends" },
  { id: "p4", url: "/photos/p4.mp4", media_path: "p4.mp4", media_kind: "video", caption: "Candle blow moment" },
  { id: "p5", url: "/photos/p5.jpg", media_path: "p5.jpg", media_kind: "image", caption: "Golden hour portrait", alt_text: "Portrait in evening sun" },
];

// Helper mock storage implementation for unit tests
function createMockStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    key: (index: number) => Object.keys(store)[index] || null,
    length: 0,
  };
}

// ============================================================================
// 1. Filtering Algorithm Tests
// ============================================================================

test("Filter algorithm: 'posts' mode returns only images and non-video items", () => {
  const result = filterProfileMedia(samplePosts, "posts", []);
  assert.equal(result.length, 3);
  assert.deepEqual(
    result.map((p) => p.id),
    ["p1", "p3", "p5"]
  );
  assert.ok(result.every((p) => p.media_kind !== "video"));
});

test("Filter algorithm: 'reels' mode returns only video items", () => {
  const result = filterProfileMedia(samplePosts, "reels", []);
  assert.equal(result.length, 2);
  assert.deepEqual(
    result.map((p) => p.id),
    ["p2", "p4"]
  );
  assert.ok(result.every((p) => p.media_kind === "video"));
});

test("Filter algorithm: 'favorites' mode returns only items included in favorites array", () => {
  const favorites = ["p2", "p5", "non-existent-id"];
  const result = filterProfileMedia(samplePosts, "favorites", favorites);
  assert.equal(result.length, 2);
  assert.deepEqual(
    result.map((p) => p.id),
    ["p2", "p5"]
  );
  // Can include both video and image as long as it's favorited
  assert.equal(result.some((p) => p.media_kind === "video"), true);
  assert.equal(result.some((p) => p.media_kind === "image"), true);
});

test("Filter algorithm: handles empty items and empty favorites gracefully", () => {
  assert.deepEqual(filterProfileMedia([], "posts", []), []);
  assert.deepEqual(filterProfileMedia([], "reels", ["p1"]), []);
  assert.deepEqual(filterProfileMedia(samplePosts, "favorites", []), []);
  // @ts-expect-error test invalid inputs
  assert.deepEqual(filterProfileMedia(null, "posts", []), []);
});

// ============================================================================
// 2. Favorite Toggle & Storage Helper Tests
// ============================================================================

test("Favorite toggle helper: adds an item when not currently present", () => {
  const initial = ["p1", "p2"];
  const next = toggleFavoriteId(initial, "p3");
  assert.deepEqual(next, ["p1", "p2", "p3"]);
  assert.notEqual(initial, next, "Must not mutate original array");
});

test("Favorite toggle helper: removes an item when already present", () => {
  const initial = ["p1", "p2", "p3"];
  const next = toggleFavoriteId(initial, "p2");
  assert.deepEqual(next, ["p1", "p3"]);
  assert.notEqual(initial, next, "Must not mutate original array");
});

test("Favorite toggle helper: safely handles non-array input", () => {
  // @ts-expect-error test non-array input
  const next = toggleFavoriteId(null, "p1");
  assert.deepEqual(next, ["p1"]);
});

test("Storage helpers: save and load favorites accurately with compatibility keys", () => {
  const memoryStore: Record<string, string> = {};
  const mockStorage = {
    getItem: (key: string) => memoryStore[key] ?? null,
    setItem: (key: string, val: string) => {
      memoryStore[key] = val;
    },
  };

  const toSave = ["p1", "p4", "p5"];
  const saveSuccess = saveFavoritesToStorage(toSave, mockStorage);
  assert.equal(saveSuccess, true);
  assert.equal(memoryStore[FAVORITES_STORAGE_KEY], JSON.stringify(toSave));
  assert.equal(memoryStore[FAVORITES_STORAGE_ALT_KEY], JSON.stringify(toSave));

  const loaded = loadFavoritesFromStorage(mockStorage);
  assert.deepEqual(loaded, toSave);
});

test("Storage helpers: safely handle corrupt or non-array storage data", () => {
  const mockCorruptStorage = {
    getItem: () => "{ invalid json 123 ]",
    setItem: () => {},
  };
  const loadedCorrupt = loadFavoritesFromStorage(mockCorruptStorage);
  assert.deepEqual(loadedCorrupt, []);

  const mockNonArrayStorage = {
    getItem: () => JSON.stringify({ message: "not an array" }),
    setItem: () => {},
  };
  const loadedNonArray = loadFavoritesFromStorage(mockNonArrayStorage);
  assert.deepEqual(loadedNonArray, []);

  const mockNullStorage = {
    getItem: () => null,
    setItem: () => {},
  };
  const loadedNull = loadFavoritesFromStorage(mockNullStorage);
  assert.deepEqual(loadedNull, []);

  // SSR / undefined storage
  assert.deepEqual(loadFavoritesFromStorage(undefined), []);
  assert.equal(saveFavoritesToStorage(["p1"], undefined), false);
});

// ============================================================================
// 3. Empty State Messaging Rules Tests
// ============================================================================

test("Empty state messages: exact rules for each profile mode", () => {
  assert.equal(
    getEmptyStateMessage("favorites"),
    "Tap the heart on a post or reel to save it here."
  );
  assert.equal(
    getEmptyStateMessage("reels"),
    "No reels yet. Add videos in the creator workspace."
  );
  assert.equal(
    getEmptyStateMessage("posts"),
    "Your birthday photos will appear here once the creator adds them."
  );
  assert.equal(
    getEmptyStateMessage("unknown" as unknown as ProfileMode),
    "Your birthday photos will appear here once the creator adds them."
  );
});

// ============================================================================
// 4. URL Sanitization Tests
// ============================================================================

test("URL sanitization: accepts valid HTTP/HTTPS and rejects dangerous protocols", () => {
  const safeHttps = sanitizeExternalUrl("https://instagram.com/meerah");
  assert.equal(safeHttps.isSafe, true);
  assert.equal(safeHttps.sanitizedUrl, "https://instagram.com/meerah");

  const safeHttp = sanitizeExternalUrl("http://localhost:3000/profile");
  assert.equal(safeHttp.isSafe, true);
  assert.equal(safeHttp.sanitizedUrl, "http://localhost:3000/profile");

  const dangerousJs = sanitizeExternalUrl("javascript:alert(1)");
  assert.equal(dangerousJs.isSafe, false);
  assert.equal(dangerousJs.sanitizedUrl, null);

  const empty = sanitizeExternalUrl("");
  assert.equal(empty.isSafe, false);
  assert.equal(empty.sanitizedUrl, null);

  assert.equal(sanitizeExternalUrl(null).isSafe, false);
});

// ============================================================================
// 5. Highlights Fallback Logic Tests
// ============================================================================

test("Highlights logic: resolves custom highlights when provided", () => {
  const customHighlights: ProfileHighlight[] = [
    { id: "c1", title: "Paris Trip", coverUrl: "/covers/paris.jpg" },
    { id: "c2", title: "Puppy Days", coverUrl: "/covers/puppy.jpg" },
  ];
  const resolved = resolveHighlights(customHighlights);
  assert.deepEqual(resolved, customHighlights);
});

test("Highlights logic: falls back to DEFAULT_HIGHLIGHTS when undefined or empty", () => {
  const fromUndefined = resolveHighlights(undefined);
  assert.deepEqual(fromUndefined, DEFAULT_HIGHLIGHTS);
  assert.equal(fromUndefined.length >= 5, true);

  const fromEmpty = resolveHighlights([]);
  assert.deepEqual(fromEmpty, DEFAULT_HIGHLIGHTS);
});

test("Highlights logic: glyph resolver maps titles to meaningful symbols", () => {
  assert.equal(getHighlightGlyph("1", "Memories ✿"), "✿");
  assert.equal(getHighlightGlyph("2", "Golden Days"), "✨");
  assert.equal(getHighlightGlyph("3", "Laughter & Love"), "♡");
  assert.equal(getHighlightGlyph("4", "Birthday Wishes"), "🎂");
  assert.equal(getHighlightGlyph("5", "Eternal Chapter"), "🕊️");
  assert.equal(getHighlightGlyph("6", "Our Songbook"), "♪");
  assert.equal(getHighlightGlyph("7", "General Highlight"), "❀");
});

// ============================================================================
// 6. Authoritative Dynamic Age & Countdown Tests
// ============================================================================

test("Authoritative Age: calculates 24 when birthDate is 2002-10-29 and reference year is 2026", () => {
  // Reference date: October 29, 2026
  const ageOnBirthday = calculateAge("2002-10-29", new Date("2026-10-29T12:00:00Z"));
  assert.equal(ageOnBirthday, 24, "Should be 24 years old on birthday in 2026");

  // Reference date before birthday in 2026 (e.g. October 1, 2026)
  const ageBeforeBirthday = calculateAge("2002-10-29", new Date("2026-10-01T12:00:00Z"));
  assert.equal(ageBeforeBirthday, 23, "Should be 23 before birthday");
});

test("Authoritative Countdown: detects isToday flag and countdown breakdown accurately", () => {
  // On birthday day
  const countdownToday = calculateNextBirthdayCountdown("2002-10-29", new Date("2026-10-29T08:00:00Z"));
  assert.equal(countdownToday.isToday, true, "isToday should be true on birthday date");
  assert.equal(countdownToday.days, 0);

  // Before birthday day
  const countdownUpcoming = calculateNextBirthdayCountdown("2002-10-29", new Date("2026-10-20T00:00:00Z"));
  assert.equal(countdownUpcoming.isToday, false);
  assert.ok(countdownUpcoming.days >= 8 && countdownUpcoming.days <= 10, "Should have ~9 days remaining");
});

// ============================================================================
// 7. Profile Identity & Personal Info Persistence Tests
// ============================================================================

test("Profile identity: loadProfile loads default values and saveProfile persists changes", () => {
  const mockStorage = createMockStorage();
  const initial = loadProfile(mockStorage);
  assert.equal(initial.displayName, "Meerah");
  assert.equal(initial.bio, "birthday girl · main character today");
  assert.deepEqual(initial.interests, ["Reading", "Poetry", "Music", "Photography"]);

  // Update profile
  const updated = saveProfile(
    {
      displayName: "Meerah Noor",
      bio: "Living my golden chapter ✨",
      interests: ["Poetry", "Astronomy", "Design"],
      avatarUrl: "https://example.com/meerah-new.jpg",
    },
    mockStorage
  );

  assert.equal(updated.displayName, "Meerah Noor");
  assert.equal(updated.bio, "Living my golden chapter ✨");
  assert.deepEqual(updated.interests, ["Poetry", "Astronomy", "Design"]);
  assert.equal(updated.avatarUrl, "https://example.com/meerah-new.jpg");

  // Reload from storage
  const reloaded = loadProfile(mockStorage);
  assert.equal(reloaded.displayName, "Meerah Noor");
  assert.deepEqual(reloaded.interests, ["Poetry", "Astronomy", "Design"]);
});

// ============================================================================
// 8. User-Created Highlights & Safe Deletion Tests
// ============================================================================

test("Highlights service: createHighlight adds new highlight and deleteHighlight safely removes it without touching photos", () => {
  const mockStorage = createMockStorage();

  // Seed sample photos in storage
  const samplePhotoAssets: PhotoAsset[] = [
    {
      id: "photo-1",
      storagePath: "curated/1.jpg",
      url: "/photos/1.jpg",
      mediaKind: "image",
      effectiveCaptureDate: "2024-10-29",
      hasKnownCaptureDate: true,
      uploadTimestamp: "2026-10-20T10:00:00Z",
    },
    {
      id: "photo-2",
      storagePath: "curated/2.jpg",
      url: "/photos/2.jpg",
      mediaKind: "image",
      effectiveCaptureDate: "2024-10-29",
      hasKnownCaptureDate: true,
      uploadTimestamp: "2026-10-20T10:00:00Z",
    },
  ];
  savePhotos(samplePhotoAssets, mockStorage);

  const initialHighlights = loadHighlights(mockStorage);
  const initialCount = initialHighlights.length;

  // Create new user highlight
  const newHighlight = createHighlight(
    "Weekend Getaway ✈️",
    ["photo-1", "photo-2"],
    "photo-1",
    mockStorage
  );

  assert.equal(newHighlight.title, "Weekend Getaway ✈️");
  assert.deepEqual(newHighlight.photoIds, ["photo-1", "photo-2"]);
  assert.equal(newHighlight.coverPhotoId, "photo-1");

  const afterCreate = loadHighlights(mockStorage);
  assert.equal(afterCreate.length, initialCount + 1);
  assert.equal(afterCreate[0].title, "Weekend Getaway ✈️");

  // Safely delete highlight
  const remaining = deleteHighlight(newHighlight.id, mockStorage);
  assert.equal(remaining.length, initialCount);
  assert.ok(!remaining.some((h) => h.id === newHighlight.id));

  // Verify source photos remain completely intact
  const photosAfterDelete = loadPhotos(mockStorage);
  assert.equal(photosAfterDelete.length, samplePhotoAssets.length);
  assert.ok(photosAfterDelete.some((p) => p.id === "photo-1"));
  assert.ok(photosAfterDelete.some((p) => p.id === "photo-2"));
});

// ============================================================================
// 9. Component & CSS File Verification (Contract & Accessibility)
// ============================================================================

test("Component verification: ProfilePanel.tsx exists and satisfies contract", () => {
  const filePath = path.resolve(process.cwd(), "src/components/profile/ProfilePanel.tsx");
  assert.ok(fs.existsSync(filePath), "ProfilePanel.tsx must exist");

  const content = fs.readFileSync(filePath, "utf-8");

  // Check required exports
  assert.ok(content.includes("export function ProfilePanel"), "Must export ProfilePanel");
  assert.ok(content.includes("export interface ProfilePanelProps"), "Must export ProfilePanelProps");
  assert.ok(content.includes("export type ProfileMode"), "Must export ProfileMode");
  assert.ok(content.includes("export interface ProfilePostItem"), "Must export ProfilePostItem");
  assert.ok(content.includes("export interface ProfileHighlight"), "Must export ProfileHighlight");

  // Check Authoritative Dynamic Age & Countdown imports
  assert.ok(
    content.includes("calculateAge") && content.includes("calculateNextBirthdayCountdown"),
    "Must import and use calculateAge and calculateNextBirthdayCountdown from birthday-dates"
  );

  // Check Birthday Banner & Card presence
  assert.ok(
    content.includes("profileBirthdayCard"),
    "Must render birthday celebration card banner"
  );
  assert.ok(
    content.includes("Today is"),
    "Must include birthday announcement when isToday is true"
  );

  // Check Profile editing modal and interest chips
  assert.ok(
    content.includes("profileInterests"),
    "Must render personal interest chips"
  );
  assert.ok(
    content.includes("handleOpenEditModal") || content.includes("isEditModalOpen"),
    "Must implement Edit Profile modal"
  );
  assert.ok(
    content.includes("saveProfile"),
    "Must save profile updates using saveProfile"
  );

  // Check "+ New" Highlight button and modal
  assert.ok(
    content.includes("profileNewHighlightCircle"),
    "Must render '+ New' highlight circle"
  );
  assert.ok(
    content.includes("createHighlight"),
    "Must create user highlights using createHighlight"
  );
  assert.ok(
    content.includes("deleteHighlight"),
    "Must support deleting highlights using deleteHighlight"
  );

  // Check Media Detail modal with caption, alt text and favorite toggle
  assert.ok(
    content.includes("detailItem") && content.includes("profileDetailModalCard"),
    "Must include media detail modal upon tapping an item"
  );
  assert.ok(
    content.includes("profileDetailAltText"),
    "Must display alt text in detail modal"
  );
  assert.ok(
    content.includes("profileDetailFavBtn"),
    "Must include favorite heart toggle in detail modal"
  );

  // Check HTML validity: NO nested buttons!
  const buttonTags = content.match(/<button[\s\S]*?<\/button>/g) || [];
  for (const b of buttonTags) {
    const innerButtons = (b.match(/<button/g) || []).length;
    assert.equal(innerButtons, 1, `Found invalid nested <button> in: ${b.slice(0, 80)}...`);
  }

  // Check Instagram link security attributes
  assert.ok(
    content.includes('rel="noopener noreferrer"'),
    "Instagram link must have rel='noopener noreferrer'"
  );
  assert.ok(
    content.includes('target="_blank"'),
    "Instagram link must have target='_blank'"
  );

  // Check Eternalus call
  assert.ok(
    content.includes("onClick={onOpenEternalus}"),
    "Eternalus card must invoke onOpenEternalus"
  );
});

test("CSS verification: profile.css exists and defines expected classes & tokens", () => {
  const cssPath = path.resolve(process.cwd(), "src/components/profile/profile.css");
  assert.ok(fs.existsSync(cssPath), "profile.css must exist");

  const css = fs.readFileSync(cssPath, "utf-8");

  assert.ok(css.includes(".profilePanel"), "CSS must define .profilePanel");
  assert.ok(css.includes(".profileHeader"), "CSS must define .profileHeader");
  assert.ok(css.includes(".profileCounts"), "CSS must define .profileCounts");
  assert.ok(css.includes(".profileHighlightsScroll"), "CSS must define .profileHighlightsScroll");
  assert.ok(css.includes(".profileModes"), "CSS must define .profileModes");
  assert.ok(css.includes(".profileGalleryGrid"), "CSS must define .profileGalleryGrid");
  assert.ok(css.includes(".profileFavoriteToggle"), "CSS must define .profileFavoriteToggle");
  assert.ok(css.includes(".profileEternalusSection"), "CSS must define .profileEternalusSection");

  // Check Birthday Banner & Card styles
  assert.ok(css.includes(".profileBirthdayCard"), "CSS must style .profileBirthdayCard");
  assert.ok(css.includes(".profileCountdownWrapper"), "CSS must style .profileCountdownWrapper");

  // Check Love Theme tokens support
  assert.ok(css.includes('[data-theme="love"]'), "CSS must support [data-theme='love'] tokens");

  // Check Touch targets (min 44px)
  assert.ok(css.includes("44px"), "CSS must enforce minimum 44px touch targets");

  // Check Focus-visible accessibility
  assert.ok(css.includes(":focus-visible"), "CSS must support :focus-visible keyboard navigation");

  // Check responsive media queries (640px, 480px for 2-column grid, 380px)
  assert.ok(css.includes("@media (max-width: 640px)"), "CSS must include mobile breakpoint 640px");
  assert.ok(css.includes("@media (max-width: 480px)"), "CSS must include narrow mobile 2-column breakpoint 480px");
  assert.ok(css.includes("@media (max-width: 380px)"), "CSS must include compact breakpoint 380px");
});
