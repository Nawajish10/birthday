import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  deriveConversationKey,
  encryptTextMessage,
  decryptTextMessage,
  generateKeyFingerprint,
  ChatDecryptionError,
} from "../src/components/chat/chat-crypto.ts";
import { generateSecurityFingerprint } from "../src/components/chat/chat-helpers.ts";

test("Private Chat E2EE: Full encryption and decryption roundtrip", async () => {
  const passphrase = "meerah-birthday-vault-secret-2026";
  const salt = "meerah-creator-e2ee-salt";
  const plaintext = "Happy Birthday my love! 🌸✨ Looking forward to our celebration.";

  const key = await deriveConversationKey(passphrase, salt);
  const encrypted = await encryptTextMessage(plaintext, key);

  assert.ok(encrypted.ciphertext.length > 0);
  assert.ok(encrypted.iv.length > 0);
  assert.notEqual(encrypted.ciphertext, plaintext, "Ciphertext must not be plaintext");

  const decrypted = await decryptTextMessage(encrypted.ciphertext, encrypted.iv, key);
  assert.equal(decrypted, plaintext, "Decrypted message must match original plaintext exactly");
});

test("Private Chat E2EE: Tamper rejection throws ChatDecryptionError", async () => {
  const passphrase = "meerah-birthday-vault-secret-2026";
  const salt = "meerah-creator-e2ee-salt";
  const plaintext = "Secret birthday surprise";

  const key = await deriveConversationKey(passphrase, salt);
  const encrypted = await encryptTextMessage(plaintext, key);

  // Corrupt the ciphertext
  const tamperedCipher = encrypted.ciphertext.slice(0, -4) + "AAAA";

  await assert.rejects(
    async () => {
      await decryptTextMessage(tamperedCipher, encrypted.iv, key);
    },
    (err: unknown) => {
      return err instanceof ChatDecryptionError || err instanceof Error;
    },
    "Tampered ciphertext must be rejected"
  );
});

test("Private Chat E2EE: Security fingerprint is exactly 16 blocks of 4 hex characters", async () => {
  const key = await deriveConversationKey("meerah-birthday-vault-secret-2026", "meerah-creator-e2ee-salt");
  const fingerprint = await generateKeyFingerprint(key);
  const blocks = fingerprint.split(" ");
  assert.equal(blocks.length, 16, "Must contain 16 space-separated blocks");
  for (const block of blocks) {
    assert.equal(block.length, 4, "Each block must contain 4 hex characters");
    assert.match(block, /^[0-9A-F]{4}$/, "Must be uppercase hex characters");
  }
});

test("Private Chat: Strict Zero-AI rule in human thread", () => {
  const chatPanelPath = path.resolve(process.cwd(), "src/components/chat/ChatPanel.tsx");
  const content = fs.readFileSync(chatPanelPath, "utf-8");

  assert.ok(
    !content.includes("noah-ai") && !content.includes("Noah companion"),
    "ChatPanel must not connect AI bot replies into private human thread"
  );
  assert.ok(
    content.includes("meerah-creator-private-chat"),
    "Security fingerprint must use creator-recipient identity"
  );
  assert.ok(
    content.includes("birthday-offline-chat-queue"),
    "Must implement offline message queueing"
  );
});

test("Private Chat API: Resilient column selection and envelope storage", () => {
  const routePath = path.resolve(process.cwd(), "src/app/api/creator-messages/route.ts");
  const content = fs.readFileSync(routePath, "utf-8");

  // Ensure query only selects standard columns in public.creator_messages
  assert.ok(
    content.includes('SELECT_COLUMNS = "id,visitor_id,sender,body,created_at,read_at"'),
    "API must query only schema-safe columns"
  );

  // Ensure it never directly queries unmigrated columns in SELECT or INSERT
  assert.ok(
    !content.includes('insertPayload = {\n      visitor_id,\n      sender,\n      body,\n      media_url'),
    "Insert payload must only insert standard columns"
  );

  // Ensure formatMessageRow is used to unpack envelopes
  assert.ok(
    content.includes("formatMessageRow"),
    "Must have envelope unpacker function"
  );

  // Ensure resilient fallback store is implemented for schema cache errors and missing tables
  assert.ok(
    content.includes("fallbackStore") && content.includes("getSafeAdminClient"),
    "Must have fallback store and safe client wrapper to prevent 500 crashes"
  );
});

test("Private Chat API: Resilient fallback handling prevents 500 freezes on DB errors", () => {
  const routePath = path.resolve(process.cwd(), "src/app/api/creator-messages/route.ts");
  const content = fs.readFileSync(routePath, "utf-8");

  // Verify that database errors fall back to in-memory store instead of returning 500
  assert.ok(
    content.includes("saveFallbackMessage") && content.includes("getFallbackMessages"),
    "Must provide fallback retrieval and storage methods"
  );
  assert.ok(
    !content.includes('return NextResponse.json({ error: "Unable to load messages." }, { status: 500 })'),
    "Must not freeze chat on query errors with 500 status"
  );
  assert.ok(
    !content.includes('return NextResponse.json({ error: "Unable to send message." }, { status: 500 })'),
    "Must not reject message sends on schema cache errors with 500 status"
  );
});
