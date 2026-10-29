/**
 * Types and interfaces for the Birthday 1-to-1 Private Chat interface
 * Between Creator (Noah) and Recipient (Meerah)
 */

export type ChatRole = "recipient" | "creator";

export type MessageDeliveryStatus =
  | "queued"
  | "sending"
  | "server-accepted"
  | "durably-persisted"
  | "sent"
  | "error";

export type MediaKind = "image" | "video" | "audio" | "gif";

export interface ChatAttachment {
  id: string;
  type: MediaKind;
  url: string;
  name: string;
  size: number; // in bytes
  mimeType: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  caption?: string;
}

export interface ChatMessage {
  id: string;
  clientId?: string;
  sender: ChatRole; // "recipient" (Meerah) or "creator" (Noah)
  body: string;
  createdAt: string; // ISO-8601 string or timestamp
  status: MessageDeliveryStatus;
  persisted?: boolean;
  storageTier?: "local_queue" | "volatile_fallback" | "database";
  attachments?: ChatAttachment[];
  reactions?: Record<string, number>;
  myReactions?: string[];
  visitorId?: string;
}

export interface CuratedGif {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  tags: string[];
}

export interface ChatComposerProps {
  onSendMessage: (payload: {
    body: string;
    attachments: ChatAttachment[];
  }) => Promise<boolean | void>;
  isSending?: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  currentUserRole?: ChatRole;
}

export interface ChatTimelineProps {
  messages: ChatMessage[];
  currentUserRole?: ChatRole;
  onRetryMessage?: (messageId: string) => void;
  onAddReaction?: (messageId: string, emoji: string) => void;
  onImageClick?: (attachment: ChatAttachment) => void;
}

export interface ChatPanelProps {
  visitorId?: string;
  currentUserRole?: ChatRole;
  onSendMessage?: (msg: { body: string; attachments: ChatAttachment[] }) => Promise<boolean>;
  className?: string;
}
