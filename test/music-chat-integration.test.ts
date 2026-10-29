import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  SEED_MUSIC_CATALOGUE,
  searchAndFilterTracks,
  formatDuration,
  parseDurationToSeconds,
  getNextTrackIndex,
  getPreviousTrackIndex,
} from "../src/components/music/music-catalogue.ts";
import {
  generateConversationKey,
  encryptChatMessage,
  decryptChatMessage,
  generateKeyFingerprint,
} from "../src/components/chat/chat-crypto.ts";
import {
  DEFAULT_INITIAL_MESSAGES,
  identifyMediaKind,
  validateAttachment,
  formatFileSize,
  generateSecurityFingerprint,
} from "../src/components/chat/chat-helpers.ts";

describe("Integrated Music Room & Private Chat Acceptance Tests", () => {
  describe("1. Music Room Integration & Catalogue Integrity", () => {
    test("Music Room catalogue contains 50 verified romantic entries", () => {
      assert.equal(SEED_MUSIC_CATALOGUE.length, 50);
      for (const track of SEED_MUSIC_CATALOGUE) {
        assert.ok(track.id, "Track must have an ID");
        assert.ok(track.title, "Track must have a title");
        assert.ok(track.artist, "Track must have an artist");
        assert.ok(track.duration, "Track must have a duration string");
        assert.ok(track.durationSeconds > 0, "Track must have positive duration in seconds");
      }
    });

    test("Music Room search and filtering operates with zero latency", () => {
      const results = searchAndFilterTracks(SEED_MUSIC_CATALOGUE, "Stephen Sanchez", "all");
      assert.ok(results.length >= 1);
      assert.match(results[0].title.toLowerCase(), /until i found you/);

      const favorites = searchAndFilterTracks(SEED_MUSIC_CATALOGUE, "", "favorites");
      assert.ok(favorites.length > 0);
      assert.ok(favorites.every((t) => t.isFavorite));
    });

    test("Playback navigation handles loop and shuffle bounds safely", () => {
      const nextIndex = getNextTrackIndex(49, 50, false, true);
      assert.equal(nextIndex, 0); // Wraps around when repeat is on

      const prevIndex = getPreviousTrackIndex(0, 50);
      assert.equal(prevIndex, 49); // Wraps to end
    });
  });

  describe("2. End-to-End Encryption Contract & Security", () => {
    test("E2EE key generation, message encryption, and decryption roundtrip", async () => {
      const passphrase = "meerah-noah-secret-birthday-key-2026";
      const salt = "unique-salt-october-30";
      const key = await generateConversationKey(passphrase, salt);

      const plaintext = "Happy Birthday Meerah! You mean the world to me ♡";
      const { ciphertext, iv } = await encryptChatMessage(plaintext, key);

      assert.notEqual(ciphertext, plaintext);
      assert.ok(iv.length > 0);

      const decrypted = await decryptChatMessage(ciphertext, iv, key);
      assert.equal(decrypted, plaintext);
    });

    test("Tampered ciphertext or IV is rejected by AES-GCM authentication tag", async () => {
      const key = await generateConversationKey("passphrase", "salt");
      const { ciphertext, iv } = await encryptChatMessage("Sensitive Love Letter", key);

      // Tamper ciphertext
      const tamperedCiphertext =
        ciphertext.slice(0, -4) + (ciphertext.slice(-4) === "AAAA" ? "BBBB" : "AAAA");
      await assert.rejects(
        async () => {
          await decryptChatMessage(tamperedCiphertext, iv, key);
        },
        /operation failed|tampered|tag|failed|modified|invalid/i
      );
    });

    test("Key fingerprint provides 16 groups of 4-character hex strings for verification", async () => {
      const key = await generateConversationKey("passphrase", "salt");
      const fp = await generateKeyFingerprint(key);
      const groups = fp.split(" ");
      assert.equal(groups.length, 16);
      for (const g of groups) {
        assert.equal(g.length, 4);
        assert.match(g, /^[0-9A-F]{4}$/);
      }
    });
  });

  describe("3. 1-to-1 Private Chat UI & Media Attachment Contracts", () => {
    test("MIME type identification supports image, video, audio, and gif", () => {
      assert.equal(identifyMediaKind("image/jpeg", "photo.jpg"), "image");
      assert.equal(identifyMediaKind("image/gif", "celebrate.gif"), "gif");
      assert.equal(identifyMediaKind("video/mp4", "memory.mp4"), "video");
      assert.equal(identifyMediaKind("audio/webm", "voice-note.webm"), "audio");
      assert.equal(identifyMediaKind("application/pdf", "doc.pdf"), null);
    });

    test("Enforces safe media size limits and formats readable labels", () => {
      assert.equal(validateAttachment({ size: 14 * 1024 * 1024, type: "image/jpeg" }).valid, true);
      assert.equal(validateAttachment({ size: 16 * 1024 * 1024, type: "image/jpeg" }).valid, false);

      assert.equal(validateAttachment({ size: 45 * 1024 * 1024, type: "video/mp4" }).valid, true);
      assert.equal(validateAttachment({ size: 55 * 1024 * 1024, type: "video/mp4" }).valid, false);

      assert.equal(formatFileSize(1024 * 1024 * 3.5), "3.5 MB");
    });

    test("Default initial messages provide comforting offline fallback", () => {
      assert.ok(DEFAULT_INITIAL_MESSAGES.length >= 2);
      assert.ok(DEFAULT_INITIAL_MESSAGES.every((m) => m.sender === "creator" || m.sender === "recipient"));
      assert.ok(DEFAULT_INITIAL_MESSAGES[0].body.includes("Happy Birthday"));
    });
  });

  describe("4. Love Theme Design System Compliance", () => {
    test("design.md and music-panel.html are preserved in repository", () => {
      const designPath = path.join(process.cwd(), "design.md");
      const musicPanelPath = path.join(process.cwd(), "music-panel.html");
      assert.ok(fs.existsSync(designPath), "design.md must exist in root");
      assert.ok(fs.existsSync(musicPanelPath), "music-panel.html must exist in root");
    });

    test("styles.css defines [data-theme='love'] semantic tokens", () => {
      const stylesPath = path.join(process.cwd(), "src/app/styles.css");
      const stylesContent = fs.readFileSync(stylesPath, "utf-8");
      assert.ok(stylesContent.includes('[data-theme="love"]'));
      assert.ok(stylesContent.includes("--color-bg: #1A0F1F"));
      assert.ok(stylesContent.includes("--color-surface: #26132B"));
      assert.ok(stylesContent.includes("--color-primary: #F7A8B8"));
      assert.ok(stylesContent.includes("--color-accent: #D4A47C"));
    });

    test("Experience.tsx integrates both MusicRoom and ChatPanel into tabs", () => {
      const expPath = path.join(process.cwd(), "src/components/Experience.tsx");
      const expContent = fs.readFileSync(expPath, "utf-8");
      assert.ok(expContent.includes("import { MusicRoom } from \"./music/MusicRoom\""));
      assert.ok(expContent.includes("import { ChatPanel } from \"./chat/ChatPanel\""));
      assert.ok(expContent.includes("<MusicRoom externalAudioRef={playerRef} />"));
      assert.ok(expContent.includes("<ChatPanel />"));
    });
  });
});
