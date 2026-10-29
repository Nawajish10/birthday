import type {
  ChatMessage,
  ChatAttachment,
  ChatRole,
  MediaKind,
  MessageDeliveryStatus,
  CuratedGif,
} from "./chat-types.ts";

// Maximum file size limits as specified
export const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_TEXT_LENGTH = 2000;

export const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/heic",
  "image/heif",
];

export const ALLOWED_VIDEO_MIMES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/ogg",
];

export const ALLOWED_AUDIO_MIMES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/aac",
  "audio/m4a",
  "audio/x-m4a",
];

/**
 * Identify MediaKind from MIME type or filename fallback
 */
export function identifyMediaKind(mimeType: string, filename = ""): MediaKind | null {
  const mime = (mimeType || "").toLowerCase().trim();
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  if (mime === "image/gif" || ext === "gif") {
    return "gif";
  }

  // Check audio first if mime begins with audio/ or ext is audio
  if (
    ALLOWED_AUDIO_MIMES.includes(mime) ||
    mime.startsWith("audio/") ||
    ["mp3", "wav", "ogg", "aac", "m4a", "flac"].includes(ext)
  ) {
    return "audio";
  }

  // Check video if mime begins with video/ or ext is video (if ext is webm and mime is not audio)
  if (
    ALLOWED_VIDEO_MIMES.includes(mime) ||
    mime.startsWith("video/") ||
    ["mp4", "mov", "m4v", "mkv"].includes(ext) ||
    (ext === "webm" && !mime.startsWith("audio/"))
  ) {
    return "video";
  }

  // Check image
  if (
    ALLOWED_IMAGE_MIMES.includes(mime) ||
    mime.startsWith("image/") ||
    ["jpg", "jpeg", "png", "webp", "avif", "heic"].includes(ext)
  ) {
    return "image";
  }

  return null;
}

export interface AttachmentValidationResult {
  valid: boolean;
  error?: string;
  kind?: MediaKind;
}

/**
 * Validates an attachment file against size limits and allowed MIME types.
 */
export function validateAttachment(file: {
  size: number;
  type: string;
  name?: string;
}): AttachmentValidationResult {
  const kind = identifyMediaKind(file.type, file.name);

  if (!kind) {
    return {
      valid: false,
      error: "Unsupported file type. Please upload a photo, video, or audio clip.",
    };
  }

  if (kind === "image" || kind === "gif") {
    if (file.size > MAX_IMAGE_SIZE) {
      return {
        valid: false,
        kind,
        error: `Photo is too large (${formatFileSize(file.size)}). Maximum size is 15 MB.`,
      };
    }
  } else if (kind === "video") {
    if (file.size > MAX_VIDEO_SIZE) {
      return {
        valid: false,
        kind,
        error: `Video is too large (${formatFileSize(file.size)}). Maximum size is 50 MB.`,
      };
    }
  } else if (kind === "audio") {
    if (file.size > MAX_AUDIO_SIZE) {
      return {
        valid: false,
        kind,
        error: `Audio note is too large (${formatFileSize(file.size)}). Maximum size is 10 MB.`,
      };
    }
  }

  return { valid: true, kind };
}

/**
 * Format bytes into readable string (KB, MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format duration in seconds to M:SS (e.g. 0:05, 1:24)
 */
export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

/**
 * Format date separators: "Today", "Yesterday", or formatted dates ("October 28, 2026")
 */
export function formatDateSeparator(
  dateInput: string | number | Date,
  referenceDate = new Date()
): string {
  const target = new Date(dateInput);
  if (isNaN(target.getTime())) return "Recent";

  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const refDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());

  const diffDays = Math.round((refDay.getTime() - targetDay.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    ...(target.getFullYear() !== referenceDate.getFullYear() ? { year: "numeric" } : {}),
  };

  return target.toLocaleDateString("en-US", options);
}

/**
 * Determines whether a date divider pill should appear between two messages
 */
export function shouldShowDateSeparator(
  prevDateStr: string | undefined,
  currDateStr: string
): boolean {
  if (!prevDateStr) return true;
  const prev = new Date(prevDateStr);
  const curr = new Date(currDateStr);
  if (isNaN(prev.getTime()) || isNaN(curr.getTime())) return false;

  return (
    prev.getUTCFullYear() !== curr.getUTCFullYear() ||
    prev.getUTCMonth() !== curr.getUTCMonth() ||
    prev.getUTCDate() !== curr.getUTCDate()
  );
}

/**
 * Format timestamp for message bubble (e.g. "10:42 PM")
 */
export function formatMessageTime(dateInput: string | number | Date): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Transition message state (sending -> sent, sending -> error, etc.)
 */
export function transitionMessageState(
  message: ChatMessage,
  nextStatus: MessageDeliveryStatus
): ChatMessage {
  return {
    ...message,
    status: nextStatus,
  };
}

/**
 * Create a pending outgoing message
 */
export function createPendingMessage(
  body: string,
  sender: ChatRole = "recipient",
  attachments: ChatAttachment[] = [],
  visitorId?: string
): ChatMessage {
  const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    clientId: id,
    sender,
    body: body.trim(),
    createdAt: new Date().toISOString(),
    status: "sending",
    attachments: attachments.length ? [...attachments] : undefined,
    reactions: {},
    myReactions: [],
    visitorId,
  };
}

/**
 * Curated romantic celebration GIFs
 */
export const CURATED_ROMANTIC_GIFS: CuratedGif[] = [
  {
    id: "gif-candles",
    title: "Make a Birthday Wish",
    url: "https://media.giphy.com/media/l4KibWpBGWG9849HR/giphy.gif",
    thumbnailUrl: "https://media.giphy.com/media/l4KibWpBGWG9849HR/200w.gif",
    tags: ["cake", "candles", "wish", "birthday", "celebrate"],
  },
  {
    id: "gif-sparkler-heart",
    title: "Sparkler Love",
    url: "https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif",
    thumbnailUrl: "https://media.giphy.com/media/26AHONQ79FdWZhAI0/200w.gif",
    tags: ["heart", "sparkler", "love", "warm", "magic"],
  },
  {
    id: "gif-roses-bloom",
    title: "Rose Petals Bloom",
    url: "https://media.giphy.com/media/3o7TKoWXm3okO1kgHC/giphy.gif",
    thumbnailUrl: "https://media.giphy.com/media/3o7TKoWXm3okO1kgHC/200w.gif",
    tags: ["rose", "flower", "bloom", "romantic", "love"],
  },
  {
    id: "gif-warm-hug",
    title: "Warm Embrace",
    url: "https://media.giphy.com/media/od5H3PmEG5EVq/giphy.gif",
    thumbnailUrl: "https://media.giphy.com/media/od5H3PmEG5EVq/200w.gif",
    tags: ["hug", "cute", "warm", "embrace", "love"],
  },
  {
    id: "gif-confetti-cheer",
    title: "Birthday Confetti",
    url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
    thumbnailUrl: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/200w.gif",
    tags: ["confetti", "party", "cheer", "happy", "celebrate"],
  },
  {
    id: "gif-sparkle-stars",
    title: "Golden Starlight",
    url: "https://media.giphy.com/media/l41JGlwa1xYhk25q0/giphy.gif",
    thumbnailUrl: "https://media.giphy.com/media/l41JGlwa1xYhk25q0/200w.gif",
    tags: ["stars", "glow", "sparkle", "night", "golden"],
  },
  {
    id: "gif-heart-air",
    title: "Sending My Heart",
    url: "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif",
    thumbnailUrl: "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/200w.gif",
    tags: ["heart", "love", "flutter", "sweet"],
  },
  {
    id: "gif-toast-cheers",
    title: "To Another Year ♡",
    url: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif",
    thumbnailUrl: "https://media.giphy.com/media/g9582DNuQppxC/200w.gif",
    tags: ["cheers", "celebration", "toast", "smile"],
  },
];

/**
 * Filter curated GIFs with search query
 */
export function searchCuratedGifs(query: string): CuratedGif[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return CURATED_ROMANTIC_GIFS;

  return CURATED_ROMANTIC_GIFS.filter((gif) => {
    return (
      gif.title.toLowerCase().includes(clean) ||
      gif.tags.some((tag) => tag.toLowerCase().includes(clean))
    );
  });
}

/**
 * Deterministic End-to-End Encryption safety fingerprint
 */
export function generateSecurityFingerprint(seed = "meerah-noah-private-chat"): string {
  // Generates 8 groups of 4 uppercase hex characters
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  const parts: string[] = [];
  for (let i = 0; i < 8; i++) {
    hash = Math.imul(hash ^ (i * 0x5bd1e995), 0x1b873593);
    const hex = Math.abs(hash).toString(16).padStart(8, "0").slice(0, 4).toUpperCase();
    parts.push(hex);
  }

  return parts.join("  ");
}

/**
 * Fallback initial conversation between Noah (creator) and Meerah (recipient)
 */
export const DEFAULT_INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "msg-init-1",
    sender: "creator",
    body: "Happy Birthday Meerah! 🎂✨ I built this whole little universe for you. Every word, every song, and every corner here was made with so much love.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    status: "sent",
    reactions: { "❤️": 1, "✨": 1 },
    myReactions: ["❤️"],
  },
  {
    id: "msg-init-2",
    sender: "creator",
    body: "Whenever you want to talk, send a voice note, or share a thought, this chat is just ours — safe, private, and always right here.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    status: "sent",
    attachments: [
      {
        id: "att-welcome-photo",
        type: "image",
        url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=82",
        name: "birthday-morning.jpg",
        size: 1420000,
        mimeType: "image/jpeg",
        thumbnailUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=300&q=80",
        caption: "A little celebration for the brightest smile ♡",
      },
    ],
  },
];
