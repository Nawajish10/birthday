import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * ============================================================================
 * SPECIFICATION & CONTRACT DEFINITIONS
 * Dedicated Video Experience (Meerah's Birthday Website)
 * ============================================================================
 */

export interface VideoSubtitleCue {
  start: number;
  end: number;
  text: string;
}

export interface VideoPanelProps {
  videoUrl?: string;
  title?: string;
  description?: string;
  posterUrl?: string;
  onClose?: () => void;
  isModal?: boolean;
  captionsUrl?: string;
  subtitles?: VideoSubtitleCue[];
}

export const DEFAULT_VIDEO_TITLE = "A Year of Magic & Memories";
export const DEFAULT_VIDEO_URDU_TITLE = "ہماری یادوں کی جھلک";
export const EXPECTED_CINEMA_TITLE = "Birthday Video for Meerah · ہماری یادوں کی جھلک";
export const EXPECTED_PLACEHOLDER_NOTE =
  "The creator is editing the final reel of moments to cherish. Add your birthday video in the creator studio or check back soon!";
export const EXPECTED_PLACEHOLDER_NOTE_URDU =
  "تخلیق کار یادگار لمحات کی حتمی ریل تیار کر رہے ہیں۔ تخلیق کار اسٹوڈیو میں اپنی ویڈیو شامل کریں یا جلد دوبارہ دیکھیں۔";
export const SAMPLE_PREVIEW_VIDEO_URL =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

/**
 * Pure state resolution logic matching component specification
 */
export function resolveVideoDestinationState(options: {
  videoUrl?: string;
  isPreviewMode?: boolean;
  hasVideoError?: boolean;
}): {
  hasPlayableSource: boolean;
  activeUrl: string | null;
  showCinemaCard: boolean;
} {
  const resolved =
    options.videoUrl && options.videoUrl.trim().length > 0 ? options.videoUrl.trim() : null;
  const isPreview = Boolean(options.isPreviewMode);
  const hasError = Boolean(options.hasVideoError);
  const activeUrl = isPreview ? SAMPLE_PREVIEW_VIDEO_URL : resolved;
  const hasPlayableSource = Boolean(activeUrl) && !hasError;
  return {
    hasPlayableSource,
    activeUrl,
    showCinemaCard: !hasPlayableSource,
  };
}

export function getSubtitleAtTime(
  seconds: number,
  subtitles: VideoSubtitleCue[],
  fallbackText: string = "Happy Birthday Meerah! 🎂✨"
): string {
  if (!Array.isArray(subtitles) || subtitles.length === 0) return fallbackText;
  const match = subtitles.find((cue) => seconds >= cue.start && seconds < cue.end);
  return match ? match.text : fallbackText;
}

// File paths for static & code verification
const videoPanelComponentPath = path.resolve(
  process.cwd(),
  "src/components/video/VideoPanel.tsx"
);
const videoCssPath = path.resolve(
  process.cwd(),
  "src/components/video/video.css"
);

/**
 * ============================================================================
 * TEST SUITE 1: Video Destination State Machine & Fallback Contracts
 * ============================================================================
 */
describe("1. Video Destination State Machine & Fallback Logic", () => {
  test("Missing videoUrl defaults gracefully to cinema card placeholder", () => {
    const stateEmpty = resolveVideoDestinationState({});
    assert.equal(stateEmpty.hasPlayableSource, false);
    assert.equal(stateEmpty.showCinemaCard, true);
    assert.equal(stateEmpty.activeUrl, null);

    const stateUndefined = resolveVideoDestinationState({ videoUrl: undefined });
    assert.equal(stateUndefined.hasPlayableSource, false);
    assert.equal(stateUndefined.showCinemaCard, true);

    const stateWhitespace = resolveVideoDestinationState({ videoUrl: "   " });
    assert.equal(stateWhitespace.hasPlayableSource, false);
    assert.equal(stateWhitespace.showCinemaCard, true);
  });

  test("Valid videoUrl resolves to playable state without showing cinema placeholder card", () => {
    const validUrl = "https://cdn.meerah-birthday.com/videos/cherished-moments.mp4";
    const state = resolveVideoDestinationState({ videoUrl: validUrl });

    assert.equal(state.hasPlayableSource, true);
    assert.equal(state.showCinemaCard, false);
    assert.equal(state.activeUrl, validUrl);
  });

  test("Video loading error gracefully falls back to cinema card to avoid black screen", () => {
    const brokenUrl = "https://cdn.meerah-birthday.com/videos/missing-reel.mp4";
    const state = resolveVideoDestinationState({
      videoUrl: brokenUrl,
      hasVideoError: true,
    });

    assert.equal(state.hasPlayableSource, false);
    assert.equal(state.showCinemaCard, true);
  });

  test("Sample preview toggle activates sample celebration reel", () => {
    const state = resolveVideoDestinationState({
      videoUrl: undefined,
      isPreviewMode: true,
    });

    assert.equal(state.hasPlayableSource, true);
    assert.equal(state.showCinemaCard, false);
    assert.equal(state.activeUrl, SAMPLE_PREVIEW_VIDEO_URL);
  });

  test("Subtitle timestamp resolver matches active cue accurately", () => {
    const testSubtitles: VideoSubtitleCue[] = [
      { start: 0, end: 5, text: "Happy Birthday Meerah!" },
      { start: 5, end: 10, text: "A year of warmth and joy." },
    ];

    assert.equal(getSubtitleAtTime(2, testSubtitles), "Happy Birthday Meerah!");
    assert.equal(getSubtitleAtTime(7, testSubtitles), "A year of warmth and joy.");
    assert.equal(getSubtitleAtTime(12, testSubtitles), "Happy Birthday Meerah! 🎂✨");
  });
});

/**
 * ============================================================================
 * TEST SUITE 2: Strict Zero Autoplay Rule & Gesture Enforcement
 * ============================================================================
 */
describe("2. Strict Zero Autoplay Rule & Gesture Enforcement", () => {
  test("VideoPanel.tsx contains strictly NO autoPlay or autoplay attribute on HTML5 <video>", () => {
    assert.ok(fs.existsSync(videoPanelComponentPath), "VideoPanel.tsx must exist");
    const source = fs.readFileSync(videoPanelComponentPath, "utf-8");

    // Extract the <video ... > tag
    const videoTagMatch = source.match(/<video[\s\S]*?>/);
    assert.ok(videoTagMatch, "VideoPanel must render an HTML5 <video> tag");

    const videoTag = videoTagMatch[0];

    // Must NOT contain autoPlay or autoplay
    assert.equal(
      /autoplay/i.test(videoTag),
      false,
      "Strict Autoplay Rule: <video> must NEVER contain autoPlay or autoplay"
    );
  });

  test("Native controls attribute is enabled on <video> element", () => {
    const source = fs.readFileSync(videoPanelComponentPath, "utf-8");
    const videoTagMatch = source.match(/<video[\s\S]*?>/);
    assert.ok(videoTagMatch, "Must find <video> tag");

    const videoTag = videoTagMatch[0];
    assert.ok(
      videoTag.includes("controls"),
      "Native controls must be explicitly enabled on the video element"
    );
    assert.ok(
      videoTag.includes("playsInline"),
      "playsInline must be enabled for smooth mobile playback"
    );
    assert.ok(
      videoTag.includes('preload="metadata"'),
      "preload='metadata' must be set to prevent aggressive background buffering"
    );
  });

  test("Requires explicit user gesture overlay to initiate playback", () => {
    const source = fs.readFileSync(videoPanelComponentPath, "utf-8");

    assert.ok(
      source.includes("video-gesture-play-overlay"),
      "Must include explicit gesture play overlay"
    );
    assert.ok(
      source.includes("Play Birthday Reel ▶") || source.includes("Play birthday video"),
      "Must offer an explicit play trigger gesture"
    );
    assert.ok(
      source.includes(".play()"),
      "Video play gesture must programmatically trigger playback"
    );
  });
});

/**
 * ============================================================================
 * TEST SUITE 3: Missing Asset Scrapbook Cinema Card UI Contract
 * ============================================================================
 */
describe("3. Missing Asset Scrapbook Cinema Card Contract", () => {
  test("Cinema card renders exact title: Birthday Video for Meerah · ہماری یادوں کی جھلک", () => {
    const source = fs.readFileSync(videoPanelComponentPath, "utf-8");

    assert.ok(
      source.includes(EXPECTED_CINEMA_TITLE),
      `Must contain exact cinema card title: ${EXPECTED_CINEMA_TITLE}`
    );
  });

  test("Cinema card contains illustrated film reel / projector SVG", () => {
    const source = fs.readFileSync(videoPanelComponentPath, "utf-8");

    assert.ok(
      source.includes("CinemaProjectorIllustration") ||
        source.includes("cinema-projector-illustration"),
      "Must contain CinemaProjectorIllustration component/class"
    );
    assert.ok(
      source.includes('viewBox="0 0 160 140"'),
      "Projector SVG must define a dedicated viewBox"
    );
    assert.ok(
      source.includes("goldGradient") || source.includes("beamGradient"),
      "Projector SVG must render golden light beam or reel gradients"
    );
  });

  test("Cinema card contains the required creator note and Urdu translation", () => {
    const source = fs.readFileSync(videoPanelComponentPath, "utf-8");

    assert.ok(
      source.includes(EXPECTED_PLACEHOLDER_NOTE),
      `Must display exact note: "${EXPECTED_PLACEHOLDER_NOTE}"`
    );
    assert.ok(
      source.includes(EXPECTED_PLACEHOLDER_NOTE_URDU),
      "Must display Urdu translation for creator note"
    );
  });

  test("Cinema card provides sample preview toggle button", () => {
    const source = fs.readFileSync(videoPanelComponentPath, "utf-8");

    assert.ok(
      source.includes("handleTogglePreview") || source.includes("Preview Sample"),
      "Must provide an interactive sample preview toggle trigger"
    );
    assert.ok(
      source.includes('aria-label="Preview sample celebration reel"'),
      "Sample preview button must have accessible aria-label"
    );
  });
});

/**
 * ============================================================================
 * TEST SUITE 4: Video Frame, Sprockets, Washi & Captions UI Contract
 * ============================================================================
 */
describe("4. Video Frame, Sprockets, Washi & Captions UI Contract", () => {
  test("Renders stylish antique gold frame and filmstrip sprocket borders", () => {
    const source = fs.readFileSync(videoPanelComponentPath, "utf-8");

    assert.ok(
      source.includes("antique-gold-frame"),
      "Must render .antique-gold-frame wrapper"
    );
    assert.ok(
      source.includes("filmstrip-sprockets") || source.includes("FilmstripSprockets"),
      "Must render filmstrip sprocket border accents"
    );
  });

  test("Renders scrapbook washi tape accents", () => {
    const source = fs.readFileSync(videoPanelComponentPath, "utf-8");

    assert.ok(
      source.includes("video-washi-tape-gold"),
      "Must render gold washi tape accent"
    );
    assert.ok(
      source.includes("video-washi-tape-pink"),
      "Must render pink washi tape accent"
    );
  });

  test("Renders subtitle track and synchronized caption banner", () => {
    const source = fs.readFileSync(videoPanelComponentPath, "utf-8");

    assert.ok(
      source.includes("<track"),
      "HTML5 video must support <track kind='captions'>"
    );
    assert.ok(
      source.includes("video-subtitles-banner"),
      "Must render accessible subtitle captions banner"
    );
    assert.ok(
      source.includes('aria-live="polite"'),
      "Caption banner must have aria-live='polite' for screen reader accessibility"
    );
  });
});

/**
 * ============================================================================
 * TEST SUITE 5: Modal Dismiss & Standalone Layout Contract
 * ============================================================================
 */
describe("5. Modal Dismiss & Standalone Layout Contract", () => {
  test("Modal mode renders dialog semantics and backdrop overlay", () => {
    const source = fs.readFileSync(videoPanelComponentPath, "utf-8");

    assert.ok(
      source.includes('role="dialog"'),
      "Modal mode must specify role='dialog'"
    );
    assert.ok(
      source.includes('aria-modal="true"'),
      "Modal mode must specify aria-modal='true'"
    );
    assert.ok(
      source.includes("video-destination-modal-overlay"),
      "Modal mode must render backdrop overlay container"
    );
  });

  test("Provides accessible close button invoking onClose", () => {
    const source = fs.readFileSync(videoPanelComponentPath, "utf-8");

    assert.ok(
      source.includes('aria-label="Close video"'),
      "Close button must have aria-label='Close video'"
    );
    assert.ok(
      source.includes("onClick={onClose}"),
      "Close button must trigger onClose callback"
    );
  });

  test("Attaches keyboard Escape listener for modal dismissal", () => {
    const source = fs.readFileSync(videoPanelComponentPath, "utf-8");

    assert.ok(
      source.includes('e.key === "Escape"'),
      "Must listen for Escape key to close modal"
    );
    assert.ok(
      source.includes("removeEventListener"),
      "Must clean up Escape key event listener on unmount"
    );
  });

  test("Standalone mode renders region semantics without modal backdrop", () => {
    const source = fs.readFileSync(videoPanelComponentPath, "utf-8");

    assert.ok(
      source.includes("video-destination-standalone"),
      "Must support standalone layout container"
    );
    assert.ok(
      source.includes('role="region"'),
      "Card must have role='region' for landmark accessibility"
    );
  });
});

/**
 * ============================================================================
 * TEST SUITE 6: CSS & Design Tokens Verification (video.css)
 * ============================================================================
 */
describe("6. CSS & Design Tokens Verification (video.css)", () => {
  test("video.css exists and is readable", () => {
    assert.ok(fs.existsSync(videoCssPath), "video.css must exist");
  });

  test("Defines antique gold colors (#C69325 / #F1C75B)", () => {
    const css = fs.readFileSync(videoCssPath, "utf-8");

    assert.ok(
      css.includes("#C69325") || css.includes("#c69325"),
      "Must define antique gold dark #C69325"
    );
    assert.ok(
      css.includes("#F1C75B") || css.includes("#f1c75b"),
      "Must define sunflower/antique gold #F1C75B"
    );
    assert.ok(
      css.includes(".antique-gold-frame"),
      "Must define .antique-gold-frame class"
    );
  });

  test("Defines warm ivory background (#FFF9EF / #FBF4E6)", () => {
    const css = fs.readFileSync(videoCssPath, "utf-8");

    assert.ok(
      css.includes("#FFF9EF") || css.includes("#fff9ef"),
      "Must define warm ivory #FFF9EF"
    );
    assert.ok(
      css.includes("#FBF4E6") || css.includes("#fbf4e6"),
      "Must define scrapbook paper ivory #FBF4E6"
    );
  });

  test("Defines plum ink typography (#624752 / #3D2B33)", () => {
    const css = fs.readFileSync(videoCssPath, "utf-8");

    assert.ok(
      css.includes("#624752") || css.includes("#624752"),
      "Must define plum ink #624752"
    );
    assert.ok(
      css.includes("#3D2B33") || css.includes("#3d2b33"),
      "Must define deep plum #3D2B33"
    );
  });

  test("Enforces responsive 16:9 aspect ratio and mobile viewports", () => {
    const css = fs.readFileSync(videoCssPath, "utf-8");

    assert.ok(
      css.includes("16 / 9") || css.includes("16/9"),
      "Must define 16:9 aspect ratio for cinema display"
    );
    assert.ok(
      css.includes("@media (max-width: 640px)"),
      "Must include responsive mobile adaptation breakpoint"
    );
  });

  test("Includes keyboard accessibility with :focus-visible", () => {
    const css = fs.readFileSync(videoCssPath, "utf-8");

    assert.ok(
      css.includes(":focus-visible"),
      "Must define :focus-visible rules for keyboard navigation"
    );
  });

  test("Includes motion safety with @media (prefers-reduced-motion: reduce)", () => {
    const css = fs.readFileSync(videoCssPath, "utf-8");

    assert.ok(
      css.includes("@media (prefers-reduced-motion: reduce)"),
      "Must define @media (prefers-reduced-motion: reduce)"
    );
  });
});
