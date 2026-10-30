"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  calculateAge,
  calculateNextBirthdayCountdown,
  formatEffectiveDate,
  AUTHORITATIVE_BIRTH_DATE,
} from "../../lib/birthday-dates.ts";
import {
  loadProfile,
  saveProfile,
  loadHighlights,
  createHighlight,
  deleteHighlight,
  loadPhotos,
  toCompactDerivativeUrl,
  photoAssetToProfilePostItem,
  GOOGLE_PHOTOS_DATA,
} from "../../lib/media-service.ts";
import type { BirthdayCountdownResult, ProfileData, HighlightCollection, PhotoAsset } from "../../types/media-contracts.ts";
import "./profile.css";

export { toCompactDerivativeUrl, photoAssetToProfilePostItem };

export type ProfileMode = "posts" | "reels" | "favorites";

export interface ProfilePostItem {
  id: string;
  url: string;
  fullDisplayUrl?: string;
  thumbnailUrl?: string;
  thumbnail_url?: string;
  thumbnailPath?: string;
  media_path?: string;
  media_kind: "image" | "video";
  caption?: string;
  alt_text?: string;
  sort_order?: number;
  is_published?: boolean;
  effectiveCaptureDate?: string;
  hasKnownCaptureDate?: boolean;
}

export interface ProfileHighlight {
  id: string;
  title: string;
  coverUrl?: string;
  photoIds?: string[];
}

export interface ProfilePanelProps {
  posts?: ProfilePostItem[];
  photos?: PhotoAsset[];
  loading?: boolean;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onSelectMedia?: (item: { url: string; caption: string; kind?: "image" | "video" }) => void;
  onOpenEternalus?: () => void;
  instagramUrl?: string;
  externalInstagramUrl?: string | null;
  recipientName?: string;
  bio?: string;
  highlights?: ProfileHighlight[];
  profileMode?: ProfileMode;
  onModeChange?: (mode: ProfileMode) => void;
  externalAudioRef?: React.RefObject<HTMLAudioElement | null>;
  onPauseBackgroundMusic?: () => void;
  onResumeBackgroundMusic?: () => void;
}

/**
 * Filter profile media based on the active tab mode.
 * - "posts": all items where media_kind !== "video"
 * - "reels": all items where media_kind === "video" (kept for contract compatibility)
 * - "favorites": all items whose id is in favorites
 */
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

/**
 * Helper to get user-friendly empty state guidance for each mode.
 */
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

/**
 * Validate and sanitize external URL (e.g. Instagram link).
 * Prevents javascript: or data: injection.
 */
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

/**
 * Default story highlights shown when none are provided.
 * Circular Highlights with valid cover photos: New, Memories, Golden Days, Travel, Friends
 */
export const DEFAULT_HIGHLIGHTS: ProfileHighlight[] = [
  {
    id: "hl-memories",
    title: "Memories",
    coverUrl: GOOGLE_PHOTOS_DATA[0]?.thumbnailUrl || "https://lh3.googleusercontent.com/pw/AP1GczMLasTHYPPFuDPfLPRSnH5tQ6mhgV3XNu-V5SBjy_maHYwLX5_Ej716nIoS7pipr9aPZrJObZTzo-QGHxKckSqpY6EtdiRb_qnVCyjw_1dU1tYIk3iF=w400-h400-c",
    photoIds: ["gphoto_special_birthday_popup", "gphoto_fa949a46b9e9de99"],
  },
  {
    id: "hl-golden",
    title: "Golden Days",
    coverUrl: GOOGLE_PHOTOS_DATA[1]?.thumbnailUrl || "https://lh3.googleusercontent.com/pw/AP1GczNFONb5xMBungxJ7eEXpNMyXugzGXTPVLtKKtiBW8Xrf_OcA0cwVcB_YXVToDju4_vShkBN7JFylGXKmal1c0ti2_XyImh7nxJ7n7pMWahXYlG9EpxL=w400-h400-c",
    photoIds: ["gphoto_fa949a46b9e9de99", "gphoto_583f8fdba0608ec6"],
  },
  {
    id: "hl-travel",
    title: "Travel",
    coverUrl: GOOGLE_PHOTOS_DATA[2]?.thumbnailUrl || "https://lh3.googleusercontent.com/pw/AP1GczOt4ewD10S3LbFEUoJvNw_Am1b-BIsOdz6rwdR2IUbdRgxOhVZ4ZS7JxgZ1GkkgKAHr5BhKoA1j5usMNIkaReM2QS2h0QUDFWp8HvZxzQcRwGV9WOf2=w400-h400-c",
    photoIds: ["gphoto_583f8fdba0608ec6", "gphoto_f5c4be70912173ab"],
  },
  {
    id: "hl-friends",
    title: "Friends",
    coverUrl: GOOGLE_PHOTOS_DATA[3]?.thumbnailUrl || "https://lh3.googleusercontent.com/pw/AP1GczMYXe3__ks42H0s_alGL517E9hYquUtEkgYjKOUBN-KlFbtqJ8LiR-vHhpFNsIcDTXEtjmF6rTMWmzfLdY7dMCkdojfpZEcVbU83CuZO6_8gre1mSSQ=w400-h400-c",
    photoIds: ["gphoto_f5c4be70912173ab", "gphoto_f2670d3d7c539e77"],
  },
  {
    id: "hl-forever",
    title: "Eternal",
    coverUrl: GOOGLE_PHOTOS_DATA[4]?.thumbnailUrl || "https://lh3.googleusercontent.com/pw/AP1GczMF3Mked9DD8umt-lTuNsIG2HkSqTrvwX3_USWdGW3F89xUHOMhkKL_1JtCX2c5LXFKWKBxBn2KIl9GIoYYeGXBnsd4Q-eHOufH77HnhyBteGPlsvI2=w400-h400-c",
    photoIds: ["gphoto_f2670d3d7c539e77", "gphoto_97ed0cf0ca9f4fc3"],
  },
];

/**
 * Resolve highlight circles, gracefully falling back to defaults if empty or omitted.
 */
export function resolveHighlights(highlights?: ProfileHighlight[]): ProfileHighlight[] {
  if (highlights && highlights.length > 0) {
    return highlights;
  }
  return DEFAULT_HIGHLIGHTS;
}

/**
 * Helper to resolve appropriate glyph for default highlights.
 */
export function getHighlightGlyph(id: string, title: string): string {
  const t = (title || "").toLowerCase();
  if (t.includes("memory") || t.includes("memories")) return "✿";
  if (t.includes("gold") || t.includes("shine") || t.includes("star")) return "✨";
  if (t.includes("travel") || t.includes("trip") || t.includes("journey") || t.includes("tour")) return "✈️";
  if (t.includes("friend") || t.includes("laugh") || t.includes("smile") || t.includes("love") || t.includes("heart")) return "♡";
  if (t.includes("wish") || t.includes("cake") || t.includes("celebrat") || t.includes("birthday")) return "🎂";
  if (t.includes("eternal") || t.includes("forever") || t.includes("chapter") || t.includes("vault")) return "🕊️";
  if (t.includes("song") || t.includes("music")) return "♪";
  return "❀";
}

/**
 * Helper to safely toggle a favorite ID.
 */
export function toggleFavoriteId(current: string[], id: string): string[] {
  if (!Array.isArray(current)) return [id];
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
}

export const FAVORITES_STORAGE_KEY = "birthday_favorites";
export const FAVORITES_STORAGE_ALT_KEY = "birthday-favorites";

export function loadFavoritesFromStorage(storage?: Storage): string[] {
  try {
    const s = storage || (typeof window !== "undefined" ? window.localStorage : undefined);
    if (!s) return [];
    const raw = s.getItem(FAVORITES_STORAGE_KEY) || s.getItem(FAVORITES_STORAGE_ALT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function saveFavoritesToStorage(nextFavorites: string[], storage?: Storage): boolean {
  try {
    const s = storage || (typeof window !== "undefined" ? window.localStorage : undefined);
    if (!s) return false;
    const serialized = JSON.stringify(nextFavorites);
    s.setItem(FAVORITES_STORAGE_KEY, serialized);
    s.setItem(FAVORITES_STORAGE_ALT_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}

export function ProfilePanel({
  posts,
  photos,
  loading,
  isLoading,
  error,
  onRetry,
  favorites = [],
  onToggleFavorite,
  onSelectMedia,
  onOpenEternalus,
  instagramUrl,
  externalInstagramUrl,
  recipientName = "Meerah",
  bio = "birthday girl • dreamer • learner • creator",
  highlights: propHighlights,
  profileMode,
  onModeChange,
  externalAudioRef,
  onPauseBackgroundMusic,
  onResumeBackgroundMusic,
}: ProfilePanelProps) {
  // Primary photo tabs: "posts" | "favorites"
  const [internalMode, setInternalMode] = useState<ProfileMode>("posts");
  // Default to posts if an external reels mode was passed
  const effectivePropMode = profileMode === "reels" ? "posts" : profileMode;
  const mode = effectivePropMode ?? internalMode;

  const wasPlayingBeforeDetailVideoRef = useRef(false);

  const handleModeChange = (newMode: ProfileMode) => {
    // Only switch to valid tabs: posts or favorites
    const targetMode = newMode === "reels" ? "posts" : newMode;
    setInternalMode(targetMode);
    if (onModeChange) {
      onModeChange(targetMode);
    }
  };

  const isActuallyLoading = loading ?? isLoading ?? false;

  // Authoritative shared photo integration: resolve posts prop, photos prop, or loadPhotos()
  // Enforces that Main Gallery strictly displays photos classified for Main Gallery
  const effectivePosts: ProfilePostItem[] = useMemo(() => {
    const assetList = photos && photos.length > 0 ? photos : loadPhotos();
    const mainAssets = assetList.filter(
      (photo) => (photo.galleryCategory === "main" || (!photo.galleryCategory && !photo.isPrivate)) && !photo.isPrivate
    );
    const photoPosts = mainAssets.map((photo) => photoAssetToProfilePostItem(photo));

    if (!posts || posts.length === 0) {
      return photoPosts;
    }

    const formattedPosts = posts
      .filter((p) => (p.galleryCategory === "main" || (!p.galleryCategory && !(p as any).is_private)) && !(p as any).is_private)
      .map((p) => ({
        ...p,
        fullDisplayUrl: p.fullDisplayUrl || p.url,
        thumbnailUrl: p.thumbnailUrl || p.thumbnail_url || p.thumbnailPath || p.url,
        galleryCategory: p.galleryCategory || "main",
      }));

    // Merge: include formattedPosts, and seamlessly merge photoPosts so all 145 Google Photos remain visible
    const seenIds = new Set(formattedPosts.map((p) => p.id));
    const seenUrls = new Set(formattedPosts.map((p) => p.url));

    const merged: ProfilePostItem[] = [...formattedPosts];
    for (const item of photoPosts) {
      if (!seenIds.has(item.id) && !seenUrls.has(item.url)) {
        seenIds.add(item.id);
        seenUrls.add(item.url);
        merged.push(item);
      }
    }
    return merged.filter((item) => (item.galleryCategory === "main" || (!item.galleryCategory && !(item as any).is_private)) && !(item as any).is_private);
  }, [posts, photos]);

  // 1. Profile State & Persistence (authoritative birth date: 30 October 2001)
  const [profile, setProfile] = useState<ProfileData>(() => {
    const saved = loadProfile();
    return {
      ...saved,
      displayName: "Meerah",
      bio: saved.bio && saved.bio !== "birthday girl · main character today"
        ? saved.bio
        : "birthday girl • dreamer • learner • creator",
      interests: saved.interests && saved.interests.length > 0
        ? saved.interests
        : ["Reading", "Poetry", "Music", "Photography", "Cooking", "Gardening"],
      birthDate: saved.birthDate && saved.birthDate !== "2002-10-28" && saved.birthDate !== "2002-10-29"
        ? saved.birthDate
        : AUTHORITATIVE_BIRTH_DATE,
    };
  });

  // 2. Authoritative Dynamic Age & Countdown (30 October 2001)
  const birthDateStr = profile.birthDate || AUTHORITATIVE_BIRTH_DATE;
  const [countdown, setCountdown] = useState<BirthdayCountdownResult>(() =>
    calculateNextBirthdayCountdown(birthDateStr)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(calculateNextBirthdayCountdown(birthDateStr));
    }, 1000);
    return () => clearInterval(timer);
  }, [birthDateStr]);

  const currentAge = useMemo(() => calculateAge(birthDateStr), [birthDateStr]);

  // 3. User-Created Highlights State
  const [highlightsList, setHighlightsList] = useState<HighlightCollection[]>(() => {
    return loadHighlights();
  });

  // Effective highlights for display with valid cover images
  const effectiveHighlights: ProfileHighlight[] = useMemo(() => {
    if (highlightsList && highlightsList.length > 0) {
      return highlightsList.map((hl, index) => {
        const coverPhoto = hl.coverPhotoId ? effectivePosts.find((p) => p.id === hl.coverPhotoId) : undefined;
        const fallbackCover = GOOGLE_PHOTOS_DATA[index % GOOGLE_PHOTOS_DATA.length]?.thumbnailUrl;
        return {
          id: hl.id,
          title: hl.title,
          coverUrl: hl.coverPhotoUrl || coverPhoto?.thumbnailUrl || coverPhoto?.url || fallbackCover,
          photoIds: hl.photoIds,
        };
      });
    }
    return resolveHighlights(propHighlights);
  }, [highlightsList, propHighlights, effectivePosts]);

  // 4. Modal States & Lightbox Viewer
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateHighlightOpen, setIsCreateHighlightOpen] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState<ProfileHighlight | null>(null);
  const [detailItem, setDetailItem] = useState<ProfilePostItem | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);

  // Audio coordination: if detail item is a video, pause background music and resume on close
  useEffect(() => {
    if (detailItem?.media_kind === "video") {
      if (onPauseBackgroundMusic) {
        onPauseBackgroundMusic();
      } else if (externalAudioRef?.current && !externalAudioRef.current.paused) {
        wasPlayingBeforeDetailVideoRef.current = true;
        externalAudioRef.current.pause();
      }
    } else {
      if (onResumeBackgroundMusic) {
        onResumeBackgroundMusic();
      } else if (externalAudioRef?.current && wasPlayingBeforeDetailVideoRef.current) {
        wasPlayingBeforeDetailVideoRef.current = false;
        externalAudioRef.current.play().catch(() => {});
      }
    }
  }, [detailItem, onPauseBackgroundMusic, onResumeBackgroundMusic, externalAudioRef]);

  // Edit Profile Form State
  const [editName, setEditName] = useState(profile.displayName);
  const [editBio, setEditBio] = useState(profile.bio);
  const [editAvatarUrl, setEditAvatarUrl] = useState(profile.avatarUrl || "");
  const [editBirthDate, setEditBirthDate] = useState(profile.birthDate || AUTHORITATIVE_BIRTH_DATE);
  const [editInterests, setEditInterests] = useState<string[]>(profile.interests || []);
  const [newInterestTag, setNewInterestTag] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const headerFileInputRef = useRef<HTMLInputElement | null>(null);

  // Create Highlight Form State
  const [newHighlightTitle, setNewHighlightTitle] = useState("");
  const [selectedHighlightPhotoIds, setSelectedHighlightPhotoIds] = useState<string[]>([]);
  const [selectedCoverPhotoId, setSelectedCoverPhotoId] = useState<string>("");

  // Pool of all photos for highlight creation
  const availablePhotosForHighlight = useMemo(() => {
    return effectivePosts;
  }, [effectivePosts]);

  // Instagram sanitization
  const rawIgUrl = instagramUrl || externalInstagramUrl || profile.externalInstagramUrl || undefined;
  const safeInstagram = useMemo(() => sanitizeExternalUrl(rawIgUrl), [rawIgUrl]);

  // Filtered media for the active tab (posts or favorites)
  const visiblePosts = useMemo(
    () => filterProfileMedia(effectivePosts, mode, favorites),
    [effectivePosts, mode, favorites]
  );

  const postsCount = useMemo(
    () => effectivePosts.filter((p) => p.media_kind !== "video").length,
    [effectivePosts]
  );

  // Active Lightbox Item resolution
  const activeMediaItem = useMemo(() => {
    if (lightboxIndex !== null && visiblePosts[lightboxIndex]) {
      return visiblePosts[lightboxIndex];
    }
    return detailItem;
  }, [lightboxIndex, visiblePosts, detailItem]);

  const handleNextMedia = useCallback(() => {
    if (visiblePosts.length === 0) return;
    setLightboxIndex((prev) => {
      const cur = prev !== null ? prev : (detailItem ? visiblePosts.findIndex((p) => p.id === detailItem.id) : 0);
      const next = (cur + 1) % visiblePosts.length;
      setDetailItem(visiblePosts[next]);
      return next;
    });
  }, [visiblePosts, detailItem]);

  const handlePrevMedia = useCallback(() => {
    if (visiblePosts.length === 0) return;
    setLightboxIndex((prev) => {
      const cur = prev !== null ? prev : (detailItem ? visiblePosts.findIndex((p) => p.id === detailItem.id) : 0);
      const next = (cur - 1 + visiblePosts.length) % visiblePosts.length;
      setDetailItem(visiblePosts[next]);
      return next;
    });
  }, [visiblePosts, detailItem]);

  const handleOpenLightbox = (item: ProfilePostItem, index: number) => {
    setDetailItem(item);
    setLightboxIndex(index);
    if (onSelectMedia) {
      onSelectMedia({
        url: item.url,
        caption: item.caption || item.alt_text || "A birthday memory",
        kind: item.media_kind,
      });
    }
  };

  const handleCloseLightbox = () => {
    setDetailItem(null);
    setLightboxIndex(null);
  };

  // Keyboard navigation (ArrowLeft, ArrowRight, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsEditModalOpen(false);
        setIsCreateHighlightOpen(false);
        setActiveHighlight(null);
        handleCloseLightbox();
      } else if (e.key === "ArrowRight") {
        if (detailItem || lightboxIndex !== null) {
          e.preventDefault();
          handleNextMedia();
        }
      } else if (e.key === "ArrowLeft") {
        if (detailItem || lightboxIndex !== null) {
          e.preventDefault();
          handlePrevMedia();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [detailItem, lightboxIndex, handleNextMedia, handlePrevMedia]);

  const handleShareMedia = async (item: ProfilePostItem) => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: item.caption || "Birthday Memory",
          text: item.caption || "A cherished birthday memory of Meerah ✿",
          url: item.fullDisplayUrl || item.url,
        });
        return;
      } catch {}
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(item.fullDisplayUrl || item.url);
        setShareToast("Link copied to clipboard! ✿");
        setTimeout(() => setShareToast(null), 2500);
      } catch {}
    }
  };

  // Edit Profile Handlers
  const handleOpenEditModal = () => {
    setEditName(profile.displayName);
    setEditBio(profile.bio);
    setEditAvatarUrl(profile.avatarUrl || "");
    setEditBirthDate(profile.birthDate || AUTHORITATIVE_BIRTH_DATE);
    setEditInterests([...(profile.interests || [])]);
    setNewInterestTag("");
    setIsEditModalOpen(true);
  };

  const handleAddInterest = () => {
    const tag = newInterestTag.trim();
    if (tag && !editInterests.includes(tag)) {
      setEditInterests([...editInterests, tag]);
      setNewInterestTag("");
    }
  };

  const handleRemoveInterest = (tagToRemove: string) => {
    setEditInterests(editInterests.filter((t) => t !== tagToRemove));
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newAvatar = event.target.result as string;
          setEditAvatarUrl(newAvatar);
          // Auto-save direct avatar upload immediately
          const updated = saveProfile({
            avatarUrl: newAvatar,
          });
          setProfile((prev) => ({ ...prev, avatarUrl: updated.avatarUrl }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveProfile({
      displayName: editName.trim() || profile.displayName,
      bio: editBio.trim() || profile.bio,
      avatarUrl: editAvatarUrl.trim() || undefined,
      birthDate: editBirthDate || profile.birthDate || AUTHORITATIVE_BIRTH_DATE,
      interests: editInterests,
    });
    setProfile(updated);
    setIsEditModalOpen(false);
  };

  // Create Highlight Handlers
  const handleOpenCreateHighlight = () => {
    setNewHighlightTitle("");
    setSelectedHighlightPhotoIds([]);
    setSelectedCoverPhotoId("");
    setIsCreateHighlightOpen(true);
  };

  const handleTogglePhotoForHighlight = (photoId: string) => {
    setSelectedHighlightPhotoIds((prev) => {
      const next = prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId];
      if (!selectedCoverPhotoId && next.length > 0) {
        setSelectedCoverPhotoId(next[0]);
      } else if (!next.includes(selectedCoverPhotoId)) {
        setSelectedCoverPhotoId(next[0] || "");
      }
      return next;
    });
  };

  const handleSaveHighlight = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newHighlightTitle.trim() || "New Highlight";
    const coverPhoto = availablePhotosForHighlight.find(p => p.id === selectedCoverPhotoId);
    createHighlight(
      title,
      selectedHighlightPhotoIds,
      selectedCoverPhotoId || selectedHighlightPhotoIds[0]
    );
    // Refresh highlight list from authoritative media service
    const refreshed = loadHighlights();
    // If coverPhoto has a URL, update the newly created highlight in state
    if (coverPhoto && refreshed[0]) {
      refreshed[0].coverPhotoUrl = coverPhoto.url;
    }
    setHighlightsList(refreshed);
    setIsCreateHighlightOpen(false);
  };

  const handleDeleteHighlight = (highlightId: string) => {
    const remaining = deleteHighlight(highlightId);
    setHighlightsList(remaining);
    setActiveHighlight(null);
  };

  return (
    <div className="profilePanel" data-testid="profile-panel">
      {/* 0. Header with wordmark "Meerah ✿" */}
      <header className="profileTopBar" data-testid="profile-top-bar" aria-label="Profile navigation header">
        <div className="profileTopBarLeft">
          <h1 className="profileWordmark">
            Meerah <span className="profileWordmarkFlower" aria-hidden="true">✿</span>
          </h1>
        </div>
        <div className="profileTopBarRight">
          <span className="profileTopBadge">Birthday Edition</span>
        </div>
      </header>

      {/* 1. Dynamic Birthday Card & Live Countdown Banner */}
      <section
        className="profileBirthdayCard"
        data-testid="profile-birthday-card"
        aria-label="Authoritative Birthday Celebration Card"
      >
        <div className="profileBirthdayCardInner">
          <div className="profileBirthdayCakeBadge" aria-hidden="true">
            🎂
          </div>
          <div className="profileBirthdayInfo">
            <div className="profileBirthdayHeaderLine">
              <span className="profileBirthdayKicker">
                {countdown.isToday ? "Special Celebration" : "Birthday Milestone"}
              </span>
              <span className="profileBirthdayDateTag">
                Date: 30 October 2026
              </span>
            </div>
            <div className="profileBirthdayAgeDisplay">
              <span className="profileBirthdayAgeNumber">{currentAge}</span>
              <span className="profileBirthdayAgeLabel">
                {countdown.isToday ? "years young today! 🎂✨" : "years young"}
              </span>
            </div>
            {countdown.isToday ? (
              <h3 className="profileBirthdayTodayNotice" data-testid="birthday-today-banner">
                Today is {profile.displayName}&apos;s Birthday! 🎂✨
              </h3>
            ) : (
              <div className="profileCountdownWrapper" aria-label="Countdown to next birthday">
                <span className="profileCountdownIntro">Next birthday celebration in:</span>
                <div className="profileCountdownBoxes">
                  <div className="profileCountdownUnit">
                    <b className="profileCountdownNum">{countdown.days}</b>
                    <small>Days</small>
                  </div>
                  <span className="profileCountdownColon" aria-hidden="true">:</span>
                  <div className="profileCountdownUnit">
                    <b className="profileCountdownNum">{String(countdown.hours).padStart(2, "0")}</b>
                    <small>Hours</small>
                  </div>
                  <span className="profileCountdownColon" aria-hidden="true">:</span>
                  <div className="profileCountdownUnit">
                    <b className="profileCountdownNum">{String(countdown.minutes).padStart(2, "0")}</b>
                    <small>Mins</small>
                  </div>
                  <span className="profileCountdownColon" aria-hidden="true">:</span>
                  <div className="profileCountdownUnit">
                    <b className="profileCountdownNum">{String(countdown.seconds).padStart(2, "0")}</b>
                    <small>Secs</small>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. Profile Header & Identity Info */}
      <header className="profileHeader">
        <div className="profileAvatarContainer">
          <div className="profileAvatarRing">
            <div className="profileAvatar">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={`${profile.displayName}'s avatar`}
                  className="profileAvatarImg"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    // Prevent broken image display
                    e.currentTarget.style.display = "none";
                    const fallback = e.currentTarget.parentElement?.querySelector(".profileAvatarFlower") as HTMLElement | null;
                    if (fallback) fallback.style.display = "inline";
                  }}
                />
              ) : null}
              <span
                className="profileAvatarFlower"
                aria-hidden="true"
                style={{ display: profile.avatarUrl ? "none" : "inline" }}
              >
                ✿
              </span>
            </div>
          </div>
          <input
            type="file"
            ref={headerFileInputRef}
            accept="image/*"
            onChange={handleAvatarFileChange}
            className="profileHiddenFileInput"
            id="profile-header-avatar-file"
            aria-label="Upload profile photo"
          />
          <button
            type="button"
            className="profileAvatarEditBtn"
            onClick={() => {
              if (headerFileInputRef.current) {
                headerFileInputRef.current.click();
              } else {
                handleOpenEditModal();
              }
            }}
            aria-label="Change profile picture"
            title="Change profile picture"
          >
            ✎
          </button>
        </div>

        <div className="profileBioSection">
          <div className="profileIdentityRow">
            <h2 className="profileName">{profile.displayName}</h2>
            <button
              type="button"
              className="profileEditBtn"
              onClick={handleOpenEditModal}
              aria-label="Edit Profile Details"
            >
              <span>Edit Profile</span>
            </button>
            {safeInstagram.isSafe && safeInstagram.sanitizedUrl ? (
              <a
                href={safeInstagram.sanitizedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="profileInstagramLink"
                aria-label={`Visit ${profile.displayName}'s Instagram profile (opens in a new tab)`}
              >
                <svg
                  className="profileIgIcon"
                  viewBox="0 0 24 24"
                  width="13"
                  height="13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
                <span>Instagram</span>
                <span className="profileExternalArrow" aria-hidden="true">
                  ↗
                </span>
              </a>
            ) : (
              <span className="profilePillBadge">Birthday Edition</span>
            )}
          </div>

          <p className="profileBio">{profile.bio}</p>

          {/* Interest Chips: Reading, Poetry, Music, Photography, Cooking, Gardening */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="profileInterests" aria-label="Personal interests">
              {profile.interests.map((interest, idx) => (
                <span key={idx} className="profileInterestChip">
                  {interest}
                </span>
              ))}
            </div>
          )}

          <div className="profileBioAccent">
            <span className="profileBioDate">A special chapter created with love</span>
          </div>
        </div>
      </header>

      {/* Stats Counter Row */}
      <section className="profileCounts" aria-label="Profile statistics">
        <div className="profileCountItem">
          <b>{effectivePosts.length}</b>
          <span>little moments</span>
        </div>
        <div className="profileCountDivider" aria-hidden="true" />
        <div className="profileCountItem">
          <b>05</b>
          <span>birthday pages</span>
        </div>
        <div className="profileCountDivider" aria-hidden="true" />
        <div className="profileCountItem">
          <b>{favorites.length}</b>
          <span>favourites</span>
        </div>
      </section>

      {/* 3. Story Highlights Section with "+ New" & Safe Deletion */}
      <section className="profileHighlightsContainer" aria-label="Story highlights">
        <div className="profileHighlightsScroll" role="list">
          {/* "+ New" Highlight Circle */}
          <div className="profileHighlightItem" role="listitem">
            <button
              type="button"
              className="profileHighlightCircle profileNewHighlightCircle"
              aria-label="Create new story highlight"
              onClick={handleOpenCreateHighlight}
            >
              <div className="profileHighlightInner profileNewHighlightInner">
                <span className="profileNewHighlightPlus" aria-hidden="true">
                  +
                </span>
              </div>
            </button>
            <span className="profileHighlightTitle">New</span>
          </div>

          {/* Story Highlights Circles */}
          {effectiveHighlights.map((hl) => (
            <div key={hl.id} className="profileHighlightItem" role="listitem">
              <button
                type="button"
                className="profileHighlightCircle"
                aria-label={`Highlight: ${hl.title}`}
                onClick={() => {
                  setActiveHighlight(hl);
                  if (hl.coverUrl && onSelectMedia) {
                    onSelectMedia({
                      url: hl.coverUrl,
                      caption: hl.title,
                      kind: "image",
                    });
                  }
                }}
              >
                <div className="profileHighlightInner">
                  {hl.coverUrl ? (
                    <img
                      src={hl.coverUrl}
                      alt={hl.title}
                      className="profileHighlightImg"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        // Prevent broken image display by falling back to glyph
                        e.currentTarget.style.display = "none";
                        const fallback = e.currentTarget.parentElement?.querySelector(".profileHighlightGlyph") as HTMLElement | null;
                        if (fallback) fallback.style.display = "inline";
                      }}
                    />
                  ) : null}
                  <span
                    className="profileHighlightGlyph"
                    aria-hidden="true"
                    style={{ display: hl.coverUrl ? "none" : "inline" }}
                  >
                    {getHighlightGlyph(hl.id, hl.title)}
                  </span>
                </div>
              </button>
              <span className="profileHighlightTitle" title={hl.title}>
                {hl.title}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Mode Navigation Tabs: STRICTLY TWO TABS (Posts & Favorites) - NO REELS */}
      <nav
        className="profileModes"
        role="tablist"
        aria-label="Profile media views"
      >
        <button
          type="button"
          role="tab"
          id="tab-posts"
          aria-selected={mode === "posts"}
          aria-controls="profile-media-panel"
          className={`profileModeTab ${mode === "posts" ? "active" : ""}`}
          onClick={() => handleModeChange("posts")}
        >
          <span className="profileModeIcon" aria-hidden="true">
            ▦
          </span>
          <span className="profileModeLabel">Posts</span>
          <span className="profileModeBadge" aria-label={`${postsCount} posts`}>
            {postsCount}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-favorites"
          aria-selected={mode === "favorites"}
          aria-controls="profile-media-panel"
          className={`profileModeTab ${mode === "favorites" ? "active" : ""}`}
          onClick={() => handleModeChange("favorites")}
        >
          <span className="profileModeIcon" aria-hidden="true">
            {mode === "favorites" ? "♥" : "♡"}
          </span>
          <span className="profileModeLabel">Favorites</span>
          <span
            className="profileModeBadge"
            aria-label={`${favorites.length} favorites`}
          >
            {favorites.length}
          </span>
        </button>
      </nav>

      {/* 5. Profile Media Gallery Grid */}
      <section
        id="profile-media-panel"
        role="tabpanel"
        aria-labelledby={`tab-${mode}`}
        className="profileGallerySection"
      >
        {isActuallyLoading && (
          <div className="profileLoadingGrid" aria-label="Loading your photos">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div key={idx} className="profileSkeletonTile">
                <div className="profileSkeletonShimmer" />
              </div>
            ))}
          </div>
        )}

        {!isActuallyLoading && visiblePosts.length > 0 && (
          <div className="profileGalleryGrid">
            {visiblePosts.map((p, idx) => {
              const isFav = favorites.includes(p.id);
              const caption = p.caption || p.alt_text || "A birthday memory";
              const thumbSrc = p.thumbnailUrl || p.thumbnail_url || p.thumbnailPath || toCompactDerivativeUrl(p.url);

              return (
                <div key={p.id} className="profileMediaTile">
                  {/* Media Open Button (Opens Detail Modal / Lightbox) */}
                  <button
                    type="button"
                    className="profilePhotoTile"
                    onClick={() => handleOpenLightbox(p, idx)}
                    aria-label={`View ${caption}`}
                  >
                    {p.media_kind === "video" ? (
                      <div className="profileVideoWrapper">
                        <video
                          src={p.url}
                          muted
                          playsInline
                          preload="metadata"
                        />
                        <span
                          className="profileReelPlayBadge"
                          aria-label="Video memory"
                        >
                          ▶
                        </span>
                      </div>
                    ) : (
                      <img
                        src={thumbSrc}
                        alt={p.alt_text || p.caption || "Birthday memory"}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          // Prevent broken image tile
                          e.currentTarget.style.opacity = "0.7";
                        }}
                      />
                    )}
                    <span className="profileTileOverlay">
                      <span className="profileTileHoverCaption">{caption}</span>
                    </span>
                  </button>

                  {/* Favorite Toggle Button (Sibling to media button, NOT nested!) */}
                  <button
                    type="button"
                    className={`profileFavoriteToggle ${
                      isFav ? "isFavorite" : ""
                    }`}
                    aria-label={
                      isFav
                        ? `Remove "${caption}" from favorites`
                        : `Add "${caption}" to favorites`
                    }
                    aria-pressed={isFav}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(p.id);
                    }}
                  >
                    <span className="profileFavoriteIcon" aria-hidden="true">
                      {isFav ? "♥" : "♡"}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {error && visiblePosts.length === 0 && (
          <div className="profileErrorState" role="alert">
            <span className="profileErrorIcon" aria-hidden="true">⚠️</span>
            <h4 className="profileErrorTitle">Unable to load moments</h4>
            <p className="profileErrorMessage">{error}</p>
            {onRetry && (
              <button
                type="button"
                className="profileRetryBtn"
                onClick={onRetry}
                aria-label="Retry loading photos"
              >
                Try Again
              </button>
            )}
          </div>
        )}

        {!isActuallyLoading && !error && visiblePosts.length === 0 && (
          <div className="profileEmptyState" role="status">
            <div className="profileEmptyIcon" aria-hidden="true">
              {mode === "favorites" ? "♡" : "✿"}
            </div>
            <h4 className="profileEmptyTitle">
              {mode === "favorites"
                ? "No favourites saved yet"
                : "No moments yet"}
            </h4>
            <p className="profileEmptyMessage">{getEmptyStateMessage(mode)}</p>
          </div>
        )}
      </section>

      {/* 6. Eternal Us Navigation Bridge */}
      <section
        className="profileEternalusSection"
        aria-label="Eternalus private folder"
      >
        <div className="profileEternalusDetails">
          <div className="profileEternalusHeader">
            <span className="profileEternalusKicker">A private chapter</span>
            <span className="profileEternalusTag">Vault · خزانہ</span>
          </div>
          <h3 className="profileEternalusTitle">Eternalus ♡</h3>
          <p className="profileEternalusText">
            Your private album stays tucked away here. A sanctuary of sacred memories and whispers kept just for us.
          </p>
        </div>
        <button
          type="button"
          className="profileEternalusButton"
          onClick={onOpenEternalus}
          aria-label="Open private folder to view Eternalus"
        >
          <span>Open private folder</span>
          <span className="profileEternalusArrow" aria-hidden="true">
            →
          </span>
        </button>
      </section>

      {/* ======================================================================
          7. Modals
          ====================================================================== */}

      {/* A. Edit Profile Modal (Name, Bio, Birthday Date, Avatar & Interests) */}
      {isEditModalOpen && (
        <div
          className="profileModalBackdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-profile-title"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="profileModalCard"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="profileModalHeader">
              <h3 id="edit-profile-title" className="profileModalTitle">
                Edit Profile
              </h3>
              <button
                type="button"
                className="profileModalClose"
                onClick={() => setIsEditModalOpen(false)}
                aria-label="Close edit profile modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="profileEditForm">
              <div className="profileFormGroup">
                <label htmlFor="edit-profile-name">Display Name</label>
                <input
                  type="text"
                  id="edit-profile-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Meerah"
                  required
                />
              </div>

              <div className="profileFormGroup">
                <label htmlFor="edit-profile-bio">Bio</label>
                <textarea
                  id="edit-profile-bio"
                  rows={2}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell your story..."
                />
              </div>

              <div className="profileFormGroup">
                <label htmlFor="edit-profile-birthdate">Birthday Date</label>
                <input
                  type="date"
                  id="edit-profile-birthdate"
                  value={editBirthDate}
                  onChange={(e) => setEditBirthDate(e.target.value)}
                  required
                />
              </div>

              <div className="profileFormGroup">
                <label htmlFor="edit-profile-avatar">Avatar URL or File</label>
                <input
                  type="text"
                  id="edit-profile-avatar"
                  value={editAvatarUrl}
                  onChange={(e) => setEditAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
                <div className="profileFileUploadWrapper">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="profileHiddenFileInput"
                    id="profile-avatar-file"
                  />
                  <label
                    htmlFor="profile-avatar-file"
                    className="profileFileUploadBtn"
                  >
                    <span>Choose Image File</span>
                  </label>
                </div>
              </div>

              <div className="profileFormGroup">
                <label>Interests & Passions</label>
                <div className="profileEditTagsList">
                  {editInterests.map((tag) => (
                    <span key={tag} className="profileEditTagChip">
                      {tag}
                      <button
                        type="button"
                        className="profileRemoveTagBtn"
                        onClick={() => handleRemoveInterest(tag)}
                        aria-label={`Remove interest ${tag}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <div className="profileAddTagRow">
                  <input
                    type="text"
                    value={newInterestTag}
                    onChange={(e) => setNewInterestTag(e.target.value)}
                    placeholder="Add an interest..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddInterest();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="profileAddTagBtn"
                    onClick={handleAddInterest}
                    aria-label="Add interest tag"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="profileModalActions">
                <button
                  type="button"
                  className="profileModalBtnSecondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="profileModalBtnPrimary"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* B. Create Highlight Modal */}
      {isCreateHighlightOpen && (
        <div
          className="profileModalBackdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-highlight-title"
          onClick={() => setIsCreateHighlightOpen(false)}
        >
          <div
            className="profileModalCard profileHighlightModalCard"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="profileModalHeader">
              <h3 id="create-highlight-title" className="profileModalTitle">
                New Highlight
              </h3>
              <button
                type="button"
                className="profileModalClose"
                onClick={() => setIsCreateHighlightOpen(false)}
                aria-label="Close create highlight modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveHighlight} className="profileHighlightForm">
              <div className="profileFormGroup">
                <label htmlFor="highlight-title-input">Highlight Name</label>
                <input
                  type="text"
                  id="highlight-title-input"
                  value={newHighlightTitle}
                  onChange={(e) => setNewHighlightTitle(e.target.value)}
                  placeholder="e.g. Golden Days ✨"
                  required
                />
              </div>

              <div className="profileFormGroup">
                <label>Select Photos ({selectedHighlightPhotoIds.length} selected)</label>
                <div className="profilePhotoPickerGrid">
                  {availablePhotosForHighlight.map((photo) => {
                    const isSelected = selectedHighlightPhotoIds.includes(photo.id);
                    const isCover = selectedCoverPhotoId === photo.id;
                    return (
                      <div
                        key={photo.id}
                        className={`profilePickerTile ${isSelected ? "selected" : ""}`}
                        onClick={() => handleTogglePhotoForHighlight(photo.id)}
                        role="checkbox"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            handleTogglePhotoForHighlight(photo.id);
                          }
                        }}
                      >
                        <img
                          src={toCompactDerivativeUrl(photo.url)}
                          alt={photo.caption || "Photo option"}
                          className="profilePickerImg"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            e.currentTarget.style.opacity = "0.7";
                          }}
                        />
                        {isSelected && (
                          <span className="profilePickerCheck" aria-hidden="true">
                            ✓
                          </span>
                        )}
                        {isSelected && (
                          <button
                            type="button"
                            className={`profilePickerCoverBtn ${isCover ? "activeCover" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCoverPhotoId(photo.id);
                            }}
                            title="Set as highlight cover"
                            aria-label={`Set as cover`}
                          >
                            {isCover ? "Cover ★" : "Make Cover"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="profileModalActions">
                <button
                  type="button"
                  className="profileModalBtnSecondary"
                  onClick={() => setIsCreateHighlightOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="profileModalBtnPrimary"
                  disabled={selectedHighlightPhotoIds.length === 0}
                >
                  Create Highlight
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C. Highlight Viewer & Safe Deletion Modal */}
      {activeHighlight && (
        <div
          className="profileModalBackdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="active-highlight-title"
          onClick={() => setActiveHighlight(null)}
        >
          <div
            className="profileModalCard"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="profileModalHeader">
              <h3 id="active-highlight-title" className="profileModalTitle">
                {activeHighlight.title}
              </h3>
              <button
                type="button"
                className="profileModalClose"
                onClick={() => setActiveHighlight(null)}
                aria-label="Close highlight viewer"
              >
                ✕
              </button>
            </div>

            <div className="profileHighlightDetailBody">
              {activeHighlight.coverUrl ? (
                <div className="profileHighlightCoverPreview">
                  <img
                    src={activeHighlight.coverUrl}
                    alt={activeHighlight.title}
                    className="profileHighlightCoverBig"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const fallback = e.currentTarget.parentElement?.querySelector(".profileHighlightGlyphBig") as HTMLElement | null;
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                  <div className="profileHighlightGlyphBig" aria-hidden="true" style={{ display: "none" }}>
                    {getHighlightGlyph(activeHighlight.id, activeHighlight.title)}
                  </div>
                </div>
              ) : (
                <div className="profileHighlightGlyphBig" aria-hidden="true">
                  {getHighlightGlyph(activeHighlight.id, activeHighlight.title)}
                </div>
              )}
              <p className="profileHighlightDetailText">
                Story highlight containing {activeHighlight.photoIds?.length || 1} moment(s).
              </p>
            </div>

            <div className="profileModalActions">
              <button
                type="button"
                className="profileDeleteHighlightBtn"
                onClick={() => handleDeleteHighlight(activeHighlight.id)}
                aria-label={`Delete highlight ${activeHighlight.title}`}
              >
                Delete Highlight
              </button>
              <button
                type="button"
                className="profileModalBtnPrimary"
                onClick={() => setActiveHighlight(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* D. Interactive Lightbox Viewer */}
      {activeMediaItem && (
        <div
          className="profileModalBackdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="media-detail-caption"
          onClick={handleCloseLightbox}
        >
          <div
            className="profileDetailModalCard"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              className="profileModalClose profileDetailCloseBtn"
              onClick={handleCloseLightbox}
              aria-label="Close photo viewer"
            >
              ✕
            </button>

            {/* Media Container with Previous / Next navigation and counter */}
            <div className="profileDetailMediaContainer">
              {visiblePosts.length > 1 && (
                <button
                  type="button"
                  className="profileLightboxNavBtn profileLightboxNavPrev"
                  onClick={handlePrevMedia}
                  aria-label="Previous photo"
                >
                  ‹
                </button>
              )}

              {activeMediaItem.media_kind === "video" ? (
                <video
                  src={activeMediaItem.url}
                  controls
                  autoPlay
                  playsInline
                  className="profileDetailVideo"
                />
              ) : (
                <img
                  src={activeMediaItem.fullDisplayUrl || activeMediaItem.url}
                  alt={activeMediaItem.alt_text || activeMediaItem.caption || "Birthday media detail"}
                  className="profileDetailImage"
                  decoding="async"
                />
              )}

              {visiblePosts.length > 1 && (
                <button
                  type="button"
                  className="profileLightboxNavBtn profileLightboxNavNext"
                  onClick={handleNextMedia}
                  aria-label="Next photo"
                >
                  ›
                </button>
              )}

              {visiblePosts.length > 1 && (
                <span className="profileLightboxCounter">
                  {(lightboxIndex !== null ? lightboxIndex : visiblePosts.findIndex((p) => p.id === activeMediaItem.id)) + 1} / {visiblePosts.length}
                </span>
              )}
            </div>

            <div className="profileDetailInfo">
              <div className="profileDetailTopRow">
                <div className="profileDetailHeaderInfo">
                  <h4 id="media-detail-caption" className="profileDetailCaption">
                    {activeMediaItem.caption || "A cherished birthday memory"}
                  </h4>
                  {activeMediaItem.hasKnownCaptureDate && activeMediaItem.effectiveCaptureDate && (
                    <span className="profileDetailDate" aria-label="Capture date">
                      🗓 {formatEffectiveDate(activeMediaItem.effectiveCaptureDate, true)}
                    </span>
                  )}
                </div>

                <div className="profileLightboxActions">
                  <button
                    type="button"
                    className="profileDetailShareBtn"
                    onClick={() => handleShareMedia(activeMediaItem)}
                    aria-label="Share photo"
                  >
                    <span aria-hidden="true">↗</span>
                    <span>Share</span>
                  </button>

                  <button
                    type="button"
                    className={`profileDetailFavBtn ${
                      favorites.includes(activeMediaItem.id) ? "isFavorite" : ""
                    }`}
                    aria-label={
                      favorites.includes(activeMediaItem.id)
                        ? "Remove from favorites"
                        : "Add to favorites"
                    }
                    aria-pressed={favorites.includes(activeMediaItem.id)}
                    onClick={() => onToggleFavorite(activeMediaItem.id)}
                  >
                    <span className="profileFavoriteIcon" aria-hidden="true">
                      {favorites.includes(activeMediaItem.id) ? "♥" : "♡"}
                    </span>
                    <span>
                      {favorites.includes(activeMediaItem.id) ? "Favorited" : "Favorite"}
                    </span>
                  </button>
                </div>
              </div>

              {shareToast && (
                <div className="profileShareToast" role="status">
                  {shareToast}
                </div>
              )}

              {activeMediaItem.alt_text && (
                <p className="profileDetailAltText">
                  <span className="profileDetailAltLabel">Description:</span>{" "}
                  {activeMediaItem.alt_text}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
