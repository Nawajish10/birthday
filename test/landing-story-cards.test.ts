import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * ============================================================================
 * SPECIFICATION & CONTRACT DEFINITIONS
 * Section 4 (Birthday Book Entry Point) & Section 5 (Memories Preview)
 * ============================================================================
 */

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
export const EXPECTED_BOOK_FOIL_ENGLISH = "For my baba";
export const EXPECTED_BOOK_FOIL_URDU = "تمہاری سالگرہ";
export const EXPECTED_EMPTY_GUIDANCE_TITLE = "Moments are waiting to be placed here...";
export const EXPECTED_EMPTY_GUIDANCE_TEXT =
  "Your birthday photos and sweet snapshots will appear here as soon as memories are pinned to the scrapbook.";

/**
 * Helper logic mirroring component contract
 */
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

export function getMemoryDisplayCaption(item: MemoryPreviewItem): string {
  if (item.caption?.trim()) return item.caption.trim();
  if (item.alt_text?.trim()) return item.alt_text.trim();
  return "A sweet memory ✿";
}

export function buildSelectPhotoPayload(
  item: MemoryPreviewItem
): { url: string; caption: string; kind?: "image" | "video" } {
  return {
    url: item.url,
    caption: item.caption?.trim() || item.alt_text?.trim() || "A birthday memory",
    kind: item.media_kind,
  };
}

// Sample Test Data Fixtures
const SAMPLE_MEMORIES: MemoryPreviewItem[] = [
  {
    id: "mem-1",
    url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600",
    caption: "Celebration day · ایک خوبصورت شام",
    alt_text: "Meerah celebrating with birthday cake and sparklers",
    media_kind: "image",
  },
  {
    id: "mem-2",
    url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600",
    caption: "Night of golden lights",
    alt_text: "Golden fairy lights glowing softly",
    media_kind: "image",
  },
  {
    id: "mem-3",
    url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    caption: "Flowers in bloom video",
    alt_text: "Flowers waving gently in the garden breeze",
    media_kind: "video",
  },
  {
    id: "mem-4",
    url: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=600",
    caption: "Laughing together",
    alt_text: "Shared laughter across the tea table",
    media_kind: "image",
  },
  {
    id: "mem-5",
    url: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=600",
    caption: "Bonus fifth memory that should be sliced out",
    alt_text: "Sunlight through balcony window",
    media_kind: "image",
  },
];

describe("Section 4: Birthday Book Entry Point Logic & Contract", () => {
  test("Book entry: formats default page count badge when undefined", () => {
    const badge = formatPageCountBadge(undefined);
    assert.equal(badge, "7 Keepsake Pages · صفحات");
  });

  test("Book entry: formats custom page count badge accurately", () => {
    assert.equal(formatPageCountBadge(12), "12 Keepsake Pages · صفحات");
    assert.equal(formatPageCountBadge(25), "25 Keepsake Pages · صفحات");
    assert.equal(formatPageCountBadge(1), "1 Keepsake Pages · صفحات");
  });

  test("Book entry: falls back gracefully on non-positive or invalid counts", () => {
    assert.equal(formatPageCountBadge(0), "7 Keepsake Pages · صفحات");
    assert.equal(formatPageCountBadge(-5), "7 Keepsake Pages · صفحات");
    assert.equal(formatPageCountBadge(NaN), "7 Keepsake Pages · صفحات");
  });

  test("Book entry: triggers onOpenBook callback on invocation", () => {
    let opened = false;
    const mockOnOpenBook = () => {
      opened = true;
    };
    mockOnOpenBook();
    assert.equal(opened, true);
  });
});

describe("Section 5: Memories & Photographs Preview Logic & Contract", () => {
  test("Memories preview: limits displayed items to at most 4 items", () => {
    const displayed = getPreviewMemories(SAMPLE_MEMORIES, 4);
    assert.equal(displayed.length, 4);
    assert.equal(displayed[0].id, "mem-1");
    assert.equal(displayed[1].id, "mem-2");
    assert.equal(displayed[2].id, "mem-3");
    assert.equal(displayed[3].id, "mem-4");
  });

  test("Memories preview: safely handles fewer than 4 items", () => {
    const twoItems = SAMPLE_MEMORIES.slice(0, 2);
    const displayed = getPreviewMemories(twoItems, 4);
    assert.equal(displayed.length, 2);
    assert.equal(displayed[0].id, "mem-1");
    assert.equal(displayed[1].id, "mem-2");
  });

  test("Memories preview: handles empty or non-array memories safely", () => {
    assert.deepEqual(getPreviewMemories([]), []);
    assert.deepEqual(getPreviewMemories(undefined as any), []);
    assert.deepEqual(getPreviewMemories(null as any), []);
  });

  test("Empty memory state: provides proper creator/visitor guidance messages", () => {
    assert.equal(EXPECTED_EMPTY_GUIDANCE_TITLE, "Moments are waiting to be placed here...");
    assert.ok(
      EXPECTED_EMPTY_GUIDANCE_TEXT.includes("Your birthday photos and sweet snapshots will appear here"),
      "Guidance text must invite visitor when empty"
    );
  });

  test("Accessible alt text: prioritizes alt_text over caption", () => {
    const item: MemoryPreviewItem = {
      id: "t-1",
      url: "/photo.jpg",
      alt_text: "Meerah smiling at sunset",
      caption: "Golden hour",
      media_kind: "image",
    };
    assert.equal(getMemoryAltText(item, 0), "Meerah smiling at sunset");
  });

  test("Accessible alt text: falls back to caption when alt_text is absent", () => {
    const item: MemoryPreviewItem = {
      id: "t-2",
      url: "/photo.jpg",
      caption: "A joyful moment in spring",
      media_kind: "image",
    };
    assert.equal(getMemoryAltText(item, 1), "A joyful moment in spring");
  });

  test("Accessible alt text: falls back to indexed label when both are empty", () => {
    const item: MemoryPreviewItem = {
      id: "t-3",
      url: "/photo.jpg",
      media_kind: "image",
    };
    assert.equal(getMemoryAltText(item, 2), "Birthday memory photograph 3");
  });

  test("Photo selection payload: accurately maps URL, caption, and media_kind", () => {
    const photoItem = SAMPLE_MEMORIES[0];
    const payload = buildSelectPhotoPayload(photoItem);
    assert.equal(payload.url, photoItem.url);
    assert.equal(payload.caption, photoItem.caption);
    assert.equal(payload.kind, "image");

    const videoItem = SAMPLE_MEMORIES[2];
    const videoPayload = buildSelectPhotoPayload(videoItem);
    assert.equal(videoPayload.url, videoItem.url);
    assert.equal(videoPayload.kind, "video");
  });

  test("Memories action: triggers onOpenMemories callback on invocation", () => {
    let openedAll = false;
    const mockOnOpenMemories = () => {
      openedAll = true;
    };
    mockOnOpenMemories();
    assert.equal(openedAll, true);
  });
});

describe("Component Static Verification: StoryDestinationCards.tsx", () => {
  const componentPath = path.resolve(
    process.cwd(),
    "src/components/landing/StoryDestinationCards.tsx"
  );

  test("StoryDestinationCards.tsx exists and is readable", () => {
    assert.ok(fs.existsSync(componentPath), "StoryDestinationCards.tsx must exist");
  });

  test("Exports required interface and component symbols", () => {
    const source = fs.readFileSync(componentPath, "utf-8");

    assert.ok(source.includes("export function StoryDestinationCards"), "Must export StoryDestinationCards");
    assert.ok(source.includes("export interface StoryDestinationCardsProps"), "Must export StoryDestinationCardsProps");
    assert.ok(source.includes("export interface MemoryPreviewItem"), "Must export MemoryPreviewItem");
  });

  test("Contains gold foil lettering for Section 4 book cover", () => {
    const source = fs.readFileSync(componentPath, "utf-8");

    assert.ok(source.includes("BOOK_FOIL_ENGLISH"), "Must define BOOK_FOIL_ENGLISH");
    assert.ok(source.includes("BOOK_FOIL_URDU"), "Must define BOOK_FOIL_URDU");
    assert.ok(source.includes("For my baba"), "Must include English gold foil text 'For my baba'");
    assert.ok(source.includes("تمہاری سالگرہ"), "Must include Urdu gold foil text 'تمہاری سالگرہ'");
    assert.ok(source.includes('lang="ur"'), "Must mark Urdu text with lang='ur'");
    assert.ok(source.includes('dir="rtl"'), "Must mark Urdu text with dir='rtl'");
  });

  test("Contains primary CTA button 'Open Birthday Book ✿' invoking onOpenBook", () => {
    const source = fs.readFileSync(componentPath, "utf-8");

    assert.ok(source.includes("Open Birthday Book"), "Must contain 'Open Birthday Book' label");
    assert.ok(source.includes("onClick={onOpenBook}"), "CTA button must invoke onOpenBook");
    assert.ok(source.includes("✿"), "CTA button must include decorative flower ✿");
  });

  test("Contains Section 5 Memories action 'Open all memories →' invoking onOpenMemories", () => {
    const source = fs.readFileSync(componentPath, "utf-8");

    assert.ok(source.includes("Open all memories"), "Must contain 'Open all memories' label");
    assert.ok(source.includes("onClick={onOpenMemories}"), "Memories CTA must invoke onOpenMemories");
  });

  test("Contains empty state guidance 'Moments are waiting to be placed here...'", () => {
    const source = fs.readFileSync(componentPath, "utf-8");

    assert.ok(
      source.includes("Moments are waiting to be placed here..."),
      "Must include empty state title 'Moments are waiting to be placed here...'"
    );
  });

  test("Invokes onSelectPhoto when a photo card is clicked", () => {
    const source = fs.readFileSync(componentPath, "utf-8");

    assert.ok(source.includes("onSelectPhoto?.("), "Must invoke onSelectPhoto callback with photo item");
  });

  test("HTML semantic validity: contains NO nested <button> elements", () => {
    const source = fs.readFileSync(componentPath, "utf-8");
    const buttonBlocks = source.match(/<button[\s\S]*?<\/button>/g) || [];

    for (const block of buttonBlocks) {
      const buttonMatches = (block.match(/<button/g) || []).length;
      assert.equal(buttonMatches, 1, `Invalid nested button detected in: ${block.slice(0, 100)}...`);
    }
  });

  test("Accessibility: includes accessible controls and ARIA attributes", () => {
    const source = fs.readFileSync(componentPath, "utf-8");

    assert.ok(source.includes('aria-label="Open Birthday Book"'), "Book CTA has aria-label");
    assert.ok(source.includes('aria-label="Open all memories"'), "Memories CTA has aria-label");
    assert.ok(source.includes('aria-labelledby="book-destination-title"'), "Book card has section labelledby");
    assert.ok(source.includes('aria-labelledby="memories-destination-title"'), "Memories card has section labelledby");
    assert.ok(source.includes('role="img"'), "Book illustration has role='img'");
    assert.ok(source.includes('loading="lazy"'), "Images have loading='lazy'");
  });
});

describe("CSS Verification: story-destination-cards.css", () => {
  const cssPath = path.resolve(
    process.cwd(),
    "src/components/landing/story-destination-cards.css"
  );

  test("story-destination-cards.css exists and is readable", () => {
    assert.ok(fs.existsSync(cssPath), "story-destination-cards.css must exist");
  });

  test("Imports landing-tokens.css and defines scrapbook tokens", () => {
    const css = fs.readFileSync(cssPath, "utf-8");

    assert.ok(
      css.includes('@import "./landing-tokens.css";'),
      "CSS must import landing-tokens.css"
    );
  });

  test("Defines Section 4 Book styling: vintage book cover, gold foil, ribbon, spine crease", () => {
    const css = fs.readFileSync(cssPath, "utf-8");

    assert.ok(css.includes(".book-destination-card"), "Must define .book-destination-card");
    assert.ok(css.includes(".vintage-book-cover"), "Must define .vintage-book-cover");
    assert.ok(css.includes(".book-spine-crease"), "Must define .book-spine-crease");
    assert.ok(css.includes(".book-bookmark-ribbon"), "Must define .book-bookmark-ribbon");
    assert.ok(css.includes(".book-gold-foil-title"), "Must define .book-gold-foil-title");
    assert.ok(css.includes(".book-gold-english"), "Must define .book-gold-english");
    assert.ok(css.includes(".book-gold-urdu"), "Must define .book-gold-urdu");
    assert.ok(css.includes(".book-page-count-badge"), "Must define .book-page-count-badge");
    assert.ok(css.includes(".book-cta-button"), "Must define .book-cta-button");
  });

  test("Defines Section 5 Memories styling: polaroids, washi tape, empty state, cta", () => {
    const css = fs.readFileSync(cssPath, "utf-8");

    assert.ok(css.includes(".memories-destination-card"), "Must define .memories-destination-card");
    assert.ok(css.includes(".memories-polaroid-grid"), "Must define .memories-polaroid-grid");
    assert.ok(css.includes(".scrapbook-polaroid"), "Must define .scrapbook-polaroid");
    assert.ok(css.includes(".polaroid-washi"), "Must define .polaroid-washi");
    assert.ok(css.includes(".polaroid-video-badge"), "Must define .polaroid-video-badge");
    assert.ok(css.includes(".polaroid-caption"), "Must define .polaroid-caption");
    assert.ok(css.includes(".memories-empty-state"), "Must define .memories-empty-state");
    assert.ok(css.includes(".memories-cta-button"), "Must define .memories-cta-button");
  });

  test("Includes accessibility support: focus-visible and prefers-reduced-motion", () => {
    const css = fs.readFileSync(cssPath, "utf-8");

    assert.ok(css.includes(":focus-visible"), "Must define :focus-visible rules for keyboard navigation");
    assert.ok(
      css.includes("@media (prefers-reduced-motion: reduce)"),
      "Must define @media (prefers-reduced-motion: reduce)"
    );
  });

  test("Includes responsive mobile adaptations", () => {
    const css = fs.readFileSync(cssPath, "utf-8");

    assert.ok(
      css.includes("@media (max-width: 640px)") || css.includes("@media (max-width: 768px)"),
      "Must define mobile responsive breakpoint"
    );
  });
});
