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

export interface ProfilePostItem {
  id: string;
  url: string;
  fullDisplayUrl?: string;
  thumbnailUrl?: string;
  thumbnail_url?: string;
  thumbnailPath?: string;
  media_path?: string;
  media_kind: MediaKind;
  caption?: string;
  alt_text?: string;
  sort_order?: number;
  is_published?: boolean;
  effectiveCaptureDate?: string;
  hasKnownCaptureDate?: boolean;
  created_at?: string;
}

export function photoAssetToProfilePostItem(photo: PhotoAsset): ProfilePostItem {
  const thumb = photo.thumbnailUrl || photo.thumbnailPath || photo.url;
  return {
    id: photo.id,
    url: photo.url,
    fullDisplayUrl: photo.fullDisplayUrl || photo.url,
    thumbnailUrl: thumb,
    thumbnail_url: thumb,
    thumbnailPath: photo.thumbnailPath,
    media_path: photo.storagePath,
    media_kind: photo.mediaKind,
    caption: photo.caption,
    alt_text: photo.altText,
    effectiveCaptureDate: photo.effectiveCaptureDate,
    hasKnownCaptureDate: photo.hasKnownCaptureDate,
    created_at: photo.uploadTimestamp,
  };
}

export function profilePostItemToPhotoAsset(item: ProfilePostItem): PhotoAsset {
  return {
    id: item.id,
    storagePath: item.media_path || `photos/${item.id}.jpg`,
    url: item.url,
    fullDisplayUrl: item.fullDisplayUrl || item.url,
    thumbnailUrl: item.thumbnailUrl || item.thumbnail_url || item.url,
    thumbnailPath: item.thumbnailPath,
    mediaKind: item.media_kind,
    effectiveCaptureDate: item.effectiveCaptureDate || new Date().toISOString(),
    hasKnownCaptureDate: item.hasKnownCaptureDate ?? false,
    uploadTimestamp: item.created_at || new Date().toISOString(),
    caption: item.caption,
    altText: item.alt_text,
  };
}

export interface BirthdayCountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isToday: boolean;
  nextBirthday: Date;
}
