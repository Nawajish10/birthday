/**
 * Media and Profile Shared Domain Contracts
 * Single source of truth for Profile, Memories, Photos, Collections, Highlights, and Stories.
 */

export type MediaKind = "image" | "video";

export type PhotoAssetStatus = "ready" | "processing" | "failed";

export interface PhotoAsset {
  id: string;
  storagePath?: string;
  url: string;
  originalUrl?: string;
  thumbnailPath?: string;
  thumbnailUrl?: string;
  fullDisplayUrl?: string;
  mediaKind: MediaKind;
  effectiveCaptureDate: string; // ISO date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)
  hasKnownCaptureDate: boolean;
  uploadTimestamp: string;     // ISO timestamp
  width?: number;
  height?: number;
  caption?: string;
  altText?: string;
  ownerVisitorId?: string;
  isPrivate?: boolean;
  contentHash?: string;
  metadata?: Record<string, unknown>;
  status?: PhotoAssetStatus;
}

export interface ProfileData {
  id: string;
  displayName: string;
  bio: string;
  birthDate: string; // YYYY-MM-DD
  avatarUrl?: string;
  avatarPath?: string;
  interests: string[];
  canEdit: boolean;
  externalInstagramUrl?: string | null;
}

export interface ProfilePost {
  id: string;
  photoId: string;
  photo: PhotoAsset;
  caption: string;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
}

export interface FavoriteItem {
  id: string;
  photoId: string;
  photo: PhotoAsset;
  addedAt: string;
}

export interface HighlightCollection {
  id: string;
  title: string;
  coverPhotoId?: string;
  coverPhotoUrl?: string;
  photoIds: string[];
  photos?: PhotoAsset[];
  createdAt: string;
  updatedAt: string;
}

export interface AlbumCollection {
  id: string;
  title: string;
  description?: string;
  coverPhotoId?: string;
  coverPhotoUrl?: string;
  photoIds: string[];
  photos?: PhotoAsset[];
  createdAt: string;
  updatedAt: string;
}

export interface StoryAudioTrack {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  duration?: number;
}

export interface StoryItem {
  id: string;
  title: string;
  photoIds: string[];
  photos: PhotoAsset[];
  musicTrackId?: string;
  musicTrack?: StoryAudioTrack;
  createdAt: string;
  updatedAt: string;
}

export interface BirthdayCountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isToday: boolean;
  nextBirthday: Date;
}
