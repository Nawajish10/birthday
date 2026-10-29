"use client";

import React, { useState } from "react";
import type { PhotoAsset, StoryItem } from "../../types/media-contracts.ts";
import { loadPhotos, createStory } from "../../lib/media-service.ts";
import { MUSIC_CATALOGUE } from "../music/music-catalogue.ts";
import {
  normalizeMusicTrack,
  reorderSlideIds,
  validateStoryData,
} from "./story-helpers.ts";
import "./stories.css";

export interface StoryBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated?: (newStory: StoryItem) => void;
  availablePhotos?: PhotoAsset[];
  storage?: Storage;
}

export const StoryBuilderModal: React.FC<StoryBuilderModalProps> = ({
  isOpen,
  onClose,
  onStoryCreated,
  availablePhotos,
  storage,
}) => {
  const initialPhotos = availablePhotos && availablePhotos.length > 0 ? availablePhotos : loadPhotos(storage);
  const [photosList] = useState<PhotoAsset[]>(initialPhotos);
  const [title, setTitle] = useState<string>("");
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>(() =>
    initialPhotos.slice(0, Math.min(3, initialPhotos.length)).map((p) => p.id)
  );
  const [selectedMusicId, setSelectedMusicId] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  if (!isOpen) return null;

  // Selected photo objects maintaining order of selectedPhotoIds
  const selectedPhotosOrdered = selectedPhotoIds
    .map((id) => photosList.find((p) => p.id === id))
    .filter((p): p is PhotoAsset => Boolean(p));

  const handleTogglePhoto = (photoId: string) => {
    setErrorMsg("");
    setSelectedPhotoIds((prev) => {
      if (prev.includes(photoId)) {
        return prev.filter((id) => id !== photoId);
      } else {
        return [...prev, photoId];
      }
    });
  };

  const handleMoveSlide = (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedPhotoIds.length) return;
    setSelectedPhotoIds((prev) => reorderSlideIds(prev, index, targetIndex));
  };

  const handleSave = () => {
    const validation = validateStoryData(title, selectedPhotoIds);
    if (!validation.isValid) {
      setErrorMsg(validation.errors[0] || "Please check story details.");
      return;
    }

    const selectedTrack = MUSIC_CATALOGUE.find((t) => t.id === selectedMusicId);
    const musicTrack = selectedTrack ? normalizeMusicTrack(selectedTrack) : undefined;

    const newStory = createStory(
      title,
      selectedPhotoIds,
      selectedPhotosOrdered,
      musicTrack,
      storage
    );

    if (onStoryCreated) {
      onStoryCreated(newStory);
    }

    onClose();
  };

  return (
    <div
      className="storyBuilderBackdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Create a Birthday Story"
    >
      <div className="storyBuilderCard">
        {/* Header */}
        <header className="storyBuilderHeader">
          <h3>
            <span aria-hidden="true">✨</span>
            <span>Create Story Reel</span>
          </h3>
          <button
            type="button"
            className="storyIconButton"
            onClick={onClose}
            aria-label="Close story builder"
          >
            ✕
          </button>
        </header>

        {/* Form Body */}
        <div className="storyBuilderContent">
          {errorMsg && (
            <div
              style={{
                color: "#fda4af",
                background: "rgba(244, 63, 94, 0.15)",
                padding: "8px 12px",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Title */}
          <div className="storyBuilderField">
            <label htmlFor="story-title-input">Story Title</label>
            <input
              id="story-title-input"
              type="text"
              className="storyBuilderInput"
              placeholder="e.g. Moments With Meerah · ✿"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setErrorMsg("");
              }}
            />
          </div>

          {/* Selected Slides Strip & Reorder */}
          {selectedPhotosOrdered.length > 0 && (
            <div className="storyBuilderField">
              <label>Story Slide Sequence ({selectedPhotosOrdered.length} selected)</label>
              <div className="storyBuilderStrip">
                {selectedPhotosOrdered.map((photo, index) => (
                  <div key={photo.id} className="storyBuilderSlideThumb">
                    <img src={photo.url} alt={photo.caption || "Story slide"} />
                    <div className="storyBuilderReorderControls">
                      <button
                        type="button"
                        className="storyBuilderReorderBtn"
                        disabled={index === 0}
                        onClick={() => handleMoveSlide(index, "left")}
                        title="Move slide earlier"
                        aria-label={`Move slide ${index + 1} earlier`}
                      >
                        ◀
                      </button>
                      <button
                        type="button"
                        className="storyBuilderReorderBtn"
                        disabled={index === selectedPhotosOrdered.length - 1}
                        onClick={() => handleMoveSlide(index, "right")}
                        title="Move slide later"
                        aria-label={`Move slide ${index + 1} later`}
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photo Library Picker */}
          <div className="storyBuilderField">
            <label>Choose Photos from Library</label>
            <div className="storyBuilderPhotoGrid">
              {photosList.map((photo) => {
                const isSelected = selectedPhotoIds.includes(photo.id);
                const orderNumber = selectedPhotoIds.indexOf(photo.id) + 1;
                return (
                  <div
                    key={photo.id}
                    className={`storyBuilderPhotoOption ${isSelected ? "selected" : ""}`}
                    onClick={() => handleTogglePhoto(photo.id)}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        handleTogglePhoto(photo.id);
                      }
                    }}
                  >
                    <img src={photo.url} alt={photo.caption || "Library photo"} />
                    {isSelected && (
                      <div className="storyBuilderPhotoBadge">{orderNumber}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Romantic Music Picker */}
          <div className="storyBuilderField">
            <label htmlFor="story-music-select">Optional Soundtrack (Romantic Melody)</label>
            <select
              id="story-music-select"
              className="storyBuilderSelect"
              value={selectedMusicId}
              onChange={(e) => setSelectedMusicId(e.target.value)}
            >
              <option value="">No Soundtrack (Silent)</option>
              {MUSIC_CATALOGUE.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.title} — {track.artist} ({track.duration})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <footer className="storyBuilderFooter">
          <button
            type="button"
            className="storyBuilderBtnSecondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="storyBuilderBtnPrimary"
            onClick={handleSave}
            disabled={!title.trim() || selectedPhotoIds.length === 0}
          >
            Save Story
          </button>
        </footer>
      </div>
    </div>
  );
};
