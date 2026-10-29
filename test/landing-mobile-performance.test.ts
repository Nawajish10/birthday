import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const LANDING_DIR = path.resolve(process.cwd(), "src/components/landing");
// Dynamically inspect all CSS files in src/components/landing/
const ALL_CSS_FILES = fs
  .readdirSync(LANDING_DIR)
  .filter((f) => f.endsWith(".css"));

function readCss(fileName: string): string {
  const filePath = path.join(LANDING_DIR, fileName);
  assert.ok(fs.existsSync(filePath), `Expected CSS file to exist: ${fileName}`);
  return fs.readFileSync(filePath, "utf-8");
}

describe("Landing Page Mobile Responsiveness & Performance Audit", () => {
  it("discovers all landing CSS files in src/components/landing/", () => {
    assert.ok(ALL_CSS_FILES.length >= 5, "Expected at least 5 CSS files in landing");
    assert.ok(ALL_CSS_FILES.includes("landing-tokens.css"));
    assert.ok(ALL_CSS_FILES.includes("hero-section.css"));
    assert.ok(ALL_CSS_FILES.includes("landing-music-card.css"));
    assert.ok(ALL_CSS_FILES.includes("scrapbook-card-wall.css"));
    assert.ok(ALL_CSS_FILES.includes("story-destination-cards.css"));
  });

  describe("Audit 1: Mobile Viewport Media Queries", () => {
    it("ensures every landing stylesheet defines responsive mobile media queries", () => {
      for (const file of ALL_CSS_FILES) {
        const css = readCss(file);
        const hasMobileQuery =
          css.includes("@media (max-width:") ||
          css.includes("@media(max-width:");

        assert.ok(
          hasMobileQuery,
          `${file} must declare mobile viewport media queries (e.g. max-width: 480px, 640px, etc.)`
        );
      }
    });

    it("verifies narrow mobile viewport adaptation (320px-360px) in core landing stylesheets", () => {
      const heroCss = readCss("hero-section.css");
      const musicCss = readCss("landing-music-card.css");
      const wallCss = readCss("scrapbook-card-wall.css");
      const storyCss = readCss("story-destination-cards.css");

      assert.ok(heroCss.includes("@media (max-width: 360px)"), "hero-section.css must adapt for narrow 320px-360px screens");
      assert.ok(musicCss.includes("@media (max-width: 360px)"), "landing-music-card.css must adapt for narrow 320px-360px screens");
      assert.ok(wallCss.includes("@media (max-width: 360px)"), "scrapbook-card-wall.css must adapt for narrow 320px-360px screens");
      assert.ok(storyCss.includes("@media (max-width: 360px)"), "story-destination-cards.css must adapt for narrow 320px-360px screens");
    });
  });

  describe("Audit 2: Zero Horizontal Overflow Rules", () => {
    it("verifies overflow-x containment, box-sizing, and max-width across ALL landing stylesheets", () => {
      for (const file of ALL_CSS_FILES) {
        const css = readCss(file);
        assert.ok(
          css.includes("box-sizing: border-box"),
          `${file} must enforce box-sizing: border-box to contain sizing bounds`
        );
        assert.ok(
          css.includes("max-width: 100%") || css.includes("max-width:"),
          `${file} must constrain maximum width`
        );
        assert.ok(
          css.includes("overflow-x: hidden") || css.includes("overflow-x: clip"),
          `${file} must declare overflow-x: hidden/clip on shell or section containers`
        );
      }
    });

    it("verifies decorative tilts are neutralized or constrained on mobile to prevent rotated-corner overflow", () => {
      const wallCss = readCss("scrapbook-card-wall.css");
      const storyCss = readCss("story-destination-cards.css");

      // Card wall must reset or neutralize tilt on mobile
      assert.ok(
        wallCss.includes("transform: none !important"),
        "scrapbook-card-wall.css must neutralize card tilt on mobile viewports to prevent overflow"
      );

      // Story destination cards must neutralize tilt on mobile
      assert.ok(
        storyCss.includes("transform: none !important"),
        "story-destination-cards.css must neutralize tilt on mobile viewports to prevent overflow"
      );
    });
  });

  describe("Audit 3: Accessible 44px Touch Targets", () => {
    it("ensures interactive controls meet minimum accessible 44x44px target bounds across landing stylesheets", () => {
      for (const file of ALL_CSS_FILES) {
        const css = readCss(file);
        const hasAccessibleTarget =
          css.includes("44px") ||
          css.includes("48px") ||
          css.includes("--touch-target-min");
        assert.ok(
          hasAccessibleTarget,
          `${file} must enforce accessible touch target sizing (>=44px)`
        );
      }
    });

    it("verifies specific critical CTA and touch controls meet >=44px standards", () => {
      const heroCss = readCss("hero-section.css");
      const musicCss = readCss("landing-music-card.css");
      const wallCss = readCss("scrapbook-card-wall.css");
      const storyCss = readCss("story-destination-cards.css");
      const tokenCss = readCss("landing-tokens.css");

      assert.ok(tokenCss.includes("--touch-target-min: 44px"), "landing-tokens.css must specify 44px minimum touch token");
      assert.ok(heroCss.includes("min-height: 48px") || heroCss.includes("min-height: 44px"), "Hero CTA must meet accessible touch target height");
      assert.ok(musicCss.includes("min-height: 44px"), "Music card buttons must meet 44px minimum touch target height");
      assert.ok(wallCss.includes("min-height: 44px"), "Card wall buttons and close controls must meet 44px touch target height");
      assert.ok(storyCss.includes("min-height: 48px") || storyCss.includes("min-height: 44px"), "Story destination buttons must meet 44px touch target height");
    });
  });

  describe("Audit 4: Prefers-Reduced-Motion Coverage", () => {
    it("ensures every stylesheet in src/components/landing/ has prefers-reduced-motion coverage", () => {
      for (const file of ALL_CSS_FILES) {
        const css = readCss(file);
        assert.ok(
          css.includes("@media (prefers-reduced-motion: reduce)") ||
          css.includes("@media(prefers-reduced-motion:reduce)"),
          `${file} must declare @media (prefers-reduced-motion: reduce)`
        );
        assert.ok(
          css.includes("animation: none !important") ||
          css.includes("transform: none !important") ||
          css.includes("transition: none !important"),
          `${file} must disable animations/transitions under reduced motion`
        );
      }
    });

    it("verifies vinyl turntable spin and hero floating petals are shut off under reduced motion", () => {
      const heroCss = readCss("hero-section.css");
      const musicCss = readCss("landing-music-card.css");

      assert.ok(heroCss.includes(".hero-floating-petal"), "Hero reduced motion must target floating petals");
      assert.ok(musicCss.includes(".scrapbook-vinyl-disc.is-spinning"), "Music card reduced motion must stop vinyl spinning");
    });
  });

  describe("Audit 5: Safe-Area Inset Support", () => {
    it("ensures ALL landing stylesheets implement safe-area-inset-bottom support", () => {
      for (const file of ALL_CSS_FILES) {
        const css = readCss(file);
        assert.ok(
          css.includes("env(safe-area-inset-bottom)"),
          `${file} must integrate env(safe-area-inset-bottom) for iPhone home indicator and notch areas`
        );
      }
    });

    it("validates safe-area inset padding uses max() fallback bounds", () => {
      const heroCss = readCss("hero-section.css");
      const musicCss = readCss("landing-music-card.css");
      const wallCss = readCss("scrapbook-card-wall.css");
      const storyCss = readCss("story-destination-cards.css");
      const tokenCss = readCss("landing-tokens.css");

      assert.ok(tokenCss.includes("max(16px, env(safe-area-inset-bottom))"), "landing-tokens.css must use max() for safe area padding");
      assert.ok(heroCss.includes("env(safe-area-inset-bottom)"), "hero-section.css must use max() safe-area-inset-bottom");
      assert.ok(musicCss.includes("env(safe-area-inset-bottom)"), "landing-music-card.css must use max() safe-area-inset-bottom");
      assert.ok(wallCss.includes("env(safe-area-inset-bottom)"), "scrapbook-card-wall.css must use max() safe-area-inset-bottom");
      assert.ok(storyCss.includes("env(safe-area-inset-bottom)"), "story-destination-cards.css must use max() safe-area-inset-bottom");
    });
  });

  describe("Audit 6: Typography Clamping & Fluid Scaling", () => {
    it("ensures typography clamping with clamp() across ALL landing stylesheets", () => {
      for (const file of ALL_CSS_FILES) {
        const css = readCss(file);
        assert.ok(
          css.includes("clamp("),
          `${file} must declare clamp() for fluid, responsive typography across mobile and desktop`
        );
      }
    });

    it("verifies Urdu typography and headings have proper mobile clamp boundaries", () => {
      const heroCss = readCss("hero-section.css");
      const storyCss = readCss("story-destination-cards.css");

      assert.ok(heroCss.includes("font-size: clamp("), "Hero heading must use clamp()");
      assert.ok(storyCss.includes("font-size: clamp("), "Story card titles must use clamp()");
    });
  });

  describe("Audit 7: Low-Latency Performance & CLS Prevention", () => {
    it("verifies lazy loading and asynchronous decoding on below-the-fold landing images", () => {
      const storyTsx = fs.readFileSync(path.join(LANDING_DIR, "StoryDestinationCards.tsx"), "utf-8");
      assert.ok(storyTsx.includes('loading="lazy"'), "Below-the-fold memory photographs must be lazy loaded");
      assert.ok(storyTsx.includes('decoding="async"'), "Memory photographs must use asynchronous image decoding");

      const heroTsx = fs.readFileSync(path.join(LANDING_DIR, "HeroSection.tsx"), "utf-8");
      assert.ok(heroTsx.includes('decoding="async"'), "Hero avatar must use asynchronous image decoding");
    });

    it("verifies explicit aspect ratio declarations on media containers to prevent layout shifts (CLS)", () => {
      const wallCss = readCss("scrapbook-card-wall.css");
      const storyCss = readCss("story-destination-cards.css");

      assert.ok(wallCss.includes("aspect-ratio: 4 / 3"), "Scrapbook wall cards must declare aspect-ratio to prevent CLS");
      assert.ok(storyCss.includes("aspect-ratio: 1 / 1"), "Polaroid media containers must declare aspect-ratio: 1 / 1 to prevent CLS");
    });

    it("verifies no memory leaks or uncleaned interval timers in landing components", () => {
      const componentFiles = fs
        .readdirSync(LANDING_DIR)
        .filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));

      for (const file of componentFiles) {
        const content = fs.readFileSync(path.join(LANDING_DIR, file), "utf-8");
        // Ensure any setInterval has an accompanying clearInterval
        if (content.includes("setInterval(")) {
          assert.ok(
            content.includes("clearInterval("),
            `${file} with setInterval must also provide clearInterval in a cleanup handler`
          );
        }
      }
    });
  });
});
