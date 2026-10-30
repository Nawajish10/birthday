"use client";

import React from "react";
import type { PhotoAsset } from "../../types/media-contracts.ts";
import { CameraPanel, type CameraPanelProps } from "../camera/CameraPanel.tsx";
import { stopMediaTracks } from "../camera/camera-pipeline.ts";

export interface MemoriesCameraProps {
  onCaptureAdded?: (photo: PhotoAsset) => void;
  onOpenGallery?: () => void;
  onOpenOnThisDay?: () => void;
  onNavigateToProfile?: () => void;
  onClose?: () => void;
  latestPhotoUrl?: string;
  autoStart?: boolean;
  className?: string;
}

/**
 * MemoriesCamera provides a Snapchat-inspired full-screen mobile-first camera experience.
 *
 * Key features:
 * - Direct live camera stream via navigator.mediaDevices.getUserMedia (auto-starting on mount)
 * - Friendly fallback/permission-denied UI with retry and device upload alternatives
 * - Prominent 72px center capture shutter with Love Theme pulse ring
 * - Flash / torch toggle controls where supported by device hardware
 * - Bottom-left gallery shortcut switching to saved memories library
 * - Automatic hardware track release and camera cleanup on component unmount (stopMediaTracks)
 * - Snapchat-inspired Love Theme styling with zero proprietary branding
 */
export function MemoriesCamera({
  onCaptureAdded,
  onOpenGallery,
  onOpenOnThisDay,
  onNavigateToProfile,
  onClose,
  latestPhotoUrl,
  autoStart = true,
  className = "",
}: MemoriesCameraProps) {
  return (
    <div
      className={`memoriesCameraContainer ${className}`}
      data-theme="love"
      data-testid="memories-camera-container"
    >
      <CameraPanel
        autoStart={autoStart}
        onCaptureAdded={onCaptureAdded}
        onOpenGallery={onOpenGallery}
        onOpenOnThisDay={onOpenOnThisDay}
        onNavigateToProfile={onNavigateToProfile}
        onClose={onClose}
        latestPhotoUrl={latestPhotoUrl}
      />
    </div>
  );
}

export { stopMediaTracks };
export default MemoriesCamera;
