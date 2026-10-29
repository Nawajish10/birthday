"use client";

import React, { useState, useEffect, useRef } from "react";
import type { StoryItem, PhotoAsset, AlbumCollection } from "../../types/media-contracts.ts";
import {
  loadStories,
  loadPhotos,
  loadAlbums,
  loadFavorites,
  toggleFavorite as toggleFavoriteService,
  createAlbum,
  deleteAlbum,
  deletePhotoAsset,
} from "../../lib/media-service.ts";
import {
  groupPhotosChronologically,
  groupPhotosOnThisDay,
  formatEffectiveDate,
  toCompactDerivativeUrl,
  filterPhotosByCategory,
  getRecentMemories,
  CATEGORY_FILTERS,
  type MemoriesTab,
  type PhotoCategory,
} from "./memories-helpers.ts";
import { StoryViewer } from "./StoryViewer.tsx";
import { StoryBuilderModal } from "./StoryBuilderModal.tsx";
import { PhotoUploadModal } from "../camera/PhotoUploadModal.tsx";
import { CameraPanel } from "../camera/CameraPanel.tsx";
import "./memories.css";
import "./stories.css";

export interface MemoriesPanelProps {
  photos?: PhotoAsset[];
  loading?: boolean;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  externalAudioRef?: React.RefObject<HTMLAudioElement | null>;
  onClose?: () => void;
  storage?: Storage;
  onNavigateToProfile?: () => void;
}

export const MemoriesPanel: React.FC<MemoriesPanelProps> = ({
  photos: propPhotos,
  loading,
  isLoading,
  error,
  onRetry,
  externalAudioRef,
  storage,
  onNavigateToProfile,
}) => {
  const [activeTab, setActiveTab] = useState<MemoriesTab>("photos"); // useState<MemoriesTab>("camera")
  const [photos, setPhotos] = useState<PhotoAsset[]>(() => {
    if (propPhotos && propPhotos.length > 0) return propPhotos;
    return loadPhotos(storage);
  });
  const [stories, setStories] = useState<StoryItem[]>(() => loadStories(storage));
  const [albums, setAlbums] = useState<AlbumCollection[]>(() => loadAlbums(storage));
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites(storage));
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<PhotoCategory>("all");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Sync when propPhotos updates
  useEffect(() => {
    if (propPhotos && propPhotos.length > 0) {
      setPhotos(propPhotos);
    }
  }, [propPhotos]);

  const isActuallyLoading = loading ?? isLoading ?? false;

  // Modals & Viewers
  const [activeStory, setActiveStory] = useState<StoryItem | null>(null);
  const [isStoryBuilderOpen, setIsStoryBuilderOpen] = useState<boolean>(false);
  const [isPhotoUploadOpen, setIsPhotoUploadOpen] = useState<boolean>(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoAsset | null>(null);

  // Album creation modal
  const [isCreateAlbumOpen, setIsCreateAlbumOpen] = useState<boolean>(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState<string>("");
  const [newAlbumDesc, setNewAlbumDesc] = useState<string>("");
  const [newAlbumPhotoIds, setNewAlbumPhotoIds] = useState<string[]>([]);

  // Scroll position retention
  const scrollPositionRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync data on external storage events
  useEffect(() => {
    const handleStorageChange = () => {
      setPhotos(loadPhotos(storage));
      setStories(loadStories(storage));
      setAlbums(loadAlbums(storage));
      setFavorites(loadFavorites(storage));
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
    }
  }, [storage]);

  // Handle Photo Click (save scroll position and open lightbox)
  const handlePhotoClick = (photo: PhotoAsset) => {
    if (typeof window !== "undefined") {
      scrollPositionRef.current = window.scrollY;
    }
    setSelectedPhoto(photo);
  };


  const handleCloseLightbox = () => {
    setSelectedPhoto(null);
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPositionRef.current);
      });
    }
  };

  const handleNextPhoto = () => {
    if (!selectedPhoto || photos.length === 0) return;
    const curIdx = photos.findIndex((p) => p.id === selectedPhoto.id);
    const nextIdx = (curIdx + 1) % photos.length;
    setSelectedPhoto(photos[nextIdx]);
  };

  const handlePrevPhoto = () => {
    if (!selectedPhoto || photos.length === 0) return;
    const curIdx = photos.findIndex((p) => p.id === selectedPhoto.id);
    const prevIdx = (curIdx - 1 + photos.length) % photos.length;
    setSelectedPhoto(photos[prevIdx]);
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!selectedPhoto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedPhoto(null);
        if (typeof window !== "undefined") {
          requestAnimationFrame(() => {
            window.scrollTo(0, scrollPositionRef.current);
          });
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setSelectedPhoto((current) => {
          if (!current || photos.length === 0) return null;
          const curIdx = photos.findIndex((p) => p.id === current.id);
          const nextIdx = (curIdx + 1) % photos.length;
          return photos[nextIdx];
        });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSelectedPhoto((current) => {
          if (!current || photos.length === 0) return null;
          const curIdx = photos.findIndex((p) => p.id === current.id);
          const prevIdx = (curIdx - 1 + photos.length) % photos.length;
          return photos[prevIdx];
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPhoto, photos]);

  const handleSharePhoto = async (photo: PhotoAsset) => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: photo.caption || "Birthday Memory",
          text: photo.caption || "A cherished birthday memory ✿",
          url: photo.fullDisplayUrl || photo.url,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(photo.fullDisplayUrl || photo.url);
        setShareToast("Link copied to clipboard! ✿");
        setTimeout(() => setShareToast(null), 2500);
      } catch {}
    }
  };


  const handleToggleFavorite = (photoId: string) => {
    const updated = toggleFavoriteService(photoId, storage);
    setFavorites(updated);
  };

  const handlePhotoUploaded = (newPhoto: PhotoAsset) => {
    setPhotos((prev) => [newPhoto, ...prev.filter((p) => p.id !== newPhoto.id)]);
    setIsPhotoUploadOpen(false);
  };

  const handleStoryCreated = (newStory: StoryItem) => {
    setStories((prev) => [newStory, ...prev.filter((s) => s.id !== newStory.id)]);
    setActiveStory(newStory);
  };

  const handleCreateAlbumSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumTitle.trim()) return;
    const album = createAlbum(newAlbumTitle, newAlbumDesc, newAlbumPhotoIds, storage);
    setAlbums((prev) => [album, ...prev]);
    setIsCreateAlbumOpen(false);
    setNewAlbumTitle("");
    setNewAlbumDesc("");
    setNewAlbumPhotoIds([]);
  };

  const handleDeleteAlbum = (id: string) => {
    const remaining = deleteAlbum(id, storage);
    setAlbums(remaining);
  };

  const handleDeletePhoto = (photoId: string) => {
    const result = deletePhotoAsset(photoId, storage);
    setPhotos(result.photos);
    setFavorites(result.favorites);
    setAlbums(result.albums);
    setStories(result.stories);
    setShareToast("Memory safely deleted ✿");
    setTimeout(() => setShareToast(null), 3000);

    if (selectedPhoto && selectedPhoto.id === photoId) {
      const curIdx = photos.findIndex((p) => p.id === photoId);
      const remaining = photos.filter((p) => p.id !== photoId);
      if (remaining.length > 0) {
        const nextIdx = curIdx >= remaining.length ? 0 : curIdx;
        setSelectedPhoto(remaining[nextIdx]);
      } else {
        setSelectedPhoto(null);
      }
    }
    setDeleteConfirmId(null);
  };

  const filteredPhotos = filterPhotosByCategory(photos, activeCategory, favorites);
  const chronologicalGroups = groupPhotosChronologically(filteredPhotos);
  const onThisDayGroups = groupPhotosOnThisDay(photos);
  const recentMemories = getRecentMemories(photos, 8);

  return (
    <div className="memoriesContainer" ref={containerRef} data-theme="love">
      {/* 1. Header & Actions */}
      <header className="memoriesHeader">
        <h2 className="memoriesHeaderTitle">
          Memories & <span>Moments</span> ✿
        </h2>
        <p className="memoriesSubtitle">
          A treasured collection of smiles, milestones, and celebration days
        </p>

        {/* Global Action Button: Take / Add Photo */}
        <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
          <button
            type="button"
            className="memoriesTabButton"
            style={{
              background: "linear-gradient(135deg, var(--memories-rose), var(--memories-red))",
              color: "#ffffff",
              border: "none",
              fontWeight: 700,
            }}
            onClick={() => setIsPhotoUploadOpen(true)}
            aria-label="Add or Take a Photo"
          >
            <span>📷</span>
            <span>Add / Take Photo</span>
          </button>
        </div>
      </header>

      {/* 2. Top Navigation Tabs */}
      <nav className="memoriesTabs" role="tablist" aria-label="Memories navigation">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "camera"}
          className={`memoriesTabButton ${activeTab === "camera" ? "active" : ""}`}
          onClick={() => setActiveTab("camera")}
        >
          <span>📸 Snap Camera</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "photos" || activeTab === "all-photos"}
          className={`memoriesTabButton ${activeTab === "photos" || activeTab === "all-photos" ? "active" : ""}`}
          onClick={() => setActiveTab("photos")}
        >
          <span>All Photos</span>
          <span className="memoriesTabCount">{photos.length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "on-this-day"}
          className={`memoriesTabButton ${activeTab === "on-this-day" ? "active" : ""}`}
          onClick={() => setActiveTab("on-this-day")}
        >
          <span>On This Day</span>
          <span className="memoriesTabCount">
            {onThisDayGroups.reduce((acc, g) => acc + g.photos.length, 0)}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "albums"}
          className={`memoriesTabButton ${activeTab === "albums" ? "active" : ""}`}
          onClick={() => setActiveTab("albums")}
        >
          <span>Albums</span>
          <span className="memoriesTabCount">{albums.length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "stories"}
          className={`memoriesTabButton ${activeTab === "stories" ? "active" : ""}`}
          onClick={() => setActiveTab("stories")}
        >
          <span>Stories</span>
          <span className="memoriesTabCount">{stories.length}</span>
        </button>
      </nav>

      {/* Global Error Banner */}
      {error && (
        <div
          role="alert"
          className="memoriesErrorCard"
          style={{
            padding: "16px 20px",
            background: "rgba(182, 83, 95, 0.12)",
            border: "1px solid var(--memories-rose)",
            borderRadius: "12px",
            textAlign: "center",
            margin: "0 0 12px 0",
          }}
        >
          <p style={{ margin: "0 0 8px 0", color: "var(--memories-rose)", fontWeight: 600 }}>
            {error}
          </p>
          {onRetry && (
            <button
              type="button"
              className="memoriesTabButton"
              onClick={onRetry}
              style={{
                background: "var(--memories-rose)",
                color: "#fff",
                border: "none",
                fontWeight: 600,
              }}
            >
              Retry Loading Photos
            </button>
          )}
        </div>
      )}

      {/* Global Loading State */}
      {isActuallyLoading && (
        <div
          role="status"
          aria-label="Loading memories photos"
          className="memoriesLoadingGrid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "8px",
            padding: "24px 0",
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                aspectRatio: "1",
                borderRadius: "8px",
                background: "var(--memories-pink-soft)",
                opacity: 0.6,
                animation: "pulse 1.5s infinite",
              }}
            />
          ))}
        </div>
      )}

      {/* 3. Tab Contents */}

      {/* TAB 0: SNAPCHAT CAMERA DEFAULT EXPERIENCE */}
      {activeTab === "camera" && (
        <section className="memoriesCameraSection" aria-label="Live Camera and Capture Experience">
          <CameraPanel
            onCaptureAdded={(photo) => {
              setPhotos((prev) => [photo, ...prev.filter((p) => p.id !== photo.id)]);
              setActiveTab("photos");
            }}
            onOpenGallery={() => setActiveTab("photos")}
            onNavigateToProfile={onNavigateToProfile}
            latestPhotoUrl={photos[0]?.url}
          />
        </section>
      )}

      {/* TAB 1: ALL PHOTOS (Chronological Timeline) */}
      {(activeTab === "photos" || activeTab === "all-photos") && (
        <section className="memoriesTimeline" aria-label="Chronological photo timeline">
          {/* Category Filters Bar */}
          <div className="memoriesCategoryFilters" role="radiogroup" aria-label="Photo Category Filters">
            {CATEGORY_FILTERS.map((cat) => {
              const count =
                cat.id === "all"
                  ? photos.length
                  : cat.id === "favorites"
                  ? favorites.length
                  : filterPhotosByCategory(photos, cat.id, favorites).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="radio"
                  aria-checked={activeCategory === cat.id}
                  className={`memoriesCategoryChip ${activeCategory === cat.id ? "active" : ""}`}
                  onClick={() => setActiveCategory(cat.id)}
                  aria-label={`Filter by ${cat.label} (${count} items)`}
                >
                  <span aria-hidden="true">{cat.icon}</span>
                  <span>{cat.label}</span>
                  <span style={{ fontSize: "11px", opacity: 0.85 }}>({count})</span>
                </button>
              );
            })}
          </div>

          {/* Recent Memories Strip (Snapchat-style Highlight Reel) */}
          {(activeCategory === "all" || activeCategory === "recent") && recentMemories.length > 0 && (
            <div className="recentMemoriesSection" aria-label="Recent memories">
              <div className="recentMemoriesHeader">
                <h4 className="recentMemoriesTitle">
                  <span aria-hidden="true">✨</span>
                  <span>Recent Memories</span>
                </h4>
                <span style={{ fontSize: "11px", color: "var(--memories-muted)" }}>
                  {recentMemories.length} recent {recentMemories.length === 1 ? "snap" : "snaps"}
                </span>
              </div>
              <div className="recentMemoriesTrack">
                {recentMemories.map((photo) => (
                  <button
                    key={`recent-${photo.id}`}
                    type="button"
                    className="recentMemoryCard"
                    onClick={() => handlePhotoClick(photo)}
                    aria-label={`View recent memory: ${photo.caption || "Untitled"}`}
                  >
                    <div className="recentMemoryRing">
                      <img
                        src={photo.thumbnailUrl || toCompactDerivativeUrl(photo.url)}
                        alt={photo.altText || photo.caption || "Recent memory"}
                        className="recentMemoryThumb"
                        loading="lazy"
                        decoding="async"
                        style={{ width: "100%", height: "100%", objectFit: "cover", aspectRatio: "1" }}
                      />
                    </div>
                    <span className="recentMemoryLabel">
                      {photo.caption || (photo.hasKnownCaptureDate ? formatEffectiveDate(photo.effectiveCaptureDate) : "Memory")}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {chronologicalGroups.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--memories-muted)" }}>
              <p>No photos in your memories yet.</p>
              <button
                type="button"
                className="memoriesTabButton"
                onClick={() => setIsPhotoUploadOpen(true)}
              >
                Add Your First Memory
              </button>
            </div>
          ) : (
            chronologicalGroups.map((group) => (
              <div key={`${group.year}-${group.month}`} className="timelineGroup">
                <div className="timelineStickyHeader">
                  <h3 className="timelineStickyTitle">
                    <span>{group.title}</span>
                  </h3>
                  <span className="timelineCountBadge">{group.photos.length} photos</span>
                </div>

                <div className="memoriesGrid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                  {group.photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="photoCard"
                      onClick={() => handlePhotoClick(photo)}
                      role="button"
                      tabIndex={0}
                      aria-label={photo.caption || "View memory photo"}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handlePhotoClick(photo);
                        }
                      }}
                      style={{
                        position: "relative",
                        aspectRatio: "1",
                        borderRadius: "8px",
                        overflow: "hidden",
                        cursor: "pointer",
                        background: "var(--memories-paper-card)",
                      }}
                    >
                      <img
                        src={photo.thumbnailUrl || toCompactDerivativeUrl(photo.url)}
                        alt={photo.altText || photo.caption || "Birthday memory"}
                        style={{ width: "100%", height: "100%", objectFit: "cover", aspectRatio: "1" }}
                        loading="lazy"
                        decoding="async"
                      />
                      {favorites.includes(photo.id) && (
                        <span
                          style={{
                            position: "absolute",
                            top: "6px",
                            right: "6px",
                            color: "var(--memories-rose)",
                            fontSize: "14px",
                            textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                          }}
                          aria-label="Favorited"
                        >
                          ♥
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* TAB 2: ON THIS DAY */}
      {activeTab === "on-this-day" && (
        <section className="onThisDayContainer" aria-label="On this day memories">
          {onThisDayGroups.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--memories-muted)" }}>
              <span style={{ fontSize: "36px", display: "block", marginBottom: "8px" }}>✿</span>
              <h3 style={{ margin: "4px 0", fontFamily: "Playfair Display, serif", color: "var(--memories-ink)" }}>
                No past memories for today
              </h3>
              <p style={{ maxWidth: "340px", margin: "8px auto", fontSize: "14px" }}>
                As years go by, memories captured on this day will bloom right here for you.
              </p>
            </div>
          ) : (
            onThisDayGroups.map((group) => (
              <div key={group.year} className="onThisDayGroup" style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <h3 style={{ margin: 0, fontFamily: "Playfair Display, serif", fontSize: "18px", color: "var(--memories-rose)" }}>
                    {group.label}
                  </h3>
                  <span className="timelineCountBadge">{group.photos.length} photos</span>
                </div>

                <div className="memoriesGrid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                  {group.photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="photoCard"
                      onClick={() => handlePhotoClick(photo)}
                      role="button"
                      tabIndex={0}
                      aria-label={photo.caption || "View memory photo"}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handlePhotoClick(photo);
                        }
                      }}
                      style={{
                        position: "relative",
                        aspectRatio: "1",
                        borderRadius: "8px",
                        overflow: "hidden",
                        cursor: "pointer",
                        background: "var(--memories-paper-card)",
                      }}
                    >
                      <img
                        src={photo.thumbnailUrl || toCompactDerivativeUrl(photo.url)}
                        alt={photo.altText || photo.caption || "Birthday memory"}
                        style={{ width: "100%", height: "100%", objectFit: "cover", aspectRatio: "1" }}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* TAB 3: ALBUMS */}
      {activeTab === "albums" && (
        <section className="albumsContainer" aria-label="Photo albums">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "14px" }}>
            <button
              type="button"
              className="memoriesTabButton active"
              onClick={() => setIsCreateAlbumOpen(true)}
            >
              <span>＋</span>
              <span>Create Album</span>
            </button>
          </div>

          <div
            className="albumsGrid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: "14px",
            }}
          >
            {albums.map((album) => {
              const coverPhoto = photos.find((p) => p.id === album.coverPhotoId) || photos[0];
              return (
                <div
                  key={album.id}
                  className="albumCard"
                  style={{
                    borderRadius: "14px",
                    overflow: "hidden",
                    border: "1px solid var(--memories-line)",
                    background: "var(--memories-paper-card)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ position: "relative", aspectRatio: "1" }}>
                    {coverPhoto ? (
                      <img
                        src={coverPhoto.thumbnailUrl || toCompactDerivativeUrl(coverPhoto.url)}
                        alt={album.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover", aspectRatio: "1" }}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          background: "var(--memories-pink-soft)",
                          display: "grid",
                          placeItems: "center",
                          fontSize: "24px",
                        }}
                      >
                        ✿
                      </div>
                    )}
                    <span
                      style={{
                        position: "absolute",
                        bottom: "6px",
                        right: "6px",
                        background: "rgba(0,0,0,0.6)",
                        color: "#fff",
                        padding: "2px 6px",
                        borderRadius: "10px",
                        fontSize: "11px",
                      }}
                    >
                      {album.photoIds.length}
                    </span>
                  </div>
                  <div style={{ padding: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h4 style={{ margin: "0 0 2px", fontSize: "14px", color: "var(--memories-ink)" }}>
                        {album.title}
                      </h4>
                      {album.description && (
                        <p style={{ margin: 0, fontSize: "12px", color: "var(--memories-muted)" }}>
                          {album.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAlbum(album.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--memories-muted)",
                        cursor: "pointer",
                        fontSize: "14px",
                        minWidth: "44px",
                        minHeight: "44px",
                        display: "grid",
                        placeItems: "center",
                      }}
                      title="Delete album"
                      aria-label={`Delete album ${album.title}`}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 4: STORIES */}
      {activeTab === "stories" && (
        <section className="storiesTabContainer" aria-label="Curated photo stories">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "14px" }}>
            <button
              type="button"
              className="memoriesTabButton active"
              onClick={() => setIsStoryBuilderOpen(true)}
            >
              <span>＋</span>
              <span>Create Story</span>
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: "12px",
            }}
          >
            {stories.map((story) => {
              const cover = story.photos && story.photos.length > 0 ? story.photos[0] : null;
              return (
                <div
                  key={story.id}
                  onClick={() => setActiveStory(story)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Play story: ${story.title}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveStory(story);
                    }
                  }}
                  style={{
                    position: "relative",
                    aspectRatio: "9/16",
                    borderRadius: "14px",
                    overflow: "hidden",
                    cursor: "pointer",
                    border: "2px solid var(--memories-rose)",
                    background: "#18181b",
                  }}
                >
                  {cover ? (
                    <img
                      src={cover.thumbnailUrl || toCompactDerivativeUrl(cover.url)}
                      alt={story.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover", aspectRatio: "9/16" }}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div style={{ display: "grid", placeItems: "center", height: "100%", color: "#fff" }}>
                      ✿
                    </div>
                  )}
                  <div
                    style={{
                      position: "absolute",
                      inset: "auto 0 0 0",
                      padding: "8px",
                      background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)",
                      color: "#fff",
                    }}
                  >
                    <p style={{ margin: "0 0 2px", fontSize: "12px", fontWeight: "600" }}>{story.title}</p>
                    {story.musicTrack && (
                      <span style={{ fontSize: "10px", color: "var(--memories-pink)" }}>
                        ♪ {story.musicTrack.title}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. Full-Screen Photo Lightbox Modal */}
      {selectedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="memoriesLightboxOverlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(24, 15, 27, 0.94)",
            backdropFilter: "blur(12px)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            paddingTop: "max(16px, env(safe-area-inset-top))",
            paddingBottom: "max(24px, env(safe-area-inset-bottom))",
          }}
          onClick={handleCloseLightbox}
        >
          <div
            className="memoriesLightboxCard"
            style={{
              position: "relative",
              maxWidth: "560px",
              width: "100%",
              background: "var(--memories-paper-card)",
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ position: "relative", width: "100%", maxHeight: "65vh", overflow: "hidden" }}>
              <img
                src={selectedPhoto.fullDisplayUrl || selectedPhoto.url}
                alt={selectedPhoto.altText || selectedPhoto.caption || "Memory detail"}
                style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }}
                decoding="async"
              />

              {/* Navigation: Previous */}
              <button
                type="button"
                onClick={handlePrevPhoto}
                aria-label="Previous photo"
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(0,0,0,0.6)",
                  border: "none",
                  color: "#fff",
                  minWidth: "44px",
                  minHeight: "44px",
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: "24px",
                  display: "grid",
                  placeItems: "center",
                  zIndex: 2,
                }}
              >
                ‹
              </button>

              {/* Navigation: Next */}
              <button
                type="button"
                onClick={handleNextPhoto}
                aria-label="Next photo"
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(0,0,0,0.6)",
                  border: "none",
                  color: "#fff",
                  minWidth: "44px",
                  minHeight: "44px",
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: "24px",
                  display: "grid",
                  placeItems: "center",
                  zIndex: 2,
                }}
              >
                ›
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleCloseLightbox}
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  background: "rgba(0,0,0,0.6)",
                  border: "none",
                  color: "#fff",
                  minWidth: "44px",
                  minHeight: "44px",
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: "18px",
                  display: "grid",
                  placeItems: "center",
                  zIndex: 3,
                }}
                aria-label="Close photo viewer"
              >
                ✕
              </button>

              {/* Slide Counter */}
              <span
                style={{
                  position: "absolute",
                  top: "12px",
                  left: "12px",
                  background: "rgba(0,0,0,0.6)",
                  color: "#fff",
                  padding: "4px 8px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  zIndex: 3,
                }}
              >
                {photos.findIndex((p) => p.id === selectedPhoto.id) + 1} / {photos.length}
              </span>
            </div>

            <div style={{ padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <div>
                  <h4 style={{ margin: "0 0 4px", fontSize: "16px", color: "var(--memories-ink)" }}>
                    {selectedPhoto.caption || "Birthday Memory"}
                  </h4>
                  {selectedPhoto.hasKnownCaptureDate && selectedPhoto.effectiveCaptureDate && (
                    <span style={{ fontSize: "12px", color: "var(--memories-muted)" }}>
                      🗓 {formatEffectiveDate(selectedPhoto.effectiveCaptureDate, true)}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {deleteConfirmId === selectedPhoto.id ? (
                    <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(selectedPhoto.id)}
                        style={{
                          minWidth: "44px",
                          minHeight: "44px",
                          borderRadius: "22px",
                          border: "none",
                          background: "var(--memories-red)",
                          color: "#ffffff",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: 600,
                          padding: "0 12px",
                        }}
                        aria-label="Confirm delete photo"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        style={{
                          minWidth: "44px",
                          minHeight: "44px",
                          borderRadius: "22px",
                          border: "1px solid var(--memories-line)",
                          background: "var(--memories-white)",
                          color: "var(--memories-ink)",
                          cursor: "pointer",
                          fontSize: "12px",
                          padding: "0 10px",
                        }}
                        aria-label="Cancel delete photo"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="lightboxDeleteBtn"
                      onClick={() => setDeleteConfirmId(selectedPhoto.id)}
                      style={{
                        minWidth: "44px",
                        minHeight: "44px",
                        borderRadius: "22px",
                        border: "1px solid rgba(182, 83, 95, 0.3)",
                        background: "var(--memories-white)",
                        color: "var(--memories-red)",
                        cursor: "pointer",
                        fontSize: "13px",
                        padding: "0 12px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                      aria-label="Delete photo"
                      title="Delete photo"
                    >
                      <span>🗑</span>
                      <span>Delete</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSharePhoto(selectedPhoto)}
                    style={{
                      minWidth: "44px",
                      minHeight: "44px",
                      borderRadius: "22px",
                      border: "1px solid var(--memories-line)",
                      background: "var(--memories-white)",
                      color: "var(--memories-ink)",
                      cursor: "pointer",
                      fontSize: "13px",
                      padding: "0 12px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    aria-label="Share photo"
                  >
                    <span>↗</span>
                    <span>Share</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(selectedPhoto.id)}
                    style={{
                      minWidth: "44px",
                      minHeight: "44px",
                      borderRadius: "50%",
                      border: "1px solid var(--memories-line)",
                      background: favorites.includes(selectedPhoto.id) ? "var(--memories-rose)" : "var(--memories-white)",
                      color: favorites.includes(selectedPhoto.id) ? "#fff" : "var(--memories-rose)",
                      cursor: "pointer",
                      fontSize: "20px",
                      display: "grid",
                      placeItems: "center",
                    }}
                    aria-label={favorites.includes(selectedPhoto.id) ? "Unfavorite photo" : "Favorite photo"}
                  >
                    ♥
                  </button>
                </div>
              </div>
              {shareToast && (
                <div
                  role="status"
                  style={{
                    fontSize: "12px",
                    color: "var(--memories-rose)",
                    fontWeight: 600,
                    marginTop: "4px",
                  }}
                >
                  {shareToast}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Create Album Modal */}
      {isCreateAlbumOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Create new album"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding: "16px",
          }}
          onClick={() => setIsCreateAlbumOpen(false)}
        >
          <div
            style={{
              background: "var(--memories-paper-card)",
              borderRadius: "16px",
              padding: "20px",
              maxWidth: "480px",
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 12px", fontFamily: "Playfair Display, serif" }}>Create New Album ✿</h3>
            <form onSubmit={handleCreateAlbumSubmit}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Album Title
                </label>
                <input
                  type="text"
                  required
                  value={newAlbumTitle}
                  onChange={(e) => setNewAlbumTitle(e.target.value)}
                  placeholder="e.g. Birthday Sunshine"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--memories-line)" }}
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={newAlbumDesc}
                  onChange={(e) => setNewAlbumDesc(e.target.value)}
                  placeholder="e.g. Moments we cherish"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--memories-line)" }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Select Photos ({newAlbumPhotoIds.length} selected)
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", maxHeight: "160px", overflowY: "auto" }}>
                  {photos.map((p) => {
                    const isSelected = newAlbumPhotoIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() =>
                          setNewAlbumPhotoIds((prev) =>
                            isSelected ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                          )
                        }
                        style={{
                          aspectRatio: "1",
                          borderRadius: "6px",
                          overflow: "hidden",
                          cursor: "pointer",
                          border: isSelected ? "3px solid var(--memories-rose)" : "1px solid var(--memories-line)",
                          opacity: isSelected ? 1 : 0.6,
                        }}
                      >
                        <img
                          src={toCompactDerivativeUrl(p.url)}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover", aspectRatio: "1" }}
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  className="memoriesTabButton"
                  onClick={() => setIsCreateAlbumOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="memoriesTabButton active"
                >
                  Save Album
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modals: Photo Upload, Story Viewer, Story Builder */}
      <PhotoUploadModal
        isOpen={isPhotoUploadOpen}
        onClose={() => setIsPhotoUploadOpen(false)}
        onPhotoUploaded={handlePhotoUploaded}
      />

      <StoryBuilderModal
        isOpen={isStoryBuilderOpen}
        onClose={() => setIsStoryBuilderOpen(false)}
        onStoryCreated={handleStoryCreated}
        availablePhotos={photos}
        storage={storage}
      />

      {activeStory && (
        <StoryViewer
          story={activeStory}
          isOpen={true}
          onClose={() => setActiveStory(null)}
          externalAudioRef={externalAudioRef}
        />
      )}
    </div>
  );
};
