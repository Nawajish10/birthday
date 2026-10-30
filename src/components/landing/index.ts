// Section 1
export {
  MidnightBirthdayReveal,
  DEFAULT_RECIPIENT_TIMEZONE,
  DEFAULT_RECIPIENT_PHOTO_URL,
  DEFAULT_BIRTHDAY_MONTH,
  DEFAULT_BIRTHDAY_DAY,
  isBirthdayActive,
  getTimezoneDateParts,
  getRevealStorageKey,
  hasRevealCompleted,
  markRevealCompleted,
  type MidnightBirthdayRevealProps,
  type TimezoneDateParts,
} from "./MidnightBirthdayReveal";

// Section 2
export {
  HeroSection,
  DEFAULT_RECIPIENT_NAME,
  DEFAULT_BIRTHDAY_DATE,
  DEFAULT_URDU_BLESSING,
  resolveHeroProps,
  type HeroSectionProps,
} from "./HeroSection";

// Section 3
export {
  SwipeablePhotoCards,
  DEFAULT_PHOTOS,
  SWIPE_THRESHOLD_PX,
  calculateSwipeDirection,
  isValidMediaUrl,
  isExcludedPhotoEntry,
  selectDynamicPhotos,
  type SwipeablePhotoItem,
  type SwipeablePhotoCardsProps,
} from "./SwipeablePhotoCards";

// Section 4
export {
  PersonalMessagesSection,
  DEFAULT_HEADING as DEFAULT_MESSAGES_HEADING,
  DEFAULT_SUPPORTING_TEXT as DEFAULT_MESSAGES_SUPPORTING,
  DEFAULT_PERSONAL_MESSAGES,
  type PersonalMessageCard,
  type PersonalMessagesSectionProps,
} from "./PersonalMessagesSection";

// Section 5
export {
  BirthdayBookInvitation,
  DEFAULT_BOOK_INVITATION_HEADING,
  DEFAULT_BOOK_INVITATION_SUPPORTING,
  DEFAULT_BOOK_ACTION_LABEL,
  DEFAULT_BOOK_COVER_TITLE,
  DEFAULT_BOOK_COVER_URDU,
  DEFAULT_BOOK_TOTAL_PAGES,
  type BirthdayBookInvitationProps,
} from "./BirthdayBookInvitation";

// Section 6
export {
  OurSoundtrackSection,
  DEFAULT_SOUNDTRACK_HEADING,
  DEFAULT_SOUNDTRACK_SUPPORTING,
  type OurSoundtrackSectionProps,
} from "./OurSoundtrackSection";

// Section 7
export {
  MemoriesPreviewSection,
  DEFAULT_MEMORIES_HEADING,
  DEFAULT_MEMORIES_SUPPORTING,
  DEFAULT_MEMORIES_KICKER,
  DEFAULT_MEMORIES_MAX_COUNT,
  EMPTY_MEMORIES_TITLE,
  EMPTY_MEMORIES_TEXT,
  selectDynamicMemories,
  type MemoryPreviewItem,
  type MemoriesPreviewSectionProps,
  getMemoryAltText,
  getMemoryDisplayCaption,
} from "./MemoriesPreviewSection";

// Section 8
export {
  ExploreWorldSection,
  DEFAULT_EXPLORE_HEADING,
  DEFAULT_EXPLORE_SUPPORTING,
  DEFAULT_WORLD_DESTINATIONS,
  type WorldDestinationCard,
  type ExploreWorldSectionProps,
} from "./ExploreWorldSection";

// Section 9
export {
  ClosingMessageSection,
  DEFAULT_CLOSING_HEADING,
  DEFAULT_CLOSING_MESSAGE,
  DEFAULT_CLOSING_LINE,
  DEFAULT_CLOSING_SIGNOFF,
  type ClosingMessageSectionProps,
} from "./ClosingMessageSection";

// Everyday Sanctuary — Daily Reflections & Personal Reminders
export {
  DailyReflections,
  AUTHENTIC_QURANIC_REFLECTIONS,
  getReflectionForDate,
  getReflectionByIndex,
  type DailyReflectionItem,
  type DailyReflectionsProps,
} from "./DailyReflections";

export {
  PersonalReminders,
  DEFAULT_STORAGE_KEY as DEFAULT_REMINDERS_STORAGE_KEY,
  DEFAULT_STARTER_REMINDERS,
  formatReminderBadge,
  createReminder,
  updateReminder,
  deleteReminder,
  toggleReminder,
  sortRemindersByDate,
  loadStoredReminders,
  saveStoredReminders,
  type PersonalReminderItem,
  type ReminderCategory,
  type PersonalRemindersProps,
} from "./PersonalReminders";

// Legacy components preserved for existing test suites
export {
  ScrapbookCardWall,
  SCRAPBOOK_CARDS,
  isPlannedDestination,
  getCardBadgeText,
  getCardAriaLabel,
  type ScrapbookDestination,
  type ScrapbookCardConfig,
  type ScrapbookCardWallProps,
} from "./ScrapbookCardWall";

export {
  LandingMusicCard,
  type LandingMusicTrack,
  type LandingMusicCardProps,
} from "./LandingMusicCard";

export {
  StoryDestinationCards,
  MAX_MEMORIES_PREVIEW,
  DEFAULT_BOOK_PAGES_COUNT,
  BOOK_FOIL_ENGLISH,
  BOOK_FOIL_URDU,
  EMPTY_MEMORIES_GUIDANCE_TITLE,
  EMPTY_MEMORIES_GUIDANCE_TEXT,
  formatPageCountBadge,
  getPreviewMemories,
  buildSelectPhotoPayload,
  type StoryDestinationCardsProps,
} from "./StoryDestinationCards";

export * from "./landing-helpers";
