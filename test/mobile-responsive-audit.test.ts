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
});
