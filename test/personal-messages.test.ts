import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * ============================================================================
 * SPECIFICATION & CONTRACT DEFINITIONS
 * Section 3 & Section 4: Photo Memories & Personal Notes
 * ============================================================================
 */

export interface PersonalMessageCard {
  id: string;
  title: string;
  body_en: string;
  body_ur?: string;
  category?: string;
  date?: string;
  author?: string;
  sealColor?: "pink" | "gold" | "sage";
}

export interface SwipeablePhotoItem {
  id?: string;
  url: string;
  heading?: string;
  title?: string;
  caption?: string;
  date?: string;
  alt?: string;
  washiTapeColor?: "gold" | "pink" | "sage";
  rotation?: number;
  kind?: "image" | "video";
}

export const SWIPE_THRESHOLD_PX = 45;
export const MESSAGE_SWIPE_THRESHOLD_PX = 45;

export const DEFAULT_HEADING = "A few things from my heart.";
export const DEFAULT_SUPPORTING_TEXT = "Some things deserve more than a simple birthday wish.";

export const DEFAULT_PERSONAL_MESSAGES: readonly PersonalMessageCard[] = [
  {
    id: "msg-1",
    title: "To the Light in Every Room",
    category: "Birthday Blessing",
    body_en:
      "Happy Birthday, Meerah. Watching you bring warmth, kindness, and light to everyone around you is one of the greatest blessings. May this new year of your life be filled with gentle peace, deep laughter, and beautiful surprises around every corner.",
    date: "October 30",
    author: "With all my heart",
    sealColor: "pink",
  },
  {
    id: "msg-2",
    title: "Beyond the Far Horizon",
    category: "A Note for Your Journey",
    body_en:
      "Some souls do not just walk through life; they leave a trail of gentle starlight behind them. Wherever your path leads, remember that your wings were made for the highest skies. There are worlds waiting for your courage, and endless horizons made brighter by your presence.",
    date: "Always believing in you",
    author: "A verse for your wings",
    sealColor: "gold",
  },
  {
    id: "msg-3",
    title: "A Quiet Prayer for Your Path",
    category: "Prayer & Blessing",
    body_en:
      "Whenever the road feels uncertain or the days feel long, I pray that you always feel protected, deeply cherished, and confident in your own extraordinary strength. May ease find you in every difficulty, and may your heart always be anchored in peace. You are never walking alone.",
    date: "Always & forever",
    author: "A silent prayer",
    sealColor: "sage",
  },
  {
    id: "msg-4",
    title: "Gratitude for Who You Are",
    category: "Keepsake Note",
    body_en:
      "Thank you for the honesty of your laughter, for listening when words are hard to find, and for being the most genuine person I have ever known. Your warmth touches everyone fortunate enough to know you. Celebrating you today—and every day—is the easiest and truest joy in the world.",
    date: "October 30",
    author: "Always in your corner",
    sealColor: "pink",
  },
] as const;

export const DEFAULT_PHOTOS: readonly SwipeablePhotoItem[] = [
  {
    id: "photo-1",
    url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=900&q=82",
    heading: "Golden Hour Celebrations",
    title: "Golden Hour Celebrations",
    caption: "The room filled with laughter as the sparklers were lit. A moment where time seemed to slow down, bathed in the softest amber light.",
    date: "October 2025",
    alt: "Meerah celebrating with birthday sparkles and golden ambient lighting",
    washiTapeColor: "gold",
    rotation: -1.4,
  },
  {
    id: "photo-2",
    url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=82",
    heading: "Starlit Evenings & Twilight",
    title: "Starlit Evenings & Twilight",
    caption: "Tiny fairy lights strung across the patio, casting gentle glows into the twilight. Long stories, comfortable silences, and endless tea.",
    date: "November 2025",
    alt: "Soft golden bokeh lights illuminating a calm evening celebration",
    washiTapeColor: "pink",
    rotation: 1.5,
  },
  {
    id: "photo-3",
    url: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=900&q=82",
    heading: "Cozy Teacups & Quiet Talks",
    title: "Cozy Teacups & Quiet Talks",
    caption: "Cinnamon tea in vintage porcelain, steam rising against the rainy windowpane. The quietest conversations that always meant the most.",
    date: "December 2025",
    alt: "A warm cozy tea moment captured with genuine smiles and gentle light",
    washiTapeColor: "sage",
    rotation: -1.0,
  },
  {
    id: "photo-4",
    url: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=900&q=82",
    heading: "Sweet Confections & Petals",
    title: "Sweet Confections & Petals",
    caption: "Handmade birthday cake adorned with delicate edible rose petals and candlelight. Blown out candles with wishes whispered into the breeze.",
    date: "October 2025",
    alt: "Handcrafted birthday cake decorated with fresh petals and glowing candlelight",
    washiTapeColor: "gold",
    rotation: 1.6,
  },
  {
    id: "photo-5",
    url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=900&q=82",
    heading: "Vintage Melodies & Strings",
    title: "Vintage Melodies & Strings",
    caption: "Spinning old vinyl records while humming familiar refrains. The chords that bring back whole seasons in a single strum.",
    date: "January 2026",
    alt: "Vintage vinyl record and acoustic guitar surrounded by warm afternoon sunlight",
    washiTapeColor: "pink",
    rotation: -1.3,
  },
  {
    id: "photo-6",
    url: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=900&q=82",
    heading: "A Tapestry of Moments",
    title: "A Tapestry of Moments",
    caption: "A full year of courage, warmth, and shared smiles behind us, with an even brighter chapter opening today. Happy Birthday, Meerah.",
    date: "March 2026",
    alt: "Joyful birthday memories under fairy string lights and celebratory garlands",
    washiTapeColor: "sage",
    rotation: 0.9,
  },
] as const;

// Domain functions matching implementation
export function resolvePersonalMessages(
  cards?: readonly PersonalMessageCard[] | PersonalMessageCard[],
  allowEmpty: boolean = false
): PersonalMessageCard[] {
  if (cards === undefined) {
    return [...DEFAULT_PERSONAL_MESSAGES];
  }
  if (Array.isArray(cards)) {
    if (cards.length === 0 && !allowEmpty) {
      return [...DEFAULT_PERSONAL_MESSAGES];
    }
    return [...cards];
  }
  return [...DEFAULT_PERSONAL_MESSAGES];
}

export function clampMessageIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  if (index < 0) return 0;
  if (index >= total) return total - 1;
  return index;
}

export function getNextMessageIndex(current: number, total: number, wrap: boolean = false): number {
  if (total <= 0) return 0;
  if (wrap) {
    return (current + 1) % total;
  }
  return Math.min(current + 1, total - 1);
}

export function getPrevMessageIndex(current: number, total: number, wrap: boolean = false): number {
  if (total <= 0) return 0;
  if (wrap) {
    return (current - 1 + total) % total;
  }
  return Math.max(current - 1, 0);
}

export function calculateSwipeDirection(
  startX: number,
  endX: number,
  threshold: number = MESSAGE_SWIPE_THRESHOLD_PX
): "next" | "prev" | "none" {
  const deltaX = startX - endX;
  if (Math.abs(deltaX) < threshold) {
    return "none";
  }
  return deltaX > 0 ? "next" : "prev";
}

export function resolveSealColor(
  sealColor?: "pink" | "gold" | "sage",
  index: number = 0
): "pink" | "gold" | "sage" {
  if (sealColor === "pink" || sealColor === "gold" || sealColor === "sage") {
    return sealColor;
  }
  const colors: ("pink" | "gold" | "sage")[] = ["pink", "gold", "sage"];
  return colors[index % colors.length];
}

export function clampPhotoIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  if (index < 0) return 0;
  if (index >= total) return total - 1;
  return index;
}

export function getNextPhotoIndex(current: number, total: number, wrap: boolean = false): number {
  if (total <= 0) return 0;
  if (wrap) {
    return (current + 1) % total;
  }
  return Math.min(current + 1, total - 1);
}

export function getPrevPhotoIndex(current: number, total: number, wrap: boolean = false): number {
  if (total <= 0) return 0;
  if (wrap) {
    return (current - 1 + total) % total;
  }
  return Math.max(current - 1, 0);
}

export function resolvePhotoAltText(photo: SwipeablePhotoItem, index: number): string {
  if (photo.alt?.trim()) return photo.alt.trim();
  if (photo.caption?.trim()) return photo.caption.trim();
  if (photo.heading?.trim()) return photo.heading.trim();
  if (photo.title?.trim()) return photo.title.trim();
  return `Meerah's birthday memory photograph ${index + 1}`;
}

export function resolvePhotoHeading(photo: SwipeablePhotoItem, index: number): string {
  if (photo.heading?.trim()) return photo.heading.trim();
  if (photo.title?.trim()) return photo.title.trim();
  return `Memory ${String(index + 1).padStart(2, "0")}`;
}

export function resolvePhotoWashiColor(
  color?: "gold" | "pink" | "sage",
  index: number = 0
): "gold" | "pink" | "sage" {
  if (color === "gold" || color === "pink" || color === "sage") {
    return color;
  }
  const sequence: ("gold" | "pink" | "sage")[] = ["gold", "pink", "sage"];
  return sequence[index % sequence.length];
}

// ============================================================================
// 1. Personal Messages Domain Logic & Boundary Handling
// ============================================================================

test("Personal Messages: resolves default notes when undefined or empty without flag", () => {
  const resolvedDefault = resolvePersonalMessages(undefined);
  assert.equal(resolvedDefault.length, DEFAULT_PERSONAL_MESSAGES.length);
  assert.equal(resolvedDefault[0].id, "msg-1");

  const resolvedEmptyFallback = resolvePersonalMessages([]);
  assert.equal(resolvedEmptyFallback.length, DEFAULT_PERSONAL_MESSAGES.length);

  const resolvedAllowedEmpty = resolvePersonalMessages([], true);
  assert.equal(resolvedAllowedEmpty.length, 0);

  const customCard: PersonalMessageCard = {
    id: "test-1",
    title: "Test Note",
    body_en: "A test birthday note in English.",
    category: "Wish",
    author: "Friend",
    date: "Today",
  };
  const resolvedCustom = resolvePersonalMessages([customCard]);
  assert.equal(resolvedCustom.length, 1);
  assert.equal(resolvedCustom[0].title, "Test Note");
});

test("Personal Messages: clampMessageIndex enforces strict boundaries", () => {
  const total = 4;
  assert.equal(clampMessageIndex(-5, total), 0);
  assert.equal(clampMessageIndex(0, total), 0);
  assert.equal(clampMessageIndex(2, total), 2);
  assert.equal(clampMessageIndex(3, total), 3);
  assert.equal(clampMessageIndex(4, total), 3);
  assert.equal(clampMessageIndex(10, total), 3);
  assert.equal(clampMessageIndex(0, 0), 0);
});

test("Personal Messages: getNextMessageIndex and getPrevMessageIndex respect bounded navigation", () => {
  const total = 4;

  // Bounded mode (wrap = false)
  assert.equal(getPrevMessageIndex(0, total, false), 0, "Previous at index 0 must remain 0");
  assert.equal(getPrevMessageIndex(2, total, false), 1);
  assert.equal(getNextMessageIndex(2, total, false), 3);
  assert.equal(getNextMessageIndex(3, total, false), 3, "Next at last index must remain last index");

  // Wrapping mode (wrap = true)
  assert.equal(getPrevMessageIndex(0, total, true), 3, "Previous at index 0 wraps to last");
  assert.equal(getNextMessageIndex(3, total, true), 0, "Next at last index wraps to 0");
});

test("Personal Messages: calculateSwipeDirection computes correct gesture direction", () => {
  assert.equal(calculateSwipeDirection(100, 20), "next");
  assert.equal(calculateSwipeDirection(20, 100), "prev");
  assert.equal(calculateSwipeDirection(50, 40), "none");
});

test("Personal Messages: resolveSealColor cycles gracefully", () => {
  assert.equal(resolveSealColor("gold", 0), "gold");
  assert.equal(resolveSealColor("pink", 1), "pink");
  assert.equal(resolveSealColor("sage", 2), "sage");
  assert.equal(resolveSealColor(undefined, 0), "pink");
  assert.equal(resolveSealColor(undefined, 1), "gold");
  assert.equal(resolveSealColor(undefined, 2), "sage");
  assert.equal(resolveSealColor(undefined, 3), "pink");
});

// ============================================================================
// 2. Personal Messages Content & English-Only Verification
// ============================================================================

test("Personal Messages: curated notes are in English only with sincere personal tone", () => {
  assert.ok(DEFAULT_PERSONAL_MESSAGES.length >= 4);

  const urduRegex = /[\u0600-\u06FF]/;

  for (const [idx, note] of DEFAULT_PERSONAL_MESSAGES.entries()) {
    assert.ok(note.title.trim().length > 0, `Note ${idx + 1} must have a title`);
    assert.ok(note.body_en.trim().length > 30, `Note ${idx + 1} must have meaningful English body`);
    assert.ok(!urduRegex.test(note.title), `Note ${idx + 1} title must be English only`);
    assert.ok(!urduRegex.test(note.body_en), `Note ${idx + 1} body must be English only`);
    if (note.category) {
      assert.ok(!urduRegex.test(note.category), `Note ${idx + 1} category must be English only`);
    }
  }

  assert.equal(DEFAULT_HEADING, "A few things from my heart.");
  assert.ok(!urduRegex.test(DEFAULT_HEADING));
  assert.ok(!urduRegex.test(DEFAULT_SUPPORTING_TEXT));
});

// ============================================================================
// 3. Component & CSS Inspection for PersonalMessagesSection
// ============================================================================

test("PersonalMessagesSection.tsx: contains bounded controls, English-only rendering, and accessibility", () => {
  const filePath = path.resolve(
    process.cwd(),
    "src/components/landing/PersonalMessagesSection.tsx"
  );
  assert.ok(fs.existsSync(filePath), "PersonalMessagesSection.tsx must exist");

  const code = fs.readFileSync(filePath, "utf-8");

  assert.ok(code.includes('"use client"'), "Must be a client component");
  assert.ok(code.includes("export function PersonalMessagesSection"), "Must export PersonalMessagesSection");

  // Verify English primary body rendering
  assert.ok(code.includes("message-card-body-en"), "Must contain English body container");

  // Verify bounded button disabling
  assert.ok(
    code.includes("disabled={!wrap && isFirst}") || code.includes("disabled={isFirst}"),
    "Previous Note button must be disabled at index 0"
  );
  assert.ok(
    code.includes("disabled={!wrap && isLast}") || code.includes("disabled={isLast}"),
    "Next Note button must be disabled at the last note"
  );

  // Verify button labels
  assert.ok(code.includes("Previous Note"), "Must have 'Previous Note' label");
  assert.ok(code.includes("Next Note"), "Must have 'Next Note' label");

  // Verify accessible counter and keyboard navigation
  assert.ok(code.includes('aria-live="polite"'), "Must have aria-live='polite' counter");
  assert.ok(code.includes("ArrowLeft") && code.includes("ArrowRight"), "Must support Arrow key navigation");
  assert.ok(code.includes('role="tablist"'), "Must provide accessible tablist for notes");
});

test("personal-messages.css: contains disabled states, typography, and responsive styles", () => {
  const cssPath = path.resolve(
    process.cwd(),
    "src/components/landing/personal-messages.css"
  );
  assert.ok(fs.existsSync(cssPath), "personal-messages.css must exist");

  const css = fs.readFileSync(cssPath, "utf-8");

  assert.ok(css.includes("./landing-tokens.css"), "Must import landing tokens");
  assert.ok(css.includes(".messages-nav-btn:disabled"), "Must include styling for disabled nav buttons");
  assert.ok(css.includes("cursor: not-allowed"), "Disabled nav button must set cursor to not-allowed");
  assert.ok(css.includes(":focus-visible"), "Must provide focus-visible accessibility outlines");
  assert.ok(css.includes("@media (max-width: 640px)"), "Must support mobile responsive queries");
  assert.ok(css.includes("prefers-reduced-motion"), "Must support prefers-reduced-motion");
});

// ============================================================================
// 4. Swipeable Photo Cards Domain Logic & Aesthetics
// ============================================================================

test("SwipeablePhotoCards: clampPhotoIndex, navigation helpers, and swipe math", () => {
  const total = 6;
  assert.equal(clampPhotoIndex(-1, total), 0);
  assert.equal(clampPhotoIndex(5, total), 5);
  assert.equal(clampPhotoIndex(10, total), 5);

  assert.equal(getPrevPhotoIndex(0, total, false), 0);
  assert.equal(getPrevPhotoIndex(3, total, false), 2);
  assert.equal(getNextPhotoIndex(5, total, false), 5);

  assert.equal(calculateSwipeDirection(120, 20), "next");
  assert.equal(calculateSwipeDirection(20, 120), "prev");
  assert.equal(calculateSwipeDirection(50, 45), "none");
});

test("SwipeablePhotoCards: default photos have editorial headings, narratives, dates, and washi tapes", () => {
  assert.ok(DEFAULT_PHOTOS.length >= 6, "Must have at least 6 curated journey photos");

  for (const [idx, photo] of DEFAULT_PHOTOS.entries()) {
    assert.ok(photo.url.startsWith("http"), `Photo ${idx + 1} must have a valid URL`);
    const heading = resolvePhotoHeading(photo, idx);
    assert.ok(heading.length > 0, `Photo ${idx + 1} must have a heading`);
    assert.ok(photo.caption && photo.caption.length > 20, `Photo ${idx + 1} must have an editorial caption narrative`);
    assert.ok(photo.date && photo.date.length > 0, `Photo ${idx + 1} must have a date stamp`);
    assert.ok(photo.washiTapeColor, `Photo ${idx + 1} must specify a washi tape color`);
    const washi = resolvePhotoWashiColor(photo.washiTapeColor, idx);
    assert.ok(["gold", "pink", "sage"].includes(washi));

    if (typeof photo.rotation === "number") {
      assert.ok(
        photo.rotation >= -3 && photo.rotation <= 3,
        `Photo ${idx + 1} subtle scrapbook rotation must be between -3 and 3 degrees`
      );
    }
  }
});

test("SwipeablePhotoCards.tsx: component exists, renders headings, captions, washi tape, and controls", () => {
  const filePath = path.resolve(
    process.cwd(),
    "src/components/landing/SwipeablePhotoCards.tsx"
  );
  assert.ok(fs.existsSync(filePath), "SwipeablePhotoCards.tsx must exist");

  const code = fs.readFileSync(filePath, "utf-8");

  assert.ok(code.includes('"use client"'), "Must be a client component");
  assert.ok(code.includes("export function SwipeablePhotoCards"), "Must export SwipeablePhotoCards");
  assert.ok(code.includes("polaroid-heading"), "Must render polaroid heading");
  assert.ok(code.includes("polaroid-caption"), "Must render polaroid caption");
  assert.ok(code.includes("polaroid-date-stamp"), "Must render polaroid date stamp");
  assert.ok(code.includes("washi-tape"), "Must render washi tape styling");
  assert.ok(code.includes("photos-counter-pill"), "Must render live photo counter pill");
  assert.ok(code.includes('aria-roledescription="carousel"'), "Must have carousel accessibility role");
});

test("swipeable-photo-cards.css: contains washi tape styling, polaroid frame, and accessibility", () => {
  const cssPath = path.resolve(
    process.cwd(),
    "src/components/landing/swipeable-photo-cards.css"
  );
  assert.ok(fs.existsSync(cssPath), "swipeable-photo-cards.css must exist");

  const css = fs.readFileSync(cssPath, "utf-8");

  assert.ok(css.includes("./landing-tokens.css"), "Must reference landing-tokens.css");
  assert.ok(css.includes("washi-tape-gold"), "Must have washi-tape-gold");
  assert.ok(css.includes("washi-tape-pink"), "Must have washi-tape-pink");
  assert.ok(css.includes("washi-tape-sage"), "Must have washi-tape-sage");
  assert.ok(css.includes(".polaroid-card"), "Must have polaroid-card styling");
  assert.ok(css.includes(".polaroid-heading"), "Must have polaroid-heading typography");
  assert.ok(css.includes(".photos-nav-btn:disabled"), "Must style disabled nav buttons");
  assert.ok(css.includes(":focus-visible"), "Must provide focus-visible accessibility outlines");
  assert.ok(css.includes("prefers-reduced-motion"), "Must respect prefers-reduced-motion");
});
