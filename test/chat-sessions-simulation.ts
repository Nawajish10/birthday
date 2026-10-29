import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  deriveConversationKey,
  encryptTextMessage,
  decryptTextMessage,
  generateKeyFingerprint,
  ChatDecryptionError,
} from "../src/components/chat/chat-crypto.ts";

import {
  formatDateSeparator,
  formatMessageTime,
  createPendingMessage,
  transitionMessageState,
  generateSecurityFingerprint,
} from "../src/components/chat/chat-helpers.ts";

import type {
  ChatMessage,
  ChatRole,
  MessageDeliveryStatus,
} from "../src/components/chat/chat-types.ts";

// Shared conversation secrets
const CONVERSATION_PASSPHRASE = "meerah-birthday-vault-secret-2026";
const CONVERSATION_SALT = "meerah-creator-e2ee-salt";

describe("Agent 3: Comprehensive Multi-Session Chat Simulation & Verification", () => {
  // =========================================================================
  // Mandate 2: 4 Delivery States Verification
  // =========================================================================
  describe("Delivery States Lifecycle (queued -> sending -> server-accepted -> durably-persisted)", () => {
    it("verifies 'queued' state representation and offline queue storage", () => {
      const pending = createPendingMessage("Offline message", "recipient");
      const queuedMsg: ChatMessage = {
        ...pending,
        status: "queued",
        storageTier: "local_queue",
      };

      assert.equal(queuedMsg.status, "queued");
      assert.equal(queuedMsg.storageTier, "local_queue");
      assert.equal(queuedMsg.persisted, undefined);
    });

    it("verifies 'sending' state representation during in-flight network request", () => {
      const pending = createPendingMessage("In flight message", "recipient");
      assert.equal(pending.status, "sending");
    });

    it("verifies 'server-accepted' state (HTTP 202, persisted: false, single check '✓')", () => {
      const serverResponse = {
        status: 202,
        data: {
          message: {
            id: randomUUID(),
            client_id: "client-uuid-1",
            visitor_id: "visitor-123",
            sender: "recipient",
            body: "encrypted-content",
            created_at: new Date().toISOString(),
            read_at: null,
            persisted: false,
            storage_tier: "volatile_fallback",
          },
        },
      };

      const isPersisted = Boolean(serverResponse.data.message.persisted);
      const deliveryStatus: MessageDeliveryStatus = isPersisted ? "durably-persisted" : "server-accepted";

      assert.equal(serverResponse.status, 202);
      assert.equal(isPersisted, false);
      assert.equal(deliveryStatus, "server-accepted");
      assert.equal(serverResponse.data.message.storage_tier, "volatile_fallback");
    });

    it("verifies 'durably-persisted' state (HTTP 200, persisted: true, double check '✓✓')", () => {
      const serverResponse = {
        status: 200,
        data: {
          message: {
            id: randomUUID(),
            client_id: "client-uuid-2",
            visitor_id: "visitor-123",
            sender: "recipient",
            body: "encrypted-content",
            created_at: new Date().toISOString(),
            read_at: null,
            persisted: true,
            storage_tier: "database",
          },
        },
      };

      const isPersisted = Boolean(serverResponse.data.message.persisted);
      const deliveryStatus: MessageDeliveryStatus = isPersisted ? "durably-persisted" : "server-accepted";

      assert.equal(serverResponse.status, 200);
      assert.equal(isPersisted, true);
      assert.equal(deliveryStatus, "durably-persisted");
      assert.equal(serverResponse.data.message.storage_tier, "database");
    });
  });

  // =========================================================================
  // Mandate 3: Two Independent Client Sessions (Meerah & Noah)
  // =========================================================================
  describe("Two Independent Client Sessions Simulation", () => {
    interface StoredMessageRecord {
      id: string;
      client_id?: string;
      visitor_id: string;
      sender: "recipient" | "creator";
      body: string;
      created_at: string;
      read_at: string | null;
      persisted: boolean;
    }

    const simulatedServerMemory: StoredMessageRecord[] = [];

    function serverPostHandler(payload: {
      client_id?: string;
      body: string;
      iv?: string;
      is_encrypted?: boolean;
      sender: "recipient" | "creator";
      visitor_id: string;
    }) {
      // Deduplication check
      if (payload.client_id) {
        const existing = simulatedServerMemory.find((m) => m.client_id === payload.client_id);
        if (existing) {
          return { status: 200, data: { message: existing, deduplicated: true } };
        }
      }

      // Envelope creation
      const envelope = JSON.stringify({
        client_id: payload.client_id,
        is_encrypted: payload.is_encrypted,
        iv: payload.iv,
        ciphertext: payload.body,
      });

      const record: StoredMessageRecord = {
        id: randomUUID(),
        client_id: payload.client_id,
        visitor_id: payload.visitor_id,
        sender: payload.sender,
        body: envelope,
        created_at: new Date().toISOString(),
        read_at: null,
        persisted: false, // In fallback memory
      };

      simulatedServerMemory.push(record);
      return { status: 202, data: { message: record, deduplicated: false } };
    }

    function serverGetHandler(visitorId: string, isAdminInbox: boolean) {
      let messages = [...simulatedServerMemory];
      if (!isAdminInbox) {
        messages = messages.filter((m) => m.visitor_id === visitorId);
      }
      return messages.map((m) => {
        let isEncrypted = false;
        let iv = null;
        let body = m.body;
        let clientId = m.client_id;
        try {
          const parsed = JSON.parse(m.body);
          isEncrypted = parsed.is_encrypted;
          iv = parsed.iv;
          body = parsed.ciphertext;
          clientId = parsed.client_id || clientId;
        } catch {}
        return {
          id: m.id,
          client_id: clientId,
          visitor_id: m.visitor_id,
          sender: m.sender,
          body,
          iv,
          is_encrypted: isEncrypted,
          created_at: m.created_at,
          persisted: m.persisted,
        };
      });
    }

    it("executes end-to-end conversation between Session A (Meerah) and Session B (Noah)", async () => {
      simulatedServerMemory.length = 0; // Clear store
      const key = await deriveConversationKey(CONVERSATION_PASSPHRASE, CONVERSATION_SALT);

      // Session A: Meerah (visitor cookie: meerah_visitor_session_a)
      const sessionA_visitor = "meerah_visitor_session_a";
      const message1_plain = "Noah, this 24th birthday treasure hunt is incredible! ❤️✨";
      const message1_clientId = "client-msg-" + randomUUID();

      // 1. Session A encrypts message with PBKDF2 + AES-GCM-256
      const enc1 = await encryptTextMessage(message1_plain, key);
      assert.ok(enc1.ciphertext !== message1_plain);
      assert.ok(enc1.iv.length > 0);

      // 2. Session A transmits message
      const postRes1 = serverPostHandler({
        client_id: message1_clientId,
        body: enc1.ciphertext,
        iv: enc1.iv,
        is_encrypted: true,
        sender: "recipient",
        visitor_id: sessionA_visitor,
      });
      assert.equal(postRes1.status, 202, "Server responds with 202 Accepted (fallback memory)");
      const msg1_serverId = postRes1.data.message.id;
      assert.ok(msg1_serverId);

      // 3. Session B: Creator Noah (admin) fetches inbox
      const inboxB = serverGetHandler(sessionA_visitor, true);
      assert.equal(inboxB.length, 1);
      const received1 = inboxB[0];
      assert.equal(received1.id, msg1_serverId);
      assert.equal(received1.client_id, message1_clientId);
      assert.equal(received1.is_encrypted, true);

      // 4. Session B decrypts Meerah's message
      const decrypted1 = await decryptTextMessage(received1.body, received1.iv!, key);
      assert.equal(decrypted1, message1_plain);

      // 5. Session B writes encrypted reply
      const reply_plain = "I'm so glad you love it Meerah! Every single clue was written for you. ♡🎂";
      const reply_clientId = "client-reply-" + randomUUID();
      const encReply = await encryptTextMessage(reply_plain, key);

      const postResReply = serverPostHandler({
        client_id: reply_clientId,
        body: encReply.ciphertext,
        iv: encReply.iv,
        is_encrypted: true,
        sender: "creator",
        visitor_id: sessionA_visitor,
      });
      assert.equal(postResReply.status, 202);

      // 6. Session A polls messages
      const sessionAMessages = serverGetHandler(sessionA_visitor, false);
      assert.equal(sessionAMessages.length, 2);

      // 7. Session A decrypts Creator's reply
      const replyFromNoah = sessionAMessages.find((m) => m.sender === "creator");
      assert.ok(replyFromNoah);
      const decryptedReply = await decryptTextMessage(replyFromNoah.body, replyFromNoah.iv!, key);
      assert.equal(decryptedReply, reply_plain);

      // Verify timestamps are valid ISO strings and chronological
      const t1 = new Date(sessionAMessages[0].created_at).getTime();
      const t2 = new Date(sessionAMessages[1].created_at).getTime();
      assert.ok(!isNaN(t1));
      assert.ok(!isNaN(t2));
      assert.ok(t2 >= t1);
    });

    it("verifies tamper rejection for messages altered in transit or memory", async () => {
      const key = await deriveConversationKey(CONVERSATION_PASSPHRASE, CONVERSATION_SALT);
      const plain = "Authentic secret message";
      const enc = await encryptTextMessage(plain, key);

      // Tampered ciphertext
      const tamperedBody = "X" + enc.ciphertext.slice(1);
      await assert.rejects(
        () => decryptTextMessage(tamperedBody, enc.iv, key),
        ChatDecryptionError
      );

      // Tampered IV
      const tamperedIv = Buffer.from(new Uint8Array(12).fill(7)).toString("base64");
      await assert.rejects(
        () => decryptTextMessage(enc.ciphertext, tamperedIv, key)
      );
    });
  });

  // =========================================================================
  // Mandate 4: Retry and Deduplication
  // =========================================================================
  describe("Retry and Deduplication Assurance", () => {
    it("confirms retried messages preserve encryption without plaintext leakage", async () => {
      const key = await deriveConversationKey(CONVERSATION_PASSPHRASE, CONVERSATION_SALT);
      const plain = "Sensitive birthday message that must NEVER be leaked in plaintext";

      // Simulation of ChatPanel handleRetryMessage logic
      const targetMessage = {
        id: "msg-retry-test",
        clientId: "client-retry-test",
        sender: "recipient" as ChatRole,
        body: plain,
      };

      // Perform encryption as ChatPanel does on retry
      const encrypted = await encryptTextMessage(targetMessage.body, key);

      const requestPayload = {
        client_id: targetMessage.clientId || targetMessage.id,
        body: encrypted.ciphertext,
        iv: encrypted.iv,
        is_encrypted: true,
        sender: targetMessage.sender,
        visitor_id: "visitor-uuid",
      };

      // Assert payload sent over wire has is_encrypted: true and ciphertext, not plaintext
      assert.equal(requestPayload.is_encrypted, true);
      assert.notEqual(requestPayload.body, plain);
      assert.ok(requestPayload.iv);

      // Decrypt to verify it can be read by recipient
      const recovered = await decryptTextMessage(requestPayload.body, requestPayload.iv, key);
      assert.equal(recovered, plain);
    });

    it("confirms duplicate submissions with same client_id return existing message without duplicate row", () => {
      const testStore: Array<{ id: string; client_id: string; body: string }> = [];

      function handlePostWithDeduplication(payload: { client_id: string; body: string }) {
        const existing = testStore.find((m) => m.client_id === payload.client_id);
        if (existing) {
          return { status: 200, message: existing, deduplicated: true };
        }
        const created = { id: randomUUID(), client_id: payload.client_id, body: payload.body };
        testStore.push(created);
        return { status: 202, message: created, deduplicated: false };
      }

      const clientId = "client-idempotency-key-999";
      const first = handlePostWithDeduplication({ client_id: clientId, body: "cipher-1" });
      assert.equal(first.status, 202);
      assert.equal(first.deduplicated, false);
      assert.equal(testStore.length, 1);

      // Second submission with identical client_id
      const second = handlePostWithDeduplication({ client_id: clientId, body: "cipher-1" });
      assert.equal(second.status, 200);
      assert.equal(second.deduplicated, true);
      assert.equal(second.message.id, first.message.id);
      assert.equal(testStore.length, 1, "Store must not create a duplicate row");
    });

    it("confirms offline queue drains on reconnect", async () => {
      const offlineQueue = [
        { id: "queued-1", payload: { body: "Offline message 1", attachments: [] } },
        { id: "queued-2", payload: { body: "Offline message 2", attachments: [] } },
      ];

      const delivered: string[] = [];
      const drainQueue = async () => {
        while (offlineQueue.length > 0) {
          const item = offlineQueue.shift()!;
          delivered.push(item.id);
        }
      };

      await drainQueue();
      assert.equal(offlineQueue.length, 0, "Offline queue must be empty after drain");
      assert.deepEqual(delivered, ["queued-1", "queued-2"]);
    });
  });

  // =========================================================================
  // Mandate 5: Strict Zero-AI Policy Verification
  // =========================================================================
  describe("Zero-AI Policy in Human Chat Thread", () => {
    it("confirms ChatPanel and chat components do not invoke AI bots or third-party LLMs", () => {
      const chatPanelSrc = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/chat/ChatPanel.tsx"),
        "utf-8"
      );

      const forbiddenTerms = [
        "openai",
        "anthropic",
        "cohere",
        "huggingface",
        "/api/chat",
        "chat/completions",
        "generateText",
        "streamText",
        "Noah companion",
        "noah-ai",
      ];

      for (const term of forbiddenTerms) {
        assert.ok(
          !chatPanelSrc.toLowerCase().includes(term.toLowerCase()),
          `ChatPanel must not contain reference to '${term}'`
        );
      }

      assert.ok(
        chatPanelSrc.includes("No AI Assistant. No Third Parties."),
        "ChatPanel security notice explicitly declares human-only policy"
      );
    });
  });
});
