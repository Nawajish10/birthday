import type {
  ChatMessage,
  ChatAttachment,
  ChatRole,
  MediaKind,
  MessageDeliveryStatus,
  CuratedGif,
  ChatConversation,
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


/**
 * WhatsApp-style conversations list
 */
export const INITIAL_CONVERSATIONS: ChatConversation[] = [
  {
    id: "meerah",
    name: "Meerah ✿",
    avatar: "/images/sample-meerah-1.jpg",
    avatarGlyph: "M",
    lastMessage: "Typing...",
    lastTime: "9:41 PM",
    unreadCount: 2,
    isTyping: true,
    isOnline: true,
    statusText: "online",
    verified: true,
  },
  {
    id: "memories",
    name: "Memories",
    avatarGlyph: "📸",
    lastMessage: "Photo shared",
    lastTime: "8:12 PM",
    unreadCount: 0,
    statusText: "Personal Vault",
  },
  {
    id: "study-buddy",
    name: "Study Buddy",
    avatarGlyph: "📚",
    lastMessage: "Let's study together!",
    lastTime: "5:30 PM",
    unreadCount: 0,
    statusText: "Library & Goals",
  },
  {
    id: "game-zone",
    name: "Game Zone",
    avatarGlyph: "🎮",
    lastMessage: "New high score!",
    lastTime: "3:18 PM",
    unreadCount: 0,
    statusText: "Arcade & Puzzles",
  },
  {
    id: "music-room",
    name: "Music Room",
    avatarGlyph: "🎵",
    lastMessage: "Shared a song",
    lastTime: "1:05 PM",
    unreadCount: 0,
    statusText: "Our Playlist",
  },
  {
    id: "notes-ideas",
    name: "Notes & Ideas",
    avatarGlyph: "💡",
    lastMessage: "Check this out",
    lastTime: "Yesterday",
    unreadCount: 0,
    statusText: "Shared Thoughts",
  },
];

export const THREAD_INITIAL_MESSAGES: Record<string, ChatMessage[]> = {
  meerah: [
    {
      id: "msg-init-1",
      sender: "creator",
      body: "Happy Birthday Meerah! 🎂✨ I built this whole little universe for you. Every word, every song, and every corner here was made with so much love.",
      createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      status: "read",
      reactions: { "❤️": 2, "✨": 1 },
      myReactions: ["❤️"],
    },
    {
      id: "msg-init-2",
      sender: "creator",
      body: "Whenever you want to talk, send a voice note, or share a thought, this chat is just ours — safe, private, and always right here.",
      createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      status: "read",
      reactions: { "🥺": 1 },
    },
    {
      id: "msg-init-sunset",
      sender: "recipient",
      body: "Aww BABA thank you so much! Look at this gorgeous golden sunset from today 🌅✨",
      createdAt: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
      status: "read",
      attachments: [
        {
          id: "att-sunset-photo",
          type: "image",
          url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
          name: "golden-sunset.jpg",
          size: 1120000,
          mimeType: "image/jpeg",
          thumbnailUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80",
          caption: "Golden hour birthday view ♡",
        },
      ],
      reactions: { "❤️": 3 },
      myReactions: ["❤️"],
    },
    {
      id: "msg-init-voice",
      sender: "recipient",
      body: "",
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      status: "read",
      attachments: [
        {
          id: "att-voice-meerah",
          type: "audio",
          url: "https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3",
          name: "voice-note-24s.m4a",
          size: 320000,
          mimeType: "audio/mpeg",
          durationSeconds: 24,
        },
      ],
    },
    {
      id: "msg-init-recent",
      sender: "creator",
      body: "I see it!! Absolutely glowing. Keep that beautiful smile all year round 🌸",
      createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      status: "durably-persisted",
      reactions: { "🥰": 1 },
    },
  ],
  memories: [
    {
      id: "mem-1",
      sender: "creator",
      body: "Here is where all our captured photographs and milestone moments live. Tap any memory to travel back in time 📸✨",
      createdAt: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
      status: "read",
      attachments: [
        {
          id: "att-mem-1",
          type: "image",
          url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=82",
          name: "birthday-morning.jpg",
          size: 1420000,
          mimeType: "image/jpeg",
          thumbnailUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=300&q=80",
          caption: "Photo shared · A special morning celebration",
        },
      ],
    },
    {
      id: "mem-2",
      sender: "recipient",
      body: "I can't believe how fast time flies! These photos brought back all the laughter.",
      createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      status: "read",
    },
  ],
  'study-buddy': [
    {
      id: "study-1",
      sender: "creator",
      body: "Let's study together! Pomodoro timer is set and the study playlist is ready. You're going to ace everything you set your mind to 📚💫",
      createdAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
      status: "read",
    },
    {
      id: "study-2",
      sender: "recipient",
      body: "Yes! Goal for today: complete 2 chapters then reward myself with cake! 🍰",
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      status: "read",
    },
  ],
  'game-zone': [
    {
      id: "game-1",
      sender: "creator",
      body: "New high score! Can you beat 12,400 in the memory match game? 🎮👾",
      createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      status: "read",
    },
    {
      id: "game-2",
      sender: "recipient",
      body: "Challenge accepted! I'm coming for that top rank right now 🔥",
      createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      status: "read",
    },
  ],
  'music-room': [
    {
      id: "music-1",
      sender: "creator",
      body: "Shared a song: 'A Thousand Years' & 'Can't Help Falling in Love' are on the birthday turntable 🎵💖",
      createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
      status: "read",
    },
    {
      id: "music-2",
      sender: "recipient",
      body: "Playing it on repeat all day! The vinyl record animation is so dreamy 🎶",
      createdAt: new Date(Date.now() - 1000 * 60 * 290).toISOString(),
      status: "read",
    },
  ],
  'notes-ideas': [
    {
      id: "notes-1",
      sender: "creator",
      body: "Check this out: our shared bucket list for this new age and adventures we want to take together ✨📝",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
      status: "read",
    },
    {
      id: "notes-2",
      sender: "recipient",
      body: "Added 3 new destinations! Stargazing trip is definitely at the top 🌌",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
      status: "read",
    },
  ],
};
