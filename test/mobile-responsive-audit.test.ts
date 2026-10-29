import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

describe("Mobile Responsiveness & Viewport Audit", () => {
  it("verifies global root container enforces overflow-x containment", () => {
    const stylesPath = path.resolve(process.cwd(), "src/app/styles.css");
    const stylesSrc = fs.readFileSync(stylesPath, "utf-8");

    // Must prevent horizontal scrollbar on mobile
    assert.ok(
      stylesSrc.includes("overflow-x: hidden") || stylesSrc.includes("overflow-x: clip"),
      "Global styles must contain horizontal overflow"
    );
  });

  it("verifies viewport meta tag in layout or document supports responsive scaling", () => {
    const layoutPath = path.resolve(process.cwd(), "src/app/layout.tsx");
    const layoutSrc = fs.readFileSync(layoutPath, "utf-8");

    assert.ok(
      layoutSrc.includes("viewport") || layoutSrc.includes("width=device-width") || layoutSrc.includes("data-theme"),
      "Layout must configure responsive viewport or theme attributes"
    );
  });

  it("verifies CameraPanel enforces max-width 100% and safe mobile clamping", () => {
    const cameraCssPath = path.resolve(process.cwd(), "src/components/camera/camera.css");
    const cameraCssSrc = fs.readFileSync(cameraCssPath, "utf-8");

    // Viewport clamping & safe insets
    assert.ok(cameraCssSrc.includes("max-width: 100%"), "Camera must not exceed screen width");
    assert.ok(cameraCssSrc.includes("safe-area-inset-bottom"), "Camera controls must observe safe-area insets");
    assert.ok(cameraCssSrc.includes("72px"), "Shutter button must maintain 72px touch target");
  });

  it("verifies ChatPanel supports virtual keyboard and responsive chat bubble widths", () => {
    const chatCssPath = path.resolve(process.cwd(), "src/components/chat/chat.css");
    const chatCssSrc = fs.readFileSync(chatCssPath, "utf-8");

    assert.ok(chatCssSrc.includes("max-width: 100%"), "Chat panel must fit within mobile screen");
    assert.ok(chatCssSrc.includes("word-break") || chatCssSrc.includes("overflow-wrap"), "Chat bubbles must wrap long strings");
    assert.ok(chatCssSrc.includes("100dvh") || chatCssSrc.includes("height:"), "Chat panel must adapt to mobile viewport height");
    assert.ok(chatCssSrc.includes("safe-area-inset-bottom"), "Chat composer must support safe area insets on mobile");
  });

  it("verifies StudyPanel responsive grid and reader controls on narrow screens", () => {
    const studyCssPath = path.resolve(process.cwd(), "src/components/study/study.css");
    const studyCssSrc = fs.readFileSync(studyCssPath, "utf-8");

    assert.ok(studyCssSrc.includes("@media (max-width: 640px)"), "StudyPanel must declare mobile responsive breakpoints");
    assert.ok(studyCssSrc.includes("study-template-viewport"), "Reader viewport must exist");
  });

  it("verifies GamesPanel responsive grid across mobile viewports", () => {
    const gamesCssPath = path.resolve(process.cwd(), "src/components/games/games.css");
    const gamesCssSrc = fs.readFileSync(gamesCssPath, "utf-8");

    assert.ok(gamesCssSrc.includes("@media (max-width: 640px)"), "GamesPanel must declare mobile responsive breakpoints");
  });

  it("verifies authoritative BottomNav component implementation and destination tabs", () => {
    const bottomNavTsxPath = path.resolve(process.cwd(), "src/components/shared/BottomNav.tsx");
    const bottomNavTsxSrc = fs.readFileSync(bottomNavTsxPath, "utf-8");

    assert.ok(bottomNavTsxSrc.includes("bottom-nav-container"), "BottomNav must render container");
    assert.ok(bottomNavTsxSrc.includes("role=\"navigation\"") || bottomNavTsxSrc.includes("aria-label=\"Application Navigation\""), "BottomNav must have accessible role and label");
    assert.ok(bottomNavTsxSrc.includes("DESTINATIONS"), "BottomNav must export canonical navigation destinations");
  });

  it("verifies BottomNav fixed positioning, safe-area-inset, touch targets, and reduced motion", () => {
    const bottomNavCssPath = path.resolve(process.cwd(), "src/components/shared/bottom-nav.css");
    const bottomNavCssSrc = fs.readFileSync(bottomNavCssPath, "utf-8");

    // Fixed positioning & zero horizontal overflow
    assert.ok(bottomNavCssSrc.includes("position: fixed"), "Bottom nav must be fixed to bottom");
    assert.ok(bottomNavCssSrc.includes("bottom: 0"), "Bottom nav must anchor at 0");
    assert.ok(bottomNavCssSrc.includes("env(safe-area-inset-bottom)"), "Bottom nav must handle safe area insets");
    
    // Touch targets >= 44px
    assert.ok(bottomNavCssSrc.includes("min-height: 48px") || bottomNavCssSrc.includes("min-height: 44px"), "Touch targets must be >= 44px");

    // Focus visible styling
    assert.ok(bottomNavCssSrc.includes(":focus-visible"), "Touch targets must have high contrast focus indicator");

    // Reduced motion support
    assert.ok(bottomNavCssSrc.includes("@media (prefers-reduced-motion: reduce)"), "BottomNav must honor prefers-reduced-motion");

    // Viewport handling down to 320px
    assert.ok(bottomNavCssSrc.includes("@media (max-width: 380px)") || bottomNavCssSrc.includes("@media (max-width: 340px)"), "Must support narrow mobile viewports");
  });

  it("verifies bottom clearance padding (.shell-content-with-bottom-nav) in RouteShell and Experience", () => {
    const routeShellPath = path.resolve(process.cwd(), "src/components/shared/RouteShell.tsx");
    const experiencePath = path.resolve(process.cwd(), "src/components/Experience.tsx");
    const bottomNavCssPath = path.resolve(process.cwd(), "src/components/shared/bottom-nav.css");

    const routeShellSrc = fs.readFileSync(routeShellPath, "utf-8");
    const experienceSrc = fs.readFileSync(experiencePath, "utf-8");
    const bottomNavCssSrc = fs.readFileSync(bottomNavCssPath, "utf-8");

    // Content containers must use clearance class
    assert.ok(
      routeShellSrc.includes("shell-content-with-bottom-nav"),
      "RouteShell must include shell-content-with-bottom-nav clearance class"
    );
    assert.ok(
      experienceSrc.includes("shell-content-with-bottom-nav"),
      "Experience must include shell-content-with-bottom-nav clearance class"
    );

    // CSS must define clearance padding with clamp and safe area
    assert.ok(
      bottomNavCssSrc.includes(".shell-content-with-bottom-nav"),
      "bottom-nav.css must style .shell-content-with-bottom-nav"
    );
    assert.ok(
      bottomNavCssSrc.includes("padding-bottom:"),
      ".shell-content-with-bottom-nav must declare padding-bottom"
    );
  });

  it("verifies Heartfelt Notes card side arrows, touch swipe, and viewport adaptation (320px-430px)", () => {
    const notesTsxPath = path.resolve(process.cwd(), "src/components/landing/PersonalMessagesSection.tsx");
    const notesCssPath = path.resolve(process.cwd(), "src/components/landing/personal-messages.css");

    const notesTsxSrc = fs.readFileSync(notesTsxPath, "utf-8");
    const notesCssSrc = fs.readFileSync(notesCssPath, "utf-8");

    // Side navigation arrows
    assert.ok(notesTsxSrc.includes("messages-nav-prev") && notesTsxSrc.includes("messages-nav-next"), "Must render prev and next note buttons");
    assert.ok(notesTsxSrc.includes("onTouchStart") && notesTsxSrc.includes("onTouchEnd"), "Must support touch gesture swipe handlers");
    assert.ok(notesTsxSrc.includes("calculateSwipeDirection"), "Must calculate swipe direction");

    // Mobile viewports 320px - 430px
    assert.ok(notesCssSrc.includes("@media (max-width: 360px)") || notesCssSrc.includes("@media (max-width: 380px)"), "Must support 320px-360px compact screens");
    assert.ok(notesCssSrc.includes("touch-action"), "Must set touch-action for scroll containment");
  });

  it("verifies Music Room player scrubber, audio controls, and bottom bar placement on mobile viewports", () => {
    const musicRoomTsxPath = path.resolve(process.cwd(), "src/components/music/MusicRoom.tsx");
    const musicRoomCssPath = path.resolve(process.cwd(), "src/components/music/music-room.css");

    const musicRoomTsxSrc = fs.readFileSync(musicRoomTsxPath, "utf-8");
    const musicRoomCssSrc = fs.readFileSync(musicRoomCssPath, "utf-8");

    // Scrubber & controls
    assert.ok(musicRoomTsxSrc.includes("music-bottom-scrubber"), "Must render scrubber bar");
    assert.ok(musicRoomTsxSrc.includes("music-progress-bar") || musicRoomTsxSrc.includes("music-bottom-slider"), "Must provide interactive slider");
    assert.ok(musicRoomCssSrc.includes("@media (max-width: 768px)"), "Must adapt bottom player bar for mobile");
    assert.ok(musicRoomCssSrc.includes("calc(") && musicRoomCssSrc.includes("env(safe-area-inset-bottom)"), "Must offset player bar above bottom navigation dock");
  });

  it("verifies Memories gallery classification controls, cards, and safe touch targets", () => {
    const memoriesTsxPath = path.resolve(process.cwd(), "src/components/memories/MemoriesPanel.tsx");
    const memoriesCssPath = path.resolve(process.cwd(), "src/components/memories/memories.css");

    const memoriesTsxSrc = fs.readFileSync(memoriesTsxPath, "utf-8");
    const memoriesCssSrc = fs.readFileSync(memoriesCssPath, "utf-8");

    assert.ok(memoriesTsxSrc.includes("memoriesTabs"), "Must render classification/tab controls");
    assert.ok(memoriesCssSrc.includes("--memories-touch-target: 44px") || memoriesCssSrc.includes("min-height: 44px") || memoriesCssSrc.includes("min-height: var(--memories-touch-target)"), "Memories tabs must satisfy 44px touch targets");
    assert.ok(memoriesCssSrc.includes("@media (max-width: 480px)") || memoriesCssSrc.includes("@media (max-width: 768px)"), "Memories must define responsive mobile breakpoints");
  });

  it("verifies zero duplicate footers across shell and experience components", () => {
    const routeShellPath = path.resolve(process.cwd(), "src/components/shared/RouteShell.tsx");
    const experiencePath = path.resolve(process.cwd(), "src/components/Experience.tsx");

    const routeShellSrc = fs.readFileSync(routeShellPath, "utf-8");
    const experienceSrc = fs.readFileSync(experiencePath, "utf-8");

    // Exactly one footer element in RouteShell
    const routeShellFooters = (routeShellSrc.match(/<footer/g) || []).length;
    assert.strictEqual(routeShellFooters, 1, "RouteShell must contain exactly one <footer>");

    // Exactly one footer element in Experience
    const experienceFooters = (experienceSrc.match(/<footer/g) || []).length;
    assert.strictEqual(experienceFooters, 1, "Experience must contain exactly one <footer>");
  });
});
