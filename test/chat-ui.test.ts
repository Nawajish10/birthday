import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MAX_AUDIO_SIZE,
  MAX_TEXT_LENGTH,
  identifyMediaKind,
  validateAttachment,
  formatFileSize,
  formatDuration,
  formatDateSeparator,
  shouldShowDateSeparator,
  formatMessageTime,
  transitionMessageState,
  createPendingMessage,
  searchCuratedGifs,
  generateSecurityFingerprint,
  CURATED_ROMANTIC_GIFS,
  DEFAULT_INITIAL_MESSAGES,
} from "../src/components/chat/chat-helpers.ts";

import type {
  ChatMessage,
  ChatAttachment,
  ChatRole,
  MediaKind,
  MessageDeliveryStatus,
} from "../src/components/chat/chat-types.ts";

describe("1-to-1 Private Chat UI & Messaging Test Suite", () => {
  // --------------------------------------------------------------------------
  // 1. Media type identification from MIME type
  // --------------------------------------------------------------------------
  describe("Media type identification from MIME type and filename", () => {
    it("identifies images correctly from MIME types", () => {
      assert.equal(identifyMediaKind("image/jpeg"), "image");
      assert.equal(identifyMediaKind("image/png"), "image");
      assert.equal(identifyMediaKind("image/webp"), "image");
      assert.equal(identifyMediaKind("image/avif"), "image");
      assert.equal(identifyMediaKind("image/heic"), "image");
    });

    it("identifies GIFs specifically from MIME type or extension", () => {
      assert.equal(identifyMediaKind("image/gif"), "gif");
      assert.equal(identifyMediaKind("", "celebration.gif"), "gif");
      assert.equal(identifyMediaKind("application/octet-stream", "sparkle.GIF"), "gif");
    });

    it("identifies videos correctly from MIME types and extensions", () => {
      assert.equal(identifyMediaKind("video/mp4"), "video");
      assert.equal(identifyMediaKind("video/webm"), "video");
      assert.equal(identifyMediaKind("video/quicktime"), "video");
      assert.equal(identifyMediaKind("", "memories.mp4"), "video");
    });

    it("identifies audio files correctly for voice notes", () => {
      assert.equal(identifyMediaKind("audio/webm"), "audio");
      assert.equal(identifyMediaKind("audio/mpeg"), "audio");
      assert.equal(identifyMediaKind("audio/wav"), "audio");
      assert.equal(identifyMediaKind("audio/ogg"), "audio");
      assert.equal(identifyMediaKind("audio/aac"), "audio");
      assert.equal(identifyMediaKind("audio/m4a"), "audio");
      assert.equal(identifyMediaKind("", "voicenote.m4a"), "audio");
    });

    it("returns null for unsupported MIME types and file extensions", () => {
      assert.equal(identifyMediaKind("application/pdf"), null);
      assert.equal(identifyMediaKind("text/plain"), null);
      assert.equal(identifyMediaKind("application/zip", "archive.zip"), null);
      assert.equal(identifyMediaKind("", "script.exe"), null);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Attachment validation (size limits: images 15MB, videos 50MB, audio 10MB)
  // --------------------------------------------------------------------------
  describe("Attachment validation & size limits", () => {
    it("enforces image limit of 15MB (15 * 1024 * 1024 bytes)", () => {
      assert.equal(MAX_IMAGE_SIZE, 15 * 1024 * 1024);

      // Valid: 14MB image
      const validImg = validateAttachment({
        size: 14 * 1024 * 1024,
        type: "image/jpeg",
        name: "birthday.jpg",
      });
      assert.equal(validImg.valid, true);
      assert.equal(validImg.kind, "image");

      // Invalid: 16MB image
      const overImg = validateAttachment({
        size: 16 * 1024 * 1024,
        type: "image/png",
        name: "large.png",
      });
      assert.equal(overImg.valid, false);
      assert.ok(overImg.error?.includes("15 MB"));
    });

    it("enforces video limit of 50MB (50 * 1024 * 1024 bytes)", () => {
      assert.equal(MAX_VIDEO_SIZE, 50 * 1024 * 1024);

      // Valid: 45MB video
      const validVideo = validateAttachment({
        size: 45 * 1024 * 1024,
        type: "video/mp4",
        name: "greeting.mp4",
      });
      assert.equal(validVideo.valid, true);
      assert.equal(validVideo.kind, "video");

      // Invalid: 52MB video
      const overVideo = validateAttachment({
        size: 52 * 1024 * 1024,
        type: "video/mp4",
        name: "reel.mp4",
      });
      assert.equal(overVideo.valid, false);
      assert.ok(overVideo.error?.includes("50 MB"));
    });

    it("enforces audio note limit of 10MB (10 * 1024 * 1024 bytes)", () => {
      assert.equal(MAX_AUDIO_SIZE, 10 * 1024 * 1024);

      // Valid: 2MB voice note
      const validAudio = validateAttachment({
        size: 2 * 1024 * 1024,
        type: "audio/webm",
        name: "voice.webm",
      });
      assert.equal(validAudio.valid, true);
      assert.equal(validAudio.kind, "audio");

      // Invalid: 11MB audio file
      const overAudio = validateAttachment({
        size: 11 * 1024 * 1024,
        type: "audio/mpeg",
        name: "podcast.mp3",
      });
      assert.equal(overAudio.valid, false);
      assert.ok(overAudio.error?.includes("10 MB"));
    });

    it("rejects unsupported file attachments with clear message", () => {
      const invalid = validateAttachment({
        size: 500,
        type: "application/json",
        name: "data.json",
      });
      assert.equal(invalid.valid, false);
      assert.ok(invalid.error?.includes("Unsupported file type"));
    });

    it("formats file sizes nicely (KB, MB, B)", () => {
      assert.equal(formatFileSize(500), "500 B");
      assert.equal(formatFileSize(1500), "1.5 KB");
      assert.equal(formatFileSize(2.5 * 1024 * 1024), "2.5 MB");
    });

    it("formats audio duration correctly (M:SS)", () => {
      assert.equal(formatDuration(0), "0:00");
      assert.equal(formatDuration(5), "0:05");
      assert.equal(formatDuration(65), "1:05");
      assert.equal(formatDuration(182), "3:02");
    });
  });

  // --------------------------------------------------------------------------
  // 3. Date separator formatting ("Today", "Yesterday", or formatted dates)
  // --------------------------------------------------------------------------
  describe("Date separator formatting", () => {
    it("formats today as 'Today'", () => {
      const now = new Date(2026, 9, 28, 14, 0, 0); // Oct 28, 2026
      const msgDate = new Date(2026, 9, 28, 10, 30, 0);
      assert.equal(formatDateSeparator(msgDate, now), "Today");
    });

    it("formats yesterday as 'Yesterday'", () => {
      const ref = new Date(2026, 9, 28, 14, 0, 0); // Oct 28, 2026
      const msgDate = new Date(2026, 9, 27, 21, 15, 0); // Oct 27, 2026
      assert.equal(formatDateSeparator(msgDate, ref), "Yesterday");
    });

    it("formats older dates as formatted date string (e.g. 'Oct 20')", () => {
      const ref = new Date(2026, 9, 28, 14, 0, 0); // Oct 28, 2026
      const msgDate = new Date(2026, 9, 20, 12, 0, 0); // Oct 20, 2026
      const result = formatDateSeparator(msgDate, ref);
      assert.ok(result.includes("Oct") && result.includes("20"), `Expected Oct 20, got ${result}`);
    });

    it("includes year when message is from a prior year", () => {
      const ref = new Date(2026, 9, 28, 14, 0, 0); // Oct 28, 2026
      const priorYearDate = new Date(2025, 9, 28, 12, 0, 0); // Oct 28, 2025
      const result = formatDateSeparator(priorYearDate, ref);
      assert.ok(result.includes("2025"), `Expected to include 2025, got ${result}`);
    });

    it("handles invalid or empty dates gracefully without throwing", () => {
      assert.equal(formatDateSeparator("invalid-date"), "Recent");
      assert.equal(formatDateSeparator(""), "Recent");
    });

    it("correctly identifies when date separator divider should appear", () => {
      // First message ever has no prevMsgDate -> true
      assert.equal(shouldShowDateSeparator(undefined, "2026-10-28T10:00:00Z"), true);

      // Two messages on the same calendar day -> false
      assert.equal(
        shouldShowDateSeparator("2026-10-28T10:00:00Z", "2026-10-28T14:30:00Z"),
        false
      );

      // Messages on different days -> true
      assert.equal(
        shouldShowDateSeparator("2026-10-27T23:59:00Z", "2026-10-28T00:01:00Z"),
        true
      );
    });

    it("formats message timestamp accurately", () => {
      const d = new Date("2026-10-28T14:45:00");
      const timeStr = formatMessageTime(d);
      assert.ok(timeStr.includes("2:45") || timeStr.includes("14:45"), `Formatted time was ${timeStr}`);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Message state transitions (sending -> sent, sending -> error, retry)
  // --------------------------------------------------------------------------
  describe("Message state transitions & lifecycle", () => {
    it("creates a pending message in 'sending' state", () => {
      const msg = createPendingMessage("Happy Birthday Meerah!", "recipient");
      assert.equal(msg.body, "Happy Birthday Meerah!");
      assert.equal(msg.sender, "recipient");
      assert.equal(msg.status, "sending");
      assert.ok(msg.id.startsWith("local-"));
      assert.ok(msg.createdAt);
    });

    it("transitions state from 'sending' to 'sent' on success", () => {
      const msg = createPendingMessage("Thinking of you ♡", "creator");
      assert.equal(msg.status, "sending");

      const sentMsg = transitionMessageState(msg, "sent");
      assert.equal(sentMsg.status, "sent");
      assert.equal(sentMsg.body, msg.body);
      assert.equal(sentMsg.id, msg.id);
    });

    it("transitions state from 'sending' to 'error' on delivery failure", () => {
      const msg = createPendingMessage("Test message", "recipient");
      assert.equal(msg.status, "sending");

      const errorMsg = transitionMessageState(msg, "error");
      assert.equal(errorMsg.status, "error");
    });

    it("handles retry transition from 'error' back to 'sending'", () => {
      const msg = createPendingMessage("Retry test", "recipient");
      const failed = transitionMessageState(msg, "error");
      assert.equal(failed.status, "error");

      const retrying = transitionMessageState(failed, "sending");
      assert.equal(retrying.status, "sending");

      const finallySent = transitionMessageState(retrying, "sent");
      assert.equal(finallySent.status, "sent");
    });
  });

  // --------------------------------------------------------------------------
  // 5. Curated Romantic GIFs and E2EE Security Fingerprint
  // --------------------------------------------------------------------------
  describe("Curated romantic GIFs & Security Verification", () => {
    it("provides curated romantic celebration GIFs", () => {
      assert.ok(CURATED_ROMANTIC_GIFS.length >= 6);
      CURATED_ROMANTIC_GIFS.forEach((gif) => {
        assert.ok(gif.id, "GIF must have id");
        assert.ok(gif.title, "GIF must have title");
        assert.ok(gif.url, "GIF must have url");
        assert.ok(gif.thumbnailUrl, "GIF must have thumbnailUrl");
        assert.ok(Array.isArray(gif.tags) && gif.tags.length > 0, "GIF must have tags");
      });
    });

    it("searches curated GIFs by keyword", () => {
      const cakeMatches = searchCuratedGifs("cake");
      assert.ok(cakeMatches.length > 0);
      assert.ok(cakeMatches.some((g) => g.tags.includes("cake") || g.title.toLowerCase().includes("cake")));

      const loveMatches = searchCuratedGifs("love");
      assert.ok(loveMatches.length > 0);

      // Empty query returns all
      const all = searchCuratedGifs("");
      assert.equal(all.length, CURATED_ROMANTIC_GIFS.length);
    });

    it("generates 8 groups of 4-character hex security fingerprint for E2EE modal", () => {
      const fp = generateSecurityFingerprint("test-visitor-id");
      assert.ok(typeof fp === "string");
      const parts = fp.split(/\s+/);
      assert.equal(parts.length, 8, "Must contain exactly 8 hex groups");
      parts.forEach((p) => {
        assert.equal(p.length, 4, "Each group must be 4 characters");
        assert.match(p, /^[0-9A-F]{4}$/, "Each group must be uppercase hex");
      });

      // Deterministic check: same seed gives same fingerprint
      const fp2 = generateSecurityFingerprint("test-visitor-id");
      assert.equal(fp, fp2);
    });

    it("includes rich default initial messages for warm offline fallback", () => {
      assert.ok(DEFAULT_INITIAL_MESSAGES.length >= 2);
      assert.equal(DEFAULT_INITIAL_MESSAGES[0].sender, "creator");
      assert.ok(DEFAULT_INITIAL_MESSAGES[0].body.includes("Meerah"));
    });
  });

  // --------------------------------------------------------------------------
  // 6. Component file exports and contracts
  // --------------------------------------------------------------------------
  describe("Component exports and structural contract", () => {
    it("ChatTimeline.tsx exists and exports ChatTimeline & VoiceNotePlayer", () => {
      const filePath = path.resolve(process.cwd(), "src/components/chat/ChatTimeline.tsx");
      assert.ok(fs.existsSync(filePath), "ChatTimeline.tsx must exist");
      const src = fs.readFileSync(filePath, "utf-8");

      assert.ok(src.includes("export function ChatTimeline"), "Must export ChatTimeline");
      assert.ok(src.includes("export function VoiceNotePlayer"), "Must export VoiceNotePlayer");

      // Accessibility & security checks
      assert.ok(src.includes('role="log"'), "Timeline must declare role='log'");
      assert.ok(src.includes('aria-live="polite"'), "Timeline must declare aria-live='polite'");
      assert.ok(src.includes('aria-label="Private message history"'), "Timeline must have descriptive aria-label");
      assert.ok(src.includes("autoPlay={false}"), "Videos must have zero autoplay");
      assert.ok(src.includes("playsInline"), "Videos must have playsInline");

      // Check no invalid nested buttons
      const buttons = src.match(/<button[\s\S]*?<\/button>/g) || [];
      for (const b of buttons) {
        const innerCount = (b.match(/<button/g) || []).length;
        assert.equal(innerCount, 1, `Found invalid nested <button> in: ${b.slice(0, 80)}`);
      }
    });

    it("ChatComposer.tsx exists and exports ChatComposer", () => {
      const filePath = path.resolve(process.cwd(), "src/components/chat/ChatComposer.tsx");
      assert.ok(fs.existsSync(filePath), "ChatComposer.tsx must exist");
      const src = fs.readFileSync(filePath, "utf-8");

      assert.ok(src.includes("export function ChatComposer"), "Must export ChatComposer");
      assert.ok(src.includes("maxLength={maxLength}"), "Composer must respect maxLength");
      assert.ok(src.includes("getUserMedia"), "Must check getUserMedia for voice notes");
      assert.ok(src.includes('role="region"'), "Must have accessible region");
      assert.ok(src.includes('role="toolbar"'), "Must have accessible toolbar");

      // Check no invalid nested buttons
      const buttons = src.match(/<button[\s\S]*?<\/button>/g) || [];
      for (const b of buttons) {
        const innerCount = (b.match(/<button/g) || []).length;
        assert.equal(innerCount, 1, `Found invalid nested <button> in: ${b.slice(0, 80)}`);
      }
    });

    it("ChatPanel.tsx exists and exports ChatPanel", () => {
      const filePath = path.resolve(process.cwd(), "src/components/chat/ChatPanel.tsx");
      assert.ok(fs.existsSync(filePath), "ChatPanel.tsx must exist");
      const src = fs.readFileSync(filePath, "utf-8");

      assert.ok(src.includes("export function ChatPanel"), "Must export ChatPanel");
      assert.ok(src.includes("ChatTimeline"), "Must integrate ChatTimeline");
      assert.ok(src.includes("ChatComposer"), "Must integrate ChatComposer");
      assert.ok(src.includes("generateSecurityFingerprint"), "Must support E2EE safety fingerprint");
      assert.ok(src.includes("showSecurityModal"), "Must have security modal toggle");

      // Check strictly 1-to-1 human rule (no AI chat toggles)
      assert.ok(!src.includes("Switch to Noah"), "Must not include AI guide switch button");
    });
  });

  // --------------------------------------------------------------------------
  // 7. CSS verification & responsive rules
  // --------------------------------------------------------------------------
  describe("CSS verification: chat.css responsive styling & Love Theme", () => {
    it("chat.css exists and defines Love Theme variables and classes", () => {
      const cssPath = path.resolve(process.cwd(), "src/components/chat/chat.css");
      assert.ok(fs.existsSync(cssPath), "chat.css must exist");
      const css = fs.readFileSync(cssPath, "utf-8");

      // Containers and headers
      assert.ok(css.includes(".chatPanelContainer"), "Must define .chatPanelContainer");
      assert.ok(css.includes(".chatPanelHeader"), "Must define .chatPanelHeader");
      assert.ok(css.includes(".chatTimelineContainer"), "Must define .chatTimelineContainer");

      // Bubbles
      assert.ok(css.includes(".bubbleIncoming"), "Must define .bubbleIncoming");
      assert.ok(css.includes(".bubbleOutgoing"), "Must define .bubbleOutgoing");
      assert.ok(css.includes(".chatDateDivider"), "Must define .chatDateDivider");

      // Media & Voice Note
      assert.ok(css.includes(".voiceNoteBar"), "Must define .voiceNoteBar");
      assert.ok(css.includes(".voiceNotePlayBtn"), "Must define .voiceNotePlayBtn");
      assert.ok(css.includes(".voiceNoteWaveform"), "Must define .voiceNoteWaveform");
      assert.ok(css.includes(".chatVideoPlayer"), "Must define .chatVideoPlayer");
      assert.ok(css.includes(".chatLightboxModal"), "Must define .chatLightboxModal");

      // Composer
      assert.ok(css.includes(".chatComposerWrapper"), "Must define .chatComposerWrapper");
      assert.ok(css.includes(".chatVoiceRecorderBar"), "Must define .chatVoiceRecorderBar");
      assert.ok(css.includes(".chatPendingAttachmentsDrawer"), "Must define .chatPendingAttachmentsDrawer");
      assert.ok(css.includes(".chatGifPickerDrawer"), "Must define .chatGifPickerDrawer");

      // Responsive Breakpoints
      assert.ok(css.includes("@media (max-width: 768px)"), "Must define 768px tablet breakpoint");
      assert.ok(css.includes("@media (max-width: 430px)"), "Must define 430px mobile breakpoint");
      assert.ok(css.includes("@media (max-width: 360px)"), "Must define 360px compact mobile breakpoint");
    });
  });
});
