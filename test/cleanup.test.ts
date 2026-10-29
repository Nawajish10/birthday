import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SCRAPBOOK_CARDS, type ScrapbookDestination } from "../src/components/landing/landing-helpers.ts";

/**
 * ============================================================================
 * CLEANUP & FEATURE REMOVAL VERIFICATION AUDIT SUITE (Agent E)
 * ============================================================================
 *
 * Verifies that deprecated / removed features are completely absent from active
 * navigation, card walls, and landing page views:
 *   1. "Gift" / "Gifts" primary navigation tab in Experience.tsx
 *   2. "25-surprises" destination
 *   3. "time-capsule" destination & broken countdown timers
 *   4. "flower-garden" destination (replaced by "video")
 *   5. "GIFs" section across all active user-facing views
 *   6. Rendering of GiftGrid in active application tabs
 *
 * Also validates presence of replacement first-class features:
 *   - "Study" (Read & Study) tab & destination card
 *   - "Games" (Birthday Games Hub) tab & destination card
 *   - "Video" (Birthday Video Reel) destination card
 */

const ROOT_DIR = process.cwd();
const EXPERIENCE_PATH = path.resolve(ROOT_DIR, "src/components/Experience.tsx");
const SCRAPBOOK_WALL_PATH = path.resolve(ROOT_DIR, "src/components/landing/ScrapbookCardWall.tsx");
const LANDING_HELPERS_PATH = path.resolve(ROOT_DIR, "src/components/landing/landing-helpers.ts");

// ============================================================================
// 1. Scrapbook Card Wall Configuration & Pure Helpers Audit
// ============================================================================

test("1.1 SCRAPBOOK_CARDS in landing-helpers.ts does NOT contain removed experiences", () => {
  const cardIds = SCRAPBOOK_CARDS.map((c) => c.id);

  assert.ok(
    !cardIds.includes("25-surprises" as ScrapbookDestination),
    "landing-helpers.ts: '25-surprises' must NOT be present in SCRAPBOOK_CARDS"
  );
  assert.ok(
    !cardIds.includes("time-capsule" as ScrapbookDestination),
    "landing-helpers.ts: 'time-capsule' must NOT be present in SCRAPBOOK_CARDS"
  );
  assert.ok(
    !cardIds.includes("flower-garden" as ScrapbookDestination),
    "landing-helpers.ts: 'flower-garden' must NOT be present in SCRAPBOOK_CARDS"
  );
});

test("1.2 SCRAPBOOK_CARDS in landing-helpers.ts contains study, games, and video as active cards", () => {
  const cardIds = SCRAPBOOK_CARDS.map((c) => c.id);

  assert.ok(cardIds.includes("study"), "landing-helpers.ts: 'study' must be in SCRAPBOOK_CARDS");
  assert.ok(cardIds.includes("games"), "landing-helpers.ts: 'games' must be in SCRAPBOOK_CARDS");
  assert.ok(cardIds.includes("video"), "landing-helpers.ts: 'video' must be in SCRAPBOOK_CARDS");

  const studyCard = SCRAPBOOK_CARDS.find((c) => c.id === "study");
  const gamesCard = SCRAPBOOK_CARDS.find((c) => c.id === "games");
  const videoCard = SCRAPBOOK_CARDS.find((c) => c.id === "video");

  assert.ok(studyCard, "study card must exist");
  assert.equal(studyCard?.isPlanned, false, "study card must be active (isPlanned: false)");
  assert.equal(studyCard?.title, "Read & Study");

  assert.ok(gamesCard, "games card must exist");
  assert.equal(gamesCard?.isPlanned, false, "games card must be active (isPlanned: false)");
  assert.equal(gamesCard?.title, "Birthday Games");

  assert.ok(videoCard, "video card must exist");
  assert.equal(videoCard?.isPlanned, false, "video card must be active (isPlanned: false)");
  assert.equal(videoCard?.title, "Birthday Video Reel");

  // Total active cards must equal 8
  assert.equal(SCRAPBOOK_CARDS.length, 8, "SCRAPBOOK_CARDS must define exactly 8 destinations");
});

test("1.3 ScrapbookCardWall.tsx does NOT contain removed destination IDs", () => {
  assert.ok(fs.existsSync(SCRAPBOOK_WALL_PATH), "ScrapbookCardWall.tsx must exist");
  const content = fs.readFileSync(SCRAPBOOK_WALL_PATH, "utf8");

  assert.ok(
    !content.includes('"25-surprises"'),
    "ScrapbookCardWall.tsx must NOT contain '25-surprises'"
  );
  assert.ok(
    !content.includes('"time-capsule"'),
    "ScrapbookCardWall.tsx must NOT contain 'time-capsule'"
  );
  assert.ok(
    !content.includes('"flower-garden"'),
    "ScrapbookCardWall.tsx must NOT contain 'flower-garden'"
  );
});

test("1.4 ScrapbookCardWall.tsx defines study, games, and video with SVG icons and active status", () => {
  const content = fs.readFileSync(SCRAPBOOK_WALL_PATH, "utf8");

  assert.ok(content.includes('id: "study"'), "ScrapbookCardWall.tsx must define 'study' card");
  assert.ok(content.includes('id: "games"'), "ScrapbookCardWall.tsx must define 'games' card");
  assert.ok(content.includes('id: "video"'), "ScrapbookCardWall.tsx must define 'video' card");
});

// ============================================================================
// 2. Active Views Sanitization (No GIFs section, No broken Time Capsule timer)
// ============================================================================

test("2.1 No active user-facing view contains a 'GIFs' section or Giphy widget", () => {
  const directoriesToScan = [
    "src/app",
    "src/components/landing",
    "src/components/profile",
    "src/components/camera",
    "src/components/study",
    "src/components/games",
    "src/components/video",
    "src/components/book",
  ];

  const violations: string[] = [];

  for (const dir of directoriesToScan) {
    const fullDirPath = path.resolve(ROOT_DIR, dir);
    if (!fs.existsSync(fullDirPath)) continue;

    const files = fs.readdirSync(fullDirPath).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
    for (const file of files) {
      const filePath = path.join(fullDirPath, file);
      const code = fs.readFileSync(filePath, "utf8");

      // Check for GIFs headings, section titles, or Giphy embeds
      if (/<h2>\s*GIFs/i.test(code) || /<section[^>]*class(?:Name)?="[^"]*gif/i.test(code) || /giphy\.com/i.test(code)) {
        violations.push(`${dir}/${file}: Found deprecated GIFs section or embed`);
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `Active pages must not contain GIFs sections: ${violations.join("; ")}`
  );
});

test("2.2 No active user-facing view contains a broken time capsule countdown timer", () => {
  const directoriesToScan = [
    "src/app",
    "src/components/landing",
    "src/components/profile",
    "src/components/camera",
    "src/components/study",
    "src/components/games",
    "src/components/video",
    "src/components/book",
  ];

  const violations: string[] = [];

  for (const dir of directoriesToScan) {
    const fullDirPath = path.resolve(ROOT_DIR, dir);
    if (!fs.existsSync(fullDirPath)) continue;

    const files = fs.readdirSync(fullDirPath).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
    for (const file of files) {
      const filePath = path.join(fullDirPath, file);
      const code = fs.readFileSync(filePath, "utf8");

      // Check for broken time capsule timer implementations
      if (/time-capsule/i.test(code) || /timeCapsuleTimer/i.test(code) || /capsuleCountdown/i.test(code)) {
        violations.push(`${dir}/${file}: Found references to deprecated time capsule timer`);
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `Active pages must not contain time capsule timers: ${violations.join("; ")}`
  );
});

// ============================================================================
// 3. Navigation & Main Application Verification (Experience.tsx)
// ============================================================================

test("3.1 'Gift' or 'Gifts' does NOT appear as a primary tab in the main navigation of Experience.tsx", () => {
  assert.ok(fs.existsSync(EXPERIENCE_PATH), "Experience.tsx must exist");
  const expSource = fs.readFileSync(EXPERIENCE_PATH, "utf8");

  // Verify Experience renders BottomNav as primary unified navigation
  assert.ok(
    expSource.includes("<BottomNav currentTab={tab}"),
    "Experience.tsx must render BottomNav navigation element"
  );
  const bottomNavPath = path.resolve(process.cwd(), "src/components/shared/BottomNav.tsx");
  const navContent = fs.readFileSync(bottomNavPath, "utf8");

  // Assert neither "Gift" nor "Gifts" is present in tab labels
  const hasGiftTab = /["'`]Gifts?["'`]/i.test(navContent);
  assert.ok(
    !hasGiftTab,
    `Navigation must NOT contain 'Gift' or 'Gifts' tab! Found: ${navContent}`
  );
});

test("3.2 'Study' and 'Games' are present as primary tabs in Experience.tsx", () => {
  const expSource = fs.readFileSync(EXPERIENCE_PATH, "utf8");
  assert.ok(
    expSource.includes("<BottomNav currentTab={tab}"),
    "Experience.tsx must render BottomNav navigation element"
  );
  const bottomNavPath = path.resolve(process.cwd(), "src/components/shared/BottomNav.tsx");
  const navContent = fs.readFileSync(bottomNavPath, "utf8");

  assert.ok(
    navContent.includes('"Study"'),
    `Navigation must include 'Study' tab! Found: ${navContent}`
  );
  assert.ok(
    navContent.includes('"Games"'),
    `Navigation must include 'Games' tab! Found: ${navContent}`
  );
});

test("3.3 GiftGrid is not rendered in the main active tabs of Experience.tsx", () => {
  const expSource = fs.readFileSync(EXPERIENCE_PATH, "utf8");

  // Verify that GiftGrid is not rendered in any active tab block (e.g. tab === "games" or tab === "gifts")
  const hasGiftGridInTabs = /tab\s*===\s*["'](?:games|gifts?)["'][\s\S]*?<GiftGrid/i.test(expSource) || /<GiftGrid\s*\/?>/.test(expSource);

  assert.ok(
    !hasGiftGridInTabs,
    "GiftGrid must not be rendered within main active tabs of Experience.tsx"
  );
});
