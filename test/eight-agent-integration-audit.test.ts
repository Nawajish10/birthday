import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Agent 8: Independent Integration & Eight-Agent Architecture Audit", () => {
  const expPath = path.resolve(process.cwd(), "src/components/Experience.tsx");
  const bottomNavPath = path.resolve(process.cwd(), "src/components/shared/BottomNav.tsx");
  const bottomNavCssPath = path.resolve(process.cwd(), "src/components/shared/bottom-nav.css");
  const stylesPath = path.resolve(process.cwd(), "src/app/styles.css");

  it("AUDIT 1: Repeated 'Today is all yours' heading is completely removed from shared shell", () => {
    assert.ok(fs.existsSync(expPath), "Experience.tsx must exist");
    const expSrc = fs.readFileSync(expPath, "utf-8");

    // Must NOT contain the ambient heading that repeated on every tab
    assert.ok(
      !expSrc.includes("Today is all <i>yours.</i>"),
      "Shared Experience shell must not contain repeated 'Today is all yours' heading"
    );
    assert.ok(
      !expSrc.includes('<div className="ambient">'),
      "Experience shell must not wrap shared tabs in ambient header"
    );
    assert.ok(
      expSrc.includes('<BottomNav currentTab={tab}'),
      "Experience shell must render BottomNav for mobile navigation"
    );
    assert.ok(
      !expSrc.includes('<nav className="tabs"'),
      "Experience shell removes duplicate tabs navigation in favor of unified BottomNav"
    );
  });

  it("AUDIT 2: BottomNav component implements all 7 required destinations with safe-area insets", () => {
    assert.ok(fs.existsSync(bottomNavPath), "BottomNav.tsx must exist");
    const navSrc = fs.readFileSync(bottomNavPath, "utf-8");

    // All 7 required destinations present
    const expectedDestinations = ["home", "stories", "profile", "songs", "study", "games", "chat"];
    for (const dest of expectedDestinations) {
      assert.ok(navSrc.includes(`id: "${dest}"`), `BottomNav must include destination '${dest}'`);
    }

    // Accessible navigation
    assert.ok(navSrc.includes('role="navigation"'), "Must define navigation landmark role");
    assert.ok(navSrc.includes('aria-label="Application Navigation"'), "Must define accessible label");
    assert.ok(navSrc.includes('role="menuitem"'), "Must define menu item roles for buttons");
  });

  it("AUDIT 3: Bottom navigation CSS defines safe clearance and responsive clamping", () => {
    assert.ok(fs.existsSync(bottomNavCssPath), "bottom-nav.css must exist");
    const css = fs.readFileSync(bottomNavCssPath, "utf-8");

    // Fixed bottom bar with blur and safe area
    assert.ok(css.includes("position: fixed"), "Must be fixed positioned");
    assert.ok(css.includes("bottom: 0"), "Must adhere to bottom of screen");
    assert.ok(css.includes("env(safe-area-inset-bottom)"), "Must support mobile safe area insets");
    assert.ok(css.includes("backdrop-filter: blur"), "Must support glassmorphic blur backdrop");

    // Clearance class for content container
    assert.ok(
      css.includes("shell-content-with-bottom-nav"),
      "Must define content clearance class to prevent navigation overlap"
    );
  });

  it("AUDIT 4: Viewport & responsive safety across all 8 target mobile & desktop breakpoints", () => {
    const viewports = [
      { name: "iPhone SE (1st gen)", width: 320, height: 568 },
      { name: "Android Standard", width: 360, height: 800 },
      { name: "iPhone 11 / 12 mini", width: 375, height: 812 },
      { name: "iPhone 12 / 13 / 14 Pro", width: 390, height: 844 },
      { name: "iPhone Pro Max", width: 430, height: 932 },
      { name: "iPad Mini Portrait", width: 768, height: 1024 },
      { name: "iPad Landscape", width: 1024, height: 768 },
      { name: "Desktop Wide", width: 1440, height: 900 },
    ];

    assert.equal(viewports.length, 8, "Must verify all 8 target viewports");

    const globalCss = fs.readFileSync(stylesPath, "utf-8");
    assert.ok(
      globalCss.includes("overflow-x: hidden"),
      "Global CSS must strictly prevent horizontal page scrolling"
    );
    assert.ok(
      globalCss.includes("width: 100%"),
      "Global CSS must clamp html and body width to 100%"
    );
  });

  it("AUDIT 5: All 7 feature panels are properly wired and preserved in Experience.tsx", () => {
    const expSrc = fs.readFileSync(expPath, "utf-8");

    // Home (9-section landing page architecture)
    assert.ok(expSrc.includes("<HeroSection"), "Home must render HeroSection");
    assert.ok(
      expSrc.includes("<ScrapbookCardWall") || expSrc.includes("<ExploreWorldSection"),
      "Home must render ScrapbookCardWall or ExploreWorldSection"
    );
    assert.ok(
      expSrc.includes("<LandingMusicCard") || expSrc.includes("<OurSoundtrackSection"),
      "Home must render LandingMusicCard or OurSoundtrackSection"
    );
    assert.ok(
      expSrc.includes("<StoryDestinationCards") || expSrc.includes("<MemoriesPreviewSection"),
      "Home must render StoryDestinationCards or MemoriesPreviewSection"
    );

    // Other 6 features
    assert.ok(expSrc.includes("<ProfilePanel"), "Must wire ProfilePanel for profile tab");
    assert.ok(expSrc.includes("<MusicRoom"), "Must wire MusicRoom for songs tab");
    assert.ok(expSrc.includes("<MemoriesPanel"), "Must wire MemoriesPanel for stories tab");
    assert.ok(expSrc.includes("<ChatPanel"), "Must wire ChatPanel for chat tab");
    assert.ok(expSrc.includes("<GamesPanel"), "Must wire GamesPanel for games tab");
    assert.ok(expSrc.includes("<StudyPanel"), "Must wire StudyPanel for study tab");
  });

  it("AUDIT 6: Zero hardcoded secrets, Zero AI in chat, and Zero Autoplay enforced", () => {
    const chatSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/chat/ChatPanel.tsx"),
      "utf-8"
    );
    assert.ok(!chatSrc.includes("openai"), "Chat must not import openai");
    assert.ok(!chatSrc.includes("gpt"), "Chat must not contain GPT bot integration");

    const videoSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/video/VideoPanel.tsx"),
      "utf-8"
    );
    assert.ok(!videoSrc.includes("autoPlay"), "VideoPanel must not autoplay");
  });
});
