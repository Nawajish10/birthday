"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ChatAttachment,
  ChatComposerProps,
  CuratedGif,
} from "./chat-types";
import {
  validateAttachment,
  formatFileSize,
  formatDuration,
  searchCuratedGifs,
  MAX_TEXT_LENGTH,
} from "./chat-helpers";

const EMOJI_PALETTE = ["❤️", "🎂", "✨", "🌸", "🥺", "💌", "🎉", "💖", "🥰", "🫂", "🌹", "💫", "🕯️", "🎁", "🕊️", "🥂"];

let attachmentIdCounter = 0;
function getUniqueAttachmentId(prefix: string): string {
  attachmentIdCounter += 1;
  return `att-${prefix}-${attachmentIdCounter}`;
}

export function ChatComposer({
  onSendMessage,
  isSending = false,
  disabled = false,
  placeholder = "Write a birthday note or love message…",
  maxLength = MAX_TEXT_LENGTH,
  currentUserRole: _currentUserRole = "recipient",
}: ChatComposerProps) {
  void _currentUserRole;
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Popover controls
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchQuery, setGifSearchQuery] = useState("");
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // Voice note recorder state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [mediaRecorderError, setMediaRecorderError] = useState<string | null>(null);

  // Hidden file inputs
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Voice recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Auto-resize textarea
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= maxLength) {
      setText(val);
      if (errorMessage) setErrorMessage(null);
      e.target.style.height = "auto";
      e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
    }
  };

  // Insert emoji at cursor position
  const handleInsertEmoji = (emoji: string) => {
    if (text.length + emoji.length > maxLength) return;
    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart || text.length;
      const end = el.selectionEnd || text.length;
      const nextText = text.substring(0, start) + emoji + text.substring(end);
      setText(nextText);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setText((prev) => prev + emoji);
    }
    setShowEmojiPicker(false);
  };

  // Process selected file
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateAttachment(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || "File could not be attached.");
      e.target.value = "";
      return;
    }

    setErrorMessage(null);
    const objectUrl = URL.createObjectURL(file);
    const newAttachment: ChatAttachment = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: validation.kind || "image",
      url: objectUrl,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      thumbnailUrl: validation.kind === "image" ? objectUrl : undefined,
    };

    setAttachments((prev) => [...prev, newAttachment]);
    e.target.value = "";
  };

  // Add GIF from curated picker
  const handleSelectGif = (gif: CuratedGif) => {
    const newAttachment: ChatAttachment = {
      id: getUniqueAttachmentId(`gif-${gif.id}`),
      type: "gif",
      url: gif.url,
      thumbnailUrl: gif.thumbnailUrl,
      name: `${gif.title}.gif`,
      size: 850000,
      mimeType: "image/gif",
      caption: gif.title,
    };
    setAttachments((prev) => [...prev, newAttachment]);
    setShowGifPicker(false);
    setGifSearchQuery("");
  };

  // Remove pending attachment
  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => {
      const item = prev.find((a) => a.id === id);
      if (item && item.url.startsWith("blob:")) {
        URL.revokeObjectURL(item.url);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  // Voice Note: Start Recording
  const startVoiceRecording = async () => {
    setMediaRecorderError(null);
    setErrorMessage(null);

    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMediaRecorderError("Audio recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      console.warn("Microphone access error:", err);
      const errorObj = err as { name?: string };
      if (errorObj?.name === "NotAllowedError" || errorObj?.name === "PermissionDeniedError") {
        setMediaRecorderError("Microphone permission was denied. Please allow microphone access to record voice notes.");
      } else {
        setMediaRecorderError("Could not access microphone. Please check your system settings.");
      }
      setIsRecording(false);
    }
  };

  // Voice Note: Cancel Recording
  const cancelVoiceRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  // Voice Note: Finish Recording & Attach
  const finishVoiceRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const duration = recordingSeconds;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorderRef.current?.mimeType || "audio/webm",
        });

        if (audioBlob.size > 0) {
          const audioUrl = URL.createObjectURL(audioBlob);
          const voiceAtt: ChatAttachment = {
            id: getUniqueAttachmentId("voice"),
            type: "audio",
            url: audioUrl,
            name: `VoiceNote-${attachmentIdCounter}.webm`,
            size: audioBlob.size,
            mimeType: audioBlob.type || "audio/webm",
            durationSeconds: duration,
          };
          setAttachments((prev) => [...prev, voiceAtt]);
        }
        setIsRecording(false);
        setRecordingSeconds(0);
      };

      mediaRecorderRef.current.stop();
    } else {
      setIsRecording(false);
    }
  };

  // Send message
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanText = text.trim();
    if (!cleanText && attachments.length === 0) return;
    if (isSending || disabled) return;

    try {
      const success = await onSendMessage({
        body: cleanText,
        attachments: [...attachments],
      });

      if (success !== false) {
        setText("");
        setAttachments([]);
        setErrorMessage(null);
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
        setShowAttachMenu(false);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to send message. Please retry.";
      setErrorMessage(errorMsg);
    }
  };

  const isSendDisabled =
    (!text.trim() && attachments.length === 0) || isSending || disabled;

  const filteredGifs = searchCuratedGifs(gifSearchQuery);

  return (
    <div className="chatComposerWrapper" role="region" aria-label="Message composer">
      {/* Hidden file inputs for photo and video */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileSelect}
        aria-hidden="true"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        style={{ display: "none" }}
        onChange={handleFileSelect}
        aria-hidden="true"
      />

      {/* Error alert toast */}
      {(errorMessage || mediaRecorderError) && (
        <div className="chatComposerAlert" role="alert">
          <span>{errorMessage || mediaRecorderError}</span>
          <button
            type="button"
            className="chatComposerAlertClose"
            onClick={() => {
              setErrorMessage(null);
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
              setMediaRecorderError(null);
            }}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Pending Attachments Drawer */}
      {attachments.length > 0 && (
        <div
          className="chatPendingAttachmentsDrawer"
          aria-label="Pending attachments"
        >
          {attachments.map((att) => (
            <div key={att.id} className="pendingAttachmentItem">
              {att.type === "image" || att.type === "gif" ? (
                <img
                  src={att.thumbnailUrl || att.url}
                  alt={att.name}
                  className="pendingThumb"
                />
              ) : att.type === "video" ? (
                <div className="pendingIconBadge videoBadge" aria-hidden="true">🎥</div>
              ) : (
                <div className="pendingIconBadge audioBadge" aria-hidden="true">🎙️</div>
              )}

              <div className="pendingMeta">
                <span className="pendingFileName" title={att.name}>
                  {att.name}
                </span>
                <span className="pendingFileSize">
                  {att.durationSeconds
                    ? formatDuration(att.durationSeconds)
                    : formatFileSize(att.size)}
                </span>
              </div>

              <button
                type="button"
                className="removePendingBtn"
                onClick={() => handleRemoveAttachment(att.id)}
                aria-label={`Remove attachment ${att.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Voice Recording Active Mode */}
      {isRecording ? (
        <div className="chatVoiceRecorderBar" role="region" aria-label="Voice recorder active">
          <div className="recordingPulseGroup">
            <span className="recordingPulseDot" aria-hidden="true" />
            <span className="recordingLiveTimer">
              Recording {formatDuration(recordingSeconds)}
            </span>
          </div>

          <div className="recordingControls">
            <button
              type="button"
              className="recordingCancelBtn"
              onClick={cancelVoiceRecording}
              aria-label="Cancel recording"
            >
              Cancel
            </button>
            <button
              type="button"
              className="recordingDoneBtn"
              onClick={finishVoiceRecording}
              aria-label="Attach voice note"
            >
              Attach Note ✓
            </button>
          </div>
        </div>
      ) : (
        /* Normal Composer Mode */
        <form className="chatComposerForm" onSubmit={handleSend}>
          {/* Action Tools Toolbar */}
          <div className="chatToolbarRow" role="toolbar" aria-label="Media attachment options">
            <button
              type="button"
              className="chatToolBtn"
              onClick={() => photoInputRef.current?.click()}
              title="Attach Photo (up to 15MB)"
              aria-label="Attach Photo"
              disabled={disabled || isSending}
            >
              <span className="toolIcon" aria-hidden="true">🖼️</span>
              <span className="toolLabel">Photo</span>
            </button>

            <button
              type="button"
              className="chatToolBtn"
              onClick={() => videoInputRef.current?.click()}
              title="Attach Video (up to 50MB)"
              aria-label="Attach Video"
              disabled={disabled || isSending}
            >
              <span className="toolIcon" aria-hidden="true">🎥</span>
              <span className="toolLabel">Video</span>
            </button>

            <button
              type="button"
              className="chatToolBtn"
              onClick={startVoiceRecording}
              title="Record Voice Note"
              aria-label="Record Voice Note"
              disabled={disabled || isSending}
            >
              <span className="toolIcon" aria-hidden="true">🎙️</span>
              <span className="toolLabel">Voice</span>
            </button>

            <button
              type="button"
              className={`chatToolBtn ${showGifPicker ? "chatToolBtnActive" : ""}`}
              onClick={() => {
                setShowGifPicker((prev) => !prev);
                setShowEmojiPicker(false);
              }}
              title="Curated Romantic GIFs"
              aria-label="Curated Romantic GIFs"
              disabled={disabled || isSending}
            >
              <span className="toolIcon" aria-hidden="true">✨</span>
              <span className="toolLabel">GIF</span>
            </button>

            <button
              type="button"
              className={`chatToolBtn ${showEmojiPicker ? "chatToolBtnActive" : ""}`}
              onClick={() => {
                setShowEmojiPicker((prev) => !prev);
                setShowGifPicker(false);
              }}
              title="Emoji reaction palette"
              aria-label="Emoji reaction palette"
              disabled={disabled || isSending}
            >
              <span className="toolIcon" aria-hidden="true">😊</span>
            </button>
          </div>

          {/* Curated GIF Picker Popover */}
          {showGifPicker && (
            <div className="chatGifPickerDrawer" role="dialog" aria-label="Curated Celebration GIFs">
              <div className="gifPickerHeader">
                <input
                  type="text"
                  className="gifSearchInput"
                  value={gifSearchQuery}
                  onChange={(e) => setGifSearchQuery(e.target.value)}
                  placeholder="Search romantic celebration GIFs (cake, love, hug)..."
                  aria-label="Search GIFs"
                />
                <button
                  type="button"
                  className="closeGifPickerBtn"
                  onClick={() => setShowGifPicker(false)}
                  aria-label="Close GIF picker"
                >
                  ✕
                </button>
              </div>

              <div className="gifGrid">
                {filteredGifs.map((gif) => (
                  <button
                    key={gif.id}
                    type="button"
                    className="gifGridItem"
                    onClick={() => handleSelectGif(gif)}
                    aria-label={`Select GIF: ${gif.title}`}
                  >
                    <img src={gif.thumbnailUrl} alt={gif.title} loading="lazy" />
                    <span className="gifGridItemTitle">{gif.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Emoji Picker Popover */}
          {showEmojiPicker && (
            <div className="chatEmojiPickerDrawer" role="dialog" aria-label="Emoji picker">
              <div className="emojiPickerGrid">
                {EMOJI_PALETTE.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="emojiPaletteBtn"
                    onClick={() => handleInsertEmoji(emoji)}
                    aria-label={`Insert ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input & Send Button Container */}
          <div className="chatInputRow">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={handleTextChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={placeholder}
              maxLength={maxLength}
              disabled={disabled || isSending}
              aria-label="Message text"
              className="chatTextInput"
              onFocus={() => {
                if (typeof window !== "undefined") {
                  setTimeout(() => window.dispatchEvent(new CustomEvent("chat:focus-input")), 120);
                }
              }}
            />

            <button
              type="submit"
              className="chatSendButton"
              disabled={isSendDisabled}
              aria-label="Send message"
            >
              {isSending ? (
                <span className="sendSpinner" aria-hidden="true" />
              ) : (
                <span className="sendIcon" aria-hidden="true">💌</span>
              )}
              <span className="sendText">Send</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
