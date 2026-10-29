import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Passcode Landing Page UI, Mobile Responsiveness & Favicon Audit", () => {
  const compPath = path.resolve(process.cwd(), "src/components/PasscodeGate.tsx");
  const cssPath = path.resolve(process.cwd(), "src/components/passcode-gate.css");
  const layoutPath = path.resolve(process.cwd(), "src/app/layout.tsx");

  it("PasscodeGate component exists and renders romantic editorial elements", () => {
    assert.ok(fs.existsSync(compPath), "PasscodeGate.tsx must exist");
    const src = fs.readFileSync(compPath, "utf-8");

    // Recipient & Title
    assert.ok(src.includes("Meerah"), "Must contain recipient name Meerah");
    assert.ok(src.includes("A note for <i>Meerah</i>"), "Must format heading as 'A note for Meerah'");
    assert.ok(src.includes("A little birthday world"), "Must include kicker");
    assert.ok(src.includes("سالگرہ کا تحفہ"), "Must include Urdu subtitle in kicker");

    // Accessible Form Controls
    assert.ok(src.includes('htmlFor="passcode-input"'), "Must link accessible label to input");
    assert.ok(src.includes('id="passcode-input"'), "Input must have matching ID");
    assert.ok(src.includes('inputMode="numeric"'), "Must use numeric inputmode for mobile keyboards");
    assert.ok(src.includes('autoComplete="one-time-code"'), "Must support one-time-code autocomplete");
    assert.ok(src.includes("showPasscode"), "Must provide password show/hide visibility toggle");

    // CTA & Loading State
    assert.ok(src.includes("Open your birthday world"), "Must feature primary action button");
    assert.ok(src.includes("Opening your world..."), "Must provide active loading state text");
    assert.ok(src.includes("disabled={loading}"), "Must disable button while verifying to prevent double submit");

    // Inline Error
    assert.ok(src.includes('role="alert"'), "Error state must use alert role");
    assert.ok(src.includes('aria-live="assertive"'), "Error state must announce to screen readers");

    // Footer
    assert.ok(src.includes("Made with love"), "Must feature romantic footer");
    assert.ok(src.includes("بنایا محبت سے"), "Must include Urdu translated footer note");
  });

  it("passcode-gate.css defines mobile-first responsive tokens and media queries", () => {
    assert.ok(fs.existsSync(cssPath), "passcode-gate.css must exist");
    const css = fs.readFileSync(cssPath, "utf-8");

    // Viewport containment & overflow safety
    assert.ok(css.includes("overflow-x: hidden"), "Must prevent horizontal overflow");
    assert.ok(css.includes("min-height: 100vh") || css.includes("min-height: 100dvh"), "Must occupy full viewport height");

    // Touch targets >= 44px
    assert.ok(css.includes("height: 52px") || css.includes("min-height: 48px"), "Inputs and buttons must have >= 44px touch targets");

    // Compact mobile breakpoint (320px - 360px)
    assert.ok(css.includes("@media (max-width: 360px)"), "Must support compact 360px and 320px screens");

    // Short landscape mobile screens
    assert.ok(css.includes("@media (max-height: 650px) and (orientation: landscape)"), "Must support short landscape mobile viewports");

    // Accessibility motion safety
    assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"), "Must respect prefers-reduced-motion");
  });

  it("Favicon, app icons, and web manifest assets exist and are valid", () => {
    const iconSvg = path.resolve(process.cwd(), "public/icon.svg");
    const faviconIco = path.resolve(process.cwd(), "public/favicon.ico");
    const appleIcon = path.resolve(process.cwd(), "public/apple-icon.png");
    const manifest = path.resolve(process.cwd(), "public/manifest.json");

    assert.ok(fs.existsSync(iconSvg), "public/icon.svg must exist");
    assert.ok(fs.existsSync(faviconIco), "public/favicon.ico must exist");
    assert.ok(fs.existsSync(appleIcon), "public/apple-icon.png must exist");
    assert.ok(fs.existsSync(manifest), "public/manifest.json must exist");

    const svgContent = fs.readFileSync(iconSvg, "utf-8");
    assert.ok(svgContent.includes("<svg"), "icon.svg must be a valid SVG document");
    assert.ok(svgContent.includes("bgGlow"), "icon.svg must include branded glow");

    const manifestJson = JSON.parse(fs.readFileSync(manifest, "utf-8"));
    assert.equal(manifestJson.name, "A Birthday World for Meerah");
    assert.equal(manifestJson.theme_color, "#4A1525");
  });

  it("src/app/layout.tsx defines canonical metadata, viewport, and icon links", () => {
    assert.ok(fs.existsSync(layoutPath), "layout.tsx must exist");
    const layoutSrc = fs.readFileSync(layoutPath, "utf-8");

    assert.ok(layoutSrc.includes("/icon.svg"), "Metadata must link /icon.svg");
    assert.ok(layoutSrc.includes("/favicon.ico"), "Metadata must link /favicon.ico");
    assert.ok(layoutSrc.includes("/apple-icon.png"), "Metadata must link /apple-icon.png");
    assert.ok(layoutSrc.includes("/manifest.json"), "Metadata must link /manifest.json");
    assert.ok(layoutSrc.includes("themeColor"), "Metadata must declare themeColor");
    assert.ok(layoutSrc.includes("Meerah"), "Title must include Meerah");
  });
});

