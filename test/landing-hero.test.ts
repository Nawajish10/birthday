import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// ============================================================================
// Core Prop Fallback Logic (mirrors and tests contract from HeroSection)
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
// Test Suite 1: Default Prop Fallback Contract
// ============================================================================

test("Prop fallback: defaults recipient to 'Meerah' when undefined or empty", () => {
  const result1 = resolveHeroProps({});
  assert.equal(result1.recipientName, "Meerah");

  const result2 = resolveHeroProps({ recipientName: undefined });
  assert.equal(result2.recipientName, "Meerah");

  const result3 = resolveHeroProps({ recipientName: "   " });
  assert.equal(result3.recipientName, "Meerah");

  const resultCustom = resolveHeroProps({ recipientName: "Ameera" });
  assert.equal(resultCustom.recipientName, "Ameera");
});

test("Prop fallback: defaults birthdayDate to 'October 30' when undefined or empty", () => {
  const result1 = resolveHeroProps({});
  assert.equal(result1.birthdayDate, "October 30");

  const result2 = resolveHeroProps({ birthdayDate: undefined });
  assert.equal(result2.birthdayDate, "October 30");

  const result3 = resolveHeroProps({ birthdayDate: "   " });
  assert.equal(result3.birthdayDate, "October 30");

  const resultCustom = resolveHeroProps({ birthdayDate: "November 5" });
  assert.equal(resultCustom.birthdayDate, "November 5");
});

test("Prop fallback: preserves onOpenWorld callback and avatarUrl if provided", () => {
  let opened = false;
  const mockOnOpen = () => {
    opened = true;
  };
  const result = resolveHeroProps({
    onOpenWorld: mockOnOpen,
    avatarUrl: "https://example.com/meerah.jpg",
  });

  assert.equal(typeof result.onOpenWorld, "function");
  result.onOpenWorld?.();
  assert.equal(opened, true);
  assert.equal(result.avatarUrl, "https://example.com/meerah.jpg");
});

// ============================================================================
// Test Suite 2: Component Structure & Source Verification (HeroSection.tsx)
// ============================================================================

const heroSectionFilePath = path.resolve(
  process.cwd(),
  "src/components/landing/HeroSection.tsx"
);

test("Component source verification: HeroSection.tsx exists and exports required types and function", () => {
  assert.ok(
    fs.existsSync(heroSectionFilePath),
    "HeroSection.tsx must exist in src/components/landing/"
  );

  const content = fs.readFileSync(heroSectionFilePath, "utf-8");

  // Export checks
  assert.ok(
    content.includes("export function HeroSection"),
    "Must export HeroSection function component"
  );
  assert.ok(
    content.includes("export interface HeroSectionProps"),
    "Must export HeroSectionProps interface"
  );
  assert.ok(
    content.includes("DEFAULT_RECIPIENT_NAME"),
    "Must export DEFAULT_RECIPIENT_NAME"
  );
  assert.ok(
    content.includes("DEFAULT_BIRTHDAY_DATE"),
    "Must export DEFAULT_BIRTHDAY_DATE"
  );
  assert.ok(
    content.includes("DEFAULT_URDU_BLESSING"),
    "Must export DEFAULT_URDU_BLESSING"
  );
});

test("HeroSection content: expressive serif heading and personalized greeting", () => {
  const content = fs.readFileSync(heroSectionFilePath, "utf-8");

  // Heading check
  assert.ok(
    content.includes("Today is all <em>yours</em>"),
    "Heading must include expressive serif phrasing 'Today is all yours'"
  );
  assert.ok(
    content.includes("A little world, made with love"),
    "Subheading must include 'A little world, made with love'"
  );
});

test("HeroSection content: kicker includes celebration mark, date, and Urdu greeting", () => {
  const content = fs.readFileSync(heroSectionFilePath, "utf-8");

  // Kicker mark & text
  assert.ok(
    content.includes("✿"),
    "Kicker must include celebration floral mark ✿"
  );
  assert.ok(
    content.includes("BIRTHDAY"),
    "Kicker must include 'BIRTHDAY'"
  );
  assert.ok(
    content.includes("activeDate.toUpperCase()"),
    "Kicker must uppercase the birthday date"
  );
  assert.ok(
    content.includes("سالگرہ مبارک"),
    "Kicker must include Urdu celebration 'سالگرہ مبارک'"
  );
});

// ============================================================================
// Test Suite 3: Urdu Text Direction and Language Attributes
// ============================================================================

test("Urdu typography: renders with lang='ur' and dir='rtl' attributes", () => {
  const content = fs.readFileSync(heroSectionFilePath, "utf-8");

  // Look for lang="ur" and dir="rtl"
  const hasLangUr = content.includes('lang="ur"');
  const hasDirRtl = content.includes('dir="rtl"');

  assert.ok(hasLangUr, "Must provide lang='ur' for correct language tagging");
  assert.ok(hasDirRtl, "Must provide dir='rtl' for correct right-to-left rendering");

  // Verify exact required Urdu copy
  assert.ok(
    content.includes("تمہاری سالگرہ کا ہر لمحہ محبت اور روشنی سے بھرا رہے"),
    "Must include exact Urdu blessing: 'تمہاری سالگرہ کا ہر لمحہ محبت اور روشنی سے بھرا رہے'"
  );
});

// ============================================================================
// Test Suite 4: Floral Motifs Presence in Markup/SVG
// ============================================================================

test("Floral motifs: wreath contains sunflowers, pink roses, and white flowers", () => {
  const content = fs.readFileSync(heroSectionFilePath, "utf-8");

  // Sunflower motif
  assert.ok(
    content.includes('data-motif="sunflower"'),
    "Floral wreath must contain sunflower motif"
  );
  assert.ok(
    content.includes("#F1C75B"),
    "Sunflower motif must use gold color #F1C75B"
  );

  // Pink rose motif
  assert.ok(
    content.includes('data-motif="rose"'),
    "Floral wreath must contain pink rose motif"
  );
  assert.ok(
    content.includes("#D4798D") && content.includes("#F8E8EC"),
    "Rose motif must use rose tones #D4798D and #F8E8EC"
  );

  // White flower (daisy / jasmine) motif
  assert.ok(
    content.includes('data-motif="white-flower"'),
    "Floral wreath must contain white flower motif"
  );
  assert.ok(
    content.includes("#FFFFFF"),
    "White flower motif must use white color #FFFFFF"
  );

  // Sage green foliage
  assert.ok(
    content.includes("#376E58") || content.includes("#E5EDE2"),
    "Floral wreath must include sage foliage accents"
  );
});

test("Decorative elements: lightweight floating petals and sparkles are aria-hidden", () => {
  const content = fs.readFileSync(heroSectionFilePath, "utf-8");

  assert.ok(
    content.includes('className="hero-petals-container" aria-hidden="true"'),
    "Floating petals container must be aria-hidden='true'"
  );
  assert.ok(
    content.includes("petal-sunflower"),
    "Floating petals must include sunflower petal"
  );
  assert.ok(
    content.includes("petal-rose"),
    "Floating petals must include rose petal"
  );
});

// ============================================================================
// Test Suite 5: Call-to-Action Contract & Accessibility Attributes
// ============================================================================

test("CTA button: contract, onClick binding, and accessibility semantics", () => {
  const content = fs.readFileSync(heroSectionFilePath, "utf-8");

  // Button contract
  assert.ok(
    content.includes('type="button"'),
    "CTA must specify explicit type='button'"
  );
  assert.ok(
    content.includes("onClick={onOpenWorld}"),
    "CTA button must bind onClick to onOpenWorld"
  );
  assert.ok(
    content.includes('aria-label="Open your little world"'),
    "CTA button must provide aria-label='Open your little world'"
  );
  assert.ok(
    content.includes("Open your little world"),
    "CTA button must contain visible text 'Open your little world'"
  );
  assert.ok(
    content.includes("↓"),
    "CTA button must contain downward indicator arrow '↓'"
  );

  // Guard against nested interactive elements
  const buttonTags = content.match(/<button[\s\S]*?<\/button>/g) || [];
  for (const b of buttonTags) {
    const innerButtons = (b.match(/<button/g) || []).length;
    assert.equal(innerButtons, 1, "Buttons must not be nested");
    assert.equal(b.includes("<a "), false, "Anchor tags must not be nested in button");
  }
});

test("Avatar placeholder & replaceable cameo: supports real avatar photo and symbolic fallback", () => {
  const content = fs.readFileSync(heroSectionFilePath, "utf-8");

  // Avatar frame testid
  assert.ok(
    content.includes('data-testid="hero-avatar-frame"'),
    "Cameo frame must provide data-testid='hero-avatar-frame'"
  );

  // Symbolic SVG fallback
  assert.ok(
    content.includes("hero-symbolic-silhouette"),
    "Must provide symbolic 2D avatar silhouette SVG"
  );

  // Real avatar support with onError fallback
  assert.ok(
    content.includes("onError={() => setAvatarError(true)}"),
    "Real avatar image must provide onError fallback handler"
  );
});

// ============================================================================
// Test Suite 6: CSS & Design Tokens Compliance (hero-section.css)
// ============================================================================

const cssFilePath = path.resolve(
  process.cwd(),
  "src/components/landing/hero-section.css"
);

test("CSS verification: hero-section.css exists, imports tokens, and defines required styling", () => {
  assert.ok(
    fs.existsSync(cssFilePath),
    "hero-section.css must exist in src/components/landing/"
  );

  const css = fs.readFileSync(cssFilePath, "utf-8");

  // Tokens import
  assert.ok(
    css.includes('@import "./landing-tokens.css";'),
    "hero-section.css must import landing-tokens.css"
  );

  // Class definitions
  assert.ok(css.includes(".hero-section"), "CSS must define .hero-section");
  assert.ok(css.includes(".hero-card"), "CSS must define .hero-card");
  assert.ok(css.includes(".hero-kicker"), "CSS must define .hero-kicker");
  assert.ok(css.includes(".hero-avatar-cameo-wrapper"), "CSS must define .hero-avatar-cameo-wrapper");
  assert.ok(css.includes(".hero-wreath-svg"), "CSS must define .hero-wreath-svg");
  assert.ok(css.includes(".hero-heading"), "CSS must define .hero-heading");
  assert.ok(css.includes(".hero-urdu-card"), "CSS must define .hero-urdu-card");
  assert.ok(css.includes(".hero-urdu-blessing"), "CSS must define .hero-urdu-blessing");
  assert.ok(css.includes(".hero-cta-button"), "CSS must define .hero-cta-button");

  // Accessibility: Focus visible outline
  assert.ok(
    css.includes(":focus-visible"),
    "CSS must define accessible :focus-visible outline for keyboard navigation"
  );

  // Accessibility: prefers-reduced-motion
  assert.ok(
    css.includes("@media (prefers-reduced-motion: reduce)"),
    "CSS must include prefers-reduced-motion media query"
  );
  assert.ok(
    css.includes("animation: none !important"),
    "CSS must disable animations in prefers-reduced-motion mode"
  );

  // Responsive breakpoints
  assert.ok(
    css.includes("@media (max-width: 820px)"),
    "CSS must include tablet breakpoint 820px"
  );
  assert.ok(
    css.includes("@media (max-width: 480px)"),
    "CSS must include mobile breakpoint 480px"
  );

  // Palette compliance
  assert.ok(css.includes("#FFF9EF") || css.includes("--scrapbook-ivory"), "Must use warm ivory");
  assert.ok(css.includes("#F8E8EC") || css.includes("--scrapbook-rose"), "Must use rose pink");
  assert.ok(css.includes("#F1C75B") || css.includes("--scrapbook-sunflower"), "Must use sunflower gold");
  assert.ok(css.includes("#624752") || css.includes("--scrapbook-plum"), "Must use plum ink");
});
