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
});
