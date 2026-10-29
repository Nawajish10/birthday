import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const React = require("react");
const ReactDOMServer = require("react-dom/server");

const WORKSPACE_ROOT = process.cwd();
const LANDING_DIR = path.resolve(WORKSPACE_ROOT, "src/components/landing");

/**
 * ============================================================================
 * Transpiler & Dynamic Component Loader
 * Strips CSS imports so TSX components can be rendered in Node.js
 * ============================================================================
 */
function loadTsxModule(relativePath: string) {
  const filePath = path.resolve(WORKSPACE_ROOT, relativePath);
  assert.ok(fs.existsSync(filePath), `File must exist at ${relativePath}`);

  const rawCode = fs.readFileSync(filePath, "utf-8");
  const cleanedCode = rawCode.replace(/import\s+['"][^'"]+\.css['"];?/g, "");
  const transpiled = ts.transpileModule(cleanedCode, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });

  const moduleExports: any = {};
  const localRequire = (id: string) => {
    if (id.startsWith("./") || id.startsWith("../")) {
      const target = path.resolve(path.dirname(filePath), id);
      const possibleExtensions = [".ts", ".tsx", ".js", ".jsx", ""];
      for (const ext of possibleExtensions) {
        const full = target + ext;
        if (fs.existsSync(full) && !fs.statSync(full).isDirectory()) {
          return loadTsxModule(path.relative(WORKSPACE_ROOT, full)).moduleExports;
        }
      }
    }
    return require(id);
  };

  const evalFunc = new Function("exports", "require", transpiled.outputText);
  evalFunc(moduleExports, localRequire);

  return { moduleExports, rawCode, filePath };
}

function readCss(fileName: string): string {
  const filePath = path.join(LANDING_DIR, fileName);
  assert.ok(fs.existsSync(filePath), `CSS file must exist: ${fileName}`);
  return fs.readFileSync(filePath, "utf-8");
}

function findElements(element: any, predicate: (el: any) => boolean): any[] {
  const results: any[] = [];
  if (!element || typeof element !== "object") return results;

  if (predicate(element)) {
    results.push(element);
  }

  if (element.props && element.props.children) {
    const children = Array.isArray(element.props.children)
      ? element.props.children
      : [element.props.children];
    for (const child of children) {
      results.push(...findElements(child, predicate));
    }
  }

  return results;
}

// ============================================================================
// Test Suite: 9-Section Definition & Export Verification
// ============================================================================
describe("Landing Page — 9-Section Architecture & Export Registry", () => {
  test("All 9 section components and stylesheets exist on the filesystem", () => {
    const requiredFiles = [
      // Section 1
      "MidnightBirthdayReveal.tsx",
      "midnight-reveal.css",
      // Section 2
      "HeroSection.tsx",
      "hero-section.css",
      // Section 3
      "SwipeablePhotoCards.tsx",
      "swipeable-photo-cards.css",
      // Section 4
      "PersonalMessagesSection.tsx",
      "personal-messages.css",
      // Section 5
      "BirthdayBookInvitation.tsx",
      "book-invitation.css",
      // Section 6
      "OurSoundtrackSection.tsx",
      "our-soundtrack.css",
      // Section 7
      "MemoriesPreviewSection.tsx",
      "memories-preview.css",
      // Section 8
      "ExploreWorldSection.tsx",
      "explore-world.css",
      // Section 9
      "ClosingMessageSection.tsx",
      "closing-message.css",
      // Shared Tokens & Index
      "landing-tokens.css",
      "landing-helpers.ts",
      "index.ts",
    ];

    for (const file of requiredFiles) {
      const p = path.join(LANDING_DIR, file);
      assert.ok(fs.existsSync(p), `Missing required landing page file: ${file}`);
    }
  });

  test("Central barrel (src/components/landing/index.ts) exports all 9 section components", () => {
    const { moduleExports } = loadTsxModule("src/components/landing/index.ts");

    // Section 1: Midnight Birthday Reveal
    assert.equal(typeof moduleExports.MidnightBirthdayReveal, "function");
    // Section 2: Welcome Hero & Avatar
    assert.equal(typeof moduleExports.HeroSection, "function");
    // Section 3: Swipeable Photo Cards
    assert.equal(typeof moduleExports.SwipeablePhotoCards, "function");
    // Section 4: Personal Messages & Poetry
    assert.equal(typeof moduleExports.PersonalMessagesSection, "function");
    // Section 5: Birthday Book Invitation
    assert.equal(typeof moduleExports.BirthdayBookInvitation, "function");
    // Section 6: Our Soundtrack
    assert.equal(typeof moduleExports.OurSoundtrackSection, "function");
    // Section 7: Memories Preview
    assert.equal(typeof moduleExports.MemoriesPreviewSection, "function");
    // Section 8: Explore Your World
    assert.equal(typeof moduleExports.ExploreWorldSection, "function");
    // Section 9: Closing Message
    assert.equal(typeof moduleExports.ClosingMessageSection, "function");
  });

  test("All 9 section components are client components ('use client')", () => {
    const sectionTsxFiles = [
      "MidnightBirthdayReveal.tsx",
      "HeroSection.tsx",
      "SwipeablePhotoCards.tsx",
      "PersonalMessagesSection.tsx",
      "BirthdayBookInvitation.tsx",
      "OurSoundtrackSection.tsx",
      "MemoriesPreviewSection.tsx",
      "ExploreWorldSection.tsx",
      "ClosingMessageSection.tsx",
    ];

    for (const file of sectionTsxFiles) {
      const code = fs.readFileSync(path.join(LANDING_DIR, file), "utf-8");
      assert.ok(
        code.startsWith('"use client"') || code.startsWith("'use client'"),
        `${file} must begin with 'use client' directive for hydration safety`
      );
    }
  });
});

// ============================================================================
// Section 1: Midnight Birthday Reveal
// ============================================================================
describe("Section 1: Midnight Birthday Reveal (Date-gating, Timezone & Audio)", () => {
  const { moduleExports, rawCode } = loadTsxModule("src/components/landing/MidnightBirthdayReveal.tsx");
  const {
    DEFAULT_RECIPIENT_NAME,
    DEFAULT_RECIPIENT_TIMEZONE,
    DEFAULT_BIRTHDAY_MONTH,
    DEFAULT_BIRTHDAY_DAY,
    DEFAULT_URDU_BLESSING,
    getTimezoneDateParts,
    isBirthdayActive,
    getRevealStorageKey,
    hasRevealCompleted,
    markRevealCompleted,
    playMusicBoxChime,
  } = moduleExports;

  test("Timezone calculation uses recipient timezone (Asia/Kolkata default)", () => {
    assert.equal(DEFAULT_RECIPIENT_TIMEZONE, "Asia/Kolkata");
    assert.equal(DEFAULT_BIRTHDAY_MONTH, 10);
    assert.equal(DEFAULT_BIRTHDAY_DAY, 30);
    assert.equal(DEFAULT_RECIPIENT_NAME, "Meerah");

    const testDate = new Date("2026-10-29T18:30:00Z"); // 00:00 AM Oct 30 in IST
    const parts = getTimezoneDateParts(testDate, "Asia/Kolkata");
    assert.equal(parts.year, 2026);
    assert.equal(parts.month, 10);
    assert.equal(parts.day, 30);
    assert.equal(parts.hour, 0);
  });

  test("isBirthdayActive correctly activates on Oct 30 and deactivates on Oct 29/31", () => {
    const oct29 = new Date("2026-10-29T12:00:00Z");
    const oct30 = new Date("2026-10-30T06:00:00Z");
    const oct31 = new Date("2026-10-31T06:00:00Z");

    assert.equal(isBirthdayActive(oct29, "Asia/Kolkata"), false);
    assert.equal(isBirthdayActive(oct30, "Asia/Kolkata"), true);
    assert.equal(isBirthdayActive(oct31, "Asia/Kolkata"), false);
  });

  test("Deterministic reveal storage key and persistence lifecycle", () => {
    const key = getRevealStorageKey(2026, 10, 30);
    assert.equal(key, "birthday-reveal-completed-2026-10-30");

    const mockStorage: Record<string, string> = {};
    const storageApi = {
      getItem: (k: string) => mockStorage[k] || null,
      setItem: (k: string, v: string) => {
        mockStorage[k] = v;
      },
    };

    assert.equal(hasRevealCompleted(key, storageApi), false);
    markRevealCompleted(key, storageApi);
    assert.equal(hasRevealCompleted(key, storageApi), true);
  });

  test("Synthesizes acoustic music-box chime via Web Audio API fallback", () => {
    assert.equal(typeof playMusicBoxChime, "function");
    const result = playMusicBoxChime();
    assert.equal(result.state, "unsupported");
    assert.equal(typeof result.stop, "function");
  });

  test("ARIA attributes, semantic modal dialog, and RTL language tagging", () => {
    assert.ok(rawCode.includes('role="dialog"'), "Must render dialog role");
    assert.ok(rawCode.includes('aria-modal="true"'), "Must declare aria-modal='true'");
    assert.ok(rawCode.includes('aria-labelledby="midnight-reveal-title"'), "Must link title via aria-labelledby");
    assert.ok(rawCode.includes('id="midnight-reveal-title"'), "Title element must provide id");
    assert.ok(rawCode.includes('lang="ur"'), "Urdu blessing must have lang='ur'");
    assert.ok(rawCode.includes('dir="rtl"'), "Urdu blessing must have dir='rtl'");
    assert.ok(rawCode.includes('aria-hidden="true"'), "Confetti and emblems must be hidden from screen readers");
    assert.ok(rawCode.includes('aria-live="polite"'), "Audio playback status must use polite live region");
    assert.ok(rawCode.includes(DEFAULT_URDU_BLESSING), "Component source contains Urdu blessing");
  });
});

// ============================================================================
// Section 2: Welcome Hero & Avatar
// ============================================================================
describe("Section 2: Welcome Hero & Avatar (Cameo, Floral Wreath, Personalized)", () => {
  const { moduleExports, rawCode } = loadTsxModule("src/components/landing/HeroSection.tsx");
  const { HeroSection } = moduleExports;

  test("Renders personalized greeting, Urdu blessing with RTL, and date badge", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(HeroSection, {
        recipientName: "Meerah",
        birthdayDate: "October 30",
        onOpenWorld: () => {},
      })
    );

    assert.ok(html.includes("Happy Birthday"), "Hero heading must include Happy Birthday");
    assert.ok(html.includes("Meerah"), "Hero heading must include recipient name");
    assert.ok(html.includes("OCTOBER 30") || html.includes("October 30"), "Hero must include birthday date");
    assert.ok(html.includes('lang="ur"'), "Must include lang='ur' for Urdu elements");
    assert.ok(html.includes('dir="rtl"'), "Must include dir='rtl' for Urdu text");
  });

  test("Wreath contains 3 floral motifs: sunflower, rose, and white-flower", () => {
    assert.ok(rawCode.includes('data-motif="sunflower"'), "Floral wreath must include sunflower motif");
    assert.ok(rawCode.includes('data-motif="rose"'), "Floral wreath must include rose motif");
    assert.ok(rawCode.includes('data-motif="white-flower"'), "Floral wreath must include white flower motif");
  });

  test("Avatar supports photo with graceful fallback to symbolic cameo silhouette", () => {
    assert.ok(rawCode.includes("hero-symbolic-silhouette"), "Must contain SVG silhouette cameo");
    assert.ok(rawCode.includes("hero-avatar-real-photo"), "Must contain real photo avatar branch");
    assert.ok(rawCode.includes("onError="), "Must handle avatar load errors gracefully");
    assert.ok(rawCode.includes('decoding="async"'), "Avatar photo should decode asynchronously");
  });

  test("Primary CTA button has accessible label and keyboard action", () => {
    assert.ok(rawCode.includes("aria-label="), "Hero CTA button must declare accessible aria-label");
    assert.ok(rawCode.includes("onClick={onOpenWorld}"), "Hero CTA must bind onOpenWorld callback");
  });
});

// ============================================================================
// Section 3: Swipeable Photo Cards
// ============================================================================
describe("Section 3: Swipeable Photo Cards (Touch Carousel, Position Indicator, Selection)", () => {
  const { moduleExports, rawCode } = loadTsxModule("src/components/landing/SwipeablePhotoCards.tsx");
  const {
    SwipeablePhotoCards,
    DEFAULT_PHOTOS,
    SWIPE_THRESHOLD_PX,
    calculateSwipeDirection,
    clampPhotoIndex,
    getNextPhotoIndex,
    getPrevPhotoIndex,
  } = moduleExports;

  test("Exports required contracts and default photograph collection", () => {
    assert.equal(typeof SwipeablePhotoCards, "function");
    assert.ok(Array.isArray(DEFAULT_PHOTOS), "DEFAULT_PHOTOS must be an array");
    assert.ok(DEFAULT_PHOTOS.length >= 3, "Must have at least 3 curated photos");
    assert.equal(SWIPE_THRESHOLD_PX, 45, "Touch swipe threshold must be 45px");
  });

  test("Touch swipe gesture handling implementation", () => {
    assert.ok(rawCode.includes("handleTouchStart"), "Must handle touch start");
    assert.ok(rawCode.includes("handleTouchEnd"), "Must handle touch end");
    assert.ok(rawCode.includes("SWIPE_THRESHOLD_PX"), "Must evaluate swipe threshold");
    assert.equal(calculateSwipeDirection(100, 40, SWIPE_THRESHOLD_PX), "next");
    assert.equal(calculateSwipeDirection(40, 100, SWIPE_THRESHOLD_PX), "prev");
    assert.equal(calculateSwipeDirection(50, 55, SWIPE_THRESHOLD_PX), "none");
  });

  test("Navigation index boundaries and clamping", () => {
    assert.equal(clampPhotoIndex(0, 5), 0);
    assert.equal(clampPhotoIndex(4, 5), 4);
    assert.equal(clampPhotoIndex(-1, 5), 0);
    assert.equal(clampPhotoIndex(10, 5), 4);
    assert.equal(getNextPhotoIndex(4, 5, false), 4); // No wrap
    assert.equal(getNextPhotoIndex(4, 5, true), 0); // Wrap
    assert.equal(getPrevPhotoIndex(0, 5, false), 0); // No wrap
    assert.equal(getPrevPhotoIndex(0, 5, true), 4); // Wrap
  });

  test("Accessible position indicators, roledescription, and keyboard navigation", () => {
    assert.ok(rawCode.includes('aria-roledescription="carousel"'), "Must declare carousel roledescription");
    assert.ok(rawCode.includes('tabIndex={0}'), "Carousel must be keyboard focusable");
    assert.ok(rawCode.includes('aria-label="Photo Memories Carousel"'), "Carousel must have accessible aria-label");
    assert.ok(rawCode.includes('aria-label="Previous photo"'), "Previous button must have accessible label");
    assert.ok(rawCode.includes('aria-label="Next photo"'), "Next button must have accessible label");
    assert.ok(rawCode.includes("aria-current="), "Active indicator dot must declare aria-current");
    assert.ok(rawCode.includes("handleKeyDown"), "Cards must be keyboard operable");

    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(SwipeablePhotoCards, { photos: DEFAULT_PHOTOS })
    );
    assert.ok(html.includes("polaroid-card"), "Renders polaroid-card");
    assert.ok(html.includes("1 of "), "Renders 1 of N position indicator");
  });
});

// ============================================================================
// Section 4: Personal Messages and Poetry
// ============================================================================
describe("Section 4: Personal Messages and Poetry (Bilingual English/Urdu RTL)", () => {
  const { moduleExports, rawCode } = loadTsxModule("src/components/landing/PersonalMessagesSection.tsx");
  const {
    PersonalMessagesSection,
    DEFAULT_PERSONAL_MESSAGES,
    resolvePersonalMessages,
  } = moduleExports;

  test("Exports required contracts and default bicultural messages", () => {
    assert.equal(typeof PersonalMessagesSection, "function");
    assert.ok(Array.isArray(DEFAULT_PERSONAL_MESSAGES));
    assert.ok(DEFAULT_PERSONAL_MESSAGES.length >= 4, "Must contain at least 4 default keepsake cards");

    const resolved = resolvePersonalMessages();
    assert.equal(resolved.length, DEFAULT_PERSONAL_MESSAGES.length);
  });

  test("Renders bilingual cards with proper RTL attribute and Urdu language tag", () => {
    assert.ok(rawCode.includes('lang="ur"'), "Must mark Urdu text with lang='ur'");
    assert.ok(rawCode.includes('dir="rtl"'), "Must set dir='rtl' for Urdu poetry/prose");
    assert.ok(rawCode.includes("body_en"), "Must render English message body");
    assert.ok(rawCode.includes("body_ur"), "Must render Urdu message body");

    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(PersonalMessagesSection, { cards: DEFAULT_PERSONAL_MESSAGES })
    );

    assert.ok(html.includes("Happy Birthday, Meerah"));
    assert.ok(html.includes("تمہاری سالگرہ کا ہر لمحہ محبت"));
  });

  test("Wax seal graphics have decorative styling and semantic accessibility", () => {
    assert.ok(rawCode.includes("message-wax-seal"), "Must render wax seal graphic");
    assert.ok(rawCode.includes('aria-hidden="true"'), "Decorative seals must be hidden from screen readers");
  });
});

// ============================================================================
// Section 5: Birthday Book Invitation
// ============================================================================
describe("Section 5: Birthday Book Invitation (3D Spine & Open Book Action)", () => {
  const { moduleExports, rawCode } = loadTsxModule("src/components/landing/BirthdayBookInvitation.tsx");
  const {
    BirthdayBookInvitation,
    DEFAULT_BOOK_INVITATION_HEADING,
    DEFAULT_BOOK_TOTAL_PAGES,
    DEFAULT_BOOK_COVER_TITLE,
    DEFAULT_BOOK_COVER_URDU,
  } = moduleExports;

  test("Exports required constants and default values", () => {
    assert.equal(typeof BirthdayBookInvitation, "function");
    assert.equal(DEFAULT_BOOK_INVITATION_HEADING, "There's a little more to this story.");
    assert.equal(DEFAULT_BOOK_TOTAL_PAGES, 7);
    assert.equal(DEFAULT_BOOK_COVER_TITLE, "For my baba");
    assert.equal(DEFAULT_BOOK_COVER_URDU, "تمہاری سالگرہ");
  });

  test("Renders physical 3D book spine, antique foil stamp, and contact shadow", () => {
    assert.ok(rawCode.includes("book-invitation-spine"), "Must render 3D book spine");
    assert.ok(rawCode.includes("book-invitation-foil-stamp"), "Must render antique gold foil stamp");
    assert.ok(rawCode.includes("book-invitation-shadow"), "Must render floor contact shadow");
    assert.ok(rawCode.includes("book-invitation-spine-crease"), "Must render realistic spine crease");
  });

  test("Accessible book opening action with keyboard support and landmark labeling", () => {
    assert.ok(rawCode.includes('aria-labelledby="book-invitation-heading"'), "Section must have aria-labelledby");
    assert.ok(rawCode.includes('role="button"'), "3D book wrapper must have button role");
    assert.ok(rawCode.includes("tabIndex={0}"), "Book wrapper must be keyboard focusable");
    assert.ok(rawCode.includes("handleBookKeyDown"), "Book wrapper must handle Enter/Space keys");

    let opened = false;
    const tree = BirthdayBookInvitation({
      onOpenBook: () => {
        opened = true;
      },
    });

    const ctaBtn = findElements(tree, (el) => el?.props?.className?.includes("book-invitation-cta-btn"));
    assert.equal(ctaBtn.length, 1);
    ctaBtn[0].props.onClick();
    assert.equal(opened, true);
  });
});

// ============================================================================
// Section 6: Our Soundtrack
// ============================================================================
describe("Section 6: Our Soundtrack (Shared Audio, Tracklist & Controls)", () => {
  const { moduleExports, rawCode } = loadTsxModule("src/components/landing/OurSoundtrackSection.tsx");
  const {
    OurSoundtrackSection,
    formatTrackDuration,
    DEFAULT_SOUNDTRACK_HEADING,
  } = moduleExports;

  test("Exports duration formatter and default soundtrack heading", () => {
    assert.equal(typeof OurSoundtrackSection, "function");
    assert.equal(DEFAULT_SOUNDTRACK_HEADING, "Our soundtrack.");
    assert.equal(formatTrackDuration(204), "3:24");
    assert.equal(formatTrackDuration(65), "1:05");
    assert.equal(formatTrackDuration(0), "3:24");
    assert.equal(formatTrackDuration(null), "3:24");
  });

  test("Autoplay safety: strictly delegates audio without autoPlay attribute or direct .play()", () => {
    assert.ok(!rawCode.includes("autoPlay"), "Must not use autoPlay attribute");
    assert.ok(!rawCode.includes(".play()"), "Must not call audio.play() directly; controlled via props");
    assert.ok(rawCode.includes("onTogglePlay"), "Must expose onTogglePlay prop");
    assert.ok(rawCode.includes("onPlayTrack"), "Must expose onPlayTrack prop");
  });

  test("Semantic track list with role='list', play/pause accessible labels, and songbook CTA", () => {
    assert.ok(rawCode.includes('role="list"'), "Tracklist container must have role='list'");
    assert.ok(rawCode.includes("soundtrack-track-row"), "Tracks must render as track rows");
    assert.ok(rawCode.includes("onOpenSongbook"), "Must provide songbook navigation action");

    const sampleTracks = [
      { id: "t1", title: "Midnight Sun", artist: "Acoustic Melody", url: "/audio/t1.mp3", duration_seconds: 180 },
      { id: "t2", title: "Golden Leaves", artist: "Gentle Piano", url: "/audio/t2.mp3", duration_seconds: 210 },
    ];

    let playedTrack: any = null;
    const tree = OurSoundtrackSection({
      tracks: sampleTracks,
      activeTrack: sampleTracks[0],
      isPlaying: true,
      onTogglePlay: () => {},
      onPlayTrack: (t: any) => {
        playedTrack = t;
      },
      onOpenSongbook: () => {},
    });

    const trackButtons = findElements(tree, (el) => el?.props?.className?.includes("soundtrack-track-row"));
    assert.equal(trackButtons.length, 2);
    trackButtons[1].props.onClick();
    assert.equal(playedTrack?.id, "t2");
  });
});

// ============================================================================
// Section 7: Memories Preview
// ============================================================================
describe("Section 7: Memories Preview (Polaroid Cards, Image Fallback & CTA)", () => {
  const { moduleExports, rawCode } = loadTsxModule("src/components/landing/MemoriesPreviewSection.tsx");
  const {
    MemoriesPreviewSection,
    getMemoryAltText,
    getMemoryDisplayCaption,
    DEFAULT_MEMORIES_HEADING,
    DEFAULT_MEMORIES_MAX_COUNT,
  } = moduleExports;

  test("Exports helpers and default cap of 4 preview items", () => {
    assert.equal(typeof MemoriesPreviewSection, "function");
    assert.equal(DEFAULT_MEMORIES_HEADING, "Moments worth keeping.");
    assert.equal(DEFAULT_MEMORIES_MAX_COUNT, 4);

    assert.equal(getMemoryAltText({ id: "1", url: "", alt_text: "Beach sunset" }, 0), "Beach sunset");
    assert.equal(getMemoryAltText({ id: "2", url: "", caption: "Our coffee chat" }, 1), "Our coffee chat");
    assert.equal(getMemoryAltText({ id: "3", url: "" }, 2), "Birthday memory photograph 3");

    assert.equal(getMemoryDisplayCaption({ id: "1", url: "", caption: "Coffee morning" }), "Coffee morning");
    assert.equal(getMemoryDisplayCaption({ id: "2", url: "", alt_text: "Walk in rain" }), "Walk in rain");
    assert.equal(getMemoryDisplayCaption({ id: "3", url: "" }), "A sweet memory ✿");
  });

  test("Renders polaroid frames with washi tape accents and explore CTA", () => {
    assert.ok(rawCode.includes("polaroid-frame"), "Must render polaroid frame styles");
    assert.ok(rawCode.includes("washi-tape"), "Must render washi tape accents");
    assert.ok(rawCode.includes("onOpenMemories"), "Must wire onOpenMemories callback");
    assert.ok(rawCode.includes('aria-labelledby="memories-preview-heading"'), "Must link heading via aria-labelledby");
  });

  test("Handles empty state and loading skeleton states gracefully", () => {
    assert.ok(rawCode.includes("memories-empty-card"), "Must support empty state");
    assert.ok(rawCode.includes("memories-loading-grid"), "Must support loading skeleton state");
  });
});

// ============================================================================
// Section 8: Explore Your World
// ============================================================================
describe("Section 8: Explore Your World (Destination Navigation Grid)", () => {
  const { moduleExports, rawCode } = loadTsxModule("src/components/landing/ExploreWorldSection.tsx");
  const {
    ExploreWorldSection,
    DEFAULT_WORLD_DESTINATIONS,
    DEFAULT_EXPLORE_HEADING,
  } = moduleExports;

  test("Contains all 6 core destinations (Profile, Games, Study, Music Room, Memories, Book)", () => {
    assert.equal(typeof ExploreWorldSection, "function");
    assert.equal(DEFAULT_EXPLORE_HEADING, "Explore your world.");
    assert.equal(DEFAULT_WORLD_DESTINATIONS.length, 6);

    const destIds = DEFAULT_WORLD_DESTINATIONS.map((d: any) => d.id);
    assert.ok(destIds.includes("profile"), "Must contain Profile destination");
    assert.ok(destIds.includes("games"), "Must contain Games destination");
    assert.ok(destIds.includes("study"), "Must contain Study destination");
    assert.ok(destIds.includes("songs"), "Must contain Music Room destination");
    assert.ok(destIds.includes("stories"), "Must contain Memories destination");
    assert.ok(destIds.includes("birthday-book"), "Must contain Birthday Book destination");
  });

  test("Cards provide accessible button semantics, washi tape styling, and navigation", () => {
    assert.ok(rawCode.includes("explore-world-card"), "Must style as explore world cards");
    assert.ok(rawCode.includes("aria-label="), "Cards must have descriptive aria-labels");
    assert.ok(rawCode.includes("washi-tape"), "Destination cards must include washi tape details");

    let navigatedTo = "";
    const tree = ExploreWorldSection({
      onNavigate: (id: string) => {
        navigatedTo = id;
      },
    });

    const cards = findElements(tree, (el) => el?.props?.className?.includes("explore-world-card"));
    assert.equal(cards.length, 6);
    cards[2].props.onClick(); // Click study
    assert.equal(navigatedTo, "study");
  });
});

// ============================================================================
// Section 9: Closing Message
// ============================================================================
describe("Section 9: Closing Message (Letter Signoff & Return to Top)", () => {
  const { moduleExports, rawCode } = loadTsxModule("src/components/landing/ClosingMessageSection.tsx");
  const {
    ClosingMessageSection,
    DEFAULT_CLOSING_HEADING,
    DEFAULT_CLOSING_MESSAGE,
    DEFAULT_CLOSING_SIGNOFF,
    DEFAULT_CLOSING_URDU,
  } = moduleExports;

  test("Exports heartfelt letter defaults and Urdu closing prayer", () => {
    assert.equal(typeof ClosingMessageSection, "function");
    assert.equal(DEFAULT_CLOSING_HEADING, "And one last thing…");
    assert.ok(DEFAULT_CLOSING_MESSAGE.includes("I hope this little world reminds you"));
    assert.equal(DEFAULT_CLOSING_SIGNOFF, "With all my love ♡");
    assert.equal(DEFAULT_CLOSING_URDU, "تمہاری سالگرہ کا ہر لمحہ محبت اور روشنی سے بھرا رہے");
  });

  test("Stationery card features top washi tape and crimson wax seal SVG with embossed heart", () => {
    assert.ok(rawCode.includes("closing-letter-card"), "Must render handcrafted letter card");
    assert.ok(rawCode.includes("washi-tape-top"), "Must render top washi tape");
    assert.ok(rawCode.includes("closing-wax-seal-svg"), "Must render embossed wax seal SVG");
    assert.ok(rawCode.includes("waxGradient"), "Wax seal must use rich radial gradient");
    assert.ok(rawCode.includes("closing-urdu-blessing"), "Must render Urdu blessing");
  });

  test("Accessible 'Return to beginning' action and optional 'Explore your world' CTA", () => {
    assert.ok(rawCode.includes('aria-label="Return to beginning"'), "Return button must have accessible label");
    assert.ok(rawCode.includes("handleScrollToTop"), "Must handle scroll to top smooth behavior");

    let returnInvoked = false;
    let exploreInvoked = false;

    const tree = ClosingMessageSection({
      onReturnToBeginning: () => {
        returnInvoked = true;
      },
      onExploreMore: () => {
        exploreInvoked = true;
      },
    });

    const returnBtn = findElements(tree, (el) => el?.props?.className?.includes("closing-return-btn"));
    const exploreBtn = findElements(tree, (el) => el?.props?.className?.includes("closing-explore-btn"));

    assert.equal(returnBtn.length, 1);
    assert.equal(exploreBtn.length, 1);

    returnBtn[0].props.onClick();
    exploreBtn[0].props.onClick();

    assert.equal(returnInvoked, true);
    assert.equal(exploreInvoked, true);
  });
});

// ============================================================================
// Cross-Cutting Audits: Accessibility, Reduced-Motion, Design System & Safety
// ============================================================================
describe("Cross-Cutting Quality Audits (A11y, Reduced-Motion, Design System)", () => {
  const CSS_FILES = [
    "landing-tokens.css",
    "midnight-reveal.css",
    "hero-section.css",
    "swipeable-photo-cards.css",
    "personal-messages.css",
    "book-invitation.css",
    "our-soundtrack.css",
    "memories-preview.css",
    "explore-world.css",
    "closing-message.css",
  ];

  test("Accessibility: EVERY landing page stylesheet defines @media (prefers-reduced-motion: reduce)", () => {
    for (const file of CSS_FILES) {
      const css = readCss(file);
      assert.ok(
        css.includes("@media (prefers-reduced-motion: reduce)"),
        `${file} MUST define a @media (prefers-reduced-motion: reduce) rule for motion sensitivity compliance`
      );
    }
  });

  test("Design System: Color token palette integrity across landing stylesheets", () => {
    const tokensCss = readCss("landing-tokens.css");

    const requiredDesignTokens = [
      "--scrapbook-rose",
      "--scrapbook-rose-deep",
      "--scrapbook-ivory",
      "--scrapbook-paper",
      "--scrapbook-sunflower",
      "--scrapbook-sunflower-dark",
      "--scrapbook-sage",
      "--scrapbook-sage-dark",
      "--scrapbook-plum",
      "--scrapbook-plum-dark",
      "--scrapbook-border",
      "--scrapbook-shadow",
    ];

    for (const token of requiredDesignTokens) {
      assert.ok(tokensCss.includes(token), `landing-tokens.css must declare ${token}`);
    }
  });

  test("Hydration Safety: safe window/localStorage access guards in all components", () => {
    const tsxFiles = [
      "MidnightBirthdayReveal.tsx",
      "SwipeablePhotoCards.tsx",
      "PersonalMessagesSection.tsx",
      "ClosingMessageSection.tsx",
    ];

    for (const file of tsxFiles) {
      const code = fs.readFileSync(path.join(LANDING_DIR, file), "utf-8");
      if (code.includes("localStorage")) {
        assert.ok(
          code.includes('typeof window !== "undefined"') || code.includes("typeof window === 'undefined'"),
          `${file} must guard localStorage with typeof window check`
        );
      }
      if (code.includes("window.scrollTo")) {
        assert.ok(
          code.includes('typeof window !== "undefined"'),
          `${file} must guard window.scrollTo with typeof window check`
        );
      }
    }
  });

  test("Experience Shell: tab === 'home' wires all 9 production sections sequentially", () => {
    const experienceCode = fs.readFileSync(path.resolve(WORKSPACE_ROOT, "src/components/Experience.tsx"), "utf-8");

    // Verify all 9 sections are rendered in home tab
    assert.ok(experienceCode.includes("<MidnightBirthdayReveal"), "Must render Section 1 (MidnightBirthdayReveal)");
    assert.ok(experienceCode.includes("<HeroSection"), "Must render Section 2 (HeroSection)");
    assert.ok(experienceCode.includes("<SwipeablePhotoCards"), "Must render Section 3 (SwipeablePhotoCards)");
    assert.ok(experienceCode.includes("<PersonalMessagesSection"), "Must render Section 4 (PersonalMessagesSection)");
    assert.ok(experienceCode.includes("<BirthdayBookInvitation"), "Must render Section 5 (BirthdayBookInvitation)");
    assert.ok(experienceCode.includes("<OurSoundtrackSection"), "Must render Section 6 (OurSoundtrackSection)");
    assert.ok(experienceCode.includes("<MemoriesPreviewSection"), "Must render Section 7 (MemoriesPreviewSection)");
    assert.ok(experienceCode.includes("<ExploreWorldSection"), "Must render Section 8 (ExploreWorldSection)");
    assert.ok(experienceCode.includes("<ClosingMessageSection"), "Must render Section 9 (ClosingMessageSection)");
  });
});
