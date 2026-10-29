"use client";

import React, { useState, useEffect, useCallback } from "react";
import "./chat.css";
import {
  ChatMessage,
  ChatAttachment,
  ChatRole,
  MediaKind,
  MessageDeliveryStatus,
  ChatPanelProps,
} from "./chat-types";
import {
  DEFAULT_INITIAL_MESSAGES,
  createPendingMessage,
  transitionMessageState,
  generateSecurityFingerprint,
} from "./chat-helpers";
import {
  deriveConversationKey,
  encryptTextMessage,
  decryptTextMessage,
} from "./chat-crypto";
import { ChatTimeline } from "./ChatTimeline";
import { ChatComposer } from "./ChatComposer";

const CONVERSATION_PASSPHRASE = "meerah-birthday-vault-secret-2026";
const CONVERSATION_SALT = "meerah-creator-e2ee-salt";
const OFFLINE_QUEUE_KEY = "birthday-offline-chat-queue";

function getOfflineQueue(): Array<{ id: string; payload: { body: string; attachments: ChatAttachment[] } }> {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue: Array<{ id: string; payload: { body: string; attachments: ChatAttachment[] } }>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

export function ChatPanel({
  visitorId,
  currentUserRole = "recipient",
  onSendMessage,
  className = "",
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(DEFAULT_INITIAL_MESSAGES);
  const [isSending, setIsSending] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  const securityFingerprint = generateSecurityFingerprint(visitorId || "meerah-creator-private-chat");

  const syncMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/creator-messages");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          const key = await deriveConversationKey(CONVERSATION_PASSPHRASE, CONVERSATION_SALT);
          const decryptedItems: ChatMessage[] = await Promise.all(
            data.messages.map(async (m: Record<string, unknown>) => {
              let text = String(m.body || "");
              if (m.is_encrypted && m.iv) {
                try {
                  text = await decryptTextMessage(text, String(m.iv), key);
                } catch {
                  text = "[Decryption Failed / Message Tampered]";
                }
              }
              const atts: ChatAttachment[] = m.media_url
                ? [
                    {
                      id: `att-${m.id}`,
                      type: (m.media_type || "image") as MediaKind,
                      url: String(m.media_url),
                      name: String(m.media_name || "attachment"),
                      size: Number(m.media_size || 0),
                      mimeType: String(
                        m.mime_type ||
                          (m.media_type === "video"
                            ? "video/mp4"
                            : m.media_type === "audio"
                            ? "audio/mp3"
                            : "image/jpeg")
                      ),
                    },
                  ]
                : [];
              const isPersisted = Boolean(m.persisted);
              const status: MessageDeliveryStatus = isPersisted ? "durably-persisted" : "server-accepted";
              return {
                id: String(m.id || `remote-${Math.random()}`),
                clientId: m.client_id ? String(m.client_id) : undefined,
                sender: (m.sender === "creator" ? "creator" : "recipient") as ChatRole,
                body: text,
                createdAt: String(m.created_at || new Date().toISOString()),
                status,
                persisted: isPersisted,
                storageTier: isPersisted ? "database" : "volatile_fallback",
                reactions: {},
                myReactions: [],
                attachments: atts.length > 0 ? atts : undefined,
              };
            })
          );

          setMessages((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const next = [...prev];
            for (const item of decryptedItems) {
              if (!existingIds.has(item.id)) {
                next.push(item);
              }
            }
            return next;
          });
          setIsLiveConnected(true);
        }
      }
    } catch {
      setIsLiveConnected(false);
    }
  }, []);

  // Auto-flush offline queue upon reconnection
  const flushOfflineQueue = useCallback(async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;
    const remaining: Array<{ id: string; payload: { body: string; attachments: ChatAttachment[] } }> = [];
    for (const item of queue) {
      try {
        const key = await deriveConversationKey(CONVERSATION_PASSPHRASE, CONVERSATION_SALT);
        const encrypted = await encryptTextMessage(item.payload.body, key);
        const res = await fetch("/api/creator-messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: item.id,
            body: encrypted.ciphertext,
            iv: encrypted.iv,
            is_encrypted: true,
            sender: currentUserRole,
            visitor_id: visitorId,
          }),
        });
        if (!res.ok && res.status !== 202) {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }
    saveOfflineQueue(remaining);
    syncMessages();
  }, [currentUserRole, visitorId, syncMessages]);

  useEffect(() => {
    const handleOnline = () => {
      flushOfflineQueue();
    };
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [flushOfflineQueue]);

  // Periodic polling sync every 3 seconds
  useEffect(() => {
    let mounted = true;
    const initialTimer = setTimeout(() => {
      if (mounted) {
        syncMessages();
        flushOfflineQueue();
      }
    }, 0);
    const interval = setInterval(() => {
      syncMessages();
    }, 3000);
    return () => {
      mounted = false;
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [syncMessages, flushOfflineQueue]);

  // Handle sending new message
  const handleSendMessage = async (payload: {
    body: string;
    attachments: ChatAttachment[];
  }): Promise<boolean> => {
    const pendingMsg = createPendingMessage(
      payload.body,
      currentUserRole,
      payload.attachments,
      visitorId
    );

    // Optimistically add to timeline with "sending" status
    setMessages((prev) => [...prev, pendingMsg]);
    setIsSending(true);

    try {
      // If parent provided custom handler, delegate to it
      if (onSendMessage) {
        const ok = await onSendMessage(payload);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingMsg.id
              ? transitionMessageState(m, ok !== false ? "sent" : "error")
              : m
          )
        );
        setIsSending(false);
        return ok !== false;
      }

      // E2EE encryption before transmission
      const key = await deriveConversationKey(CONVERSATION_PASSPHRASE, CONVERSATION_SALT);
      const encrypted = await encryptTextMessage(payload.body, key);

      const requestPayload = {
        client_id: pendingMsg.id,
        body: encrypted.ciphertext,
        iv: encrypted.iv,
        is_encrypted: true,
        sender: currentUserRole,
        visitor_id: visitorId,
        media: payload.attachments?.[0]
          ? {
              url: payload.attachments[0].url,
              type: payload.attachments[0].type,
              name: payload.attachments[0].name,
              size: payload.attachments[0].size,
            }
          : undefined,
      };

      const res = await fetch("/api/creator-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      if (!res.ok && res.status !== 202) {
        throw new Error("Delivery failed");
      }

      const data = await res.json().catch(() => ({}));
      const isPersisted = Boolean(data.message?.persisted);
      const targetStatus: MessageDeliveryStatus = isPersisted ? "durably-persisted" : "server-accepted";

      // Transition to explicit delivery status and update ID from server if provided
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingMsg.id
            ? {
                ...m,
                status: targetStatus,
                persisted: isPersisted,
                storageTier: isPersisted ? "database" : "volatile_fallback",
                id: data.message?.id || m.id,
              }
            : m
        )
      );

      setIsSending(false);
      return true;
    } catch {
      // Offline fallback: Queue for delivery upon reconnect
      const q = getOfflineQueue();
      q.push({ id: pendingMsg.id, payload });
      saveOfflineQueue(q);

      // Transition to error state with retry button
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingMsg.id ? transitionMessageState(m, "error") : m
        )
      );
      setIsSending(false);
      return false;
    }
  };

  // Retry sending a failed message
  const handleRetryMessage = async (messageId: string) => {
    const target = messages.find((m) => m.id === messageId);
    if (!target) return;

    // Transition back to sending
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? transitionMessageState(m, "sending") : m
      )
    );

    try {
      // Retain end-to-end encryption on retries (do NOT leak plaintext)
      const key = await deriveConversationKey(CONVERSATION_PASSPHRASE, CONVERSATION_SALT);
      const encrypted = await encryptTextMessage(target.body, key);

      const res = await fetch("/api/creator-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: target.clientId || target.id,
          body: encrypted.ciphertext,
          iv: encrypted.iv,
          is_encrypted: true,
          sender: target.sender,
          visitor_id: target.visitorId || visitorId,
        }),
      });

      if (!res.ok && res.status !== 202) throw new Error("Retry failed");

      const data = await res.json().catch(() => ({}));
      const isPersisted = Boolean(data.message?.persisted);
      const targetStatus: MessageDeliveryStatus = isPersisted ? "durably-persisted" : "server-accepted";

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                status: targetStatus,
                persisted: isPersisted,
                storageTier: isPersisted ? "database" : "volatile_fallback",
                id: data.message?.id || m.id,
              }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? transitionMessageState(m, "error") : m
        )
      );
    }
  };

  // Add or toggle emoji reaction
  const handleAddReaction = (messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;

        const currentReactions = { ...(m.reactions || {}) };
        const myReactions = [...(m.myReactions || [])];
        const alreadyReacted = myReactions.includes(emoji);

        if (alreadyReacted) {
          // Remove reaction
          currentReactions[emoji] = Math.max(0, (currentReactions[emoji] || 1) - 1);
          if (currentReactions[emoji] === 0) {
            delete currentReactions[emoji];
          }
          const nextMyReactions = myReactions.filter((e) => e !== emoji);
          return { ...m, reactions: currentReactions, myReactions: nextMyReactions };
        } else {
          // Add reaction
          currentReactions[emoji] = (currentReactions[emoji] || 0) + 1;
          myReactions.push(emoji);
          return { ...m, reactions: currentReactions, myReactions };
        }
      })
    );
  };

  const copyFingerprintToClipboard = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(securityFingerprint.replace(/\s+/g, " "));
      setCopiedFingerprint(true);
      setTimeout(() => setCopiedFingerprint(false), 2500);
    }
  };

  return (
    <section
      className={`chatPanelContainer ${className}`}
      aria-label="Private 1-to-1 chat"
    >
      {/* Intimate Love Theme Header */}
      <header className="chatPanelHeader">
        <div className="chatHeaderLeft">
          <div className="chatAvatarRing" aria-hidden="true">
            <span className="chatAvatarGlyph">
              {currentUserRole === "recipient" ? "N" : "M"}
            </span>
            <span className="chatOnlineDot" title="Direct 1-to-1 connection" />
          </div>

          <div className="chatTitleGroup">
            <h2 className="chatTitleHeading">
              {currentUserRole === "recipient" ? "Noah & Meerah ♡" : "Meerah ♡"}
            </h2>
            <div className="chatSubStatus">
              <span className="chatRoleBadge">
                {currentUserRole === "recipient" ? "Private with Creator" : "Direct to Recipient"}
              </span>
              <span className="chatConnectionDot" />
              <span className="chatConnectionText">
                {isLiveConnected ? "Direct Link Live" : "Private Session"}
              </span>
            </div>
          </div>
        </div>

        <div className="chatHeaderRight">
          <button
            type="button"
            className="chatSecurityBadgeBtn"
            onClick={() => setShowSecurityModal(true)}
            title="View End-to-End Encryption Safety Fingerprint"
            aria-label="End-to-End Encrypted: view safety details"
          >
            <span className="lockPillIcon" aria-hidden="true">🔒</span>
            <span className="lockPillText">Encrypted</span>
          </button>
        </div>
      </header>

      {/* Main Timeline */}
      <ChatTimeline
        messages={messages}
        currentUserRole={currentUserRole}
        onRetryMessage={handleRetryMessage}
        onAddReaction={handleAddReaction}
      />

      {/* Composer Input */}
      <ChatComposer
        onSendMessage={handleSendMessage}
        isSending={isSending}
        currentUserRole={currentUserRole}
        placeholder={
          currentUserRole === "recipient"
            ? "Write something sweet to Noah… ♡"
            : "Write a birthday note to Meerah… ♡"
        }
      />

      {/* Security & Verification Modal */}
      {showSecurityModal && (
        <div
          className="chatSecurityModalOverlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="securityModalTitle"
        >
          <div
            className="chatSecurityBackdrop"
            onClick={() => setShowSecurityModal(false)}
          />
          <div className="chatSecurityModalCard">
            <button
              type="button"
              className="chatModalCloseBtn"
              onClick={() => setShowSecurityModal(false)}
              aria-label="Close safety number modal"
            >
              ✕
            </button>

            <div className="securityModalHeader">
              <span className="securityShieldIcon" aria-hidden="true">🛡️</span>
              <h3 id="securityModalTitle">End-to-End Encrypted</h3>
              <p className="securitySubhead">
                Strict 1-to-1 Private Channel between Meerah & Noah
              </p>
            </div>

            <div className="securityFingerprintBox">
              <span className="fingerprintLabel">Verified Safety Fingerprint</span>
              <code className="fingerprintCode">{securityFingerprint}</code>
              <button
                type="button"
                className="copyFingerprintBtn"
                onClick={copyFingerprintToClipboard}
              >
                {copiedFingerprint ? "Copied to Clipboard ✓" : "Copy Safety Number"}
              </button>
            </div>

            <div className="securityExplanation">
              <p>
                <strong>No AI Assistant. No Third Parties.</strong>
              </p>
              <p>
                This conversation is reserved exclusively for personal messages, photos,
                videos, and voice notes between creator and recipient.
              </p>
            </div>

            <div className="securityModalFooter">
              <button
                type="button"
                className="closeModalMainBtn"
                onClick={() => setShowSecurityModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
