import test from "node:test";
import assert from "node:assert/strict";
import {
  generateConversationKey,
  encryptChatMessage,
  decryptChatMessage,
  generateKeyFingerprint,
  encryptMediaAttachment,
  decryptMediaAttachment,
  ChatDecryptionError,
  base64ToUint8Array,
} from "../src/components/chat/chat-crypto.ts";

test("Key derivation is deterministic given identical passphrase and salt", async () => {
  const pass = "meerah-birthday-secret-2026";
  const salt = "shared-conversation-salt-v1";

  const key1 = await generateConversationKey(pass, salt);
  const key2 = await generateConversationKey(pass, salt);

  const raw1 = await globalThis.crypto.subtle.exportKey("raw", key1);
  const raw2 = await globalThis.crypto.subtle.exportKey("raw", key2);

  assert.equal(raw1.byteLength, 32, "Derived key must be 256-bit (32 bytes)");
  assert.deepEqual(new Uint8Array(raw1), new Uint8Array(raw2), "Keys from same pass/salt must be identical");

  const fp1 = await generateKeyFingerprint(key1);
  const fp2 = await generateKeyFingerprint(key2);
  assert.equal(fp1, fp2, "Fingerprints for identical keys must match");
});

test("Key derivation yields distinct keys for different passphrases or salts", async () => {
  const keyBase = await generateConversationKey("passphrase-A", "salt-1");
  const keyDiffPass = await generateConversationKey("passphrase-B", "salt-1");
  const keyDiffSalt = await generateConversationKey("passphrase-A", "salt-2");

  const rawBase = new Uint8Array(await globalThis.crypto.subtle.exportKey("raw", keyBase));
  const rawDiffPass = new Uint8Array(await globalThis.crypto.subtle.exportKey("raw", keyDiffPass));
  const rawDiffSalt = new Uint8Array(await globalThis.crypto.subtle.exportKey("raw", keyDiffSalt));

  assert.notDeepEqual(rawBase, rawDiffPass, "Different passphrase must yield different key");
  assert.notDeepEqual(rawBase, rawDiffSalt, "Different salt must yield different key");
});

test("Key derivation rejects empty passphrase or salt", async () => {
  await assert.rejects(
    async () => generateConversationKey("", "valid-salt"),
    /Passphrase must be a non-empty string/
  );
  await assert.rejects(
    async () => generateConversationKey("valid-pass", ""),
    /Salt must be a non-empty string/
  );
});

test("Successful roundtrip encryption and decryption of text messages", async () => {
  const key = await generateConversationKey("strong-passphrase", "test-salt");
  const messages = [
    "Hello Meerah, happy 25th birthday! 🎂✨",
    "A multi-line private message:\nLine 1: Special memory\nLine 2: Forever cherished",
    "دل سے لکھی گئی ایک خوبصورت بات — Urdu text support verification",
    "Special symbols & emoji test: 💖🎁🎉🔒🔑🛡️ 1234567890 !@#$%^&*()",
    "A".repeat(5000), // Long message
  ];

  for (const originalText of messages) {
    const encrypted = await encryptChatMessage(originalText, key);

    // Verify IV format (12 bytes base64)
    const ivBytes = base64ToUint8Array(encrypted.iv);
    assert.equal(ivBytes.byteLength, 12, "IV must be exactly 12 bytes");

    // Verify ciphertext is non-empty string
    assert.ok(encrypted.ciphertext.length > 0, "Ciphertext must not be empty");

    // Decrypt and compare
    const decrypted = await decryptChatMessage(encrypted.ciphertext, encrypted.iv, key);
    assert.equal(decrypted, originalText, "Decrypted message must match original plaintext");
  }
});

test("Each encryption produces an unpredictable fresh IV and unique ciphertext", async () => {
  const key = await generateConversationKey("same-pass", "same-salt");
  const message = "Constant plaintext message";

  const enc1 = await encryptChatMessage(message, key);
  const enc2 = await encryptChatMessage(message, key);

  assert.notEqual(enc1.iv, enc2.iv, "Each encryption must use an unpredictable random IV");
  assert.notEqual(enc1.ciphertext, enc2.ciphertext, "Ciphertexts must differ due to distinct IVs");

  assert.equal(await decryptChatMessage(enc1.ciphertext, enc1.iv, key), message);
  assert.equal(await decryptChatMessage(enc2.ciphertext, enc2.iv, key), message);
});

test("Decryption failure / tampering rejection with modified ciphertext", async () => {
  const key = await generateConversationKey("secret-key", "tamper-salt");
  const { ciphertext, iv } = await encryptChatMessage("Sensitive secret payload", key);

  // Flip a byte in the base64 ciphertext
  const cipherBytes = base64ToUint8Array(ciphertext);
  cipherBytes[0] ^= 0x55; // mutate first byte
  const tamperedCiphertext = Buffer.from(cipherBytes).toString("base64");

  await assert.rejects(
    async () => decryptChatMessage(tamperedCiphertext, iv, key),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /Decryption failed/i);
      return true;
    },
    "Tampered ciphertext must fail authentication and throw error"
  );
});

test("Decryption failure / tampering rejection with modified IV", async () => {
  const key = await generateConversationKey("secret-key", "tamper-salt");
  const { ciphertext, iv } = await encryptChatMessage("Payload with valid IV", key);

  // Flip a byte in the IV
  const ivBytes = base64ToUint8Array(iv);
  ivBytes[0] ^= 0xaa;
  const tamperedIv = Buffer.from(ivBytes).toString("base64");

  await assert.rejects(
    async () => decryptChatMessage(ciphertext, tamperedIv, key),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      return true;
    },
    "Modified IV must fail authentication tag check"
  );
});

test("Decryption rejects invalid IV length (must be 12 bytes)", async () => {
  const key = await generateConversationKey("secret-key", "salt");
  const { ciphertext } = await encryptChatMessage("Test", key);

  // 8-byte IV
  const shortIv = Buffer.from(new Uint8Array(8)).toString("base64");
  await assert.rejects(
    async () => decryptChatMessage(ciphertext, shortIv, key),
    /Invalid IV length: expected 12 bytes/
  );

  // 16-byte IV
  const longIv = Buffer.from(new Uint8Array(16)).toString("base64");
  await assert.rejects(
    async () => decryptChatMessage(ciphertext, longIv, key),
    /Invalid IV length: expected 12 bytes/
  );
});

test("Decryption fails when attempting to decrypt with incorrect key", async () => {
  const keyA = await generateConversationKey("passphrase-alice", "salt");
  const keyB = await generateConversationKey("passphrase-bob", "salt");

  const { ciphertext, iv } = await encryptChatMessage("Confidential between Alice and Bob", keyA);

  await assert.rejects(
    async () => decryptChatMessage(ciphertext, iv, keyB),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      return true;
    },
    "Wrong key must reject decryption"
  );
});

test("Key fingerprint generation matches expected SHA-256 formatted output", async () => {
  const key = await generateConversationKey("verification-pass", "verification-salt");
  const fingerprint = await generateKeyFingerprint(key);

  // Verify format: 16 groups of 4 hexadecimal characters separated by space
  // Total characters: 16 * 4 + 15 spaces = 79 characters
  assert.equal(fingerprint.length, 79, "Fingerprint should have 16 4-char groups separated by spaces");
  assert.match(
    fingerprint,
    /^[0-9A-F]{4}( [0-9A-F]{4}){15}$/,
    "Fingerprint must match formatted uppercase 64-char hex partitioned into 4-char blocks"
  );

  // Verify deterministic output
  const fingerprintAgain = await generateKeyFingerprint(key);
  assert.equal(fingerprint, fingerprintAgain, "Fingerprint must be deterministic");

  // Verify manual SHA-256 comparison
  const rawKey = await globalThis.crypto.subtle.exportKey("raw", key);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", rawKey);
  const expectedHex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  const expectedFormatted = expectedHex.match(/.{1,4}/g)!.join(" ");

  assert.equal(fingerprint, expectedFormatted, "Fingerprint must match manual SHA-256 hex digest");
});

test("Media buffer roundtrip encryption and decryption", async () => {
  const key = await generateConversationKey("media-passphrase", "media-salt");

  // Test various media buffer sizes: small, medium (64KB), larger (256KB)
  const testSizes = [16, 1024, 64 * 1024, 256 * 1024];

  for (const size of testSizes) {
    const originalBytes = new Uint8Array(size);
    // Fill with pseudo-random test pattern
    for (let i = 0; i < size; i++) {
      originalBytes[i] = (i * 37 + 13) % 256;
    }

    const { encryptedBuffer, iv } = await encryptMediaAttachment(originalBytes.buffer, key);

    // Verify IV
    const ivBytes = base64ToUint8Array(iv);
    assert.equal(ivBytes.byteLength, 12, "Media IV must be 12 bytes");

    // Ciphertext size = plaintext size + 16 bytes auth tag
    assert.equal(
      encryptedBuffer.byteLength,
      size + 16,
      "AES-GCM encrypted buffer must equal plaintext length plus 16-byte authentication tag"
    );

    // Decrypt media
    const decryptedBuffer = await decryptMediaAttachment(encryptedBuffer, iv, key);
    const decryptedBytes = new Uint8Array(decryptedBuffer);

    assert.equal(decryptedBytes.byteLength, size, "Decrypted buffer length must match original");
    assert.deepEqual(decryptedBytes, originalBytes, "Decrypted bytes must match original bytes exactly");
  }
});

test("Media decryption tampering rejection", async () => {
  const key = await generateConversationKey("media-passphrase", "media-salt");
  const sampleData = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]);
  const { encryptedBuffer, iv } = await encryptMediaAttachment(sampleData.buffer, key);

  // Tamper with encrypted buffer
  const corrupted = encryptedBuffer.slice(0);
  new Uint8Array(corrupted)[0] ^= 0xff;

  await assert.rejects(
    async () => decryptMediaAttachment(corrupted, iv, key),
    /Media decryption failed/
  );

  // Invalid IV length test
  const badIv = Buffer.from(new Uint8Array(10)).toString("base64");
  await assert.rejects(
    async () => decryptMediaAttachment(encryptedBuffer, badIv, key),
    /Invalid IV length for media: expected 12 bytes/
  );
});
