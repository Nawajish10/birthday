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


// ============================================================================
// Section 1: Midnight Birthday Reveal Contracts & Pure Date Helpers
// ============================================================================
export const DEFAULT_RECIPIENT_TIMEZONE = "Asia/Kolkata";
export const BIRTHDAY_TARGET_MONTH = 9; // October (0-indexed in JS Date)
export const BIRTHDAY_TARGET_DAY = 30; // 30th
export const REVEAL_STORAGE_KEY_PREFIX = "birthday-reveal-completed-";

/**
 * Calculates current year/month/day in the specified IANA timezone.
 * Returns { year, month (0-11), day (1-31), hours (0-23), minutes (0-59), seconds (0-59) }.
 */
export function getTimeInTimezone(
  timeZone: string = DEFAULT_RECIPIENT_TIMEZONE,
  referenceDate: Date = new Date()
): { year: number; month: number; day: number; hours: number; minutes: number; seconds: number } {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(referenceDate);
    const getPart = (type: string) => {
      const p = parts.find((x) => x.type === type);
      return p ? parseInt(p.value, 10) : 0;
    };
    return {
      year: getPart("year"),
      month: getPart("month") - 1, // convert 1-12 to 0-11
      day: getPart("day"),
      hours: getPart("hour"),
      minutes: getPart("minute"),
      seconds: getPart("second"),
    };
  } catch {
    return {
      year: referenceDate.getUTCFullYear(),
      month: referenceDate.getUTCMonth(),
      day: referenceDate.getUTCDate(),
      hours: referenceDate.getUTCHours(),
      minutes: referenceDate.getUTCMinutes(),
      seconds: referenceDate.getUTCSeconds(),
    };
  }
}

/**
 * Pure checker: Is today October 30 in the recipient's timezone?
 */
export function isBirthdayToday(
  timeZone: string = DEFAULT_RECIPIENT_TIMEZONE,
  referenceDate: Date = new Date()
): boolean {
  const t = getTimeInTimezone(timeZone, referenceDate);
  return t.month === BIRTHDAY_TARGET_MONTH && t.day === BIRTHDAY_TARGET_DAY;
}

/**
 * Check if the birthday reveal has already been completed for the current birthday year.
 */
export function isMidnightRevealCompleted(
  timeZone: string = DEFAULT_RECIPIENT_TIMEZONE,
  storage?: Storage
): boolean {
  if (typeof window === "undefined" && !storage) return false;
  const s = storage || window.localStorage;
  try {
    const year = getTimeInTimezone(timeZone).year;
    const key = `${REVEAL_STORAGE_KEY_PREFIX}${year}-10-30`;
    return s.getItem(key) === "true";
  } catch {
    return false;
  }
}

/**
 * Persist that the birthday reveal has been completed for this year.
 */
export function markMidnightRevealCompleted(
  timeZone: string = DEFAULT_RECIPIENT_TIMEZONE,
  storage?: Storage
): void {
  if (typeof window === "undefined" && !storage) return;
  const s = storage || window.localStorage;
  try {
    const year = getTimeInTimezone(timeZone).year;
    const key = `${REVEAL_STORAGE_KEY_PREFIX}${year}-10-30`;
    s.setItem(key, "true");
  } catch {}
}

// ============================================================================
// Section 3: Swipeable Photo Cards Contracts
// ============================================================================
export interface PhotoCardItem {
  id: string;
  url: string;
  caption?: string;
  date?: string;
  alt?: string;
  kind?: "image" | "video";
}

export const SAMPLE_LANDING_PHOTOS: PhotoCardItem[] = [
  {
    id: "photo-1",
    url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=900&q=82",
    caption: "A little celebration · ایک چھوٹی سی خوشی",
    date: "October 2026",
    alt: "Celebration with warm fairy lights and birthday decorations",
  },
  {
    id: "photo-2",
    url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=82",
    caption: "A night full of light · روشنیوں بھری رات",
    date: "Autumn Memory",
    alt: "Night celebration under soft lanterns and golden sparkles",
  },
  {
    id: "photo-3",
    url: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=900&q=82",
    caption: "Together in the moment · ایک خوبصورت لمحہ",
    date: "Golden Hour",
    alt: "Sunlit afternoon with warm smiles and coffee",
  },
  {
    id: "photo-4",
    url: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=900&q=82",
    caption: "Sweetest birthday wishes · ڈھیروں دعائیں",
    date: "Special Day",
    alt: "Birthday cake with softly glowing candles and rose petals",
  },
];

// ============================================================================
// Section 4: Personal Messages and Poetry Contracts
// ============================================================================
export interface PersonalMessageItem {
  id: string;
  title: string;
  kicker?: string;
  body_en: string;
  body_ur?: string;
  poet?: string;
  isUrduPrimary?: boolean;
}

export const DEFAULT_PERSONAL_MESSAGES: PersonalMessageItem[] = [
  {
    id: "msg-1",
    title: "A Little Wish For You",
    kicker: "BIRTHDAY LETTER · سالگرہ کی دعا",
    body_en: "May your day be filled with warm sunlight, quiet peace, and all the gentle joy your heart can hold. You bring so much light into the world simply by being in it.",
    body_ur: "تمہاری سالگرہ کا ہر لمحہ خوشیوں سے مہکتا رہے، اور آنے والا ہر سال تمہارے لیے مسکراہٹیں اور برکتیں لائے۔",
    poet: "With all my heart",
  },
  {
    id: "msg-2",
    title: "Whispers of Starlight",
    kicker: "URDU POETRY · اردو شاعری",
    body_en: "Some souls are like gentle rain on parched earth — they don't demand attention, but everything blossoms in their presence.",
    body_ur: "خدا کرے کہ تری عمر کے گلستاں میں\nکبھی خزاں کا گزر بھی نہ ہو خدا کے لیے\nسدا بہار رہے یہ چمن، سدا آباد\nیہی دعا ہے مری، تیری ہر دعا کے لیے",
    poet: "دعاؤں کا تحفہ",
    isUrduPrimary: true,
  },
  {
    id: "msg-3",
    title: "The Chapters We Share",
    kicker: "KEEPSAKE NOTE · یادوں کا صفحہ",
    body_en: "Looking back at every little conversation, every shared laugh, and every quiet reassurance, I realize that the most precious things in life are the small moments we share together.",
    body_ur: "تمہاری مسکراہٹ وہ خوبصورت روشنی ہے جو اداس دنوں کو بھی روشن کر دیتی ہے۔",
    poet: "Always & Forever",
  },
  {
    id: "msg-4",
    title: "Ghazal of Soft Light",
    kicker: "POETIC BLESSING · خوبصورت احساس",
    body_en: "May every path you walk be soft beneath your feet, and may every morning greet you with hope and peace.",
    body_ur: "ہر نئی صبح تمہارے لیے نئی امیدیں لائے، اور ہر شام تمہارے دل کو سکون عطا کرے۔ سالگرہ بہت بہت مبارک ہو!",
    poet: "تمہارے لیے",
  },
];

// ============================================================================
// Section 5: Birthday Book Invitation Contracts
// ============================================================================
export const BOOK_INVITATION_HEADING = "There's a little more to this story.";
export const BOOK_INVITATION_SUBTEXT = "Every page holds something I wanted you to see, remember or feel.";
export const BOOK_INVITATION_ACTION = "Open your birthday book";

// ============================================================================
// Section 6: Our Soundtrack Contracts
// ============================================================================
export const SOUNDTRACK_HEADING = "Our soundtrack.";
export const SOUNDTRACK_SUBTEXT = "Some feelings are easier to share through a song.";

// ============================================================================
// Section 7: Memories Preview Contracts
// ============================================================================
export const MEMORIES_PREVIEW_HEADING = "Moments worth keeping.";
export const MEMORIES_PREVIEW_SUBTEXT = "A few little pieces of time that deserve a place of their own.";
export const MEMORIES_PREVIEW_ACTION = "Explore memories";

// ============================================================================
// Section 8: Explore Your World Contracts
// ============================================================================
export const EXPLORE_WORLD_HEADING = "Explore Your World";
export const EXPLORE_WORLD_SUBTEXT = "Every corner holds a little piece of love and memories waiting for you.";

// ============================================================================
// Section 9: Closing Message Contracts
// ============================================================================
export const CLOSING_HEADING = "And one last thing…";
export const CLOSING_MESSAGE = "I hope this little world reminds you how special you are. May this new year of your life bring you happiness, beautiful surprises and countless reasons to smile.";
export const CLOSING_LINE = "There's always another memory waiting to be made.";
export const CLOSING_SIGNOFF = "With all my love ♡";
