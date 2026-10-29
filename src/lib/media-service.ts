import type {
  PhotoAsset,
  ProfileData,
  HighlightCollection,
  AlbumCollection,
  StoryItem,
} from "../types/media-contracts.ts";

export const STORAGE_KEYS = {
  PROFILE: "meerah_birthday_profile_v1",
  PHOTOS: "meerah_birthday_photos_v1",
  FAVORITES: "birthday_favorites",
  HIGHLIGHTS: "meerah_birthday_highlights_v1",
  ALBUMS: "meerah_birthday_albums_v1",
  STORIES: "meerah_birthday_stories_v1",
} as const;

export const DEFAULT_PROFILE: ProfileData = {
  id: "profile-meerah",
  displayName: "Meerah",
  bio: "birthday girl · main character today",
  birthDate: "2002-10-29",
  interests: ["Reading", "Poetry", "Music", "Photography"],
  canEdit: true,
  externalInstagramUrl: null,
};

export const INITIAL_PRELOADED_PHOTOS: PhotoAsset[] = [
  {
    id: "photo-mem-1",
    storagePath: "curated/polaroid-1.jpg",
    url: "/images/sample-meerah-1.jpg",
    mediaKind: "image",
    effectiveCaptureDate: "2024-10-29",
    hasKnownCaptureDate: true,
    uploadTimestamp: "2026-10-20T10:00:00Z",
    caption: "Birthday smiles and laughter ✿",
    altText: "Meerah smiling on her birthday celebration",
  },
  {
    id: "photo-mem-2",
    storagePath: "curated/polaroid-2.jpg",
    url: "/images/sample-meerah-2.jpg",
    mediaKind: "image",
    effectiveCaptureDate: "2023-10-29",
    hasKnownCaptureDate: true,
    uploadTimestamp: "2026-10-20T10:05:00Z",
    caption: "Golden hour sunset memory ✨",
    altText: "Golden hour glow during an evening stroll",
  },
  {
    id: "photo-mem-3",
    storagePath: "curated/polaroid-3.jpg",
    url: "/images/sample-meerah-3.jpg",
    mediaKind: "image",
    effectiveCaptureDate: "2025-05-14",
    hasKnownCaptureDate: true,
    uploadTimestamp: "2026-10-20T10:10:00Z",
    caption: "Spring blossom afternoon ♡",
    altText: "Spring afternoon in the park",
  },
  {
    id: "photo-mem-4",
    storagePath: "curated/polaroid-4.jpg",
    url: "/images/sample-meerah-4.jpg",
    mediaKind: "image",
    effectiveCaptureDate: "2022-10-29",
    hasKnownCaptureDate: true,
    uploadTimestamp: "2026-10-20T10:15:00Z",
    caption: "Four years of beautiful moments 🎂",
    altText: "Four years celebration memories",
  },
];

export const INITIAL_PRELOADED_HIGHLIGHTS: HighlightCollection[] = [
  {
    id: "hl-memories",
    title: "Memories ✿",
    photoIds: ["photo-mem-1", "photo-mem-2"],
    createdAt: "2026-10-20T10:00:00Z",
    updatedAt: "2026-10-20T10:00:00Z",
  },
  {
    id: "hl-golden",
    title: "Golden Days ✨",
    photoIds: ["photo-mem-2"],
    createdAt: "2026-10-20T10:00:00Z",
    updatedAt: "2026-10-20T10:00:00Z",
  },
  {
    id: "hl-laughter",
    title: "Laughter ♡",
    photoIds: ["photo-mem-1", "photo-mem-3"],
    createdAt: "2026-10-20T10:00:00Z",
    updatedAt: "2026-10-20T10:00:00Z",
  },
  {
    id: "hl-wishes",
    title: "Wishes 🎂",
    photoIds: ["photo-mem-4"],
    createdAt: "2026-10-20T10:00:00Z",
    updatedAt: "2026-10-20T10:00:00Z",
  },
];

export const INITIAL_PRELOADED_ALBUMS: AlbumCollection[] = [
  {
    id: "album-birthday",
    title: "Birthday Celebrations",
    description: "Joyous birthday memories across the years",
    photoIds: ["photo-mem-1", "photo-mem-4"],
    createdAt: "2026-10-20T10:00:00Z",
    updatedAt: "2026-10-20T10:00:00Z",
  },
  {
    id: "album-golden",
    title: "Golden Moments",
    description: "Sunlit afternoons and quiet smiles",
    photoIds: ["photo-mem-2", "photo-mem-3"],
    createdAt: "2026-10-20T10:00:00Z",
    updatedAt: "2026-10-20T10:00:00Z",
  },
];

export const INITIAL_PRELOADED_STORIES: StoryItem[] = [
  {
    id: "story-birthday-reel",
    title: "A Day to Celebrate Meerah",
    photoIds: ["photo-mem-1", "photo-mem-2", "photo-mem-3"],
    photos: INITIAL_PRELOADED_PHOTOS.slice(0, 3),
    musicTrackId: "track-1",
    musicTrack: {
      id: "track-1",
      title: "Afreen Afreen",
      artist: "Rahat Fateh Ali Khan & Momina Mustehsan",
      audioUrl: "https://cdn.example.com/audio/afreen.mp3",
      duration: 382,
    },
    createdAt: "2026-10-20T10:00:00Z",
    updatedAt: "2026-10-20T10:00:00Z",
  },
];

function getSafeStorage(customStorage?: Storage): Storage | null {
  if (customStorage) return customStorage;
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

// ---------------- PROFILE SERVICES ----------------

export function loadProfile(storage?: Storage): ProfileData {
  const s = getSafeStorage(storage);
  if (!s) return { ...DEFAULT_PROFILE };
  try {
    const raw = s.getItem(STORAGE_KEYS.PROFILE);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(updates: Partial<ProfileData>, storage?: Storage): ProfileData {
  const current = loadProfile(storage);
  const updated: ProfileData = {
    ...current,
    ...updates,
  };
  const s = getSafeStorage(storage);
  if (s) {
    try {
      s.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
    } catch {
      // storage quota or error
    }
  }
  return updated;
}

// ---------------- PHOTO SERVICES ----------------

export function loadPhotos(storage?: Storage): PhotoAsset[] {
  const s = getSafeStorage(storage);
  if (!s) return [...INITIAL_PRELOADED_PHOTOS];
  try {
    const raw = s.getItem(STORAGE_KEYS.PHOTOS);
    if (!raw) {
      s.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(INITIAL_PRELOADED_PHOTOS));
      return [...INITIAL_PRELOADED_PHOTOS];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...INITIAL_PRELOADED_PHOTOS];
  } catch {
    return [...INITIAL_PRELOADED_PHOTOS];
  }
}

export function savePhotos(photos: PhotoAsset[], storage?: Storage): boolean {
  const s = getSafeStorage(storage);
  if (!s) return false;
  try {
    s.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(photos));
    return true;
  } catch {
    return false;
  }
}

export function addPhotoAsset(photo: PhotoAsset, storage?: Storage): PhotoAsset[] {
  const photos = loadPhotos(storage);
  const updated = [photo, ...photos.filter((p) => p.id !== photo.id)];
  savePhotos(updated, storage);
  return updated;
}

/**
 * Deletes a photo asset and cleans up references across:
 * - Favorites
 * - Highlights
 * - Albums
 * - Stories
 */
export function deletePhotoAsset(photoId: string, storage?: Storage): {
  photos: PhotoAsset[];
  favorites: string[];
  highlights: HighlightCollection[];
  albums: AlbumCollection[];
  stories: StoryItem[];
} {
  const photos = loadPhotos(storage).filter((p) => p.id !== photoId);
  savePhotos(photos, storage);

  const favorites = loadFavorites(storage).filter((id) => id !== photoId);
  saveFavorites(favorites, storage);

  const highlights = loadHighlights(storage).map((hl) => ({
    ...hl,
    photoIds: hl.photoIds.filter((id) => id !== photoId),
    coverPhotoId: hl.coverPhotoId === photoId ? undefined : hl.coverPhotoId,
  }));
  saveHighlights(highlights, storage);

  const albums = loadAlbums(storage).map((alb) => ({
    ...alb,
    photoIds: alb.photoIds.filter((id) => id !== photoId),
    coverPhotoId: alb.coverPhotoId === photoId ? undefined : alb.coverPhotoId,
  }));
  saveAlbums(albums, storage);

  const stories = loadStories(storage).map((st) => ({
    ...st,
    photoIds: st.photoIds.filter((id) => id !== photoId),
    photos: (st.photos || []).filter((p) => p.id !== photoId),
  }));
  saveStories(stories, storage);

  return { photos, favorites, highlights, albums, stories };
}

// ---------------- FAVORITES SERVICES ----------------

export function loadFavorites(storage?: Storage): string[] {
  const s = getSafeStorage(storage);
  if (!s) return ["photo-mem-1", "photo-mem-2"];
  try {
    const raw = s.getItem(STORAGE_KEYS.FAVORITES);
    if (!raw) return ["photo-mem-1", "photo-mem-2"];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFavorites(favorites: string[], storage?: Storage): boolean {
  const s = getSafeStorage(storage);
  if (!s) return false;
  try {
    s.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    return true;
  } catch {
    return false;
  }
}

export function toggleFavorite(photoId: string, storage?: Storage): string[] {
  const current = loadFavorites(storage);
  const updated = current.includes(photoId)
    ? current.filter((id) => id !== photoId)
    : [...current, photoId];
  saveFavorites(updated, storage);
  return updated;
}

// ---------------- HIGHLIGHTS SERVICES ----------------

export function loadHighlights(storage?: Storage): HighlightCollection[] {
  const s = getSafeStorage(storage);
  if (!s) return [...INITIAL_PRELOADED_HIGHLIGHTS];
  try {
    const raw = s.getItem(STORAGE_KEYS.HIGHLIGHTS);
    if (!raw) {
      s.setItem(STORAGE_KEYS.HIGHLIGHTS, JSON.stringify(INITIAL_PRELOADED_HIGHLIGHTS));
      return [...INITIAL_PRELOADED_HIGHLIGHTS];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...INITIAL_PRELOADED_HIGHLIGHTS];
  } catch {
    return [...INITIAL_PRELOADED_HIGHLIGHTS];
  }
}

export function saveHighlights(highlights: HighlightCollection[], storage?: Storage): boolean {
  const s = getSafeStorage(storage);
  if (!s) return false;
  try {
    s.setItem(STORAGE_KEYS.HIGHLIGHTS, JSON.stringify(highlights));
    return true;
  } catch {
    return false;
  }
}

export function createHighlight(
  title: string,
  photoIds: string[],
  coverPhotoId?: string,
  storage?: Storage
): HighlightCollection {
  const highlights = loadHighlights(storage);
  const now = new Date().toISOString();
  const newHighlight: HighlightCollection = {
    id: `hl-${Date.now()}`,
    title: title.trim() || "Highlight",
    photoIds,
    coverPhotoId: coverPhotoId || photoIds[0],
    createdAt: now,
    updatedAt: now,
  };
  saveHighlights([newHighlight, ...highlights], storage);
  return newHighlight;
}

export function deleteHighlight(id: string, storage?: Storage): HighlightCollection[] {
  // Safe deletion: Original photos remain completely untouched
  const highlights = loadHighlights(storage).filter((h) => h.id !== id);
  saveHighlights(highlights, storage);
  return highlights;
}

// ---------------- ALBUMS SERVICES ----------------

export function loadAlbums(storage?: Storage): AlbumCollection[] {
  const s = getSafeStorage(storage);
  if (!s) return [...INITIAL_PRELOADED_ALBUMS];
  try {
    const raw = s.getItem(STORAGE_KEYS.ALBUMS);
    if (!raw) {
      s.setItem(STORAGE_KEYS.ALBUMS, JSON.stringify(INITIAL_PRELOADED_ALBUMS));
      return [...INITIAL_PRELOADED_ALBUMS];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...INITIAL_PRELOADED_ALBUMS];
  } catch {
    return [...INITIAL_PRELOADED_ALBUMS];
  }
}

export function saveAlbums(albums: AlbumCollection[], storage?: Storage): boolean {
  const s = getSafeStorage(storage);
  if (!s) return false;
  try {
    s.setItem(STORAGE_KEYS.ALBUMS, JSON.stringify(albums));
    return true;
  } catch {
    return false;
  }
}

export function createAlbum(
  title: string,
  description: string = "",
  photoIds: string[] = [],
  storage?: Storage
): AlbumCollection {
  const albums = loadAlbums(storage);
  const now = new Date().toISOString();
  const newAlbum: AlbumCollection = {
    id: `album-${Date.now()}`,
    title: title.trim() || "New Album",
    description,
    photoIds,
    coverPhotoId: photoIds[0],
    createdAt: now,
    updatedAt: now,
  };
  saveAlbums([newAlbum, ...albums], storage);
  return newAlbum;
}

export function deleteAlbum(id: string, storage?: Storage): AlbumCollection[] {
  // Safe deletion: Original photos remain untouched
  const albums = loadAlbums(storage).filter((a) => a.id !== id);
  saveAlbums(albums, storage);
  return albums;
}

// ---------------- STORIES SERVICES ----------------

export function loadStories(storage?: Storage): StoryItem[] {
  const s = getSafeStorage(storage);
  if (!s) return [...INITIAL_PRELOADED_STORIES];
  try {
    const raw = s.getItem(STORAGE_KEYS.STORIES);
    if (!raw) {
      s.setItem(STORAGE_KEYS.STORIES, JSON.stringify(INITIAL_PRELOADED_STORIES));
      return [...INITIAL_PRELOADED_STORIES];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...INITIAL_PRELOADED_STORIES];
  } catch {
    return [...INITIAL_PRELOADED_STORIES];
  }
}

export function saveStories(stories: StoryItem[], storage?: Storage): boolean {
  const s = getSafeStorage(storage);
  if (!s) return false;
  try {
    s.setItem(STORAGE_KEYS.STORIES, JSON.stringify(stories));
    return true;
  } catch {
    return false;
  }
}

export function createStory(
  title: string,
  photoIds: string[],
  photos: PhotoAsset[],
  musicTrack?: StoryItem["musicTrack"],
  storage?: Storage
): StoryItem {
  const stories = loadStories(storage);
  const now = new Date().toISOString();
  const newStory: StoryItem = {
    id: `story-${Date.now()}`,
    title: title.trim() || "New Story",
    photoIds,
    photos,
    musicTrackId: musicTrack?.id,
    musicTrack,
    createdAt: now,
    updatedAt: now,
  };
  saveStories([newStory, ...stories], storage);
  return newStory;
}

export function deleteStory(id: string, storage?: Storage): StoryItem[] {
  // Safe deletion: Original photos and audio files remain intact
  const stories = loadStories(storage).filter((st) => st.id !== id);
  saveStories(stories, storage);
  return stories;
}

/**
 * Removes a photo reference from a collection without deleting the underlying asset.
 */
export function removePhotoFromCollection(
  type: "highlight" | "album" | "story",
  collectionId: string,
  photoId: string,
  storage?: Storage
): boolean {
  if (type === "highlight") {
    const highlights = loadHighlights(storage);
    const updated = highlights.map((h) => {
      if (h.id === collectionId) {
        return {
          ...h,
          photoIds: h.photoIds.filter((id) => id !== photoId),
          coverPhotoId: h.coverPhotoId === photoId ? undefined : h.coverPhotoId,
          updatedAt: new Date().toISOString(),
        };
      }
      return h;
    });
    return saveHighlights(updated, storage);
  }

  if (type === "album") {
    const albums = loadAlbums(storage);
    const updated = albums.map((a) => {
      if (a.id === collectionId) {
        return {
          ...a,
          photoIds: a.photoIds.filter((id) => id !== photoId),
          coverPhotoId: a.coverPhotoId === photoId ? undefined : a.coverPhotoId,
          updatedAt: new Date().toISOString(),
        };
      }
      return a;
    });
    return saveAlbums(updated, storage);
  }

  if (type === "story") {
    const stories = loadStories(storage);
    const updated = stories.map((s) => {
      if (s.id === collectionId) {
        return {
          ...s,
          photoIds: s.photoIds.filter((id) => id !== photoId),
          photos: (s.photos || []).filter((p) => p.id !== photoId),
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });
    return saveStories(updated, storage);
  }

  return false;
}

