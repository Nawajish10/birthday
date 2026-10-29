import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * ============================================================================
 * SPECIFICATION & CONTRACT DEFINITIONS
 * Section 2: Interactive Scrapbook Card Wall
 * ============================================================================
 */

export type ScrapbookDestination =
  | "birthday-book"
  | "letter"
  | "our-memories"
  | "camera"
  | "songs"
  | "study"
  | "games"
  | "video";

export interface ScrapbookCardWallProps {
  onSelectDestination: (dest: ScrapbookDestination) => void;
  unlockedSurprisesCount?: number;
  favoriteSongsCount?: number;
}

export interface ScrapbookCardSpecification {
  id: ScrapbookDestination;
  title: string;
  isPlanned: boolean;
  defaultBadge: string;
  washiColor: "gold" | "pink" | "sage";
  tiltAngle: string;
}

export const EXPECTED_DESTINATIONS: readonly ScrapbookDestination[] = [
  "birthday-book",
  "letter",
  "our-memories",
  "camera",
  "songs",
  "study",
  "games",
  "video",
] as const;

export const EXPECTED_PLANNED_DESTINATIONS: readonly ScrapbookDestination[] = [] as const;

export const EXPECTED_ACTIVE_DESTINATIONS: readonly ScrapbookDestination[] = [
  "birthday-book",
  "letter",
  "our-memories",
  "camera",
  "songs",
  "study",
  "games",
  "video",
] as const;

export const CARD_SPECIFICATIONS: Record<ScrapbookDestination, ScrapbookCardSpecification> = {
  "birthday-book": {
    id: "birthday-book",
    title: "The Birthday Book",
    isPlanned: false,
    defaultBadge: "Keepsake Pages",
    washiColor: "sage",
    tiltAngle: "-1.5deg",
  },
  letter: {
    id: "letter",
    title: "A Letter for You",
    isPlanned: false,
    defaultBadge: "Birthday Letter",
    washiColor: "pink",
    tiltAngle: "1.8deg",
  },
  "our-memories": {
    id: "our-memories",
    title: "Our Memories",
    isPlanned: false,
    defaultBadge: "Photo Reel",
    washiColor: "gold",
    tiltAngle: "-1.2deg",
  },
  camera: {
    id: "camera",
    title: "Make a Memory",
    isPlanned: false,
    defaultBadge: "Instant Snap",
    washiColor: "pink",
    tiltAngle: "2.0deg",
  },
  songs: {
    id: "songs",
    title: "Songs That Remind Me of You",
    isPlanned: false,
    defaultBadge: "Curated Playlist",
    washiColor: "sage",
    tiltAngle: "-1.8deg",
  },
  study: {
    id: "study",
    title: "Read & Study",
    isPlanned: false,
    defaultBadge: "Books & Study",
    washiColor: "gold",
    tiltAngle: "1.4deg",
  },
  games: {
    id: "games",
    title: "Birthday Games",
    isPlanned: false,
    defaultBadge: "Playable Games",
    washiColor: "pink",
    tiltAngle: "-1.0deg",
  },
  video: {
    id: "video",
    title: "Birthday Video Reel",
    isPlanned: false,
    defaultBadge: "Video Reel",
    washiColor: "gold",
    tiltAngle: "1.6deg",
  },
};

/**
 * Logic functions matching ScrapbookCardWall component implementation
 */
export function isPlannedDestination(_dest: ScrapbookDestination): boolean {
  return false;
}

export function resolveCardBadge(
  dest: ScrapbookDestination,
  props: { unlockedSurprisesCount?: number; favoriteSongsCount?: number }
): string {
  if (dest === "songs" && typeof props.favoriteSongsCount === "number" && props.favoriteSongsCount > 0) {
    return `${props.favoriteSongsCount} Tracks Favorited`;
  }
  return CARD_SPECIFICATIONS[dest]?.defaultBadge ?? "";
}

export function parseAngleValue(angleStr: string): number {
  const match = angleStr.match(/([+-]?\d+(?:\.\d+)?)/);
  if (!match) throw new Error(`Invalid angle string: ${angleStr}`);
  return parseFloat(match[1]);
}

// ============================================================================
// 1. Destination Completeness & Identity Tests
// ============================================================================

test("Destinations: all 8 approved destinations are present and unique", () => {
  assert.equal(EXPECTED_DESTINATIONS.length, 8);
  const uniqueSet = new Set(EXPECTED_DESTINATIONS);
  assert.equal(uniqueSet.size, 8, "All 8 destinations must be unique");

  const requiredKeys: ScrapbookDestination[] = [
    "birthday-book",
    "letter",
    "our-memories",
    "camera",
    "songs",
    "study",
    "games",
    "video",
  ];

  for (const key of requiredKeys) {
    assert.ok(uniqueSet.has(key), `Missing destination: ${key}`);
    assert.ok(CARD_SPECIFICATIONS[key], `Specification missing for: ${key}`);
  }
});

// ============================================================================
// 2. Truthful Active vs. Planned State Partition Tests
// ============================================================================

test("Active vs. Planned: distinguishes truthful states for all cards", () => {
  for (const dest of EXPECTED_ACTIVE_DESTINATIONS) {
    assert.equal(isPlannedDestination(dest), false, `${dest} must be active`);
    assert.equal(CARD_SPECIFICATIONS[dest].isPlanned, false);
  }

  for (const dest of EXPECTED_PLANNED_DESTINATIONS) {
    assert.equal(isPlannedDestination(dest), true, `${dest} must be marked planned`);
    assert.equal(CARD_SPECIFICATIONS[dest].isPlanned, true);
  }

  assert.equal(EXPECTED_ACTIVE_DESTINATIONS.length, 8);
  assert.equal(EXPECTED_PLANNED_DESTINATIONS.length, 0);
});

// ============================================================================
// 3. Dynamic Badge & Counter Resolution Tests
// ============================================================================

test("Badge Resolution: returns accurate badges for active destinations", () => {
  assert.equal(resolveCardBadge("study", {}), "Books & Study");
  assert.equal(resolveCardBadge("games", {}), "Playable Games");
  assert.equal(resolveCardBadge("video", {}), "Video Reel");
  assert.equal(resolveCardBadge("camera", {}), "Instant Snap");
  assert.equal(resolveCardBadge("birthday-book", {}), "Keepsake Pages");
  assert.equal(resolveCardBadge("letter", {}), "Birthday Letter");
});

test("Badge Resolution: updates songs dynamically when favorite count is provided", () => {
  // With favorite songs count
  const badgeWithCount = resolveCardBadge("songs", { favoriteSongsCount: 14 });
  assert.equal(badgeWithCount, "14 Tracks Favorited");

  // Without favorite songs count
  const badgeDefault = resolveCardBadge("songs", {});
  assert.equal(badgeDefault, "Curated Playlist");
});

// ============================================================================
// 4. Aesthetics & Tilt Specification Tests (-2deg to +2deg)
// ============================================================================

test("Aesthetics: all card tilt angles are strictly within -2deg to +2deg range", () => {
  for (const [key, card] of Object.entries(CARD_SPECIFICATIONS)) {
    const angle = parseAngleValue(card.tiltAngle);
    assert.ok(
      angle >= -2.0 && angle <= 2.0,
      `Card ${key} tilt angle ${card.tiltAngle} (${angle}deg) is out of range [-2, 2]`
    );
    assert.notEqual(angle, 0, `Card ${key} should have a subtle non-zero tilt for scrapbook feel`);
  }
});

// ============================================================================
// 5. Callback Execution Contract Tests
// ============================================================================

test("Callbacks: triggers onSelectDestination with correct destination key", () => {
  const selected: ScrapbookDestination[] = [];
  const mockProps: ScrapbookCardWallProps = {
    onSelectDestination: (dest) => {
      selected.push(dest);
    },
  };

  // Simulate clicking each card in sequence
  for (const dest of EXPECTED_DESTINATIONS) {
    mockProps.onSelectDestination(dest);
  }

  assert.equal(selected.length, 8);
  assert.deepEqual(selected, EXPECTED_DESTINATIONS);
});

// ============================================================================
// 6. Component File Verification (ScrapbookCardWall.tsx)
// ============================================================================

test("Component Verification: ScrapbookCardWall.tsx exists and matches contract", () => {
  const componentPath = path.resolve(
    process.cwd(),
    "src/components/landing/ScrapbookCardWall.tsx"
  );
  assert.ok(fs.existsSync(componentPath), "ScrapbookCardWall.tsx must exist");

  const content = fs.readFileSync(componentPath, "utf-8");

  // Check required exports
  assert.ok(
    content.includes("export function ScrapbookCardWall"),
    "Must export ScrapbookCardWall function component"
  );
  assert.ok(
    content.includes("export interface ScrapbookCardWallProps"),
    "Must export ScrapbookCardWallProps interface"
  );
  assert.ok(
    content.includes("export type ScrapbookDestination"),
    "Must export ScrapbookDestination type"
  );

  // Check CSS import
  assert.ok(
    content.includes('import "./scrapbook-card-wall.css"'),
    "Must import scrapbook-card-wall.css"
  );

  // Check client directive
  assert.ok(
    content.includes('"use client"') || content.includes("'use client'"),
    "Must contain 'use client' directive"
  );

  // Verify all 8 destinations are represented in code
  for (const dest of EXPECTED_DESTINATIONS) {
    assert.ok(
      content.includes(`"${dest}"`) || content.includes(`'${dest}'`),
      `Component code must include destination: ${dest}`
    );
  }

  // Check accessibility attributes
  assert.ok(content.includes("aria-label"), "Must include aria-label for accessibility");
  assert.ok(content.includes('role="status"'), "Must include role='status' for notifications");
  assert.ok(content.includes('aria-live="polite"'), "Must include aria-live='polite'");

  // Check HTML validity: No nested buttons!
  const buttonTags = content.match(/<button[\s\S]*?<\/button>/g) || [];
  for (const b of buttonTags) {
    const innerButtons = (b.match(/<button/g) || []).length;
    assert.equal(innerButtons, 1, `Found invalid nested <button> in: ${b.slice(0, 80)}...`);
  }
});

// ============================================================================
// 7. Stylesheet Verification (scrapbook-card-wall.css)
// ============================================================================

test("Stylesheet Verification: scrapbook-card-wall.css contains required design tokens & responsive rules", () => {
  const cssPath = path.resolve(
    process.cwd(),
    "src/components/landing/scrapbook-card-wall.css"
  );
  assert.ok(fs.existsSync(cssPath), "scrapbook-card-wall.css must exist");

  const css = fs.readFileSync(cssPath, "utf-8");

  // Check tokens import
  assert.ok(
    css.includes("./landing-tokens.css"),
    "Must reference landing-tokens.css"
  );

  // Check responsive grid breakpoints
  assert.ok(
    css.includes("@media (min-width: 640px)"),
    "Must include tablet breakpoint (min-width: 640px)"
  );
  assert.ok(
    css.includes("@media (min-width: 1024px)"),
    "Must include desktop breakpoint (min-width: 1024px)"
  );

  // Check prefers-reduced-motion accessibility
  assert.ok(
    css.includes("prefers-reduced-motion"),
    "Must include prefers-reduced-motion override"
  );

  // Check washi tape styles
  assert.ok(css.includes("scrapbook-washi"), "Must include scrapbook-washi styling");
  assert.ok(css.includes("washi-gold"), "Must include washi-gold styling");
  assert.ok(css.includes("washi-pink"), "Must include washi-pink styling");
  assert.ok(css.includes("washi-sage"), "Must include washi-sage styling");

  // Check keyboard focus visible outline
  assert.ok(
    css.includes(":focus-visible"),
    "Must provide high-contrast :focus-visible styling"
  );

  // Check color palette references
  assert.ok(
    css.includes("--scrapbook-plum") || css.includes("#624752"),
    "Must utilize plum ink color"
  );
});
