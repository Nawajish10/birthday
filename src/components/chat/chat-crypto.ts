/**
 * End-to-End Encryption (E2EE) Cryptographic Foundation for 1-to-1 Private Chat
 * Between Recipient (Meerah) and Creator.
 *
 * ============================================================================
 * THREAT MODEL & SECURITY SPECIFICATION:
 * ============================================================================
 * 1. Scope & Confidentiality:
 *    - All message bodies and media attachments are encrypted on the client device
 *      prior to transport or storage.
 *    - Plaintext content is never exposed to Supabase Postgres, storage buckets,
 *      intermediate proxies, or server-side logs.
 *    - TLS provides transport security, while this layer provides true application-layer
 *      End-to-End Encryption (E2EE) with zero-knowledge backend storage.
 *
 * 2. Cryptographic Primitives:
 *    - Symmetric Cipher: Standard AES-GCM (Galois/Counter Mode) with 256-bit keys.
 *    - Authentication: 128-bit integrity tag automatically appended to ciphertext.
 *    - Initialization Vector: Cryptographically secure 12-byte (96-bit) unpredictable
 *      IV per message generated via `globalThis.crypto.getRandomValues`.
 *      IV reuse is strictly avoided by generating a fresh random IV on every encryption.
 *    - Key Derivation Function: PBKDF2 using HMAC-SHA-256 with 100,000 iterations
 *      from a shared conversation passphrase and deterministic salt.
 *
 * 3. Key Lifecycle:
 *    - Keys are derived in-memory on client devices (Browser or Node.js runtime).
 *    - CryptoKey instances reside strictly in volatile client memory and are never
 *      persisted to server databases or sent over the wire.
 *    - Verification fingerprint is derived from the SHA-256 hash of raw key material.
 *
 * 4. Verification Fingerprints (Safety Numbers):
 *    - Formatted as 16 blocks of 4 hexadecimal characters (64 characters total),
 *      allowing Meerah and Creator to verify their shared secret out-of-band
 *      to ensure protection against Man-in-the-Middle (MITM) attacks.
 *
 * 5. Tamper Resistance & Error Recovery:
 *    - AES-GCM guarantees authenticated encryption. Any tampering with ciphertext,
 *      IV, or authentication tags results in an immediate rejection / OperationError.
 *    - Error recovery: `ChatDecryptionError` is thrown with descriptive error codes,
 *      enabling the UI to flag un-decryptable or corrupted messages gracefully.
 * ============================================================================
 */

export const PBKDF2_ITERATIONS = 100_000;
export const AES_KEY_LENGTH = 256;
export const GCM_IV_LENGTH_BYTES = 12; // 96-bit recommended standard for AES-GCM

export class ChatDecryptionError extends Error {
  public readonly code: "TAMPERED_CIPHERTEXT" | "INVALID_IV" | "DECRYPTION_FAILED";
  constructor(message: string, code: "TAMPERED_CIPHERTEXT" | "INVALID_IV" | "DECRYPTION_FAILED" = "DECRYPTION_FAILED") {
    super(message);
    this.name = "ChatDecryptionError";
    this.code = code;
  }
}

/**
 * Base64 encoding compatible with modern browsers and Node 20+ runtimes.
 * Uses chunked String.fromCharCode to safely handle large media payloads without call-stack overflows.
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  const len = bytes.byteLength;
  const chunkSize = 0x8000; // 32KB
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return globalThis.btoa(binary);
}

/**
 * Base64 decoding compatible with modern browsers and Node 20+ runtimes.
 */
export function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(base64, "base64");
    const bytes = new Uint8Array(new ArrayBuffer(buf.length));
    bytes.set(buf);
    return bytes;
  }
  const binary = globalThis.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(new ArrayBuffer(len));
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derives a symmetric AES-GCM 256-bit CryptoKey using PBKDF2 (SHA-256, 100,000 iterations).
 *
 * @param passphrase Shared conversation passkey or secret
 * @param salt Deterministic conversation salt (e.g., room/visitor identifier or agreed salt)
 */
export async function generateConversationKey(
  passphrase: string,
  salt: string
): Promise<CryptoKey> {
  if (!passphrase || typeof passphrase !== "string") {
    throw new Error("Passphrase must be a non-empty string");
  }
  if (!salt || typeof salt !== "string") {
    throw new Error("Salt must be a non-empty string");
  }

  const enc = new TextEncoder();
  const rawPassphrase = enc.encode(passphrase);
  const rawSalt = enc.encode(salt);

  const keyMaterial = await globalThis.crypto.subtle.importKey(
    "raw",
    rawPassphrase,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return await globalThis.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: rawSalt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: AES_KEY_LENGTH,
    },
    true, // extractable for fingerprint derivation
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a plaintext chat message using AES-GCM 256-bit with an unpredictable 12-byte IV.
 *
 * @param plaintext Plaintext message string
 * @param key AES-GCM CryptoKey derived via generateConversationKey
 * @returns Object with base64 ciphertext (with appended auth tag) and base64 IV
 */
export async function encryptChatMessage(
  plaintext: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const enc = new TextEncoder();
  const plaintextBytes = enc.encode(plaintext);

  // Generate an unpredictable 12-byte (96-bit) IV per message
  const ivBytes = globalThis.crypto.getRandomValues(new Uint8Array(GCM_IV_LENGTH_BYTES));

  const encryptedBuffer = await globalThis.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: ivBytes,
    },
    key,
    plaintextBytes
  );

  return {
    ciphertext: uint8ArrayToBase64(new Uint8Array(encryptedBuffer)),
    iv: uint8ArrayToBase64(ivBytes),
  };
}

/**
 * Decrypts an AES-GCM encrypted chat message.
 * Strictly verifies the 12-byte IV and authentication tag.
 * Rejects modified ciphertext or modified IV.
 *
 * @param ciphertext Base64 ciphertext string
 * @param iv Base64 IV string (must decode to 12 bytes)
 * @param key AES-GCM CryptoKey
 * @returns Decrypted plaintext string
 */
export async function decryptChatMessage(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const ivBytes = base64ToUint8Array(iv);
  if (ivBytes.byteLength !== GCM_IV_LENGTH_BYTES) {
    throw new ChatDecryptionError(
      `Invalid IV length: expected ${GCM_IV_LENGTH_BYTES} bytes, got ${ivBytes.byteLength}`,
      "INVALID_IV"
    );
  }

  const cipherBytes = base64ToUint8Array(ciphertext);

  try {
    const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBytes as BufferSource,
      },
      key,
      cipherBytes as BufferSource
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch {
    throw new ChatDecryptionError(
      "Decryption failed: Ciphertext or IV was modified or key is invalid.",
      "TAMPERED_CIPHERTEXT"
    );
  }
}

/**
 * Generates a mutual verification fingerprint (safety number) from the AES-GCM CryptoKey.
 * Computes SHA-256 over raw 256-bit key material and formats as 16 blocks of 4 hexadecimal characters.
 *
 * Example: `A1B2 C3D4 E5F6 0718 ...`
 *
 * @param key CryptoKey to fingerprint
 * @returns Formatted 64-character hex string partitioned into 16 uppercase 4-digit blocks
 */
export async function generateKeyFingerprint(key: CryptoKey): Promise<string> {
  const rawKey = await globalThis.crypto.subtle.exportKey("raw", key);
  const digestBuffer = await globalThis.crypto.subtle.digest("SHA-256", rawKey);
  const hashBytes = new Uint8Array(digestBuffer);

  const hex = Array.from(hashBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

  const blocks = hex.match(/.{1,4}/g);
  return blocks ? blocks.join(" ") : hex;
}

/**
 * Encrypts an arbitrary media attachment buffer (image, video, voice, file)
 * using AES-GCM 256-bit with an unpredictable 12-byte IV.
 *
 * @param fileBuffer Binary ArrayBuffer of the media attachment
 * @param key AES-GCM CryptoKey
 * @returns Encrypted ArrayBuffer and base64 IV
 */
export async function encryptMediaAttachment(
  fileBuffer: ArrayBuffer,
  key: CryptoKey
): Promise<{ encryptedBuffer: ArrayBuffer; iv: string }> {
  const ivBytes = globalThis.crypto.getRandomValues(new Uint8Array(GCM_IV_LENGTH_BYTES));

  const encryptedBuffer = await globalThis.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: ivBytes,
    },
    key,
    fileBuffer
  );

  return {
    encryptedBuffer,
    iv: uint8ArrayToBase64(ivBytes),
  };
}

/**
 * Decrypts an encrypted media attachment buffer using AES-GCM 256-bit.
 *
 * @param encryptedBuffer Binary ArrayBuffer of the ciphertext
 * @param iv Base64 IV string (12 bytes)
 * @param key AES-GCM CryptoKey
 * @returns Decrypted media ArrayBuffer
 */
export async function decryptMediaAttachment(
  encryptedBuffer: ArrayBuffer,
  iv: string,
  key: CryptoKey
): Promise<ArrayBuffer> {
  const ivBytes = base64ToUint8Array(iv);
  if (ivBytes.byteLength !== GCM_IV_LENGTH_BYTES) {
    throw new ChatDecryptionError(
      `Invalid IV length for media: expected ${GCM_IV_LENGTH_BYTES} bytes, got ${ivBytes.byteLength}`,
      "INVALID_IV"
    );
  }

  try {
    return await globalThis.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBytes as BufferSource,
      },
      key,
      encryptedBuffer as BufferSource
    );
  } catch {
    throw new ChatDecryptionError(
      "Media decryption failed: Encrypted buffer or IV was modified or key is invalid.",
      "TAMPERED_CIPHERTEXT"
    );
  }
}

// Aliases for convenience
export {
  encryptChatMessage as encryptTextMessage,
  decryptChatMessage as decryptTextMessage,
  generateConversationKey as deriveConversationKey,
};
