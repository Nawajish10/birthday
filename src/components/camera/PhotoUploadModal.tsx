"use client";

import React, { useEffect, useCallback } from "react";
import type { PhotoAsset } from "../../types/media-contracts.ts";
import { CameraPanel } from "./CameraPanel.tsx";
import "./camera.css";

export interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureAdded?: (photo: PhotoAsset) => void;
  onPhotoUploaded?: (photo: PhotoAsset) => void;
  onError?: (error: string) => void;
  title?: string;
}

/**
 * PhotoUploadModal provides an accessible modal overlay wrapper for the dual-mode
 * camera and photo ingestion pipeline, featuring:
 * - Dual ingestion (Live Camera with facingMode flip & File Picker with Drag & Drop)
 * - Safe hardware track cleanup on modal close / unmount
 * - Effective capture date picker + "Mark date as unknown" option
 * - Explicit consent guardrail ("Save to Memories ✿")
 * - Love Theme token adherence and touch-first responsive layout (320px–1024px+)
 */
export function PhotoUploadModal({
  isOpen,
  onClose,
  onCaptureAdded,
  onPhotoUploaded,
  onError,
  title = "Add a Birthday Memory ✿",
}: PhotoUploadModalProps) {
  // ESC key listener for modal accessibility
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    window.addEventListener("keydown", handleKeyDown);
    // Lock body scroll while modal is active
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="photoModalBackdrop"
      role="presentation"
      onClick={(e) => {
        // Close on backdrop tap
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      data-theme="love"
    >
      <div
        className="photoModalDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-modal-title"
      >
        <div className="photoModalHeader">
          <div className="photoModalTitleWrap">
            <span className="cameraBadge">Memories ✿ Snap</span>
            <h2 id="photo-modal-title" className="photoModalTitle">
              {title}
            </h2>
          </div>
          <button
            type="button"
            className="photoModalCloseBtn"
            onClick={onClose}
            aria-label="Close photo capture modal"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="photoModalBody">
          <CameraPanel
            isModal
            onClose={onClose}
            onCaptureAdded={(photo) => {
              onCaptureAdded?.(photo as PhotoAsset);
              onPhotoUploaded?.(photo as PhotoAsset);
            }}
            onError={onError}
          />
        </div>
      </div>
    </div>
  );
}

export default PhotoUploadModal;
