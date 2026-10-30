"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import type { PhotoAsset } from "../../types/media-contracts.ts";
import { loadPhotos } from "../../lib/media-service.ts";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_CAPTION_LENGTH,
  validateCaptureFile,
  stopMediaTracks,
  dataUrlToBlob,
  createPhotoAsset,
  persistPhotoToMediaService,
  getTodayDateString,
  CAMERA_FILTERS,
  type CameraFilter,
  type FileValidationResult,
  type UploadStatus,
  type CameraFacingMode,
} from "./camera-pipeline.ts";
import "./camera.css";

// Re-export constants & helpers for consumers and backward-compatibility
export {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_CAPTION_LENGTH,
  validateCaptureFile,
  stopMediaTracks,
  dataUrlToBlob,
  createPhotoAsset,
  persistPhotoToMediaService,
  CAMERA_FILTERS,
  type CameraFilter,
};
export type { FileValidationResult, UploadStatus, CameraFacingMode };

export interface CameraPanelProps {
  onCaptureAdded?: (postOrPhoto: PhotoAsset) => void;
  onNavigateToProfile?: () => void;
  onOpenGallery?: () => void;
  onOpenOnThisDay?: () => void;
  onError?: (error: string) => void;
  onClose?: () => void;
  isModal?: boolean;
  className?: string;
  latestPhotoUrl?: string;
  autoStart?: boolean;
}

export function CameraPanel({
  onCaptureAdded,
  onNavigateToProfile,
  onOpenGallery,
  onOpenOnThisDay,
  onError,
  onClose,
  isModal = false,
  className = "",
  latestPhotoUrl,
  autoStart = true,
}: CameraPanelProps) {
  // Modes: "camera" | "upload"
  const [ingestionMode, setIngestionMode] = useState<"camera" | "upload">("camera");
  const [facingMode, setFacingMode] = useState<CameraFacingMode>("user");

  // Camera stream states
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [isCameraBlocked, setIsCameraBlocked] = useState<boolean>(false);

  // Snapchat-style filter, flash and notification states
  const [selectedFilter, setSelectedFilter] = useState<CameraFilter>(CAMERA_FILTERS[0]);
  const [isFlashOn, setIsFlashOn] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; text: string; time: string; read: boolean }>>([
    { id: "notif-1", text: "Camera ready · Love Theme active ✿", time: "Just now", read: false },
    { id: "notif-2", text: "Snap filters & live timer ready ✨", time: "1m ago", read: true },
  ]);

  // Timer & countdown states: 0 (off), 3s, 5s, 10s
  const [timerSeconds, setTimerSeconds] = useState<0 | 3 | 5 | 10>(0);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);
  const [showFiltersTray, setShowFiltersTray] = useState<boolean>(true);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimerInterval = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setCountdownRemaining(null);
  }, []);

  const [galleryThumbnail, setGalleryThumbnail] = useState<string | null>(() => {
    if (latestPhotoUrl) return latestPhotoUrl;
    if (typeof window !== "undefined") {
      try {
        const stored = loadPhotos();
        if (stored && stored.length > 0 && stored[0]?.url) {
          return stored[0].url;
        }
      } catch {
        // storage unavailable
      }
    }
    return null;
  });

  const featuredPhotoUrl = latestPhotoUrl || galleryThumbnail || "/images/sample-meerah-1.jpg";

  // Capture & preview states
  const [capture, setCapture] = useState<string | null>(null);
  const [caption, setCaption] = useState<string>("");
  const [effectiveCaptureDate, setEffectiveCaptureDate] = useState<string>(getTodayDateString());
  const [hasKnownCaptureDate, setHasKnownCaptureDate] = useState<boolean>(true);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Lifecycle status
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Safely stop stream tracks and release camera hardware
  const stopStream = useCallback(() => {
    clearTimerInterval();
    if (streamRef.current) {
      stopMediaTracks(streamRef.current);
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setIsInitializing(false);
  }, [clearTimerInterval]);

  // Cleanup on unmount — ensures NO leaked camera streams or hardware indicators
  useEffect(() => {
    return () => {
      stopStream();
      clearTimerInterval();
    };
  }, [stopStream, clearTimerInterval]);

  // Request camera access with current facingMode
  const openCamera = async (overrideFacing?: CameraFacingMode) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsCameraBlocked(false);

    // Context & API checks
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      const msg = "Camera access requires a secure connection (HTTPS). You can choose a photo from your device below.";
      setErrorMessage(msg);
      setIsCameraBlocked(true);
      onError?.(msg);
      return;
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      const msg = "Camera is not supported on this browser or device. You can choose a photo from your device below.";
      setErrorMessage(msg);
      setIsCameraBlocked(true);
      onError?.(msg);
      return;
    }

    // Stop any existing stream first
    if (streamRef.current) {
      stopStream();
    }

    setIsInitializing(true);
    const targetFacing = overrideFacing || facingMode;

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (err: unknown) {
        const e = err as { name?: string };
        if (e.name === "OverconstrainedError" || e.name === "ConstraintNotSatisfiedError") {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } else {
          throw err;
        }
      }

      streamRef.current = stream;
      setCameraActive(true);
      setIsInitializing(false);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          // Play request might be aborted if user immediately closes
        }
      }
    } catch (err: unknown) {
      stopStream();
      setIsCameraBlocked(true);

      const e = err as { name?: string };
      let friendlyMessage = "Camera permission was not granted or camera is unavailable. You can choose a photo below.";

      if (e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError") {
        friendlyMessage = "Camera permission was denied. Please allow camera access in your browser or select a photo from your device.";
      } else if (e?.name === "NotFoundError" || e?.name === "DevicesNotFoundError") {
        friendlyMessage = "No camera found on this device. You can select a photo from your device instead.";
      } else if (e?.name === "NotReadableError" || e?.name === "TrackStartError") {
        friendlyMessage = "Your camera is currently in use by another app. Please close other camera apps and try again.";
      }

      setErrorMessage(friendlyMessage);
      onError?.(friendlyMessage);
    }
  };

  // Auto-start live camera stream when mounted in camera mode
  useEffect(() => {
    let mounted = true;
    if (autoStart && ingestionMode === "camera" && !cameraActive && !capture && !isCameraBlocked) {
      openCamera().catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [autoStart]);

  // Flip camera between front ("user") and rear ("environment")
  const toggleFacingMode = () => {
    const nextMode: CameraFacingMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    if (cameraActive) {
      openCamera(nextMode);
    }
  };

  // Close camera manually without taking a photo
  const closeCamera = () => {
    stopStream();
  };

  const toggleFlash = useCallback(async () => {
    if (!streamRef.current) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const capabilities = (track as any)?.getCapabilities?.() || {};
      if ("torch" in capabilities) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (track as any)?.applyConstraints({ advanced: [{ torch: !isFlashOn }] });
      }
      setIsFlashOn(!isFlashOn);
    } catch {
      setIsFlashOn(!isFlashOn);
    }
  }, [isFlashOn]);

  // High quality snapshot via offscreen canvas
  const takePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      const msg = "Camera feed is not ready. Please wait a moment and try again.";
      setErrorMessage(msg);
      onError?.(msg);
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not initialize 2D canvas context.");
      }

      // If user front camera, mirror it nicely
      if (facingMode === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      if (selectedFilter.cssFilter && selectedFilter.cssFilter !== "none") {
        ctx.filter = selectedFilter.cssFilter;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

      // Stop camera stream immediately upon snapshot
      stopStream();

      // Enter preview & metadata customization
      setCapture(dataUrl);
      setUploadStatus("preview");
      setErrorMessage(null);
      setSuccessMessage(null);
      setNotifications((prev) => [
        { id: `notif-${Date.now()}`, text: "New memory captured! Review & save ✿", time: "Just now", read: false },
        ...prev,
      ]);
    } catch {
      const msg = "Could not capture image. Please try again or select a file.";
      setErrorMessage(msg);
      onError?.(msg);
    }
  };

  // Shutter action handler with timer countdown support
  const handleShutterClick = () => {
    if (!cameraActive) {
      openCamera();
      return;
    }

    if (countdownRemaining !== null) {
      // User tapped during active countdown to cancel it
      clearTimerInterval();
      return;
    }

    if (timerSeconds > 0) {
      setCountdownRemaining(timerSeconds);
      let rem = timerSeconds;
      timerIntervalRef.current = setInterval(() => {
        rem -= 1;
        if (rem <= 0) {
          clearTimerInterval();
          takePhoto();
        } else {
          setCountdownRemaining(rem);
        }
      }, 1000);
    } else {
      takePhoto();
    }
  };

  // Process chosen or dropped file
  const processImageFile = (file: File) => {
    const validation = validateCaptureFile(file);
    if (!validation.valid) {
      const errorMsg = validation.error || "Invalid file chosen.";
      setErrorMessage(errorMsg);
      onError?.(errorMsg);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        stopStream();
        setCapture(result);
        setUploadStatus("preview");
        setErrorMessage(null);
        setSuccessMessage(null);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.onerror = () => {
      const msg = "Could not read chosen image file.";
      setErrorMessage(msg);
      onError?.(msg);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Retake photo: resets capture state and stops any active stream
  const retakePhoto = () => {
    stopStream();
    setCapture(null);
    setCaption("");
    setEffectiveCaptureDate(getTodayDateString());
    setHasKnownCaptureDate(true);
    setUploadStatus("idle");
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Explicit user consent upload action: NEVER uploads automatically!
  // Requires explicit user tap on "Save to Memories ✿"
  const handleSaveToMemories = async () => {
    if (!capture || uploadStatus === "uploading") return;

    setUploadStatus("uploading");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const blob = dataUrlToBlob(capture);
      const validation = validateCaptureFile({ size: blob.size, type: blob.type });
      if (!validation.valid) {
        const msg = validation.error || "Capture does not meet criteria.";
        setErrorMessage(msg);
        setUploadStatus("error");
        onError?.(msg);
        return;
      }

      // Create domain PhotoAsset with metadata
      const newPhoto = createPhotoAsset({
        url: capture,
        caption: caption.trim() || "A new birthday memory ✿",
        altText: caption.trim() || "Captured birthday memory",
        effectiveCaptureDate: hasKnownCaptureDate ? effectiveCaptureDate : getTodayDateString(),
        hasKnownCaptureDate: hasKnownCaptureDate,
      });

      let finalPhoto = newPhoto;

      // Attempt server sync if /api/captures is available
      try {
        const body = new FormData();
        body.set("file", blob, "birthday-memory.jpg");
        body.set("caption", finalPhoto.caption || "A new birthday memory");

        const res = await fetch("/api/captures", {
          method: "POST",
          body,
        });

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data?.post) {
            finalPhoto = {
              ...newPhoto,
              id: data.post.id || newPhoto.id,
              storagePath: data.post.media_path || newPhoto.storagePath,
              url: data.post.url || newPhoto.url,
            };
          }
        }
      } catch {
        // Fetch/network error - graceful offline fallback: proceed with local storage
      }

      // Persist in local storage via media-service addPhotoAsset
      try {
        persistPhotoToMediaService(finalPhoto);
      } catch {
        // Storage quota or error handled gracefully
      }

      // Augment for backward compatibility with Experience.tsx
      const augmentedPhoto = {
        ...finalPhoto,
        media_path: finalPhoto.storagePath,
        media_kind: finalPhoto.mediaKind,
        alt_text: finalPhoto.altText || "",
      };

      setUploadStatus("success");
      setSuccessMessage("Saved to Memories ✿");
      setGalleryThumbnail(finalPhoto.url);
      onCaptureAdded?.(augmentedPhoto);
    } catch {
      const errorMsg = "Could not save photo. Please try again.";
      setErrorMessage(errorMsg);
      setUploadStatus("error");
      onError?.(errorMsg);
    }
  };

  return (
    <div
      className={`cameraBox cameraPanel ${isModal ? "isModalView" : ""} ${className}`}
      role="region"
      aria-label="Camera and Memory Capture"
      data-theme="love"
    >
      {/* Header */}
      <div className="cameraHeader">
        <div className="cameraTitleWrap">
          <span className="cameraBadge">Memories ✿ Snap</span>
          <h3 className="cameraHeading">Make a new little memory</h3>
        </div>
        <div className="cameraHeaderRight">
          {cameraActive && (
            <button
              type="button"
              className={`cameraTopActionBtn ${isFlashOn ? "isActive" : ""}`}
              onClick={toggleFlash}
              aria-label="Toggle flash/torch"
              title="Toggle flash/torch"
            >
              {isFlashOn ? "⚡ On" : "⚡ Off"}
            </button>
          )}
          <button
            type="button"
            className="cameraTopActionBtn cameraNotifBtn"
            onClick={() => setShowNotifications((prev) => !prev)}
            aria-label="View notifications"
            title="View capture notifications"
          >
            🔔
            {notifications.some((n) => !n.read) && <span className="cameraNotifBadge" />}
          </button>
          <div className="cameraPrivacyChip" title="Captures stay local on your device until saved">
            <span className="cameraPrivacyDot" aria-hidden="true" />
            <span>On-device preview</span>
          </div>
          {isModal && onClose && (
            <button
              type="button"
              className="cameraHeaderCloseBtn"
              onClick={onClose}
              aria-label="Close capture panel"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Notifications Dropdown Panel */}
      {showNotifications && (
        <div className="cameraNotifDropdown" role="dialog" aria-label="Capture Notifications">
          <div className="cameraNotifHeader">
            <h4>Notifications ✿</h4>
            <button
              type="button"
              className="cameraNotifClearBtn"
              onClick={() => {
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                setShowNotifications(false);
              }}
            >
              Mark all read
            </button>
          </div>
          <div className="cameraNotifList">
            {notifications.map((n) => (
              <div key={n.id} className={`cameraNotifItem ${n.read ? "isRead" : "isUnread"}`}>
                <span className="cameraNotifIcon">✨</span>
                <div className="cameraNotifText">
                  <p>{n.text}</p>
                  <small>{n.time}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mode Switcher Pills (when not in preview) */}
      {!capture && (
        <div className="cameraModeSwitcher" role="tablist" aria-label="Ingestion Mode">
          <button
            type="button"
            role="tab"
            aria-selected={ingestionMode === "camera"}
            className={`cameraModeBtn ${ingestionMode === "camera" ? "isActive" : ""}`}
            onClick={() => {
              setIngestionMode("camera");
              setErrorMessage(null);
              setIsCameraBlocked(false);
              openCamera().catch(() => {});
            }}
          >
            <span aria-hidden="true">📷</span> Live Camera
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={ingestionMode === "upload"}
            className={`cameraModeBtn ${ingestionMode === "upload" ? "isActive" : ""}`}
            onClick={() => {
              stopStream();
              setIngestionMode("upload");
              setErrorMessage(null);
            }}
          >
            <span aria-hidden="true">📁</span> Upload Photo
          </button>
        </div>
      )}

      {/* Privacy Notice Banner */}
      <div className="cameraPrivacyNotice" role="note">
        <svg
          className="cameraPrivacyIcon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <p>
          Captures stay private on your device until you choose &ldquo;Save to Memories ✿&rdquo;.
        </p>
      </div>

      {/* Visual Feedback Alerts */}
      {errorMessage && (
        <div className="error cameraAlert" role="alert">
          <span className="cameraAlertIcon" aria-hidden="true">⚠</span>
          <div className="cameraAlertContent">
            <span>{errorMessage}</span>
            {isCameraBlocked && (
              <button
                type="button"
                className="cameraInlineActionBtn"
                onClick={() => {
                  setIngestionMode("upload");
                  fileInputRef.current?.click();
                }}
              >
                Choose from device instead →
              </button>
            )}
          </div>
        </div>
      )}

      {successMessage && (
        <div className="success cameraAlert" role="status">
          <span className="cameraAlertIcon" aria-hidden="true">✔</span>
          <div className="cameraSuccessContent">
            <span>{successMessage}</span>
            {onNavigateToProfile && (
              <button
                type="button"
                className="cameraLinkBtn"
                onClick={onNavigateToProfile}
              >
                View in profile →
              </button>
            )}
          </div>
        </div>
      )}

      {/* PREVIEW & METADATA CUSTOMIZATION */}
      {capture ? (
        <div className="cameraCapturedWrap">
          <div className="cameraFrame">
            <img
              className="captured cameraPreviewImg"
              src={capture}
              alt="Your captured birthday moment"
            />
            <div className="cameraWatermark">
              <span>Meerah&rsquo;s Birthday ✿</span>
            </div>
          </div>

          {/* Metadata Customization Form */}
          <div className="cameraMetadataForm">
            {/* Effective Capture Date Picker */}
            <div className="cameraFieldGroup">
              <div className="cameraFieldHeader">
                <label htmlFor="camera-date-input" className="cameraFieldLabel">
                  Memory capture date:
                </label>
                <label className="cameraCheckboxLabel">
                  <input
                    type="checkbox"
                    id="mark-unknown-date"
                    className="cameraCheckbox"
                    checked={!hasKnownCaptureDate}
                    onChange={(e) => setHasKnownCaptureDate(!e.target.checked)}
                    disabled={uploadStatus === "uploading"}
                  />
                  <span>Mark date as unknown</span>
                </label>
              </div>
              <input
                id="camera-date-input"
                type="date"
                className="cameraDateInput"
                value={effectiveCaptureDate}
                onChange={(e) => setEffectiveCaptureDate(e.target.value)}
                disabled={!hasKnownCaptureDate || uploadStatus === "uploading"}
              />
            </div>

            {/* Caption Input */}
            <div className="cameraFieldGroup">
              <div className="cameraFieldHeader">
                <label htmlFor="camera-caption-input" className="cameraFieldLabel">
                  Memory caption:
                </label>
                <span className="cameraCharCounter">
                  {caption.length}/{MAX_CAPTION_LENGTH}
                </span>
              </div>
              <input
                id="camera-caption-input"
                type="text"
                className="cameraCaptionInput"
                value={caption}
                maxLength={MAX_CAPTION_LENGTH}
                placeholder="Write a sweet memory note…"
                onChange={(e) => setCaption(e.target.value)}
                disabled={uploadStatus === "uploading"}
              />
            </div>
          </div>

          {/* Explicit Consent Actions */}
          <div className="actions cameraActions">
            <button
              type="button"
              className="button secondary cameraBtn cameraRetakeBtn"
              onClick={retakePhoto}
              disabled={uploadStatus === "uploading"}
              aria-label="Retake photo"
            >
              ↺ Retake
            </button>

            <button
              type="button"
              className="button secondary cameraBtn cameraReplaceBtn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadStatus === "uploading"}
              title="Replace with another photo"
              aria-label="Replace with another photo"
            >
              🔄 Replace
            </button>

            <button
              type="button"
              className="button secondary cameraBtn cameraCancelBtn"
              onClick={() => {
                retakePhoto();
                if (onClose) onClose();
              }}
              disabled={uploadStatus === "uploading"}
              title="Cancel and discard"
              aria-label="Cancel and discard"
            >
              ✕ Cancel
            </button>

            <a
              className="button secondary cameraBtn cameraDownloadBtn"
              download="meerah-birthday-memory.jpg"
              href={capture}
            >
              ↓ Save to device
            </a>

            {/* Non-negotiable Explicit Consent Button */}
            <button
              type="button"
              className="button rose cameraBtn cameraUploadBtn"
              onClick={handleSaveToMemories}
              disabled={uploadStatus === "uploading" || uploadStatus === "success"}
            >
              {uploadStatus === "uploading" ? (
                <>
                  <span className="cameraSpinner" aria-hidden="true" />
                  <span>Saving to Memories…</span>
                </>
              ) : uploadStatus === "success" ? (
                "Saved to Memories ✿"
              ) : (
                "Save to Memories ✿"
              )}
            </button>
          </div>
        </div>
      ) : (
        /* DUAL INGESTION VIEW: CAMERA OR UPLOAD DROP ZONE */
        <div className="cameraIngestionWrap">
          {ingestionMode === "camera" ? (
            <div className="cameraStreamWrap">
              <div
                className={`cameraVideoContainer ${cameraActive ? "isActive" : "isIdle"}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {/* Top Floating Bar: Flash, Flip, Timer, Filters, Notifications, Close */}
                <div className="cameraTopFloatingBar" role="toolbar" aria-label="Camera controls">
                  <div className="cameraTopFloatingLeft">
                    <button
                      type="button"
                      className={`cameraTopActionBtn cameraFlashBtn ${isFlashOn ? "isActive" : ""}`}
                      onClick={toggleFlash}
                      aria-label="Toggle flash/torch"
                      title="Toggle flash/torch"
                    >
                      {isFlashOn ? "⚡ On" : "⚡ Flash"}
                    </button>
                    <button
                      type="button"
                      className="cameraTopActionBtn cameraFlipBtn"
                      onClick={toggleFacingMode}
                      aria-label="Switch between front and back camera"
                      title={`Switch to ${facingMode === "user" ? "rear" : "front"} camera`}
                    >
                      <span>🔄</span>
                      <span>{facingMode === "user" ? "Rear" : "Front"}</span>
                    </button>
                    <button
                      type="button"
                      className={`cameraTopActionBtn cameraTimerBtn ${timerSeconds > 0 ? "isActive" : ""}`}
                      onClick={() => {
                        setTimerSeconds((prev) => (prev === 0 ? 3 : prev === 3 ? 5 : prev === 5 ? 10 : 0));
                      }}
                      aria-label={`Timer: ${timerSeconds === 0 ? "Off" : `${timerSeconds}s`}`}
                      title={`Timer: ${timerSeconds === 0 ? "Off" : `${timerSeconds}s`}`}
                    >
                      <span>⏱️</span>
                      <span>{timerSeconds === 0 ? "Timer" : `${timerSeconds}s`}</span>
                    </button>
                    <button
                      type="button"
                      className={`cameraTopActionBtn cameraFilterToggleBtn ${showFiltersTray ? "isActive" : ""}`}
                      onClick={() => setShowFiltersTray((prev) => !prev)}
                      aria-label="Toggle filters tray"
                      title="Toggle filters tray"
                    >
                      <span>✨</span>
                      <span>Filters</span>
                    </button>
                  </div>

                  <div className="cameraTopFloatingRight">
                    <button
                      type="button"
                      className="cameraTopActionBtn cameraNotifBtn"
                      onClick={() => setShowNotifications((prev) => !prev)}
                      aria-label="View notifications"
                      title="View capture notifications"
                    >
                      <span>🔔</span>
                      {notifications.some((n) => !n.read) && <span className="cameraNotifBadge" />}
                    </button>
                    {(onClose || isModal || cameraActive) && (
                      <button
                        type="button"
                        className="cameraTopActionBtn cameraCloseBtn"
                        onClick={() => {
                          if (onClose) {
                            onClose();
                          } else if (cameraActive) {
                            closeCamera();
                          }
                        }}
                        aria-label="Close camera"
                        title="Close camera"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Notifications Dropdown Panel */}
                {showNotifications && (
                  <div className="cameraNotifDropdown" role="dialog" aria-label="Capture Notifications">
                    <div className="cameraNotifHeader">
                      <h4>Notifications ✿</h4>
                      <button
                        type="button"
                        className="cameraNotifClearBtn"
                        onClick={() => {
                          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                          setShowNotifications(false);
                        }}
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="cameraNotifList">
                      {notifications.map((n) => (
                        <div key={n.id} className={`cameraNotifItem ${n.read ? "isRead" : "isUnread"}`}>
                          <span className="cameraNotifIcon">✨</span>
                          <div className="cameraNotifText">
                            <p>{n.text}</p>
                            <small>{n.time}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Live Camera Feed */}
                <video
                  ref={videoRef}
                  id="capture"
                  className={`cameraVideo ${facingMode === "user" ? "isMirrored" : ""}`}
                  style={{ filter: selectedFilter.cssFilter !== "none" ? selectedFilter.cssFilter : undefined }}
                  playsInline
                  muted
                  autoPlay
                />

                {/* Countdown Timer Overlay */}
                {countdownRemaining !== null && (
                  <div className="cameraCountdownOverlay" aria-live="assertive" role="alert">
                    <span className="cameraCountdownNumber">{countdownRemaining}</span>
                    <span className="cameraCountdownLabel">Hold steady... ✿</span>
                    <button
                      type="button"
                      className="cameraCountdownCancelBtn"
                      onClick={clearTimerInterval}
                      aria-label="Cancel timer"
                    >
                      ✕ Cancel
                    </button>
                  </div>
                )}

                {/* Camera Viewport with Featured Photo Framing when Idle or Fallback UI */}
                {!cameraActive && (
                  isCameraBlocked ? (
                    <div className="cameraPermissionFallback" role="alert" aria-label="Camera permission or fallback">
                      <div className="cameraFallbackCard">
                        <span className="cameraFallbackIcon" aria-hidden="true">🔒</span>
                        <h4 className="cameraFallbackTitle">Camera Access Needed</h4>
                        <p className="cameraFallbackMsg">
                          {errorMessage || "Camera permission is denied or unavailable on this device. You can choose a photo from your device instead."}
                        </p>
                        <div className="cameraFallbackActions">
                          <button
                            type="button"
                            className="cameraInlineActionBtn fallbackRetryBtn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsCameraBlocked(false);
                              openCamera().catch(() => {});
                            }}
                          >
                            🔄 Try Again
                          </button>
                          <button
                            type="button"
                            className="cameraInlineActionBtn fallbackUploadBtn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIngestionMode("upload");
                              fileInputRef.current?.click();
                            }}
                          >
                            📁 Choose Photo from Device →
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="cameraFeaturedFraming"
                      onClick={() => openCamera()}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openCamera();
                        }
                      }}
                      aria-label="Tap to open live camera"
                    >
                      {featuredPhotoUrl ? (
                        <div className="cameraFeaturedPhotoBackdrop">
                          <img src={featuredPhotoUrl} alt="" className="cameraFeaturedBlur" aria-hidden="true" />
                          <div className="cameraFeaturedCard">
                            <img src={featuredPhotoUrl} alt="Featured Memory" className="cameraFeaturedImage" />
                            <div className="cameraViewfinderOverlay" aria-hidden="true">
                              <span className="viewfinderCorner tl" />
                              <span className="viewfinderCorner tr" />
                              <span className="viewfinderCorner bl" />
                              <span className="viewfinderCorner br" />
                              <div className="cameraViewfinderTag">Meerah ✿ Memories</div>
                            </div>
                          </div>
                          <div className="cameraFeaturedPrompt">
                            <span className="cameraShutterHintIcon" aria-hidden="true">📷</span>
                            <span className="cameraFeaturedPromptTitle">Tap shutter to snap live ✿</span>
                            <span className="cameraFeaturedPromptSub">or drop a photo here to preview</span>
                          </div>
                        </div>
                      ) : (
                        <div className="cameraIdlePlaceholder">
                          <div className="cameraIdleIcon" aria-hidden="true">📷</div>
                          <h4>Tap shutter to snap ✿</h4>
                          <p>Open your camera to make a sweet memory, or drag a photo here.</p>
                        </div>
                      )}
                    </div>
                  )
                )}

                {isInitializing && (
                  <div className="cameraLoadingOverlay">
                    <span className="cameraSpinner" aria-hidden="true" />
                    <p>Starting camera…</p>
                  </div>
                )}

                {/* Bottom Floating Overlay: Filter Carousel + Bottom Action Bar */}
                <div className="cameraBottomOverlay">
                  {/* Snapchat-Style Live Filter Carousel */}
                  {showFiltersTray && (
                    <div className="cameraFilterCarousel" role="radiogroup" aria-label="Camera Filters">
                      {CAMERA_FILTERS.map((f) => (
                        <button
                          type="button"
                          key={f.id}
                          className={`cameraFilterChip ${selectedFilter.id === f.id ? "isActive" : ""}`}
                          onClick={() => setSelectedFilter(f)}
                          role="radio"
                          aria-checked={selectedFilter.id === f.id}
                          title={f.name}
                        >
                          <span className="cameraFilterIcon">{f.icon}</span>
                          <span className="cameraFilterName">{f.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Snapchat-Inspired Bottom Action Bar: Upload Button, Shutter Capture Button, On This Day Button */}
                  <div className="cameraBottomControls actions cameraActions" role="toolbar" aria-label="Camera shutter and actions">
                    {/* Left: Upload Button & Gallery Shortcut */}
                    <div className="cameraBottomActionSlot leftSlot">
                      <label
                        className="button secondary cameraBtn cameraUploadActionBtn"
                        title="Choose photo from device or camera roll"
                        aria-label="Upload photo"
                      >
                        <span aria-hidden="true">📁</span>
                        <span>Upload</span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif,image/*"
                          className="cameraFileInput"
                          onChange={handleFileChange}
                        />
                      </label>
                      {onOpenGallery && (
                        <button
                          type="button"
                          className="button secondary cameraBtn cameraGalleryShortcut"
                          onClick={onOpenGallery}
                          title="View saved memories gallery"
                          aria-label="View saved memories gallery"
                        >
                          {galleryThumbnail ? (
                            <span className="cameraGalleryThumbWrap">
                              <img src={galleryThumbnail} alt="Latest memory" className="cameraGalleryThumb" />
                            </span>
                          ) : (
                            <span className="cameraGalleryIconWrap">🖼️</span>
                          )}
                          <span className="cameraGalleryText">All Photos</span>
                        </button>
                      )}
                    </div>

                    {/* Center: Large 76px Circular Shutter Capture Button with Pulse Ring */}
                    <div className="cameraShutterSlot">
                      <div className="cameraShutterContainer">
                        <span className="cameraPulseRing" aria-hidden="true" />
                        <button
                          type="button"
                          className={`cameraShutterBtn ${cameraActive ? "cameraCaptureBtn" : "cameraPrimaryAction"}`}
                          onClick={handleShutterClick}
                          disabled={isInitializing}
                          aria-label={
                            cameraActive
                              ? countdownRemaining !== null
                                ? "Cancel countdown"
                                : "Snap photo"
                              : "Open camera"
                          }
                          title={
                            cameraActive
                              ? countdownRemaining !== null
                                ? "Cancel countdown"
                                : "Snap photo"
                              : "Open camera"
                          }
                        >
                          <span className="cameraShutterInner" />
                        </button>
                      </div>
                    </div>

                    {/* Right: On This Day Button */}
                    <div className="cameraBottomActionSlot rightSlot">
                      <button
                        type="button"
                        className="button secondary cameraBtn cameraOnThisDayActionBtn"
                        onClick={() => {
                          if (onOpenOnThisDay) {
                            onOpenOnThisDay();
                          } else if (onOpenGallery) {
                            onOpenGallery();
                          }
                        }}
                        title="View On This Day memories"
                        aria-label="View On This Day memories"
                      >
                        <span aria-hidden="true">🗓️</span>
                        <span>On This Day</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Upload Mode / Drag & Drop Zone */
            <div className="cameraUploadWrap">
              <div
                className={`cameraDropZone ${isDragging ? "isDragging" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                aria-label="Upload photo drop zone"
              >
                <div className="cameraDropIcon" aria-hidden="true">
                  ☁️
                </div>
                <h4>Drag & drop a photo here</h4>
                <p>or tap to browse files from your phone or computer</p>
                <span className="cameraDropFormatHint">
                  Supports JPEG, PNG, WebP, AVIF up to 12 MB
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif,image/*"
                  className="cameraFileInput"
                  onChange={handleFileChange}
                />
              </div>

              <div className="actions cameraActions">
                <button
                  type="button"
                  className="button rose cameraBtn cameraPrimaryAction"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📁 Select photo file
                </button>
                <button
                  type="button"
                  className="button secondary cameraBtn"
                  onClick={() => {
                    setIngestionMode("camera");
                    openCamera();
                  }}
                >
                  📷 Use live camera
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
