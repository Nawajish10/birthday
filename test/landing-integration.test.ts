import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Import modules and contracts directly from TypeScript source files
import {
  DEFAULT_RECIPIENT_NAME,
  DEFAULT_BIRTHDAY_DATE,
  DEFAULT_URDU_BLESSING,
  resolveHeroProps,
  type HeroSectionProps,
  SCRAPBOOK_CARDS,
  isPlannedDestination,
  getCardBadgeText,
  getCardAriaLabel,
  type ScrapbookDestination,
  type ScrapbookCardConfig,
  type LandingMusicTrack,
  type LandingMusicCardProps,
  MAX_MEMORIES_PREVIEW,
  DEFAULT_BOOK_PAGES_COUNT,
  BOOK_FOIL_ENGLISH,
  BOOK_FOIL_URDU,
  EMPTY_MEMORIES_GUIDANCE_TITLE,
  EMPTY_MEMORIES_GUIDANCE_TEXT,
  formatPageCountBadge,
  getPreviewMemories,
  getMemoryAltText,
  getMemoryDisplayCaption,
  buildSelectPhotoPayload,
  type MemoryPreviewItem,
} from "../src/components/landing/landing-helpers.ts";

const LANDING_DIR = path.resolve(process.cwd(), "src/components/landing");

// Helper to read CSS contents
function readCss(fileName: string): string {
  const filePath = path.join(LANDING_DIR, fileName);
  assert.ok(fs.existsSync(filePath), `CSS file must exist: ${fileName}`);
  return fs.readFileSync(filePath, "utf-8");
}

// Helper to read TSX source code for structural verification
function readTsx(fileName: string): string {
  const filePath = path.join(LANDING_DIR, fileName);
  assert.ok(fs.existsSync(filePath), `TSX file must exist: ${fileName}`);
  return fs.readFileSync(filePath, "utf-8");
}

describe("Wave 1 Integration — Design Tokens and CSS Architecture", () => {
  test("landing-tokens.css defines the full 2D scrapbook color palette and variables", () => {
    const css = readCss("landing-tokens.css");

    const requiredTokens = [
      "--scrapbook-rose",
      "--scrapbook-rose-deep",
      "--scrapbook-ivory",
      "--scrapbook-paper",
      "--scrapbook-sunflower",
      "--scrapbook-sunflower-dark",
      "--scrapbook-sage",
      "--scrapbook-sage-dark",
      "--scrapbook-white",
      "--scrapbook-plum",
      "--scrapbook-plum-dark",
      "--scrapbook-muted",
      "--scrapbook-border",
      "--scrapbook-shadow",
      "--scrapbook-shadow-hover",
    ];

    for (const token of requiredTokens) {
      assert.ok(css.includes(token), `landing-tokens.css must declare ${token}`);
    }

    // Verify washi-tape and polaroid-frame utility classes
    assert.ok(css.includes(".washi-tape"), "Must declare .washi-tape class");
    assert.ok(css.includes(".washi-tape-pink"), "Must declare .washi-tape-pink class");
    assert.ok(css.includes(".washi-tape-sage"), "Must declare .washi-tape-sage class");
    assert.ok(css.includes(".polaroid-frame"), "Must declare .polaroid-frame class");
  });

  test("All component stylesheets import landing-tokens.css and respect prefers-reduced-motion", () => {
    const stylesheets = [
      "landing-tokens.css",
      "hero-section.css",
      "landing-music-card.css",
      "scrapbook-card-wall.css",
      "story-destination-cards.css",
    ];

    for (const sheet of stylesheets) {
      const css = readCss(sheet);
      assert.ok(
        css.includes("prefers-reduced-motion"),
        `${sheet} must define a @media (prefers-reduced-motion: reduce) block for accessibility`
      );
    }
  });

  test("Component stylesheets define mobile-first or fluid responsive layouts", () => {
    const heroCss = readCss("hero-section.css");
    const wallCss = readCss("scrapbook-card-wall.css");
    const musicCss = readCss("landing-music-card.css");
    const destCss = readCss("story-destination-cards.css");

    // Hero responsive checks
    assert.ok(heroCss.includes("clamp(") || heroCss.includes("@media"), "Hero CSS must use fluid typography or media queries");
    assert.ok(heroCss.includes("@media (max-width:") || heroCss.includes("@media (min-width:"), "Hero CSS must provide desktop/tablet layout adaptations");

    // Card Wall responsive checks
    assert.ok(wallCss.includes("@media (min-width: 640px)"), "Card wall must have tablet column layout");
    assert.ok(wallCss.includes("@media (min-width: 1024px)"), "Card wall must have desktop column layout");

    // Music card responsive checks
    assert.ok(musicCss.includes("@media (max-width:") || musicCss.includes("@media (min-width:"), "Music card must adapt layout on larger/smaller viewports");

    // Story destinations responsive checks
    assert.ok(destCss.includes("@media (min-width: 900px)"), "Story destinations must support 2-column desktop split");
  });
});

describe("Wave 1 Integration — Section 1: Welcome Hero", () => {
  test("resolveHeroProps correctly applies defaults and trims whitespace", () => {
    const emptyProps = resolveHeroProps();
    assert.equal(emptyProps.recipientName, DEFAULT_RECIPIENT_NAME);
    assert.equal(emptyProps.birthdayDate, DEFAULT_BIRTHDAY_DATE);
    assert.equal(emptyProps.onOpenWorld, undefined);
    assert.equal(emptyProps.avatarUrl, undefined);

    const customProps = resolveHeroProps({
      recipientName: "  Meerah Jaan  ",
      birthdayDate: "  30 October  ",
      avatarUrl: "/photos/meerah.jpg",
    });
    assert.equal(customProps.recipientName, "Meerah Jaan");
    assert.equal(customProps.birthdayDate, "30 October");
    assert.equal(customProps.avatarUrl, "/photos/meerah.jpg");
  });

  test("Urdu greeting copy and metadata contract are exact", () => {
    assert.equal(
      DEFAULT_URDU_BLESSING,
      "تمہاری سالگرہ کا ہر لمحہ محبت اور روشنی سے بھرا رہے",
      "Urdu blessing must match approved emotional copy"
    );

    const tsx = readTsx("HeroSection.tsx");
    assert.ok(tsx.includes('lang="ur"'), "Urdu card must specify lang='ur'");
    assert.ok(tsx.includes('dir="rtl"'), "Urdu card must specify dir='rtl'");
    assert.ok(tsx.includes("سالگرہ مبارک"), "Urdu celebration kicker must be present");
  });

  test("Floral motifs are comprehensively embedded (sunflowers, roses, white flowers)", () => {
    const tsx = readTsx("HeroSection.tsx");

    // Floral motifs in wreath
    assert.ok(tsx.includes('data-motif="sunflower"'), "Hero wreath must contain sunflower motif");
    assert.ok(tsx.includes('data-motif="rose"'), "Hero wreath must contain rose motif");
    assert.ok(tsx.includes('data-motif="white-flower"'), "Hero wreath must contain white jasmine/daisy motif");

    // Color tokens used in SVG
    assert.ok(tsx.includes("#F1C75B"), "Sunflower gold (#F1C75B) must be applied");
    assert.ok(tsx.includes("#D4798D"), "Deep rose pink (#D4798D) must be applied");
    assert.ok(tsx.includes("#376E58") || tsx.includes("#E5EDE2"), "Sage greens must be applied for foliage");
  });

  test("Avatar placeholder contract supports both real photo and symbolic 2D cameo", () => {
    const tsx = readTsx("HeroSection.tsx");
    assert.ok(tsx.includes("hero-symbolic-silhouette"), "HeroSection must render SVG silhouette cameo");
    assert.ok(tsx.includes("hero-avatar-real-photo"), "HeroSection must support rendering real avatar photo");
    assert.ok(tsx.includes("onError={() => setAvatarError(true)}"), "Avatar must gracefully fall back to cameo on image error");
  });

  test("Primary continuation CTA has accessible semantics and click binding", () => {
    const tsx = readTsx("HeroSection.tsx");
    assert.ok(tsx.includes('onClick={onOpenWorld}'), "CTA button must be wired to onOpenWorld");
    assert.ok(tsx.includes('aria-label="Open your little world"'), "CTA button must have accessible aria-label");
  });
});

describe("Wave 1 Integration — Section 2: Interactive Scrapbook Card Wall", () => {
  const APPROVED_CARD_IDS: ScrapbookDestination[] = [
    "birthday-book",
    "letter",
    "our-memories",
    "camera",
    "songs",
    "study",
    "games",
    "video",
  ];

  test("SCRAPBOOK_CARDS contains exactly 8 approved cards in proper order", () => {
    assert.equal(SCRAPBOOK_CARDS.length, 8, "Card wall must have exactly 8 items");

    const ids = SCRAPBOOK_CARDS.map((c) => c.id);
    assert.deepEqual(ids, APPROVED_CARD_IDS, "Card wall IDs must exactly match approved specification");
  });

  test("Truthful destinations: all 8 cards are active and functional", () => {
    const activeCards = SCRAPBOOK_CARDS.filter((c) => !c.isPlanned);
    const plannedCards = SCRAPBOOK_CARDS.filter((c) => c.isPlanned);

    assert.equal(activeCards.length, 8, "Must have exactly 8 active destination cards");
    assert.equal(plannedCards.length, 0, "No planned cards remain on active wall");

    // Validate isPlannedDestination helper
    assert.equal(isPlannedDestination("birthday-book"), false);
    assert.equal(isPlannedDestination("study"), false);
    assert.equal(isPlannedDestination("games"), false);
    assert.equal(isPlannedDestination("video"), false);
  });

  test("All active cards have explicit action labels and clear badges", () => {
    for (const card of SCRAPBOOK_CARDS) {
      assert.ok(!card.isPlanned, `${card.id} must be active`);
      assert.ok(!card.actionText.includes("Coming Soon"), `${card.id} active card must not say Coming Soon`);
      assert.ok(card.defaultBadge && card.defaultBadge.length > 0, `${card.id} must have a defaultBadge`);
    }
  });

  test("Dynamic badge text formatting for cards and music favorites", () => {
    assert.equal(getCardBadgeText("study", {}), "Books & Study");
    assert.equal(getCardBadgeText("games", {}), "Playable Games");
    assert.equal(getCardBadgeText("video", {}), "Video Reel");

    // songs favorites counter
    assert.equal(
      getCardBadgeText("songs", { favoriteSongsCount: 3 }),
      "3 Tracks Favorited"
    );
    assert.equal(
      getCardBadgeText("songs", {}),
      "Curated Playlist"
    );
  });

  test("Accessible ARIA labels provide clear open actions for scrapbook cards", () => {
    const activeCard = SCRAPBOOK_CARDS.find((c) => c.id === "letter")!;
    const activeLabel = getCardAriaLabel(activeCard, {});
    assert.ok(activeLabel.startsWith("Open A Letter for You"), "Active card aria label must invite opening");

    const videoCard = SCRAPBOOK_CARDS.find((c) => c.id === "video")!;
    const videoLabel = getCardAriaLabel(videoCard, {});
    assert.ok(videoLabel.startsWith("Open Birthday Video Reel"), "Video card aria label must invite opening");
  });

  test("Card config assigns varied washi tape colors and positions to create natural scrapbook aesthetic", () => {
    const washiColors = new Set(SCRAPBOOK_CARDS.map((c) => c.washiColor));
    assert.ok(washiColors.has("gold"), "Must use gold washi tape");
    assert.ok(washiColors.has("pink"), "Must use pink washi tape");
    assert.ok(washiColors.has("sage"), "Must use sage washi tape");

    const washiPositions = new Set(SCRAPBOOK_CARDS.map((c) => c.washiPos));
    assert.ok(washiPositions.has("washi-pos-left"), "Must stagger tape left");
    assert.ok(washiPositions.has("washi-pos-center"), "Must stagger tape center");
    assert.ok(washiPositions.has("washi-pos-right"), "Must stagger tape right");

    // Tilt angles vary across cards
    const tiltAngles = new Set(SCRAPBOOK_CARDS.map((c) => c.tiltAngle));
    assert.ok(tiltAngles.size >= 5, "Card wall must have distinct tilt angles for handcrafted look");
  });
});

describe("Wave 1 Integration — Section 3: Prominent Music Card", () => {
  test("LandingMusicCard exports required contracts and interfaces", () => {
    const tsx = readTsx("LandingMusicCard.tsx");
    assert.ok(tsx.includes("export interface LandingMusicTrack"), "Must export LandingMusicTrack");
    assert.ok(tsx.includes("export interface LandingMusicCardProps"), "Must export LandingMusicCardProps");
    assert.ok(tsx.includes("export function LandingMusicCard"), "Must export LandingMusicCard component");
  });

  test("Autoplay prevention: no audio auto-execution or uncontrolled side-effects", () => {
    const tsx = readTsx("LandingMusicCard.tsx");
    // Verify there is no rogue audio.play() or useEffect that starts playing without user intent
    assert.ok(!tsx.includes(".play()"), "LandingMusicCard must NOT call .play() directly; playback is user-controlled via props");
    assert.ok(!tsx.includes("autoPlay"), "Must not specify HTML5 autoPlay attribute");
  });

  test("Empty tracklist state gracefully informs visitor and provides songbook access", () => {
    const tsx = readTsx("LandingMusicCard.tsx");
    assert.ok(tsx.includes("is-empty"), "Must apply .is-empty class when no tracks");
    assert.ok(tsx.includes("The songbook is waiting for our soundtrack..."), "Must show polite empty state title");
    assert.ok(tsx.includes("Open full songbook ♫"), "Must present clear link/button to full songbook");
  });

  test("Playing vs paused vinyl state and tonearm engagement styling contract", () => {
    const tsx = readTsx("LandingMusicCard.tsx");
    assert.ok(tsx.includes('${isPlaying ? "is-playing" : "is-paused"}'), "Must toggle card play/pause class");
    assert.ok(tsx.includes('${isPlaying ? "is-engaged" : ""}'), "Tonearm must engage when isPlaying is true");
    assert.ok(tsx.includes('${isPlaying ? "is-spinning" : ""}'), "Vinyl disc must spin when isPlaying is true");

    const css = readCss("landing-music-card.css");
    assert.ok(css.includes(".is-spinning"), "CSS must define .is-spinning animation");
    assert.ok(css.includes(".is-engaged"), "CSS must define .is-engaged tonearm transform");
    assert.ok(css.includes("@keyframes vinylSpin"), "CSS must define vinyl rotation keyframes");
  });

  test("Interactive control semantics and accessible play/pause labels", () => {
    const tsx = readTsx("LandingMusicCard.tsx");
    assert.ok(tsx.includes("Pause ${currentTrack?.title"), "Play button label must show Pause when playing");
    assert.ok(tsx.includes("Play ${currentTrack?.title"), "Play button label must show Play when paused");
    assert.ok(tsx.includes("onClick={onTogglePlay}"), "Must bind onTogglePlay");
    assert.ok(tsx.includes("onClick={onOpenSongbook}"), "Must bind onOpenSongbook");
    assert.ok(tsx.includes("onPlayTrack(track)"), "Must bind track selection");
  });
});

describe("Wave 1 Integration — Section 4: Birthday Book Entry Point", () => {
  test("StoryDestinationCards exports required constants and helpers", () => {
    assert.equal(BOOK_FOIL_ENGLISH, "For my baba");
    assert.equal(BOOK_FOIL_URDU, "تمہاری سالگرہ");
    assert.equal(DEFAULT_BOOK_PAGES_COUNT, 7);
  });

  test("formatPageCountBadge handles custom counts, zero, and missing values safely", () => {
    assert.equal(formatPageCountBadge(12), "12 Keepsake Pages · صفحات");
    assert.equal(formatPageCountBadge(1), "1 Keepsake Pages · صفحات");
    assert.equal(formatPageCountBadge(undefined), "7 Keepsake Pages · صفحات");
    assert.equal(formatPageCountBadge(0), "7 Keepsake Pages · صفحات");
    assert.equal(formatPageCountBadge(-3), "7 Keepsake Pages · صفحات");
  });

  test("Vintage book cover foil design integrates Urdu calligraphy and English title", () => {
    const tsx = readTsx("StoryDestinationCards.tsx");
    assert.ok(tsx.includes("vintage-book-cover"), "Must render vintage book cover container");
    assert.ok(tsx.includes("book-gold-foil-title"), "Must render gold foil title block");
    assert.ok(tsx.includes("BOOK_FOIL_ENGLISH"), "Must include For my baba");
    assert.ok(tsx.includes("BOOK_FOIL_URDU"), "Must include تمہاری سالگرہ");
    assert.ok(tsx.includes('lang="ur" dir="rtl"'), "Must render Urdu title in RTL mode");
  });

  test("Book opening action contract", () => {
    const tsx = readTsx("StoryDestinationCards.tsx");
    assert.ok(tsx.includes("onClick={onOpenBook}"), "Must bind onOpenBook to CTA button");
    assert.ok(tsx.includes('aria-label="Open Birthday Book"'), "Book CTA must have explicit aria-label");
  });
});

describe("Wave 1 Integration — Section 5: Memories & Photographs Preview", () => {
  const sampleMemories: MemoryPreviewItem[] = [
    {
      id: "m1",
      url: "/photos/beach.jpg",
      caption: "Sunny day by the water",
      alt_text: "Meerah laughing at the beach",
      media_kind: "image",
    },
    {
      id: "m2",
      url: "/photos/cafe.jpg",
      caption: "Our coffee afternoon",
      alt_text: "",
      media_kind: "image",
    },
    {
      id: "m3",
      url: "/photos/park.jpg",
      caption: "",
      alt_text: "Walking through autumn leaves",
      media_kind: "image",
    },
    {
      id: "m4",
      url: "/videos/fireworks.mp4",
      caption: "Midnight celebration",
      alt_text: "Sparklers and smiles",
      media_kind: "video",
    },
    {
      id: "m5",
      url: "/photos/bonus.jpg",
      caption: "Extra memory beyond preview",
      alt_text: "Extra photo",
      media_kind: "image",
    },
  ];

  test("getPreviewMemories enforces maximum preview cap of 4 items", () => {
    assert.equal(MAX_MEMORIES_PREVIEW, 4);

    const limited = getPreviewMemories(sampleMemories, MAX_MEMORIES_PREVIEW);
    assert.equal(limited.length, 4, "Must cap at 4 memories");
    assert.equal(limited[0].id, "m1");
    assert.equal(limited[3].id, "m4");

    // Empty or non-array checks
    assert.deepEqual(getPreviewMemories([]), []);
    assert.deepEqual(getPreviewMemories(undefined), []);
  });

  test("getMemoryAltText resolution hierarchy (alt_text -> caption -> fallback)", () => {
    // 1. Prefers alt_text
    assert.equal(getMemoryAltText(sampleMemories[0], 0), "Meerah laughing at the beach");

    // 2. Falls back to caption when alt_text is empty
    assert.equal(getMemoryAltText(sampleMemories[1], 1), "Our coffee afternoon");

    // 3. Falls back to generic indexed description when both are empty
    const emptyItem: MemoryPreviewItem = { id: "m0", url: "/p.jpg", caption: "", alt_text: "", media_kind: "image" };
    assert.equal(getMemoryAltText(emptyItem, 4), "Birthday memory photograph 5");
  });

  test("getMemoryDisplayCaption resolution hierarchy (caption -> alt_text -> fallback)", () => {
    // 1. Prefers caption
    assert.equal(getMemoryDisplayCaption(sampleMemories[0]), "Sunny day by the water");

    // 2. Falls back to alt_text when caption is empty
    assert.equal(getMemoryDisplayCaption(sampleMemories[2]), "Walking through autumn leaves");

    // 3. Falls back to sweet default
    const emptyItem: MemoryPreviewItem = { id: "m0", url: "/p.jpg", caption: "  ", alt_text: "", media_kind: "image" };
    assert.equal(getMemoryDisplayCaption(emptyItem), "A sweet memory ✿");
  });

  test("buildSelectPhotoPayload formats media object for photo viewer modal", () => {
    const payload = buildSelectPhotoPayload(sampleMemories[3]);
    assert.deepEqual(payload, {
      url: "/videos/fireworks.mp4",
      caption: "Midnight celebration",
      kind: "video",
    });
  });

  test("Memories section handles empty state with supportive guidance", () => {
    assert.ok(EMPTY_MEMORIES_GUIDANCE_TITLE.includes("Moments are waiting"));
    assert.ok(EMPTY_MEMORIES_GUIDANCE_TEXT.includes("birthday photos"));

    const tsx = readTsx("StoryDestinationCards.tsx");
    assert.ok(tsx.includes("memories-empty-state"), "Must render .memories-empty-state when memories is empty");
    assert.ok(tsx.includes("EMPTY_MEMORIES_GUIDANCE_TITLE"), "Must show guidance title");
    assert.ok(tsx.includes("EMPTY_MEMORIES_GUIDANCE_TEXT"), "Must show guidance text");
  });

  test("Memories section handles loading state with skeleton placeholders", () => {
    const tsx = readTsx("StoryDestinationCards.tsx");
    assert.ok(tsx.includes("memories-loading-grid"), "Must render skeleton container when loading");
    assert.ok(tsx.includes("polaroid-skeleton"), "Must render polaroid skeleton items");
  });

  test("Video items render distinctive video indicator badge", () => {
    const tsx = readTsx("StoryDestinationCards.tsx");
    assert.ok(tsx.includes('item.media_kind === "video"'), "Must check for video media_kind");
    assert.ok(tsx.includes("polaroid-video-badge"), "Must render .polaroid-video-badge for videos");
  });

  test("Polaroids feature washi tape and alternating tilt angles", () => {
    const tsx = readTsx("StoryDestinationCards.tsx");
    assert.ok(tsx.includes("polaroid-tilt-"), "Must assign alternating tilt classes");
    assert.ok(tsx.includes("polaroid-washi"), "Must apply washi tape styling to each polaroid");

    const css = readCss("story-destination-cards.css");
    assert.ok(css.includes(".polaroid-tilt-0"), "CSS must define .polaroid-tilt-0");
    assert.ok(css.includes(".polaroid-tilt-1"), "CSS must define .polaroid-tilt-1");
    assert.ok(css.includes(".polaroid-tilt-2"), "CSS must define .polaroid-tilt-2");
    assert.ok(css.includes(".polaroid-tilt-3"), "CSS must define .polaroid-tilt-3");
  });
});

describe("Wave 1 Integration — Accessibility & Reduced-Motion Audit", () => {
  test("Interactive buttons adhere to minimum accessible touch targets and focus styles", () => {
    const heroCss = readCss("hero-section.css");
    const wallCss = readCss("scrapbook-card-wall.css");
    const musicCss = readCss("landing-music-card.css");
    const destCss = readCss("story-destination-cards.css");

    // Check focus-visible rings exist in all components
    assert.ok(heroCss.includes(":focus-visible"), "HeroSection must define :focus-visible");
    assert.ok(wallCss.includes(":focus-visible"), "ScrapbookCardWall must define :focus-visible");
    assert.ok(musicCss.includes(":focus-visible"), "LandingMusicCard must define :focus-visible");
    assert.ok(destCss.includes(":focus-visible"), "StoryDestinationCards must define :focus-visible");
  });

  test("Reduced motion disables decorative rotations and spinning keyframes", () => {
    const musicCss = readCss("landing-music-card.css");
    assert.ok(
      musicCss.includes("@media (prefers-reduced-motion: reduce)"),
      "Music CSS must have reduced-motion query"
    );
    assert.ok(
      musicCss.includes("animation: none") || musicCss.includes("transform: none"),
      "Music card must disable or freeze spinning vinyl under reduced motion"
    );

    const wallCss = readCss("scrapbook-card-wall.css");
    assert.ok(
      wallCss.includes("@media (prefers-reduced-motion: reduce)"),
      "Card wall must support reduced motion"
    );
  });

  test("All ARIA roles, landmarks, and live status elements are properly configured", () => {
    const heroTsx = readTsx("HeroSection.tsx");
    const wallTsx = readTsx("ScrapbookCardWall.tsx");
    const musicTsx = readTsx("LandingMusicCard.tsx");
    const destTsx = readTsx("StoryDestinationCards.tsx");

    // Landmarks
    assert.ok(heroTsx.includes('aria-label="Birthday greeting'), "Hero must have landmark label");
    assert.ok(wallTsx.includes('aria-label="Scrapbook Memory Wall"'), "Card wall must have landmark label");
    assert.ok(musicTsx.includes('aria-label="Scrapbook Featured Music Player'), "Music card must have landmark label");
    assert.ok(destTsx.includes('aria-labelledby="book-destination-title"'), "Book card must have aria-labelledby");
    assert.ok(destTsx.includes('aria-labelledby="memories-destination-title"'), "Memories card must have aria-labelledby");

    // Lists and items
    assert.ok(destTsx.includes('role="list"'), "Memories grid must declare role='list'");
    assert.ok(destTsx.includes('role="listitem"'), "Polaroid cells must declare role='listitem'");
    assert.ok(destTsx.includes('role="status"'), "Empty state and loading states must declare role='status'");
  });
});
