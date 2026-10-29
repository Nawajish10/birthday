import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * ============================================================================
 * FOOTER & NAVIGATION DEDUPLICATION VERIFICATION SUITE (Agent H)
 * ============================================================================
 *
 * Verifies that the duplicated navigation/footer bars have been consolidated
 * into EXACTLY ONE primary, preferred, larger navigation bar (BottomNav):
 *   1. Redundant <nav className="tabs"> removed from Experience.tsx shell.
 *   2. Exactly 1 navigation bar (BottomNav) rendered across desktop & mobile.
 *   3. All 7 required destinations defined with icons, labels, and ariaLabels.
 *   4. BottomNav is never hidden on desktop (display: none rule removed).
 *   5. Bottom clearance padding is properly configured (padding-bottom clamp).
 *   6. Conflicting mobile fixed positioning removed from styles.css.
 *   7. Love theme tokens and glassmorphism backdrop-blur verified.
 */

const ROOT_DIR = process.cwd();
const EXPERIENCE_PATH = path.resolve(ROOT_DIR, "src/components/Experience.tsx");
const BOTTOM_NAV_PATH = path.resolve(ROOT_DIR, "src/components/shared/BottomNav.tsx");
const BOTTOM_NAV_CSS_PATH = path.resolve(ROOT_DIR, "src/components/shared/bottom-nav.css");
const STYLES_CSS_PATH = path.resolve(ROOT_DIR, "src/app/styles.css");

// ============================================================================
// 1. Navigation Deduplication in Experience.tsx
// ============================================================================

test("1.1 Exactly ONE primary navigation element is rendered in Experience.tsx", () => {
  assert.ok(fs.existsSync(EXPERIENCE_PATH), "Experience.tsx must exist");
  const expSource = fs.readFileSync(EXPERIENCE_PATH, "utf8");

  // Redundant top tabs nav must be completely removed
  assert.ok(
    !expSource.includes('<nav className="tabs"'),
    "Experience.tsx must NOT contain redundant <nav className=\"tabs\"> element"
  );

  // BottomNav component must be rendered as the primary navigation bar
  assert.ok(
    expSource.includes("<BottomNav currentTab={tab}"),
    "Experience.tsx must render <BottomNav currentTab={tab} onSelectTab=... />"
  );

  // Exactly one BottomNav component instance in Experience.tsx
  const bottomNavOccurrences = (expSource.match(/<BottomNav\b/g) || []).length;
  assert.equal(
    bottomNavOccurrences,
    1,
    `Experience.tsx must contain exactly 1 BottomNav element; found ${bottomNavOccurrences}`
  );

  // Ensure no other raw <nav> elements exist in Experience.tsx
  const rawNavOccurrences = (expSource.match(/<nav\b/g) || []).length;
  assert.equal(
    rawNavOccurrences,
    0,
    `Experience.tsx must contain 0 raw <nav> elements (BottomNav encapsulates the nav); found ${rawNavOccurrences}`
  );
});

test("1.2 Experience.tsx retains the creator workspace footer above BottomNav without nesting navigation", () => {
  const expSource = fs.readFileSync(EXPERIENCE_PATH, "utf8");

  assert.ok(
    expSource.includes("<footer>Made with love · Built for Meerah · <Link href=\"/admin\">Creator workspace</Link></footer>"),
    "Experience.tsx must preserve the creator workspace footer link"
  );

  // Verify footer does not contain duplicate navigation tabs
  const footerMatch = expSource.match(/<footer>([\s\S]*?)<\/footer>/);
  assert.ok(footerMatch, "footer tag must be present");
  assert.ok(
    !footerMatch[1].includes("<nav") && !footerMatch[1].includes("<button"),
    "footer tag must not contain duplicated navigation elements"
  );
});

// ============================================================================
// 2. All 7 Destinations & Full Accessibility in BottomNav.tsx
// ============================================================================

test("2.1 BottomNav defines all 7 required destinations with labels, icons and aria-labels", () => {
  assert.ok(fs.existsSync(BOTTOM_NAV_PATH), "BottomNav.tsx must exist");
  const navSource = fs.readFileSync(BOTTOM_NAV_PATH, "utf8");

  const expectedDestinations: { id: string; label: string; icon: string; ariaLabel: string }[] = [
    { id: "home", label: "Home", icon: "⌂", ariaLabel: "Go to Home" },
    { id: "stories", label: "Memories", icon: "◎", ariaLabel: "Go to Memories" },
    { id: "profile", label: "Profile", icon: "▦", ariaLabel: "Go to Profile" },
    { id: "songs", label: "Music", icon: "♫", ariaLabel: "Go to Music Room" },
    { id: "study", label: "Study", icon: "📖", ariaLabel: "Go to Read and Study" },
    { id: "games", label: "Games", icon: "🎮", ariaLabel: "Go to Games Hub" },
    { id: "chat", label: "Chat", icon: "☏", ariaLabel: "Go to Private Chat" },
  ];

  for (const dest of expectedDestinations) {
    assert.ok(
      navSource.includes(`id: "${dest.id}"`),
      `BottomNav destinations must include id: "${dest.id}"`
    );
    assert.ok(
      navSource.includes(`label: "${dest.label}"`),
      `BottomNav destinations must include label: "${dest.label}"`
    );
    assert.ok(
      navSource.includes(`icon: "${dest.icon}"`),
      `BottomNav destinations must include icon: "${dest.icon}"`
    );
    assert.ok(
      navSource.includes(`ariaLabel: "${dest.ariaLabel}"`),
      `BottomNav destinations must include ariaLabel: "${dest.ariaLabel}"`
    );
  }
});

test("2.2 BottomNav accessibility, ARIA roles, active state indicator, and touch targets", () => {
  const navSource = fs.readFileSync(BOTTOM_NAV_PATH, "utf8");

  // ARIA Landmark & Structure
  assert.ok(navSource.includes('role="navigation"'), "BottomNav root must have role='navigation'");
  assert.ok(navSource.includes('aria-label="Application Navigation"'), "BottomNav root must have accessible label");
  assert.ok(navSource.includes('role="menubar"'), "BottomNav list must have role='menubar'");
  assert.ok(navSource.includes('role="menuitem"'), "BottomNav buttons must have role='menuitem'");

  // Active state semantics
  assert.ok(
    navSource.includes('aria-current={isActive ? "page" : undefined}'),
    "BottomNav buttons must indicate active page via aria-current"
  );
  assert.ok(
    navSource.includes("bottom-nav-active-pill"),
    "BottomNav must render active pill indicator when tab is selected"
  );

  // Tab selection callback
  assert.ok(
    navSource.includes("onClick={() => onSelectTab(dest.id)}"),
    "BottomNav buttons must trigger onSelectTab with destination id"
  );
});

// ============================================================================
// 3. Layout, Clearance & Responsive Styles in bottom-nav.css and styles.css
// ============================================================================

test("3.1 bottom-nav.css defines fixed bottom bar visible across both desktop and mobile", () => {
  assert.ok(fs.existsSync(BOTTOM_NAV_CSS_PATH), "bottom-nav.css must exist");
  const css = fs.readFileSync(BOTTOM_NAV_CSS_PATH, "utf8");

  // Fixed position at bottom
  assert.ok(css.includes("position: fixed;"), "bottom-nav-container must be position: fixed");
  assert.ok(css.includes("bottom: 0;"), "bottom-nav-container must be positioned at bottom: 0");
  assert.ok(
    css.includes("z-index: 1000;") || css.includes("z-index: 999;"),
    "bottom-nav-container must have high z-index (1000/999)"
  );

  // Backdrop blur glassmorphism & safe area
  assert.ok(css.includes("backdrop-filter: blur(20px);"), "bottom-nav-container must have backdrop-filter blur");
  assert.ok(css.includes("env(safe-area-inset-bottom)"), "bottom-nav-container must respect safe-area-inset-bottom");

  // Desktop visibility: MUST NOT be hidden on desktop!
  assert.ok(
    !css.includes("@media (min-width: 769px) {\n  .bottom-nav-container {\n    display: none !important;"),
    "bottom-nav.css must NOT hide .bottom-nav-container on desktop"
  );
  assert.ok(
    !css.includes(".bottom-nav-container {\n    display: none"),
    "bottom-nav-container must never be display: none"
  );

  // Desktop enhancements present
  assert.ok(
    css.includes("@media (min-width: 769px)"),
    "bottom-nav.css must define desktop responsive enhancements"
  );
  assert.ok(
    css.includes("max-width: 680px;"),
    "bottom-nav-list must expand comfortably to max-width: 680px on desktop"
  );
});

test("3.2 Bottom clearance padding is applied so content is never obscured", () => {
  const css = fs.readFileSync(BOTTOM_NAV_CSS_PATH, "utf8");

  // Clearance class
  assert.ok(
    css.includes(".shell-content-with-bottom-nav"),
    "bottom-nav.css must define .shell-content-with-bottom-nav clearance class"
  );
  assert.ok(
    css.includes("padding-bottom: clamp(72px, 10vw, 96px) !important;"),
    "padding-bottom clamp(72px, 10vw, 96px) must be applied to prevent content overlap"
  );

  // Shell and footer clearance
  assert.ok(
    css.includes(".shell {"),
    "bottom-nav.css must define .shell bottom clearance"
  );
  assert.ok(
    css.includes(".shell > footer {"),
    "bottom-nav.css must define .shell > footer margin clearance"
  );
});

test("3.3 styles.css does NOT contain conflicting mobile fixed positioning for .tabs", () => {
  assert.ok(fs.existsSync(STYLES_CSS_PATH), "styles.css must exist");
  const globalCss = fs.readFileSync(STYLES_CSS_PATH, "utf8");

  // Conflicting mobile fixed tabs style must be absent
  assert.ok(
    !globalCss.includes(".tabs{position:fixed;z-index:30;left:0;right:0;bottom:0;"),
    "styles.css must NOT set .tabs to position: fixed at bottom: 0 on mobile"
  );
});

test("3.4 Love theme integration in bottom-nav.css", () => {
  const css = fs.readFileSync(BOTTOM_NAV_CSS_PATH, "utf8");

  assert.ok(
    css.includes('[data-theme="love"] .bottom-nav-container'),
    "bottom-nav.css must define [data-theme='love'] theme container styles"
  );
  assert.ok(
    css.includes('[data-theme="love"] .bottom-nav-btn.active'),
    "bottom-nav.css must define [data-theme='love'] active tab styles"
  );
  assert.ok(
    css.includes('[data-theme="love"] .bottom-nav-active-pill'),
    "bottom-nav.css must define [data-theme='love'] active pill styling"
  );
});
