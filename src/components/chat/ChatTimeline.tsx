"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import type {
  ChatAttachment,
  ChatTimelineProps,
} from "./chat-types";
import {
  formatDateSeparator,
  shouldShowDateSeparator,
  formatMessageTime,
  formatDuration,
  formatFileSize,
} from "./chat-helpers";

const QUICK_EMOJIS = ["❤️", "🌸", "✨", "🥺", "🎂", "💌"];

/**
 * Romantic Voice Note Player component with visual waveform and play/pause
 */
export function VoiceNotePlayer({
  attachment,
  isOutgoing,
}: {
  attachment: ChatAttachment;
  isOutgoing: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(attachment.durationSeconds || 0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {
        setIsPlaying(false);
      });
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current && (!duration || isNaN(duration))) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const onEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Fixed visual heights for romantic waveform bars
  const waveformBarHeights = [28, 45, 70, 35, 85, 60, 40, 95, 65, 30, 80, 50, 90, 45, 60, 75, 40, 65, 85, 35];
  const progressRatio = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const activeBarIndex = Math.floor(progressRatio * waveformBarHeights.length);

  return (
    <div
      className={`voiceNoteBar ${isOutgoing ? "voiceNoteOutgoing" : "voiceNoteIncoming"}`}
      role="region"
      aria-label={`Voice note: ${attachment.name || "recording"}`}
    >
      <audio
        ref={audioRef}
        src={attachment.url}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
      />

      <button
        type="button"
        className="voiceNotePlayBtn"
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
      >
        {isPlaying ? (
          <span className="voiceNoteIcon" aria-hidden="true">⏸</span>
        ) : (
          <span className="voiceNoteIcon playGlyph" aria-hidden="true">▶</span>
        )}
      </button>

      <div className="voiceNoteContent">
        <div className="voiceNoteWaveform" aria-hidden="true">
          {waveformBarHeights.map((height, idx) => {
            const isPlayed = idx <= activeBarIndex && progressRatio > 0;
            return (
              <span
                key={idx}
                className={`voiceBar ${isPlayed ? "voiceBarActive" : ""}`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>

        <div className="voiceNoteMeta">
          <span className="voiceNoteTime">
            {formatDuration(isPlaying ? currentTime : duration || attachment.durationSeconds || 0)}
          </span>
          <span className="voiceNoteTag">Voice Note 🎙</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Chat Timeline component displaying messages, media, status indicators, and reactions
 */
export function ChatTimeline({
  messages,
  currentUserRole = "recipient",
  onRetryMessage,
  onAddReaction,
  onImageClick,
}: ChatTimelineProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const prevMessagesLength = useRef<number>(messages.length);
  const userScrolledUpRef = useRef<boolean>(false);

  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<ChatAttachment | null>(null);

  // Monitor scroll position to avoid forcing bottom scroll when user is reading older messages
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceToBottom = scrollHeight - (scrollTop + clientHeight);
    userScrolledUpRef.current = distanceToBottom > 80;
  }, []);

  // Pins to bottom on initial load or if user hasn't scrolled far up
  useEffect(() => {
    const isNewMessage = messages.length > prevMessagesLength.current;
    prevMessagesLength.current = messages.length;

    if (!userScrolledUpRef.current || isNewMessage) {
      if (bottomAnchorRef.current) {
        bottomAnchorRef.current.scrollIntoView({ behavior: isNewMessage ? "smooth" : "auto" });
      }
    }
  }, [messages]);

  const handleImageTap = (att: ChatAttachment) => {
    if (onImageClick) {
      onImageClick(att);
    } else {
      setLightboxImage(att);
    }
  };

  return (
    <div
      className="chatTimelineContainer"
      ref={containerRef}
      onScroll={handleScroll}
      role="log"
      aria-label="Private message history"
      aria-live="polite"
    >
      <div className="chatTimelinePreamble">
        <div className="chatTimelineEncryptedNotice">
          <span className="chatLockIcon" aria-hidden="true">🔒</span>
          <p>
            Messages and media are end-to-end encrypted between you and the creator.
            No one else can read or listen to them.
          </p>
        </div>
      </div>

      {messages.map((msg, index) => {
        const isOutgoing = msg.sender === currentUserRole;
        const prevMsg = index > 0 ? messages[index - 1] : undefined;
        const showDateSeparator = shouldShowDateSeparator(prevMsg?.createdAt, msg.createdAt);
        const formattedDate = formatDateSeparator(msg.createdAt);

        return (
          <React.Fragment key={msg.id}>
            {showDateSeparator && (
              <div className="chatDateDivider" role="separator">
                <span className="chatDateBadge">{formattedDate}</span>
              </div>
            )}

            <div
              className={`chatMessageRow ${isOutgoing ? "chatRowOutgoing" : "chatRowIncoming"}`}
              data-message-id={msg.id}
            >
              <div
                className={`chatBubble ${isOutgoing ? "bubbleOutgoing" : "bubbleIncoming"} ${
                  msg.status === "error" ? "bubbleError" : ""
                }`}
              >
                {/* Sender badge for context */}
                <div className="chatSenderHeader">
                  <span className="chatSenderName">
                    {msg.sender === "creator" ? "Noah ♡" : "Meerah"}
                  </span>
                  <time className="chatMessageTime" dateTime={msg.createdAt}>
                    {formatMessageTime(msg.createdAt)}
                  </time>
                </div>

                {/* Media attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="chatAttachmentsGrid">
                    {msg.attachments.map((att) => {
                      if (att.type === "image") {
                        return (
                          <div
                            key={att.id}
                            className="chatMediaItem chatImageItem"
                            onClick={() => handleImageTap(att)}
                            role="button"
                            tabIndex={0}
                            aria-label={`Open photo: ${att.name || "Birthday photo"}`}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                handleImageTap(att);
                              }
                            }}
                          >
                            <img
                              src={att.thumbnailUrl || att.url}
                              alt={att.caption || att.name || "Photo attachment"}
                              className="chatThumbnail"
                              loading="lazy"
                            />
                            {att.caption && (
                              <p className="chatAttachmentCaption">{att.caption}</p>
                            )}
                          </div>
                        );
                      }

                      if (att.type === "gif") {
                        return (
                          <div key={att.id} className="chatMediaItem chatGifItem">
                            <span className="chatGifBadge" aria-hidden="true">GIF</span>
                            <img
                              src={att.url}
                              alt={att.name || "Celebration GIF"}
                              className="chatGifImage"
                              loading="lazy"
                            />
                          </div>
                        );
                      }

                      if (att.type === "video") {
                        return (
                          <div key={att.id} className="chatMediaItem chatVideoItem">
                            <video
                              src={att.url}
                              controls
                              playsInline
                              autoPlay={false}
                              preload="metadata"
                              className="chatVideoPlayer"
                              poster={att.thumbnailUrl}
                              aria-label={`Video: ${att.name || "birthday video clip"}`}
                            />
                            {att.caption && (
                              <p className="chatAttachmentCaption">{att.caption}</p>
                            )}
                          </div>
                        );
                      }

                      if (att.type === "audio") {
                        return (
                          <VoiceNotePlayer
                            key={att.id}
                            attachment={att}
                            isOutgoing={isOutgoing}
                          />
                        );
                      }

                      return null;
                    })}
                  </div>
                )}

                {/* Text Body */}
                {msg.body && <p className="chatMessageText">{msg.body}</p>}

                {/* Footer with delivery status & reaction trigger */}
                <div className="chatBubbleFooter">
                  <div className="chatReactionsList">
                    {msg.reactions &&
                      Object.entries(msg.reactions).map(([emoji, count]) => {
                        if (count <= 0) return null;
                        const hasReacted = msg.myReactions?.includes(emoji);
                        return (
                          <button
                            key={emoji}
                            type="button"
                            className={`reactionPill ${hasReacted ? "reactionPillActive" : ""}`}
                            onClick={() => onAddReaction && onAddReaction(msg.id, emoji)}
                            aria-label={`React with ${emoji}, currently ${count}`}
                          >
                            <span>{emoji}</span>
                            <span className="reactionCount">{count}</span>
                          </button>
                        );
                      })}
                  </div>

                  <div className="chatStatusGroup">
                    {isOutgoing && (
                      <span className="chatDeliveryStatus">
                        {msg.status === "sending" && (
                          <span
                            className="chatSpinner"
                            title="Sending message..."
                            aria-label="Sending message..."
                          />
                        )}
                        {msg.status === "queued" && (
                          <span
                            className="chatQueuedIcon"
                            title="Queued offline — waiting for network reconnection"
                            aria-label="Queued offline"
                          >
                            ⏳
                          </span>
                        )}
                        {msg.status === "server-accepted" && (
                          <span
                            className="chatServerAcceptedIcon"
                            title="Accepted in session memory (not yet durably written to database)"
                            aria-label="Session memory only"
                          >
                            ✓
                          </span>
                        )}
                        {msg.status === "durably-persisted" && (
                          <span
                            className="chatCheckmark chatDurablePersisted"
                            title="Delivered and durably persisted in database"
                            aria-label="Delivered and preserved in database"
                          >
                            ✓✓
                          </span>
                        )}
                        {msg.status === "sent" && (
                          <span
                            className="chatCheckmark"
                            title="Delivered"
                            aria-label="Delivered"
                          >
                            ✓
                          </span>
                        )}
                        {msg.status === "error" && (
                          <button
                            type="button"
                            className="chatRetryBtn"
                            onClick={() => onRetryMessage && onRetryMessage(msg.id)}
                            title="Failed to deliver. Click to retry."
                            aria-label="Retry sending failed message"
                          >
                            <span className="errorIcon" aria-hidden="true">⚠️</span> Retry
                          </button>
                        )}
                      </span>
                    )}

                    {/* Emoji reaction picker button */}
                    <button
                      type="button"
                      className="chatReactTriggerBtn"
                      onClick={() =>
                        setActiveReactionMessageId((prev) =>
                          prev === msg.id ? null : msg.id
                        )
                      }
                      title="Add reaction"
                      aria-label="Add reaction to message"
                    >
                      ♡
                    </button>
                  </div>
                </div>

                {/* Popover Reaction Bar */}
                {activeReactionMessageId === msg.id && (
                  <div className="chatReactionPickerPopover" role="toolbar" aria-label="Emoji reactions">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="quickEmojiBtn"
                        onClick={() => {
                          if (onAddReaction) onAddReaction(msg.id, emoji);
                          setActiveReactionMessageId(null);
                        }}
                        aria-label={`React ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="closePopoverBtn"
                      onClick={() => setActiveReactionMessageId(null)}
                      aria-label="Close reaction picker"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          </React.Fragment>
        );
      })}

      <div ref={bottomAnchorRef} className="chatTimelineBottomAnchor" />

      {/* Lightbox for tapped photos */}
      {lightboxImage && (
        <div
          className="chatLightboxModal"
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
        >
          <div
            className="chatLightboxBackdrop"
            onClick={() => setLightboxImage(null)}
          />
          <div className="chatLightboxContent">
            <button
              type="button"
              className="chatLightboxCloseBtn"
              onClick={() => setLightboxImage(null)}
              aria-label="Close photo preview"
            >
              ✕
            </button>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.caption || lightboxImage.name || "Full size photo"}
              className="chatLightboxImage"
            />
            {lightboxImage.caption && (
              <p className="chatLightboxCaption">{lightboxImage.caption}</p>
            )}
            <div className="chatLightboxMeta">
              <span>{lightboxImage.name}</span>
              <span>{formatFileSize(lightboxImage.size)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
