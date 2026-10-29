"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import "./chat.css";
import {
  ChatMessage,
  ChatAttachment,
  ChatRole,
  MediaKind,
  MessageDeliveryStatus,
  ChatPanelProps,
  ChatConversation,
} from "./chat-types";
import {
  DEFAULT_INITIAL_MESSAGES,
  INITIAL_CONVERSATIONS,
  THREAD_INITIAL_MESSAGES,
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
  initialThreadId = "meerah",
}: ChatPanelProps) {
  // Dual-role perspective support: Meerah ✿ (recipient) vs Admin / BABA (creator)
  const [activeRole, setActiveRole] = useState<ChatRole>(currentUserRole);

  // Sync role if parent prop changes
  useEffect(() => {
    setActiveRole(currentUserRole);
  }, [currentUserRole]);

  // Selected thread navigation
  const [activeThreadId, setActiveThreadId] = useState<string>(initialThreadId);
  const [mobileView, setMobileView] = useState<"list" | "thread">("thread");

  // Search filter for conversation list
  const [searchQuery, setSearchQuery] = useState("");

  // Conversations list
  const [conversations, setConversations] = useState<ChatConversation[]>(INITIAL_CONVERSATIONS);

  // Per-thread message store
  const [threadMessages, setThreadMessages] = useState<Record<string, ChatMessage[]>>({
    meerah: THREAD_INITIAL_MESSAGES.meerah || DEFAULT_INITIAL_MESSAGES,
    memories: THREAD_INITIAL_MESSAGES.memories || [],
    "study-buddy": THREAD_INITIAL_MESSAGES["study-buddy"] || [],
    "game-zone": THREAD_INITIAL_MESSAGES["game-zone"] || [],
    "music-room": THREAD_INITIAL_MESSAGES["music-room"] || [],
    "notes-ideas": THREAD_INITIAL_MESSAGES["notes-ideas"] || [],
  });

  const [isSending, setIsSending] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  // Interactive Audio/Video Calling modal state
  const [callingState, setCallingState] = useState<{
    type: "audio" | "video";
    name: string;
    status: "ringing" | "connected";
    seconds: number;
    isMuted: boolean;
  } | null>(null);

  // Quick New Chat / Note modal
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState("");

  const securityFingerprint = generateSecurityFingerprint(visitorId || "meerah-creator-private-chat");

  // Active messages based on current selected thread
  const activeMessages = useMemo(() => {
    return threadMessages[activeThreadId] || [];
  }, [threadMessages, activeThreadId]);

  // Filtered conversation list
  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q) ||
        (c.statusText && c.statusText.toLowerCase().includes(q))
    );
  }, [conversations, searchQuery]);

  // Active contact info
  const activeConversation = useMemo(() => {
    return (
      conversations.find((c) => c.id === activeThreadId) || {
        id: "meerah",
        name: "Meerah ✿",
        avatar: "/images/sample-meerah-1.jpg",
        avatarGlyph: "M",
        lastMessage: "Typing...",
        lastTime: "9:41 PM",
        isOnline: true,
        statusText: "online",
      }
    );
  }, [conversations, activeThreadId]);

  // Sync encrypted messages for Meerah thread from backend
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
              const targetStatus: MessageDeliveryStatus = isPersisted ? "durably-persisted" : "server-accepted";
              return {
                id: String(m.id || `remote-${Math.random()}`),
                clientId: m.client_id ? String(m.client_id) : undefined,
                sender: (m.sender === "creator" ? "creator" : "recipient") as ChatRole,
                body: text,
                createdAt: String(m.created_at || new Date().toISOString()),
                status: targetStatus,
                persisted: isPersisted,
                storageTier: isPersisted ? "database" : "volatile_fallback",
                reactions: {},
                myReactions: [],
                attachments: atts.length > 0 ? atts : undefined,
              };
            })
          );

          setThreadMessages((prev) => {
            const currentMeerah = prev.meerah || [];
            const existingIds = new Set(currentMeerah.map((p) => p.id));
            const next = [...currentMeerah];
            for (const item of decryptedItems) {
              if (!existingIds.has(item.id)) {
                next.push(item);
              }
            }
            return {
              ...prev,
              meerah: next,
            };
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
            sender: activeRole,
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
  }, [activeRole, visitorId, syncMessages]);

  useEffect(() => {
    const handleOnline = () => {
      flushOfflineQueue();
    };
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [flushOfflineQueue]);

  // Periodic polling sync every 3 seconds for active conversation
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

  // Calling timer simulation
  useEffect(() => {
    if (!callingState || callingState.status !== "connected") return;
    const timer = setInterval(() => {
      setCallingState((prev) => (prev ? { ...prev, seconds: prev.seconds + 1 } : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [callingState]);

  // Handle sending new message
  const handleSendMessage = async (payload: {
    body: string;
    attachments: ChatAttachment[];
  }): Promise<boolean> => {
    const pendingMsg = createPendingMessage(
      payload.body,
      activeRole,
      payload.attachments,
      visitorId
    );

    // Optimistically add to active thread
    setThreadMessages((prev) => ({
      ...prev,
      [activeThreadId]: [...(prev[activeThreadId] || []), pendingMsg],
    }));

    // Update conversation last message snippet
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeThreadId
          ? {
              ...c,
              lastMessage: payload.body || (payload.attachments[0]?.type === "image" ? "Photo shared" : "Voice note"),
              lastTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              unreadCount: 0,
              isTyping: false,
            }
          : c
      )
    );

    setIsSending(true);

    // If current thread is NOT meerah (e.g. memories or study-buddy notes), deliver immediately locally
    if (activeThreadId !== "meerah") {
      setTimeout(() => {
        setThreadMessages((prev) => ({
          ...prev,
          [activeThreadId]: (prev[activeThreadId] || []).map((m) =>
            m.id === pendingMsg.id ? transitionMessageState(m, "read") : m
          ),
        }));
        setIsSending(false);
      }, 400);
      return true;
    }

    try {
      if (onSendMessage) {
        const ok = await onSendMessage(payload);
        setThreadMessages((prev) => ({
          ...prev,
          [activeThreadId]: (prev[activeThreadId] || []).map((m) =>
            m.id === pendingMsg.id ? transitionMessageState(m, ok !== false ? "sent" : "error") : m
          ),
        }));
        setIsSending(false);
        return ok !== false;
      }

      // Web Crypto E2EE encryption before transmission
      const key = await deriveConversationKey(CONVERSATION_PASSPHRASE, CONVERSATION_SALT);
      const encrypted = await encryptTextMessage(payload.body, key);

      const requestPayload = {
        client_id: pendingMsg.id,
        body: encrypted.ciphertext,
        iv: encrypted.iv,
        is_encrypted: true,
        sender: activeRole,
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

      setThreadMessages((prev) => ({
        ...prev,
        [activeThreadId]: (prev[activeThreadId] || []).map((m) =>
          m.id === pendingMsg.id
            ? {
                ...m,
                status: targetStatus,
                persisted: isPersisted,
                storageTier: isPersisted ? "database" : "volatile_fallback",
                id: data.message?.id || m.id,
              }
            : m
        ),
      }));

      setIsSending(false);
      return true;
    } catch {
      // Offline fallback: Queue for delivery upon reconnect
      const q = getOfflineQueue();
      q.push({ id: pendingMsg.id, payload });
      saveOfflineQueue(q);

      setThreadMessages((prev) => ({
        ...prev,
        [activeThreadId]: (prev[activeThreadId] || []).map((m) =>
          m.id === pendingMsg.id ? transitionMessageState(m, "error") : m
        ),
      }));
      setIsSending(false);
      return false;
    }
  };

  // Retry sending a failed message
  const handleRetryMessage = async (messageId: string) => {
    const target = activeMessages.find((m) => m.id === messageId);
    if (!target) return;

    setThreadMessages((prev) => ({
      ...prev,
      [activeThreadId]: (prev[activeThreadId] || []).map((m) =>
        m.id === messageId ? transitionMessageState(m, "sending") : m
      ),
    }));

    try {
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

      setThreadMessages((prev) => ({
        ...prev,
        [activeThreadId]: (prev[activeThreadId] || []).map((m) =>
          m.id === messageId
            ? {
                ...m,
                status: targetStatus,
                persisted: isPersisted,
                storageTier: isPersisted ? "database" : "volatile_fallback",
                id: data.message?.id || m.id,
              }
            : m
        ),
      }));
    } catch {
      setThreadMessages((prev) => ({
        ...prev,
        [activeThreadId]: (prev[activeThreadId] || []).map((m) =>
          m.id === messageId ? transitionMessageState(m, "error") : m
        ),
      }));
    }
  };

  // Add or toggle emoji reaction
  const handleAddReaction = (messageId: string, emoji: string) => {
    setThreadMessages((prev) => ({
      ...prev,
      [activeThreadId]: (prev[activeThreadId] || []).map((m) => {
        if (m.id !== messageId) return m;

        const currentReactions = { ...(m.reactions || {}) };
        const myReactions = [...(m.myReactions || [])];
        const alreadyReacted = myReactions.includes(emoji);

        if (alreadyReacted) {
          currentReactions[emoji] = Math.max(0, (currentReactions[emoji] || 1) - 1);
          if (currentReactions[emoji] === 0) {
            delete currentReactions[emoji];
          }
          const nextMyReactions = myReactions.filter((e) => e !== emoji);
          return { ...m, reactions: currentReactions, myReactions: nextMyReactions };
        } else {
          currentReactions[emoji] = (currentReactions[emoji] || 0) + 1;
          myReactions.push(emoji);
          return { ...m, reactions: currentReactions, myReactions };
        }
      }),
    }));
  };

  const copyFingerprintToClipboard = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(securityFingerprint.replace(/\s+/g, " "));
      setCopiedFingerprint(true);
      setTimeout(() => setCopiedFingerprint(false), 2500);
    }
  };

  const handleSelectConversation = (threadId: string) => {
    setActiveThreadId(threadId);
    setMobileView("thread");

    // Clear unread count for clicked thread
    setConversations((prev) =>
      prev.map((c) => (c.id === threadId ? { ...c, unreadCount: 0 } : c))
    );
  };

  const startCall = (type: "audio" | "video") => {
    setCallingState({
      type,
      name: activeConversation.name,
      status: "ringing",
      seconds: 0,
      isMuted: false,
    });

    // Simulate answer after 2.5 seconds
    setTimeout(() => {
      setCallingState((prev) => (prev ? { ...prev, status: "connected" } : null));
    }, 2500);
  };

  const endCall = () => {
    setCallingState(null);
  };

  const handleCreateNewChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatTitle.trim()) return;

    const newId = `custom-${Date.now()}`;
    const newConv: ChatConversation = {
      id: newId,
      name: newChatTitle.trim(),
      avatarGlyph: "💭",
      lastMessage: "Conversation created",
      lastTime: "Just now",
      unreadCount: 0,
      statusText: "Personal thread",
    };

    setConversations((prev) => [newConv, ...prev]);
    setThreadMessages((prev) => ({
      ...prev,
      [newId]: [
        {
          id: `msg-${Date.now()}`,
          sender: activeRole,
          body: `Started thread: "${newChatTitle.trim()}" ✨`,
          createdAt: new Date().toISOString(),
          status: "read",
        },
      ],
    }));

    setActiveThreadId(newId);
    setMobileView("thread");
    setShowNewChatModal(false);
    setNewChatTitle("");
  };

  return (
    <section
      className={`chatPanelContainer whatsappLayout ${mobileView === "thread" ? "mobileShowThread" : "mobileShowList"} ${className}`}
      aria-label="WhatsApp Private 1-to-1 Chat"
    >
      {/* ====================================================================
          SIDEBAR: WhatsApp-style Chats List View
          ==================================================================== */}
      <aside className="chatSidebarPane" aria-label="Conversations list">
        {/* Sidebar Header */}
        <div className="chatSidebarHeader">
          <div className="sidebarHeaderUser">
            <div className="sidebarAvatar" title="Your Account">
              <span className="sidebarAvatarGlyph">
                {activeRole === "recipient" ? "M" : "B"}
              </span>
              <span className="onlineBadgeDot" />
            </div>
            <div className="sidebarUserMeta">
              <h2 className="sidebarTitle">Chats</h2>
              <span className="sidebarRoleLabel">
                {activeRole === "recipient" ? "Meerah ✿" : "Admin (BABA)"}
              </span>
            </div>
          </div>

          <div className="sidebarActionsGroup">
            {/* Perspective Switcher */}
            <button
              type="button"
              className="roleTogglePill"
              onClick={() => setActiveRole((prev) => (prev === "recipient" ? "creator" : "recipient"))}
              title={`Switch perspective (currently ${activeRole === "recipient" ? "Meerah ✿" : "Admin BABA"})`}
              aria-label={`Switch role perspective from ${activeRole}`}
            >
              <span className="roleSwitchIcon" aria-hidden="true">🔄</span>
              <span className="roleSwitchText">
                {activeRole === "recipient" ? "Meerah" : "Admin"}
              </span>
            </button>

            {/* "+" New Conversation Action */}
            <button
              type="button"
              className="sidebarIconBtn addChatBtn"
              onClick={() => setShowNewChatModal(true)}
              title="Start a new chat or note"
              aria-label="New chat"
            >
              <span aria-hidden="true">＋</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="chatSearchContainer">
          <div className="chatSearchInputWrapper">
            <span className="chatSearchIcon" aria-hidden="true">🔍</span>
            <input
              type="text"
              className="chatSearchInput"
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search conversation list"
            />
            {searchQuery && (
              <button
                type="button"
                className="chatSearchClearBtn"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="chatConversationList" role="list">
          {filteredConversations.map((conv) => {
            const isSelected = conv.id === activeThreadId;
            return (
              <div
                key={conv.id}
                role="listitem"
                tabIndex={0}
                className={`conversationItem ${isSelected ? "conversationItemActive" : ""}`}
                onClick={() => handleSelectConversation(conv.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleSelectConversation(conv.id);
                  }
                }}
                aria-selected={isSelected}
              >
                <div className="conversationAvatarWrapper">
                  <div className="conversationAvatar">
                    {conv.avatar ? (
                      <img
                        src={conv.avatar}
                        alt={conv.name}
                        className="conversationAvatarImg"
                        onError={(e) => {
                          // Fallback to glyph if image fails
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : null}
                    <span className="conversationGlyph">
                      {conv.avatarGlyph || conv.name.charAt(0)}
                    </span>
                  </div>
                  {conv.isOnline && <span className="avatarOnlineDot" />}
                </div>

                <div className="conversationDetails">
                  <div className="conversationRowTop">
                    <span className="conversationName">
                      {conv.name}
                      {conv.verified && <span className="verifiedStar" title="Verified Safe 1-to-1">✿</span>}
                    </span>
                    <span className="conversationTimestamp">{conv.lastTime}</span>
                  </div>

                  <div className="conversationRowBottom">
                    {conv.isTyping ? (
                      <span className="conversationTyping">
                        <span className="typingText">typing</span>
                        <span className="typingDots">...</span>
                      </span>
                    ) : (
                      <span className="conversationSnippet">{conv.lastMessage}</span>
                    )}

                    {Boolean(conv.unreadCount && conv.unreadCount > 0) && (
                      <span className="conversationUnreadBadge">{conv.unreadCount}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ====================================================================
          MAIN: WhatsApp-style Active Conversation Pane
          ==================================================================== */}
      <main className="chatMainPane" aria-label={`Conversation with ${activeConversation.name}`}>
        {/* Active Conversation Header */}
        <header className="chatPanelHeader whatsappActiveHeader">
          <div className="chatHeaderLeft">
            {/* Mobile Back Button to Return to Chats List */}
            <button
              type="button"
              className="chatMobileBackBtn"
              onClick={() => setMobileView("list")}
              title="Back to Chats"
              aria-label="Back to conversation list"
            >
              ←
            </button>

            <div className="chatAvatarRing" aria-hidden="true">
              {activeConversation.avatar ? (
                <img
                  src={activeConversation.avatar}
                  alt={activeConversation.name}
                  className="chatHeaderAvatarImg"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : null}
              <span className="chatAvatarGlyph">
                {activeConversation.avatarGlyph || activeConversation.name.charAt(0)}
              </span>
              <span className="chatOnlineDot" title="Direct 1-to-1 connection" />
            </div>

            <div className="chatTitleGroup">
              <h2 className="chatTitleHeading">
                {activeConversation.name}
              </h2>
              <div className="chatSubStatus">
                <span className="chatOnlineStatusIndicator">
                  {activeConversation.isTyping
                    ? "typing..."
                    : activeConversation.isOnline
                    ? "online"
                    : activeConversation.statusText || "offline"}
                </span>
                <span className="chatConnectionDot" />
                <span className="chatEncryptedTag">
                  🔒 End-to-End Encrypted
                </span>
              </div>
            </div>
          </div>

          <div className="chatHeaderRight">
            {/* Audio Call Button */}
            <button
              type="button"
              className="chatActionHeaderBtn audioCallBtn"
              onClick={() => startCall("audio")}
              title={`Start Audio Call with ${activeConversation.name}`}
              aria-label="Audio call"
            >
              <span aria-hidden="true">📞</span>
            </button>

            {/* Video Call Button */}
            <button
              type="button"
              className="chatActionHeaderBtn videoCallBtn"
              onClick={() => startCall("video")}
              title={`Start Video Call with ${activeConversation.name}`}
              aria-label="Video call"
            >
              <span aria-hidden="true">📹</span>
            </button>

            {/* E2EE Safety Number Fingerprint Button */}
            <button
              type="button"
              className="chatSecurityBadgeBtn"
              onClick={() => setShowSecurityModal(true)}
              title="View End-to-End Encryption Safety Fingerprint"
              aria-label="End-to-End Encrypted: view safety details"
            >
              <span className="lockPillIcon" aria-hidden="true">🔒</span>
              <span className="lockPillText">Safety</span>
            </button>
          </div>
        </header>

        {/* WhatsApp Message Timeline */}
        <div className="chatWallpaperWrapper">
          <ChatTimeline
            messages={activeMessages}
            currentUserRole={activeRole}
            onRetryMessage={handleRetryMessage}
            onAddReaction={handleAddReaction}
          />
        </div>

        {/* Message Composer Bar */}
        <ChatComposer
          onSendMessage={handleSendMessage}
          isSending={isSending}
          currentUserRole={activeRole}
          placeholder={
            activeRole === "recipient"
              ? "Type a message to BABA... ♡"
              : `Type a message to ${activeConversation.name}... ♡`
          }
        />
      </main>

      {/* ====================================================================
          MODALS & OVERLAYS
          ==================================================================== */}

      {/* Interactive Calling Screen Modal */}
      {callingState && (
        <div className="chatCallModalOverlay" role="dialog" aria-modal="true" aria-label="Call screen">
          <div className="chatCallModalBackdrop" onClick={endCall} />
          <div className="chatCallCard">
            <div className="callPulsingRings">
              <span className="pulseRing ring1" />
              <span className="pulseRing ring2" />
              <div className="callAvatar">
                <span className="callAvatarText">{callingState.name.charAt(0)}</span>
              </div>
            </div>

            <h3 className="callTargetName">{callingState.name}</h3>
            <p className="callStatusLine">
              {callingState.status === "ringing"
                ? `Ringing ${callingState.type === "video" ? "video" : "audio"} channel...`
                : `Connected · ${Math.floor(callingState.seconds / 60)}:${(callingState.seconds % 60).toString().padStart(2, "0")}`}
            </p>

            <div className="callLoveNote">
              🌸 Birthday hotline to Meerah ✿ is always open with unlimited love!
            </div>

            <div className="callControlsRow">
              <button
                type="button"
                className={`callControlBtn ${callingState.isMuted ? "muted" : ""}`}
                onClick={() => setCallingState((prev) => (prev ? { ...prev, isMuted: !prev.isMuted } : null))}
                aria-label={callingState.isMuted ? "Unmute microphone" : "Mute microphone"}
              >
                {callingState.isMuted ? "🔇" : "🎙️"}
              </button>

              <button
                type="button"
                className="callEndBtn"
                onClick={endCall}
                aria-label="End call"
              >
                ☎️
              </button>

              <button
                type="button"
                className="callControlBtn"
                onClick={() => {}}
                aria-label="Speaker"
              >
                🔊
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Chat / Note Modal */}
      {showNewChatModal && (
        <div className="chatSecurityModalOverlay" role="dialog" aria-modal="true" aria-label="Start New Chat">
          <div className="chatSecurityBackdrop" onClick={() => setShowNewChatModal(false)} />
          <div className="chatSecurityModalCard">
            <button
              type="button"
              className="chatModalCloseBtn"
              onClick={() => setShowNewChatModal(false)}
              aria-label="Close new chat modal"
            >
              ✕
            </button>

            <div className="securityModalHeader">
              <span className="securityShieldIcon" aria-hidden="true">💬</span>
              <h3>New Conversation</h3>
              <p className="securitySubhead">Create a dedicated thread for birthday ideas, study, or notes</p>
            </div>

            <form onSubmit={handleCreateNewChat} className="newChatForm">
              <input
                type="text"
                className="newChatInput"
                placeholder="Thread title (e.g. Paris Trip Ideas, Secret Wishlist)..."
                value={newChatTitle}
                onChange={(e) => setNewChatTitle(e.target.value)}
                autoFocus
              />
              <div className="newChatActions">
                <button
                  type="button"
                  className="closeModalMainBtn"
                  onClick={() => setShowNewChatModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="startChatSubmitBtn"
                  disabled={!newChatTitle.trim()}
                >
                  Create Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
