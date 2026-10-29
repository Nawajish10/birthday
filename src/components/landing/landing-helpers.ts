/**
 * Shared Landing Page Helpers, Constants, and Pure Domain Logic (Wave 1)
 */

// ============================================================================
// Section 1: Hero & Avatar Helpers & Defaults
// ============================================================================
export const DEFAULT_RECIPIENT_NAME = "Meerah";
export const DEFAULT_BIRTHDAY_DATE = "October 30";
export const DEFAULT_URDU_BLESSING = "تمہاری سالگرہ کا ہر لمحہ محبت اور روشنی سے بھرا رہے";

export interface HeroSectionProps {
  recipientName?: string;
  birthdayDate?: string;
  onOpenWorld: () => void;
  avatarUrl?: string;
}

export function resolveHeroProps(props: Partial<HeroSectionProps> = {}): {
  recipientName: string;
  birthdayDate: string;
  onOpenWorld?: () => void;
  avatarUrl?: string;
} {
  return {
    recipientName: props.recipientName?.trim() || DEFAULT_RECIPIENT_NAME,
    birthdayDate: props.birthdayDate?.trim() || DEFAULT_BIRTHDAY_DATE,
    onOpenWorld: props.onOpenWorld,
    avatarUrl: props.avatarUrl,
  };
}

// ============================================================================
// Section 2: Scrapbook Card Wall Types & Configuration
// ============================================================================
export type ScrapbookDestination =
  | "birthday-book"
  | "letter"
  | "our-memories"
  | "camera"
  | "songs"
  | "study"
  | "games"
  | "video";

export interface ScrapbookCardConfig {
  id: ScrapbookDestination;
  title: string;
  kicker: string;
  caption: string;
  isPlanned: boolean;
  washiColor: "gold" | "pink" | "sage";
  washiPos: "washi-pos-left" | "washi-pos-center" | "washi-pos-right";
  chipColor: "chip-gold" | "chip-pink" | "chip-sage" | "chip-planned";
  defaultBadge: string;
  stampText: string;
  actionText: string;
  tiltAngle: string;
  plannedNotice?: string;
}

export const SCRAPBOOK_CARDS: readonly ScrapbookCardConfig[] = [
  {
    id: "birthday-book",
    title: "The Birthday Book",
    kicker: "Keepsake Volume",
    caption: "Turn each page to revisit cards, Urdu messages, and chapters crafted just for you.",
    isPlanned: false,
    washiColor: "sage",
    washiPos: "washi-pos-right",
    chipColor: "chip-sage",
    defaultBadge: "Keepsake Pages",
    stampText: "NO. 01 · VOLUME",
    actionText: "Open the birthday book",
    tiltAngle: "-1.5deg",
  },
  {
    id: "letter",
    title: "A Letter for You",
    kicker: "Heartfelt Words",
    caption: "Written with all my heart, sealed with love, and meant only for your eyes.",
    isPlanned: false,
    washiColor: "pink",
    washiPos: "washi-pos-center",
    chipColor: "chip-pink",
    defaultBadge: "Personal Letter",
    stampText: "NO. 02 · KEEPSAKE",
    actionText: "Read birthday letter",
    tiltAngle: "1.8deg",
  },
  {
    id: "our-memories",
    title: "Our Memories",
    kicker: "Photo Stories",
    caption: "Sunlit afternoons, messy adventures, and snapshots we'll smile over forever.",
    isPlanned: false,
    washiColor: "gold",
    washiPos: "washi-pos-left",
    chipColor: "chip-gold",
    defaultBadge: "Photo Reel",
    stampText: "NO. 03 · STORIES",
    actionText: "Explore memory stories",
    tiltAngle: "-1.2deg",
  },
  {
    id: "camera",
    title: "Make a Memory",
    kicker: "Snap Camera",
    caption: "Snap a birthday selfie or pick a cozy photo from today to save in your book.",
    isPlanned: false,
    washiColor: "pink",
    washiPos: "washi-pos-right",
    chipColor: "chip-pink",
    defaultBadge: "Instant Snap",
    stampText: "NO. 04 · CAMERA",
    actionText: "Open birthday camera",
    tiltAngle: "2.0deg",
  },
  {
    id: "songs",
    title: "Songs That Remind Me of You",
    kicker: "Shared Soundscape",
    caption: "The melodies that hold our laughter, road trips, and midnight conversations.",
    isPlanned: false,
    washiColor: "sage",
    washiPos: "washi-pos-left",
    chipColor: "chip-sage",
    defaultBadge: "Songbook & Vinyl",
    stampText: "NO. 05 · VINYL",
    actionText: "Listen to our tracklist",
    tiltAngle: "-1.8deg",
  },
  {
    id: "study",
    title: "Read & Study",
    kicker: "Curated Bookshelf",
    caption: "Browse thoughtfully selected books, literature, poetry, and quiet reading recommendations.",
    isPlanned: false,
    washiColor: "gold",
    washiPos: "washi-pos-center",
    chipColor: "chip-gold",
    defaultBadge: "Books & Study",
    stampText: "NO. 06 · STUDY",
    actionText: "Explore bookshelf",
    tiltAngle: "1.4deg",
  },
  {
    id: "games",
    title: "Birthday Games",
    kicker: "Playful Moments",
    caption: "Memory card matching, sweet word puzzles, and birthday trivia made just for you.",
    isPlanned: false,
    washiColor: "pink",
    washiPos: "washi-pos-left",
    chipColor: "chip-pink",
    defaultBadge: "Playable Games",
    stampText: "NO. 07 · GAMES",
    actionText: "Play birthday games",
    tiltAngle: "-1.0deg",
  },
  {
    id: "video",
    title: "Birthday Video Reel",
    kicker: "Moments in Motion",
    caption: "A cinematic look back at the moments that made this year so wonderfully special.",
    isPlanned: false,
    washiColor: "gold",
    washiPos: "washi-pos-right",
    chipColor: "chip-gold",
    defaultBadge: "Video Reel",
    stampText: "NO. 08 · CINEMA",
    actionText: "Watch birthday video",
    tiltAngle: "1.6deg",
  },
];

export function isPlannedDestination(id?: ScrapbookDestination): boolean {
  void id;
  return false;
}

export function getCardBadgeText(
  id: ScrapbookDestination,
  props: { unlockedSurprisesCount?: number; favoriteSongsCount?: number } = {}
): string {
  if (id === "songs") {
    if (typeof props.favoriteSongsCount === "number" && props.favoriteSongsCount > 0) {
      return `${props.favoriteSongsCount} Tracks Favorited`;
    }
    return "Curated Playlist";
  }
  const card = SCRAPBOOK_CARDS.find((c) => c.id === id);
  return card?.defaultBadge || "Explore";
}

export function getCardAriaLabel(
  card: ScrapbookCardConfig,
  props: { unlockedSurprisesCount?: number; favoriteSongsCount?: number } = {}
): string {
  const badge = getCardBadgeText(card.id, props);
  return `Open ${card.title} - ${card.caption} (${badge})`;
}

// ============================================================================
// Section 3: Music Card Contracts
// ============================================================================
export interface LandingMusicTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
}

export interface LandingMusicCardProps {
  tracks: LandingMusicTrack[];
  activeTrack: LandingMusicTrack | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPlayTrack: (track: LandingMusicTrack) => void;
  onOpenSongbook: () => void;
  personalNote?: string;
}

// ============================================================================
// Section 4 & 5: Story & Memories Preview Contracts
// ============================================================================
export interface MemoryPreviewItem {
  id: string;
  url: string;
  caption?: string;
  alt_text?: string;
  media_kind: "image" | "video";
}

export interface StoryDestinationCardsProps {
  onOpenBook: () => void;
  onOpenMemories: () => void;
  onSelectPhoto?: (item: { url: string; caption: string; kind?: "image" | "video" }) => void;
  memories: MemoryPreviewItem[];
  totalPagesCount?: number;
  loading?: boolean;
}

export const MAX_MEMORIES_PREVIEW = 4;
export const DEFAULT_BOOK_PAGES_COUNT = 7;
export const BOOK_FOIL_ENGLISH = "For my baba";
export const BOOK_FOIL_URDU = "تمہاری سالگرہ";
export const EMPTY_MEMORIES_GUIDANCE_TITLE = "Moments are waiting to be placed here...";
export const EMPTY_MEMORIES_GUIDANCE_TEXT =
  "Your birthday photos and sweet snapshots will appear here as soon as memories are pinned to the scrapbook.";

export function formatPageCountBadge(totalPagesCount?: number): string {
  const count =
    typeof totalPagesCount === "number" && totalPagesCount > 0
      ? totalPagesCount
      : DEFAULT_BOOK_PAGES_COUNT;
  return `${count} Keepsake Pages · صفحات`;
}

export function getPreviewMemories(
  memories?: MemoryPreviewItem[],
  maxCount: number = MAX_MEMORIES_PREVIEW
): MemoryPreviewItem[] {
  if (!Array.isArray(memories)) return [];
  return memories.slice(0, maxCount);
}

export function getMemoryAltText(item: MemoryPreviewItem, index: number): string {
  if (item.alt_text?.trim()) return item.alt_text.trim();
  if (item.caption?.trim()) return item.caption.trim();
  return `Birthday memory photograph ${index + 1}`;
}

export function getMemoryDisplayCaption(item: MemoryPreviewItem, index?: number): string {
  if (item.caption?.trim()) return item.caption.trim();
  if (item.alt_text?.trim()) return item.alt_text.trim();
  if (typeof index === "number") {
    return `Sweet Moment #${index + 1}`;
  }
  return "A sweet memory ✿";
}

export function buildSelectPhotoPayload(item: MemoryPreviewItem): {
  url: string;
  caption: string;
  kind: "image" | "video";
} {
  return {
    url: item.url,
    caption: item.caption || item.alt_text || "Birthday memory photograph",
    kind: item.media_kind || "image",
  };
}
