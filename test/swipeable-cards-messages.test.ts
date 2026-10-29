import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import ReactDOMServer from "react-dom/server";

const require = createRequire(import.meta.url);
const WORKSPACE_ROOT = process.cwd();

/**
 * ============================================================================
 * Dynamic Component Loaders (stripping CSS imports for Node environment)
 * ============================================================================
 */

function loadComponentModule(relativePath: string) {
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
  const evalFunc = new Function("exports", "require", transpiled.outputText);
  evalFunc(moduleExports, require);

  return { moduleExports, rawCode, filePath };
}

function loadPhotoCards() {
  return loadComponentModule("src/components/landing/SwipeablePhotoCards.tsx");
}

function loadPersonalMessages() {
  return loadComponentModule("src/components/landing/PersonalMessagesSection.tsx");
}

/**
 * ============================================================================
 * TEST SUITE 1: Swipeable Photo Cards (Section 3)
 * ============================================================================
 */

describe("Section 3: Swipeable Photo Cards — Component & Helper Contracts", () => {
  test("Module exports: exports SwipeablePhotoCards component and utility functions", () => {
    const { moduleExports, rawCode } = loadPhotoCards();

    assert.equal(typeof moduleExports.SwipeablePhotoCards, "function");
    assert.equal(typeof moduleExports.clampPhotoIndex, "function");
    assert.equal(typeof moduleExports.getNextPhotoIndex, "function");
    assert.equal(typeof moduleExports.getPrevPhotoIndex, "function");
    assert.equal(typeof moduleExports.calculateSwipeDirection, "function");
    assert.equal(typeof moduleExports.resolvePhotoAltText, "function");
    assert.equal(typeof moduleExports.resolvePhotoWashiColor, "function");
    assert.ok(Array.isArray(moduleExports.DEFAULT_PHOTOS));
    assert.equal(typeof moduleExports.SWIPE_THRESHOLD_PX, "number");

    // TypeScript interface exports check
    assert.ok(rawCode.includes("export interface SwipeablePhotoItem"), "Exports SwipeablePhotoItem");
    assert.ok(rawCode.includes("export interface SwipeablePhotoCardsProps"), "Exports SwipeablePhotoCardsProps");
  });

  test("Carousel navigation boundaries: clamping logic (wrap=false)", () => {
    const { moduleExports } = loadPhotoCards();
    const { clampPhotoIndex, getNextPhotoIndex, getPrevPhotoIndex } = moduleExports;
    const total = 6;

    // Clamping boundaries
    assert.equal(clampPhotoIndex(0, total), 0, "Initial index 0 stays 0");
    assert.equal(clampPhotoIndex(3, total), 3, "Middle index 3 stays 3");
    assert.equal(clampPhotoIndex(5, total), 5, "Last index 5 stays 5");
    assert.equal(clampPhotoIndex(-1, total), 0, "Negative index clamps to 0");
    assert.equal(clampPhotoIndex(10, total), 5, "Overflow index clamps to 5");

    // Clamped step forward
    assert.equal(getNextPhotoIndex(0, total, false), 1);
    assert.equal(getNextPhotoIndex(4, total, false), 5);
    assert.equal(getNextPhotoIndex(5, total, false), 5, "Clamps at end");

    // Clamped step backward
    assert.equal(getPrevPhotoIndex(5, total, false), 4);
    assert.equal(getPrevPhotoIndex(1, total, false), 0);
    assert.equal(getPrevPhotoIndex(0, total, false), 0, "Clamps at start");
  });

  test("Carousel navigation boundaries: wrapping logic (wrap=true)", () => {
    const { moduleExports } = loadPhotoCards();
    const { getNextPhotoIndex, getPrevPhotoIndex } = moduleExports;
    const total = 4;

    assert.equal(getNextPhotoIndex(3, total, true), 0, "Wraps from last to first");
    assert.equal(getPrevPhotoIndex(0, total, true), 3, "Wraps from first to last");
  });

  test("Touch swipe distance threshold calculation", () => {
    const { moduleExports } = loadPhotoCards();
    const { calculateSwipeDirection, SWIPE_THRESHOLD_PX } = moduleExports;

    // Sub-threshold movement
    assert.equal(calculateSwipeDirection(100, 120, SWIPE_THRESHOLD_PX), "none");
    assert.equal(calculateSwipeDirection(100, 80, SWIPE_THRESHOLD_PX), "none");
    assert.equal(calculateSwipeDirection(100, 100, SWIPE_THRESHOLD_PX), "none");

    // Left swipe (startX > endX) -> next photo
    assert.equal(calculateSwipeDirection(200, 130, SWIPE_THRESHOLD_PX), "next");

    // Right swipe (startX < endX) -> prev photo
    assert.equal(calculateSwipeDirection(100, 170, SWIPE_THRESHOLD_PX), "prev");
  });

  test("Alt text and washi tape fallback resolution", () => {
    const { moduleExports } = loadPhotoCards();
    const { resolvePhotoAltText, resolvePhotoWashiColor } = moduleExports;

    const photoWithAlt = { url: "test.jpg", alt: "Sunset picnic", caption: "Caption" };
    assert.equal(resolvePhotoAltText(photoWithAlt, 0), "Sunset picnic");

    const photoWithCaptionOnly = { url: "test.jpg", caption: "Sweet laughter" };
    assert.equal(resolvePhotoAltText(photoWithCaptionOnly, 1), "Sweet laughter");

    const photoEmpty = { url: "test.jpg" };
    assert.equal(resolvePhotoAltText(photoEmpty, 2), "Meerah's birthday memory photograph 3");

    // Washi tape rotation
    assert.equal(resolvePhotoWashiColor("sage", 0), "sage");
    assert.equal(resolvePhotoWashiColor(undefined, 0), "gold");
    assert.equal(resolvePhotoWashiColor(undefined, 1), "pink");
    assert.equal(resolvePhotoWashiColor(undefined, 2), "sage");
  });

  test("Static rendering: renders active polaroid card with controls and indicator", () => {
    const { moduleExports } = loadPhotoCards();
    const { SwipeablePhotoCards, DEFAULT_PHOTOS } = moduleExports;

    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(SwipeablePhotoCards, {
        photos: DEFAULT_PHOTOS,
        initialIndex: 1,
      })
    );

    // Assert carousel container & accessibility
    assert.ok(html.includes('aria-roledescription="carousel"'), "Has carousel role description");
    assert.ok(html.includes('aria-label="Photo Memories Carousel"'), "Has carousel aria-label");
    assert.ok(html.includes('tabindex="0"'), "Is keyboard focusable");

    // Assert visible position indicator
    assert.ok(html.includes("2 of 6"), "Displays 2 of 6 position indicator");

    // Assert polaroid card framing
    assert.ok(html.includes("polaroid-card"), "Has polaroid-card class");
    assert.ok(html.includes("polaroid-image-frame"), "Has polaroid-image-frame");
    assert.ok(html.includes("polaroid-chin"), "Has polaroid chin for caption");
    assert.ok(html.includes("washi-tape"), "Has washi-tape accent");

    // Assert controls
    assert.ok(html.includes('aria-label="Previous photo"'), "Has previous button");
    assert.ok(html.includes('aria-label="Next photo"'), "Has next button");
    assert.ok(html.includes('role="group"'), "Has dots group");
  });

  test("Empty state: renders warm fallback when photos array is empty", () => {
    const { moduleExports } = loadPhotoCards();
    const { SwipeablePhotoCards } = moduleExports;

    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(SwipeablePhotoCards, {
        photos: [],
      })
    );

    assert.ok(html.includes("is-empty"), "Renders empty container class");
    assert.ok(html.includes("No photographs pinned yet"), "Displays empty message title");
    assert.ok(html.includes("photos-camera-svg"), "Displays camera illustration");
  });

  test("Loading state: renders skeleton cards when loading=true", () => {
    const { moduleExports } = loadPhotoCards();
    const { SwipeablePhotoCards } = moduleExports;

    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(SwipeablePhotoCards, {
        loading: true,
      })
    );

    assert.ok(html.includes("is-loading"), "Renders loading container class");
    assert.ok(html.includes('aria-busy="true"'), "Sets aria-busy to true");
    assert.ok(html.includes("photos-skeleton-image"), "Has skeleton placeholder");
  });
});

/**
 * ============================================================================
 * TEST SUITE 2: Personal Messages and Poetry (Section 4)
 * ============================================================================
 */

describe("Section 4: Personal Messages and Poetry — Component & Helper Contracts", () => {
  test("Module exports: exports PersonalMessagesSection and domain helpers", () => {
    const { moduleExports, rawCode } = loadPersonalMessages();

    assert.equal(typeof moduleExports.PersonalMessagesSection, "function");
    assert.equal(typeof moduleExports.resolvePersonalMessages, "function");
    assert.equal(typeof moduleExports.clampMessageIndex, "function");
    assert.equal(typeof moduleExports.getNextMessageIndex, "function");
    assert.equal(typeof moduleExports.getPrevMessageIndex, "function");
    assert.equal(typeof moduleExports.calculateSwipeDirection, "function");
    assert.equal(typeof moduleExports.resolveSealColor, "function");
    assert.equal(moduleExports.DEFAULT_HEADING, "A few things from my heart.");
    assert.equal(
      moduleExports.DEFAULT_SUPPORTING_TEXT,
      "Some things deserve more than a simple birthday wish."
    );
    assert.ok(Array.isArray(moduleExports.DEFAULT_PERSONAL_MESSAGES));

    // TypeScript interface exports check
    assert.ok(rawCode.includes("export interface PersonalMessageCard"), "Exports PersonalMessageCard");
    assert.ok(
      rawCode.includes("export interface PersonalMessagesSectionProps"),
      "Exports PersonalMessagesSectionProps"
    );
  });

  test("Data-driven fallback and empty state handling", () => {
    const { moduleExports } = loadPersonalMessages();
    const { resolvePersonalMessages, DEFAULT_PERSONAL_MESSAGES } = moduleExports;

    // Undefined fallback
    const defaults = resolvePersonalMessages(undefined);
    assert.equal(defaults.length, DEFAULT_PERSONAL_MESSAGES.length);
    assert.equal(defaults[0].title, DEFAULT_PERSONAL_MESSAGES[0].title);

    // Custom cards preservation
    const custom = [
      { id: "custom-1", title: "Custom Birthday Note", body_en: "Always celebrate you." },
    ];
    const customResult = resolvePersonalMessages(custom);
    assert.equal(customResult.length, 1);
    assert.equal(customResult[0].title, "Custom Birthday Note");

    // Empty array with allowEmpty=false falls back to curated messages
    const fallbackOnEmpty = resolvePersonalMessages([], false);
    assert.equal(fallbackOnEmpty.length, DEFAULT_PERSONAL_MESSAGES.length);

    // Empty array with allowEmpty=true permits empty state
    const emptyAllowed = resolvePersonalMessages([], true);
    assert.equal(emptyAllowed.length, 0);
  });

  test("Navigation boundaries and card index wrapping", () => {
    const { moduleExports } = loadPersonalMessages();
    const { clampMessageIndex, getNextMessageIndex, getPrevMessageIndex } = moduleExports;
    const total = 4;

    assert.equal(clampMessageIndex(0, total), 0);
    assert.equal(clampMessageIndex(3, total), 3);
    assert.equal(clampMessageIndex(-2, total), 0);
    assert.equal(clampMessageIndex(9, total), 3);

    // Next wrapping
    assert.equal(getNextMessageIndex(0, total, true), 1);
    assert.equal(getNextMessageIndex(3, total, true), 0, "Wraps around from end to start");

    // Prev wrapping
    assert.equal(getPrevMessageIndex(1, total, true), 0);
    assert.equal(getPrevMessageIndex(0, total, true), 3, "Wraps around from start to end");
  });

  test("Static rendering: English and Urdu typography with dir='rtl' and lang='ur'", () => {
    const { moduleExports } = loadPersonalMessages();
    const { PersonalMessagesSection, DEFAULT_PERSONAL_MESSAGES } = moduleExports;

    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(PersonalMessagesSection, {
        cards: DEFAULT_PERSONAL_MESSAGES,
        initialIndex: 1, // Index 1 is the Iqbal ghazal poetry card
      })
    );

    // Check headings and kicker
    assert.ok(html.includes("A few things from my heart."), "Renders default heading");
    assert.ok(
      html.includes("Some things deserve more than a simple birthday wish."),
      "Renders default supporting text"
    );
    assert.ok(html.includes("HEARTFELT NOTES · دلی پیغامات"), "Renders bilingual kicker");

    // Check position badge
    assert.ok(html.includes("Card 2 of " + DEFAULT_PERSONAL_MESSAGES.length) || html.includes("Card 2 of 4"), "Renders active card index badge");

    // Check English body
    assert.ok(html.includes("message-card-body-en"), "Has English body container");

    // Check Urdu typography attributes
    assert.ok(html.includes('lang="ur"'), "Urdu text block has lang='ur'");
    assert.ok(html.includes('dir="rtl"'), "Urdu text block has dir='rtl'");
    assert.ok(
      html.includes("ستاروں سے آگے جہاں اور بھی ہیں"),
      "Renders Allama Iqbal Urdu poetry in RTL block"
    );

    // Check ornamental divider
    assert.ok(html.includes("message-card-divider"), "Has ornamental divider between English & Urdu");

    // Check navigation controls
    assert.ok(html.includes('aria-label="Previous message"'), "Has previous note button");
    assert.ok(html.includes('aria-label="Next message"'), "Has next note button");
    assert.ok(html.includes('role="tablist"'), "Has tablist for direct note selection");
  });

  test("Empty state: renders accessible empty card when allowEmptyState=true and cards=[]", () => {
    const { moduleExports } = loadPersonalMessages();
    const { PersonalMessagesSection } = moduleExports;

    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(PersonalMessagesSection, {
        cards: [],
        allowEmptyState: true,
      })
    );

    assert.ok(html.includes("is-empty"), "Has is-empty container class");
    assert.ok(html.includes('role="status"'), "Has accessible role='status'");
    assert.ok(html.includes("No personal messages yet"), "Displays empty message title");
  });
});

/**
 * ============================================================================
 * TEST SUITE 3: CSS & Visual Design System Verification
 * ============================================================================
 */

describe("Visual Design System & CSS Token Verification", () => {
  const photoCssPath = path.resolve(
    WORKSPACE_ROOT,
    "src/components/landing/swipeable-photo-cards.css"
  );
  const messageCssPath = path.resolve(
    WORKSPACE_ROOT,
    "src/components/landing/personal-messages.css"
  );

  test("CSS files exist and import landing-tokens.css", () => {
    assert.ok(fs.existsSync(photoCssPath), "swipeable-photo-cards.css exists");
    assert.ok(fs.existsSync(messageCssPath), "personal-messages.css exists");

    const photoCss = fs.readFileSync(photoCssPath, "utf-8");
    const messageCss = fs.readFileSync(messageCssPath, "utf-8");

    assert.ok(photoCss.includes('landing-tokens.css'), "Photo CSS imports landing-tokens.css");
    assert.ok(messageCss.includes('landing-tokens.css'), "Message CSS imports landing-tokens.css");
  });

  test("Warm ivory & cream paper surfaces are styled correctly", () => {
    const photoCss = fs.readFileSync(photoCssPath, "utf-8");
    const messageCss = fs.readFileSync(messageCssPath, "utf-8");

    assert.ok(
      photoCss.includes("#FFF9EF") || photoCss.includes("--scrapbook-ivory"),
      "Photo CSS uses warm ivory #FFF9EF"
    );
    assert.ok(
      photoCss.includes("#FBF4E6") || photoCss.includes("--scrapbook-paper"),
      "Photo CSS uses paper cream #FBF4E6"
    );
    assert.ok(
      messageCss.includes("#FFF9EF") || messageCss.includes("--scrapbook-ivory"),
      "Message CSS uses warm ivory #FFF9EF"
    );
  });

  test("Blush pink & antique gold accents are defined", () => {
    const photoCss = fs.readFileSync(photoCssPath, "utf-8");
    const messageCss = fs.readFileSync(messageCssPath, "utf-8");

    // Blush pink (#F7A8B8, #D4798D)
    assert.ok(
      photoCss.includes("#D4798D") || photoCss.includes("#F7A8B8") || photoCss.includes("rose"),
      "Photo CSS defines blush pink"
    );
    assert.ok(
      messageCss.includes("#D4798D") || messageCss.includes("#F7A8B8") || messageCss.includes("rose"),
      "Message CSS defines blush pink"
    );

    // Antique gold (#C69325, #F1C75B)
    assert.ok(
      photoCss.includes("#C69325") || photoCss.includes("#F1C75B") || photoCss.includes("gold"),
      "Photo CSS defines antique gold"
    );
    assert.ok(
      messageCss.includes("#C69325") || messageCss.includes("#F1C75B") || messageCss.includes("gold"),
      "Message CSS defines antique gold"
    );
  });

  test("Restrained forest green / sage is present for accents and washi tape", () => {
    const photoCss = fs.readFileSync(photoCssPath, "utf-8");
    const messageCss = fs.readFileSync(messageCssPath, "utf-8");

    assert.ok(photoCss.includes("sage") || photoCss.includes("#5B8266"), "Photo CSS has sage");
    assert.ok(messageCss.includes("sage") || messageCss.includes("#376E58"), "Message CSS has sage");
  });

  test("Urdu typography prevents mixed-direction punctuation glitches via unicode-bidi isolation", () => {
    const messageCss = fs.readFileSync(messageCssPath, "utf-8");

    assert.ok(messageCss.includes("direction: rtl"), "Urdu block has direction: rtl");
    assert.ok(messageCss.includes("text-align: right"), "Urdu block has text-align: right");
    assert.ok(
      messageCss.includes("unicode-bidi: isolate"),
      "Urdu block uses unicode-bidi: isolate to prevent punctuation glitches"
    );
    assert.ok(
      messageCss.includes("Noto Nastaliq Urdu") || messageCss.includes("Jameel Noori"),
      "Configures high quality Urdu font family stack"
    );
  });

  test("Accessibility: respects prefers-reduced-motion in both stylesheets", () => {
    const photoCss = fs.readFileSync(photoCssPath, "utf-8");
    const messageCss = fs.readFileSync(messageCssPath, "utf-8");

    assert.ok(
      photoCss.includes("@media (prefers-reduced-motion: reduce)"),
      "Photo CSS includes prefers-reduced-motion media query"
    );
    assert.ok(
      messageCss.includes("@media (prefers-reduced-motion: reduce)"),
      "Message CSS includes prefers-reduced-motion media query"
    );
  });

  test("Realistic contact shadows and washi tape details are defined", () => {
    const photoCss = fs.readFileSync(photoCssPath, "utf-8");
    const messageCss = fs.readFileSync(messageCssPath, "utf-8");

    assert.ok(photoCss.includes("box-shadow:"), "Photo CSS includes realistic box shadows");
    assert.ok(photoCss.includes("washi-tape"), "Photo CSS styles washi tape");
    assert.ok(messageCss.includes("deck-card-ghost"), "Message CSS includes stacked card depth layers");
  });
});
